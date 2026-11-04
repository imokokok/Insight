import {
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  isAddress,
  keccak256,
  parseAbi,
  parseUnits,
} from 'viem';

import {
  type PANCAKE_SWAP_V3_BNB_CHAIN_ID,
  type PANCAKE_SWAP_V3_BASE_CHAIN_ID,
  type PANCAKE_SWAP_V3_MONAD_CHAIN_ID,
  PANCAKE_SWAP_V3_ROUTER_WETH9_BY_CHAIN,
  pancakeSwapV3DeploymentForChain,
  reviewedPancakeSwapV3Profile,
  type ReviewedPancakeSwapV3ProfileId,
} from './pancakeSwapV3';
import {
  getUniswapV3MarketSnapshot,
  UniswapV3MarketRpcClient,
  type UniswapV3MarketSnapshot,
  type UniswapV3QuoteDirection,
} from './uniswapV3Market';

const ROUTER_STATE_ABI = parseAbi([
  'function factory() view returns (address)',
  'function WETH9() view returns (address)',
]);
const SWAP_ROUTER_ABI = parseAbi([
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
]);
const ERC20_ABI = parseAbi(['function approve(address spender,uint256 amount) returns (bool)']);
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const MAX_DEADLINE_AHEAD_SECONDS = 30 * 60;
const DECIMAL_AMOUNT = /^(?:0\.(?:0*[1-9][0-9]*)|[1-9][0-9]*(?:\.[0-9]+)?)$/;

export interface PreparePancakeSwapV3ExactInputRequest {
  profileId?: ReviewedPancakeSwapV3ProfileId;
  /**
   * Quote direction inside the reviewed pool. Both directions of the reviewed
   * USDC/USDT pair are admitted; anything outside the reviewed pool's own two
   * tokens is rejected by construction.
   */
  direction?: UniswapV3QuoteDirection;
  /** Exact input amount in human-readable decimals of the input token. */
  amountIn: string;
  recipient: string;
  deadlineUnixSeconds: number;
  maxSlippageBps: number;
}

export interface PreparedPancakeSwapV3ExactInput {
  kind: 'pancakeswap-v3-exact-input-v1';
  chainId:
    | typeof PANCAKE_SWAP_V3_BASE_CHAIN_ID
    | typeof PANCAKE_SWAP_V3_BNB_CHAIN_ID
    | typeof PANCAKE_SWAP_V3_MONAD_CHAIN_ID;
  transaction: { to: `0x${string}`; data: `0x${string}`; value: '0x0' };
  approval: {
    token: string;
    spender: `0x${string}`;
    amountRaw: string;
    data: `0x${string}`;
  };
  exactInput: {
    profileId: ReviewedPancakeSwapV3ProfileId;
    tokenIn: string;
    tokenOut: string;
    feeTier: number;
    amountInRaw: string;
    quotedAmountOutRaw: string;
    amountOutMinimumRaw: string;
    recipient: string;
    deadlineUnixSeconds: number;
    maxSlippageBps: number;
  };
  quote: Pick<
    UniswapV3MarketSnapshot,
    | 'source'
    | 'venue'
    | 'market'
    | 'sourceFreshnessSeconds'
    | 'observedAt'
    | 'block'
    | 'contracts'
    | 'spot'
    | 'twap'
  > & { quote: UniswapV3MarketSnapshot['quotes'][number] };
  router: {
    address: `0x${string}`;
    codeHash: string;
    factory: string;
    weth9: string;
  };
  caveats: string[];
}

function assertDeadline(deadlineUnixSeconds: number, nowUnixSeconds: number): void {
  if (
    !Number.isSafeInteger(deadlineUnixSeconds) ||
    deadlineUnixSeconds <= nowUnixSeconds ||
    deadlineUnixSeconds > nowUnixSeconds + MAX_DEADLINE_AHEAD_SECONDS
  ) {
    throw new Error(
      `PancakeSwap V3 deadline must be after now and within ${MAX_DEADLINE_AHEAD_SECONDS} seconds.`
    );
  }
}

function assertSlippage(maxSlippageBps: number): void {
  if (!Number.isSafeInteger(maxSlippageBps) || maxSlippageBps < 0 || maxSlippageBps >= 10_000) {
    throw new Error('PancakeSwap V3 maxSlippageBps must be an integer from 0 to 9999.');
  }
}

function verifiedRecipient(value: string): `0x${string}` {
  if (!isAddress(value) || value.toLowerCase() === ZERO_ADDRESS) {
    throw new Error('PancakeSwap V3 recipient must be a non-zero EVM address.');
  }
  return getAddress(value) as `0x${string}`;
}

function exactAmountInRaw(amountIn: string, decimals: number): bigint {
  if (!DECIMAL_AMOUNT.test(amountIn)) {
    throw new Error(
      'PancakeSwap V3 amountIn must be a positive decimal amount without exponent notation.'
    );
  }
  try {
    const raw = parseUnits(amountIn, decimals);
    if (raw <= 0n) throw new Error('non-positive');
    return raw;
  } catch {
    throw new Error('PancakeSwap V3 amountIn is outside the supported token precision.');
  }
}

function decodeAddress(data: `0x${string}`, functionName: 'factory' | 'WETH9'): `0x${string}` {
  const address = String(decodeFunctionResult({ abi: ROUTER_STATE_ABI, functionName, data }));
  if (!isAddress(address))
    throw new Error(`PancakeSwap V3 router returned an invalid ${functionName}.`);
  return getAddress(address) as `0x${string}`;
}

/**
 * Produces an unsigned direct-router call against one reviewed PancakeSwap V3
 * pool.  It does not accept arbitrary pool addresses, swap directions, or
 * routes, and it cannot sign, approve, relay, or broadcast on a user's behalf.
 */
export async function preparePancakeSwapV3ExactInput(
  request: PreparePancakeSwapV3ExactInputRequest,
  options: {
    rpc?: UniswapV3MarketRpcClient;
    nowUnixSeconds?: number;
    signal?: AbortSignal;
  } = {}
): Promise<PreparedPancakeSwapV3ExactInput> {
  const nowUnixSeconds = options.nowUnixSeconds ?? Math.floor(Date.now() / 1000);
  assertDeadline(request.deadlineUnixSeconds, nowUnixSeconds);
  assertSlippage(request.maxSlippageBps);
  const recipient = verifiedRecipient(request.recipient);
  const profileId = request.profileId ?? 'base-pancakeswap-v3-usdc-usdt-100';
  const direction: UniswapV3QuoteDirection = request.direction ?? 'token0-to-token1';
  const profile = reviewedPancakeSwapV3Profile(profileId);
  // Fail closed on a chain without a reviewed deployment bundle: no addresses
  // are borrowed from another network's deployment.
  const deployment = pancakeSwapV3DeploymentForChain(profile.chainId);
  if (!deployment) {
    throw new Error(
      `PancakeSwap V3 profile ${profileId} targets chain ${profile.chainId}, which has no reviewed deployment.`
    );
  }
  const expectedWeth9 = (
    PANCAKE_SWAP_V3_ROUTER_WETH9_BY_CHAIN as Record<number, string | undefined>
  )[profile.chainId];
  if (!expectedWeth9) {
    throw new Error(`PancakeSwap V3 router WETH9 is not reviewed for chain ${profile.chainId}.`);
  }
  const inputToken = direction === 'token0-to-token1' ? profile.token0 : profile.token1;
  const outputToken = direction === 'token0-to-token1' ? profile.token1 : profile.token0;
  const amountIn = exactAmountInRaw(request.amountIn, inputToken.decimals);
  const rpc =
    options.rpc ?? new UniswapV3MarketRpcClient(profile.chainId, profile.rpcEndpoints.slice());
  const snapshot = await getUniswapV3MarketSnapshot(
    {
      ...profile,
      id: `${profile.id}-pretrade-${direction}-${amountIn.toString()}`,
      quoteAmountsToken0: undefined,
      ...(direction === 'token1-to-token0'
        ? { quoteAmountsToken1Raw: [amountIn] }
        : { quoteAmountsToken0Raw: [amountIn] }),
    },
    { rpc, cache: false, signal: options.signal }
  );
  const quote = snapshot.quotes[0];
  if (!quote) throw new Error('PancakeSwap V3 exact-input quote was absent.');

  const blockNumber = BigInt(snapshot.block.number);
  const routerAddress = deployment.swapRouter as `0x${string}`;
  const [runtimeCode, factoryData, weth9Data] = await Promise.all([
    rpc.getCode(routerAddress, blockNumber, options.signal),
    rpc.call(
      routerAddress,
      encodeFunctionData({ abi: ROUTER_STATE_ABI, functionName: 'factory' }),
      blockNumber,
      options.signal
    ),
    rpc.call(
      routerAddress,
      encodeFunctionData({ abi: ROUTER_STATE_ABI, functionName: 'WETH9' }),
      blockNumber,
      options.signal
    ),
  ]);
  if (runtimeCode === '0x' || keccak256(runtimeCode) !== deployment.routerCodeHash) {
    throw new Error('PancakeSwap V3 router runtime code does not match the reviewed deployment.');
  }
  const routerFactory = decodeAddress(factoryData, 'factory');
  const routerWeth9 = decodeAddress(weth9Data, 'WETH9');
  if (
    routerFactory.toLowerCase() !== deployment.factory.toLowerCase() ||
    routerFactory.toLowerCase() !== snapshot.contracts.factory.toLowerCase() ||
    routerWeth9.toLowerCase() !== expectedWeth9.toLowerCase()
  ) {
    throw new Error('PancakeSwap V3 router bindings do not match the reviewed pool.');
  }

  const quotedAmountOut = BigInt(quote.amountOutRaw);
  const amountOutMinimum = (quotedAmountOut * BigInt(10_000 - request.maxSlippageBps)) / 10_000n;
  if (amountOutMinimum <= 0n) throw new Error('PancakeSwap V3 minimum output is not positive.');
  const data = encodeFunctionData({
    abi: SWAP_ROUTER_ABI,
    functionName: 'exactInputSingle',
    args: [
      {
        tokenIn: inputToken.address,
        tokenOut: outputToken.address,
        fee: profile.feeTier,
        recipient,
        deadline: BigInt(request.deadlineUnixSeconds),
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
  const approvalData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [deployment.swapRouter as `0x${string}`, amountIn],
  });

  return {
    kind: 'pancakeswap-v3-exact-input-v1',
    chainId: profile.chainId as PreparedPancakeSwapV3ExactInput['chainId'],
    transaction: {
      to: deployment.swapRouter,
      data,
      value: '0x0',
    } as PreparedPancakeSwapV3ExactInput['transaction'],
    approval: {
      token: inputToken.address,
      spender: deployment.swapRouter as `0x${string}`,
      amountRaw: amountIn.toString(),
      data: approvalData,
    },
    exactInput: {
      profileId,
      tokenIn: inputToken.address,
      tokenOut: outputToken.address,
      feeTier: profile.feeTier,
      amountInRaw: amountIn.toString(),
      quotedAmountOutRaw: quotedAmountOut.toString(),
      amountOutMinimumRaw: amountOutMinimum.toString(),
      recipient,
      deadlineUnixSeconds: request.deadlineUnixSeconds,
      maxSlippageBps: request.maxSlippageBps,
    },
    quote: {
      source: snapshot.source,
      venue: snapshot.venue,
      market: snapshot.market,
      sourceFreshnessSeconds: snapshot.sourceFreshnessSeconds,
      observedAt: snapshot.observedAt,
      block: snapshot.block,
      contracts: snapshot.contracts,
      spot: snapshot.spot,
      twap: snapshot.twap,
      quote,
    },
    router: {
      address: deployment.swapRouter as `0x${string}`,
      codeHash: deployment.routerCodeHash,
      factory: routerFactory,
      weth9: routerWeth9,
    },
    caveats: [
      'This is unsigned calldata only. Insight cannot approve, sign, relay, or broadcast a transaction.',
      'The approval template is exact-amount token approval for the reviewed router; inspect existing allowance before signing any approval.',
      'The quote and code checks describe one pinned block. They do not simulate a later signed transaction, guarantee a fill, protect against MEV, or cover another pool or route.',
      'Use a user-controlled signer and submit the executed transaction hash to Insight or PriorSeal for post-settlement evidence.',
    ],
  };
}
