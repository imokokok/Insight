import {
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  isAddress,
  keccak256,
  parseAbi,
} from 'viem';

import {
  AERODROME_SLIPSTREAM_CHAIN_ID,
  AERODROME_SLIPSTREAM_SWAP_ROUTER,
  AERODROME_SLIPSTREAM_SWAP_ROUTER_CODE_HASH,
  AerodromeSlipstreamRpcClient,
  aerodromeSlipstreamWethUsdcProfile,
  type AerodromeSlipstreamMarketProfile,
} from './aerodromeSlipstream';
import {
  getReviewedAerodromeSlipstreamPreTradeEvidence,
  type ReviewedAerodromeSlipstreamPreTradeEvidence,
} from './preTradeAerodromeSlipstream';

const ROUTER_STATE_ABI = parseAbi([
  'function factory() view returns (address)',
  'function WETH9() view returns (address)',
]);
const SWAP_ROUTER_ABI = parseAbi([
  'function exactInputSingle((address tokenIn,address tokenOut,int24 tickSpacing,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
]);
const ERC20_ABI = parseAbi(['function approve(address spender,uint256 amount) returns (bool)']);
const MAX_DEADLINE_AHEAD_SECONDS = 30 * 60;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface PrepareAerodromeSlipstreamExactInputRequest {
  /** Exact WETH amount to sell. Native ETH and reverse direction are not admitted. */
  amountIn: string;
  /** Recipient of USDC, encoded into the transaction calldata. */
  recipient: string;
  /** Unix seconds, encoded into the router's deadline field. */
  deadlineUnixSeconds: number;
  /** Maximum allowed shortfall from the pinned QuoterV2 output. */
  maxSlippageBps: number;
}

export interface PreparedAerodromeSlipstreamExactInput {
  kind: 'aerodrome-slipstream-exact-input-v1';
  chainId: typeof AERODROME_SLIPSTREAM_CHAIN_ID;
  transaction: {
    to: typeof AERODROME_SLIPSTREAM_SWAP_ROUTER;
    data: `0x${string}`;
    value: '0x0';
  };
  approval: {
    token: string;
    spender: typeof AERODROME_SLIPSTREAM_SWAP_ROUTER;
    amountRaw: string;
    data: `0x${string}`;
  };
  exactInput: {
    tokenIn: string;
    tokenOut: string;
    tickSpacing: number;
    amountInRaw: string;
    quotedAmountOutRaw: string;
    amountOutMinimumRaw: string;
    recipient: string;
    deadlineUnixSeconds: number;
    maxSlippageBps: number;
  };
  quote: ReviewedAerodromeSlipstreamPreTradeEvidence;
  router: {
    address: typeof AERODROME_SLIPSTREAM_SWAP_ROUTER;
    codeHash: typeof AERODROME_SLIPSTREAM_SWAP_ROUTER_CODE_HASH;
    factory: string;
    weth9: string;
  };
  caveats: string[];
}

function verifiedRecipient(value: string): `0x${string}` {
  if (!isAddress(value) || value.toLowerCase() === ZERO_ADDRESS) {
    throw new Error('Aerodrome Slipstream recipient must be a non-zero EVM address.');
  }
  return getAddress(value) as `0x${string}`;
}

function assertDeadline(deadlineUnixSeconds: number, nowUnixSeconds: number): void {
  if (
    !Number.isSafeInteger(deadlineUnixSeconds) ||
    deadlineUnixSeconds <= nowUnixSeconds ||
    deadlineUnixSeconds > nowUnixSeconds + MAX_DEADLINE_AHEAD_SECONDS
  ) {
    throw new Error(
      `Aerodrome Slipstream deadline must be after now and within ${MAX_DEADLINE_AHEAD_SECONDS} seconds.`
    );
  }
}

function assertSlippage(maxSlippageBps: number): void {
  if (!Number.isSafeInteger(maxSlippageBps) || maxSlippageBps < 0 || maxSlippageBps >= 10_000) {
    throw new Error('Aerodrome Slipstream maxSlippageBps must be an integer from 0 to 9999.');
  }
}

function decodeAddress(data: `0x${string}`, functionName: 'factory' | 'WETH9'): `0x${string}` {
  const decoded = decodeFunctionResult({ abi: ROUTER_STATE_ABI, functionName, data });
  const address = String(decoded);
  if (!isAddress(address))
    throw new Error(`Aerodrome Slipstream router returned an invalid ${functionName}.`);
  return getAddress(address) as `0x${string}`;
}

function minimumAmountOut(quotedAmountOut: bigint, maxSlippageBps: number): bigint {
  const result = (quotedAmountOut * BigInt(10_000 - maxSlippageBps)) / 10_000n;
  if (result <= 0n) throw new Error('Aerodrome Slipstream minimum output is not positive.');
  return result;
}

/**
 * Produce a user-signable, single-hop WETH -> USDC Slipstream call. The
 * service cannot sign, relay, approve, or broadcast it. Before calldata is
 * emitted it requires a fresh exact-notional quote and verifies both the
 * router code hash and its immutable factory/WETH bindings at that quote's
 * block.
 */
export async function prepareAerodromeSlipstreamExactInput(
  request: PrepareAerodromeSlipstreamExactInputRequest,
  options: {
    rpc?: AerodromeSlipstreamRpcClient;
    nowUnixSeconds?: number;
    signal?: AbortSignal;
  } = {}
): Promise<PreparedAerodromeSlipstreamExactInput> {
  const nowUnixSeconds = options.nowUnixSeconds ?? Math.floor(Date.now() / 1000);
  assertDeadline(request.deadlineUnixSeconds, nowUnixSeconds);
  assertSlippage(request.maxSlippageBps);
  const recipient = verifiedRecipient(request.recipient);
  const profile: AerodromeSlipstreamMarketProfile = aerodromeSlipstreamWethUsdcProfile();
  const rpc = options.rpc ?? new AerodromeSlipstreamRpcClient(profile.rpcEndpoints);
  const quote = await getReviewedAerodromeSlipstreamPreTradeEvidence(
    {
      chainId: AERODROME_SLIPSTREAM_CHAIN_ID,
      asset: profile.token0.symbol,
      destinationAsset: profile.token1.symbol,
      amountIn: request.amountIn,
    },
    { rpc, signal: options.signal }
  );
  const blockNumber = BigInt(quote.block.number);
  const [runtimeCode, factoryData, weth9Data] = await Promise.all([
    rpc.getCode(AERODROME_SLIPSTREAM_SWAP_ROUTER, blockNumber, options.signal),
    rpc.call(
      AERODROME_SLIPSTREAM_SWAP_ROUTER,
      encodeFunctionData({ abi: ROUTER_STATE_ABI, functionName: 'factory' }),
      blockNumber,
      options.signal
    ),
    rpc.call(
      AERODROME_SLIPSTREAM_SWAP_ROUTER,
      encodeFunctionData({ abi: ROUTER_STATE_ABI, functionName: 'WETH9' }),
      blockNumber,
      options.signal
    ),
  ]);
  if (
    runtimeCode === '0x' ||
    keccak256(runtimeCode) !== AERODROME_SLIPSTREAM_SWAP_ROUTER_CODE_HASH
  ) {
    throw new Error(
      'Aerodrome Slipstream router runtime code does not match the reviewed deployment.'
    );
  }
  const routerFactory = decodeAddress(factoryData, 'factory');
  const routerWeth9 = decodeAddress(weth9Data, 'WETH9');
  if (
    routerFactory.toLowerCase() !== quote.contracts.factory.toLowerCase() ||
    routerWeth9.toLowerCase() !== profile.token0.address.toLowerCase()
  ) {
    throw new Error('Aerodrome Slipstream router bindings do not match the reviewed pool.');
  }

  const amountIn = BigInt(quote.quote.amountInRaw);
  const quotedAmountOut = BigInt(quote.quote.amountOutRaw);
  const amountOutMinimum = minimumAmountOut(quotedAmountOut, request.maxSlippageBps);
  const data = encodeFunctionData({
    abi: SWAP_ROUTER_ABI,
    functionName: 'exactInputSingle',
    args: [
      {
        tokenIn: profile.token0.address,
        tokenOut: profile.token1.address,
        tickSpacing: profile.tickSpacing,
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
    args: [AERODROME_SLIPSTREAM_SWAP_ROUTER, amountIn],
  });

  return {
    kind: 'aerodrome-slipstream-exact-input-v1',
    chainId: AERODROME_SLIPSTREAM_CHAIN_ID,
    transaction: { to: AERODROME_SLIPSTREAM_SWAP_ROUTER, data, value: '0x0' },
    approval: {
      token: profile.token0.address,
      spender: AERODROME_SLIPSTREAM_SWAP_ROUTER,
      amountRaw: amountIn.toString(),
      data: approvalData,
    },
    exactInput: {
      tokenIn: profile.token0.address,
      tokenOut: profile.token1.address,
      tickSpacing: profile.tickSpacing,
      amountInRaw: amountIn.toString(),
      quotedAmountOutRaw: quotedAmountOut.toString(),
      amountOutMinimumRaw: amountOutMinimum.toString(),
      recipient,
      deadlineUnixSeconds: request.deadlineUnixSeconds,
      maxSlippageBps: request.maxSlippageBps,
    },
    quote,
    router: {
      address: AERODROME_SLIPSTREAM_SWAP_ROUTER,
      codeHash: AERODROME_SLIPSTREAM_SWAP_ROUTER_CODE_HASH,
      factory: routerFactory,
      weth9: routerWeth9,
    },
    caveats: [
      'This is unsigned calldata only. Insight cannot approve, sign, relay, or broadcast a transaction.',
      'The approval template is exact-amount WETH approval for the reviewed router; inspect existing allowance before signing any approval.',
      'The quote and router checks describe one pinned block. They do not simulate a later signed transaction, guarantee a fill, protect against MEV, or cover another route.',
      'Use the returned exact transaction with a user-controlled signer and submit its Base transaction hash to Insight or PriorSeal for post-settlement evidence.',
    ],
  };
}
