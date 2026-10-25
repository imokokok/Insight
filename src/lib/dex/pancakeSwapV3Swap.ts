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
  PANCAKE_SWAP_V3_BASE_CHAIN_ID,
  PANCAKE_SWAP_V3_BASE_CODE_IDENTITY,
  PANCAKE_SWAP_V3_BASE_FACTORY,
  PANCAKE_SWAP_V3_BASE_SWAP_ROUTER,
  PancakeSwapV3BaseRpcClient,
  reviewedPancakeSwapV3Profile,
  type ReviewedPancakeSwapV3ProfileId,
} from './pancakeSwapV3';
import { getUniswapV3MarketSnapshot, type UniswapV3MarketSnapshot } from './uniswapV3Market';

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
  /** Exact input of the selected profile's token0; reverse routes are not admitted. */
  amountIn: string;
  recipient: string;
  deadlineUnixSeconds: number;
  maxSlippageBps: number;
}

export interface PreparedPancakeSwapV3ExactInput {
  kind: 'pancakeswap-v3-exact-input-v1';
  chainId: typeof PANCAKE_SWAP_V3_BASE_CHAIN_ID;
  transaction: { to: typeof PANCAKE_SWAP_V3_BASE_SWAP_ROUTER; data: `0x${string}`; value: '0x0' };
  approval: {
    token: string;
    spender: typeof PANCAKE_SWAP_V3_BASE_SWAP_ROUTER;
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
    address: typeof PANCAKE_SWAP_V3_BASE_SWAP_ROUTER;
    codeHash: typeof PANCAKE_SWAP_V3_BASE_CODE_IDENTITY.router;
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
    rpc?: PancakeSwapV3BaseRpcClient;
    nowUnixSeconds?: number;
    signal?: AbortSignal;
  } = {}
): Promise<PreparedPancakeSwapV3ExactInput> {
  const nowUnixSeconds = options.nowUnixSeconds ?? Math.floor(Date.now() / 1000);
  assertDeadline(request.deadlineUnixSeconds, nowUnixSeconds);
  assertSlippage(request.maxSlippageBps);
  const recipient = verifiedRecipient(request.recipient);
  const profileId = request.profileId ?? 'base-pancakeswap-v3-usdc-usdt-100';
  const profile = reviewedPancakeSwapV3Profile(profileId);
  const amountIn = exactAmountInRaw(request.amountIn, profile.token0.decimals);
  const rpc = options.rpc ?? new PancakeSwapV3BaseRpcClient(profile.rpcEndpoints.slice());
  const snapshot = await getUniswapV3MarketSnapshot(
    {
      ...profile,
      id: `${profile.id}-pretrade-${amountIn.toString()}`,
      quoteAmountsToken0: undefined,
      quoteAmountsToken0Raw: [amountIn],
    },
    { rpc, cache: false, signal: options.signal }
  );
  const quote = snapshot.quotes[0];
  if (!quote) throw new Error('PancakeSwap V3 exact-input quote was absent.');

  const blockNumber = BigInt(snapshot.block.number);
  const [runtimeCode, factoryData, weth9Data] = await Promise.all([
    rpc.getCode(PANCAKE_SWAP_V3_BASE_SWAP_ROUTER, blockNumber, options.signal),
    rpc.call(
      PANCAKE_SWAP_V3_BASE_SWAP_ROUTER,
      encodeFunctionData({ abi: ROUTER_STATE_ABI, functionName: 'factory' }),
      blockNumber,
      options.signal
    ),
    rpc.call(
      PANCAKE_SWAP_V3_BASE_SWAP_ROUTER,
      encodeFunctionData({ abi: ROUTER_STATE_ABI, functionName: 'WETH9' }),
      blockNumber,
      options.signal
    ),
  ]);
  if (
    runtimeCode === '0x' ||
    keccak256(runtimeCode) !== PANCAKE_SWAP_V3_BASE_CODE_IDENTITY.router
  ) {
    throw new Error('PancakeSwap V3 router runtime code does not match the reviewed deployment.');
  }
  const routerFactory = decodeAddress(factoryData, 'factory');
  const routerWeth9 = decodeAddress(weth9Data, 'WETH9');
  if (
    routerFactory.toLowerCase() !== PANCAKE_SWAP_V3_BASE_FACTORY.toLowerCase() ||
    routerFactory.toLowerCase() !== snapshot.contracts.factory.toLowerCase() ||
    routerWeth9.toLowerCase() !== '0x4200000000000000000000000000000000000006'
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
        tokenIn: profile.token0.address,
        tokenOut: profile.token1.address,
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
    args: [PANCAKE_SWAP_V3_BASE_SWAP_ROUTER, amountIn],
  });

  return {
    kind: 'pancakeswap-v3-exact-input-v1',
    chainId: PANCAKE_SWAP_V3_BASE_CHAIN_ID,
    transaction: { to: PANCAKE_SWAP_V3_BASE_SWAP_ROUTER, data, value: '0x0' },
    approval: {
      token: profile.token0.address,
      spender: PANCAKE_SWAP_V3_BASE_SWAP_ROUTER,
      amountRaw: amountIn.toString(),
      data: approvalData,
    },
    exactInput: {
      profileId,
      tokenIn: profile.token0.address,
      tokenOut: profile.token1.address,
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
      address: PANCAKE_SWAP_V3_BASE_SWAP_ROUTER,
      codeHash: PANCAKE_SWAP_V3_BASE_CODE_IDENTITY.router,
      factory: routerFactory,
      weth9: routerWeth9,
    },
    caveats: [
      'This is unsigned calldata only. Insight cannot approve, sign, relay, or broadcast a transaction.',
      'The approval template is exact-amount token approval for the reviewed router; inspect existing allowance before signing any approval.',
      'The quote and code checks describe one pinned block. They do not simulate a later signed transaction, guarantee a fill, protect against MEV, or cover another pool or route.',
      'Use a user-controlled signer and submit the Base transaction hash to Insight or PriorSeal for post-settlement evidence.',
    ],
  };
}
