import { decodeFunctionResult, encodeFunctionData, getAddress, isAddress, parseAbi } from 'viem';

import { CHAINLINK_RPC_CONFIG } from '@/lib/oracles/services/chainlinkDataSources/rpcConfig';

import {
  uniswapV3ArithmeticMeanTick,
  uniswapV3Token1PerToken0FromTick,
  UniswapV3MarketRpcClient,
  type UniswapV3Hex,
} from './uniswapV3Market';

/** Base mainnet's immutable EVM chain id. */
export const AERODROME_SLIPSTREAM_CHAIN_ID = 8453;
export const AERODROME_SLIPSTREAM_FACTORY = '0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A' as const;
export const AERODROME_SLIPSTREAM_QUOTER_V2 = '0x254cF9E1E6e233aa1AC962CB9B05b2cfeAaE15b0' as const;
/**
 * Router from Aerodrome's initial Slipstream deployment.  This integration
 * deliberately targets only the reviewed pool from that same factory; it does
 * not guess a route through a later factory or an aggregation router.
 */
export const AERODROME_SLIPSTREAM_SWAP_ROUTER =
  '0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5' as const;
/** Runtime bytecode pin for the reviewed router, read from Base mainnet. */
export const AERODROME_SLIPSTREAM_SWAP_ROUTER_CODE_HASH =
  '0x8ca2876cc2c509da1648ef2ad21a8849c261cf7316b675119b98ba298c8657e7' as const;
export const BASE_WETH = '0x4200000000000000000000000000000000000006' as const;
export const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;

/**
 * Reviewed Aerodrome Slipstream WETH/USDC CL100 pool.  Unlike Uniswap V3,
 * Slipstream identifies a pool and its QuoterV2 route with tickSpacing, not a
 * fee tier.  The pool's live fee is therefore reported from `fee()` at the
 * pinned block rather than assumed from the spacing.
 */
export const AERODROME_SLIPSTREAM_WETH_USDC = {
  pool: '0xb2cc224c1c9feE385f8ad6a55b4d94E92359DC59' as const,
  tickSpacing: 100,
  token0Symbol: 'WETH',
  token0Decimals: 18,
  token1Symbol: 'USDC',
  token1Decimals: 6,
  twapWindowSeconds: 1_800,
} as const;

export interface AerodromeSlipstreamMarketToken {
  address: UniswapV3Hex;
  symbol: string;
  decimals: number;
}

/** A reviewed single-pool Slipstream profile, never an arbitrary route proxy. */
export interface AerodromeSlipstreamMarketProfile {
  id: string;
  chainId: number;
  venue: 'aerodrome-slipstream';
  market: string;
  factory: UniswapV3Hex;
  quoterV2: UniswapV3Hex;
  pool: UniswapV3Hex;
  token0: AerodromeSlipstreamMarketToken;
  token1: AerodromeSlipstreamMarketToken;
  tickSpacing: number;
  twapWindowSeconds: number;
  /** Exact-input quote ladder expressed in whole token0 units. */
  quoteAmountsToken0?: readonly number[];
  /**
   * Exact-input quote ladder expressed in token0 base units. This is reserved
   * for reviewed, strictly parsed pre-trade and transaction-preparation paths;
   * callers cannot submit this value directly at an HTTP boundary.
   */
  quoteAmountsToken0Raw?: readonly bigint[];
  rpcEndpoints: readonly string[];
  maxSourceAgeSeconds: number;
  cacheTtlMs: number;
}

export interface AerodromeSlipstreamMarketSnapshot {
  source: 'dex-market';
  venue: 'aerodrome-slipstream';
  chainId: number;
  market: string;
  sourceFreshnessSeconds: number;
  observedAt: string;
  block: {
    number: string;
    hash: UniswapV3Hex;
    timestamp: string;
  };
  contracts: {
    factory: UniswapV3Hex;
    quoterV2: UniswapV3Hex;
    pool: UniswapV3Hex;
    token0: UniswapV3Hex;
    token1: UniswapV3Hex;
    tickSpacing: number;
    /** Current swap fee in pips (1e-6) read at the pinned block. */
    feePips: number;
  };
  spot: {
    tick: number;
    token1PerToken0: number;
  };
  twap: {
    windowSeconds: number;
    tick: number;
    token1PerToken0: number;
    deviationBpsFromSpot: number;
  };
  activeLiquidityRaw: string;
  poolBalances: {
    token0Raw: string;
    token0: number;
    token1Raw: string;
    token1: number;
  };
  quotes: Array<{
    amountIn: number;
    amountInRaw: string;
    amountOut: number;
    amountOutRaw: string;
    effectiveToken1PerToken0: number;
    initializedTicksCrossed: number;
    priceImpactBps: number;
  }>;
}

export class AerodromeSlipstreamMarketError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AerodromeSlipstreamMarketError';
  }
}

const FACTORY_ABI = parseAbi([
  'function getPool(address tokenA,address tokenB,int24 tickSpacing) view returns (address)',
]);
const POOL_ABI = parseAbi([
  'function factory() view returns (address)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function tickSpacing() view returns (int24)',
  'function fee() view returns (uint24)',
  'function liquidity() view returns (uint128)',
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, bool unlocked)',
  'function observe(uint32[] secondsAgos) view returns (int56[] tickCumulatives, uint160[] secondsPerLiquidityCumulativeX128s)',
]);
const ERC20_ABI = parseAbi(['function balanceOf(address) view returns (uint256)']);
const QUOTER_V2_ABI = parseAbi([
  'function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,int24 tickSpacing,uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)',
]);
const MAX_UINT32 = 2 ** 32 - 1;
const MAX_FEE_PIPS = 100_000;

function baseRpcEndpoints(): string[] {
  const configured = CHAINLINK_RPC_CONFIG[AERODROME_SLIPSTREAM_CHAIN_ID]?.endpoints ?? [];
  const valid = configured.filter((endpoint) => {
    try {
      return new URL(endpoint).protocol === 'https:';
    } catch {
      return false;
    }
  });
  return [...new Set(valid)];
}

/** The reviewed Base Aerodrome CL100 profile. */
export function aerodromeSlipstreamWethUsdcProfile(): AerodromeSlipstreamMarketProfile {
  return {
    id: 'base-aerodrome-slipstream-weth-usdc-cl100',
    chainId: AERODROME_SLIPSTREAM_CHAIN_ID,
    venue: 'aerodrome-slipstream',
    market: 'WETH/USDC',
    factory: AERODROME_SLIPSTREAM_FACTORY,
    quoterV2: AERODROME_SLIPSTREAM_QUOTER_V2,
    pool: AERODROME_SLIPSTREAM_WETH_USDC.pool,
    token0: {
      address: BASE_WETH,
      symbol: AERODROME_SLIPSTREAM_WETH_USDC.token0Symbol,
      decimals: AERODROME_SLIPSTREAM_WETH_USDC.token0Decimals,
    },
    token1: {
      address: BASE_USDC,
      symbol: AERODROME_SLIPSTREAM_WETH_USDC.token1Symbol,
      decimals: AERODROME_SLIPSTREAM_WETH_USDC.token1Decimals,
    },
    tickSpacing: AERODROME_SLIPSTREAM_WETH_USDC.tickSpacing,
    twapWindowSeconds: AERODROME_SLIPSTREAM_WETH_USDC.twapWindowSeconds,
    quoteAmountsToken0: [1, 10, 100],
    rpcEndpoints: baseRpcEndpoints(),
    maxSourceAgeSeconds: 120,
    cacheTtlMs: 10_000,
  };
}

/** Base RPC reader used only for the reviewed Aerodrome profile. */
export class AerodromeSlipstreamRpcClient extends UniswapV3MarketRpcClient {
  constructor(endpoints: readonly string[] = baseRpcEndpoints()) {
    super(AERODROME_SLIPSTREAM_CHAIN_ID, endpoints);
  }
}

function isSafePositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

/** Validate every runtime-controlled profile field before making RPC requests. */
export function assertAerodromeSlipstreamMarketProfile(
  profile: AerodromeSlipstreamMarketProfile
): void {
  if (!profile.id || !profile.market || !isSafePositiveInteger(profile.chainId)) {
    throw new AerodromeSlipstreamMarketError(
      'Aerodrome Slipstream profile has invalid identity metadata.'
    );
  }
  if (profile.venue !== 'aerodrome-slipstream') {
    throw new AerodromeSlipstreamMarketError(
      'Aerodrome Slipstream profile has an unsupported venue.'
    );
  }
  for (const [label, address] of [
    ['factory', profile.factory],
    ['quoterV2', profile.quoterV2],
    ['pool', profile.pool],
    ['token0', profile.token0.address],
    ['token1', profile.token1.address],
  ] as const) {
    if (!isAddress(address)) {
      throw new AerodromeSlipstreamMarketError(
        `Aerodrome Slipstream profile has an invalid ${label} address.`
      );
    }
  }
  if (profile.token0.address.toLowerCase() === profile.token1.address.toLowerCase()) {
    throw new AerodromeSlipstreamMarketError(
      'Aerodrome Slipstream profile reuses one token address.'
    );
  }
  if (
    !profile.token0.symbol ||
    !profile.token1.symbol ||
    !Number.isSafeInteger(profile.token0.decimals) ||
    !Number.isSafeInteger(profile.token1.decimals) ||
    profile.token0.decimals < 0 ||
    profile.token0.decimals > 36 ||
    profile.token1.decimals < 0 ||
    profile.token1.decimals > 36 ||
    !isSafePositiveInteger(profile.tickSpacing) ||
    profile.tickSpacing > 16_383 ||
    !isSafePositiveInteger(profile.twapWindowSeconds) ||
    profile.twapWindowSeconds > MAX_UINT32 ||
    !isSafePositiveInteger(profile.maxSourceAgeSeconds) ||
    !isSafePositiveInteger(profile.cacheTtlMs) ||
    ((!profile.quoteAmountsToken0 || profile.quoteAmountsToken0.length === 0) &&
      (!profile.quoteAmountsToken0Raw || profile.quoteAmountsToken0Raw.length === 0)) ||
    (profile.quoteAmountsToken0 !== undefined && profile.quoteAmountsToken0Raw !== undefined) ||
    (profile.quoteAmountsToken0 !== undefined &&
      profile.quoteAmountsToken0.some(
        (amount, index) =>
          !Number.isSafeInteger(amount) ||
          amount <= 0 ||
          (index > 0 && amount <= profile.quoteAmountsToken0![index - 1]!)
      )) ||
    (profile.quoteAmountsToken0Raw !== undefined &&
      profile.quoteAmountsToken0Raw.some(
        (amount, index) =>
          amount <= 0n || (index > 0 && amount <= profile.quoteAmountsToken0Raw![index - 1]!)
      ))
  ) {
    throw new AerodromeSlipstreamMarketError(
      'Aerodrome Slipstream profile has invalid numeric configuration.'
    );
  }
  if (
    profile.rpcEndpoints.length === 0 ||
    profile.rpcEndpoints.some((endpoint) => {
      try {
        return new URL(endpoint).protocol !== 'https:';
      } catch {
        return true;
      }
    })
  ) {
    throw new AerodromeSlipstreamMarketError(
      'Aerodrome Slipstream profile has no valid HTTPS RPC endpoint.'
    );
  }
}

function encodeFactoryGetPool(profile: AerodromeSlipstreamMarketProfile): UniswapV3Hex {
  return encodeFunctionData({
    abi: FACTORY_ABI,
    functionName: 'getPool',
    args: [profile.token0.address, profile.token1.address, profile.tickSpacing],
  });
}

function encodePoolCall(
  functionName: 'factory' | 'token0' | 'token1' | 'tickSpacing' | 'fee' | 'liquidity' | 'slot0'
): UniswapV3Hex {
  return encodeFunctionData({ abi: POOL_ABI, functionName });
}

function encodeObserve(profile: AerodromeSlipstreamMarketProfile): UniswapV3Hex {
  return encodeFunctionData({
    abi: POOL_ABI,
    functionName: 'observe',
    args: [[profile.twapWindowSeconds, 0]],
  });
}

function encodeBalanceOf(owner: UniswapV3Hex): UniswapV3Hex {
  return encodeFunctionData({ abi: ERC20_ABI, functionName: 'balanceOf', args: [owner] });
}

function encodeQuote(profile: AerodromeSlipstreamMarketProfile, amountIn: bigint): UniswapV3Hex {
  return encodeFunctionData({
    abi: QUOTER_V2_ABI,
    functionName: 'quoteExactInputSingle',
    args: [
      {
        tokenIn: profile.token0.address,
        tokenOut: profile.token1.address,
        amountIn,
        tickSpacing: profile.tickSpacing,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
}

function decodeAddressResult(
  data: UniswapV3Hex,
  functionName: 'getPool' | 'factory' | 'token0' | 'token1'
): UniswapV3Hex {
  const abi = functionName === 'getPool' ? FACTORY_ABI : POOL_ABI;
  const result = decodeFunctionResult({ abi, functionName: functionName as never, data });
  const address = String(result);
  if (!isAddress(address)) {
    throw new AerodromeSlipstreamMarketError(
      'Aerodrome Slipstream contract returned an invalid address.'
    );
  }
  return getAddress(address) as UniswapV3Hex;
}

function decodeUnsignedResult(
  data: UniswapV3Hex,
  functionName: 'fee' | 'liquidity' | 'balanceOf',
  abi: typeof POOL_ABI | typeof ERC20_ABI = POOL_ABI
): bigint {
  const result = decodeFunctionResult({ abi, functionName: functionName as never, data });
  if (typeof result === 'number') {
    if (!Number.isSafeInteger(result) || result < 0) {
      throw new AerodromeSlipstreamMarketError(
        'Aerodrome Slipstream contract returned an invalid unsigned value.'
      );
    }
    return BigInt(result);
  }
  if (typeof result !== 'bigint' || result < 0n) {
    throw new AerodromeSlipstreamMarketError(
      'Aerodrome Slipstream contract returned an invalid unsigned value.'
    );
  }
  return result;
}

function decodeInt24Result(data: UniswapV3Hex): number {
  const result = decodeFunctionResult({ abi: POOL_ABI, functionName: 'tickSpacing', data });
  const value = typeof result === 'bigint' ? Number(result) : result;
  if (!Number.isSafeInteger(value) || value <= 0 || value > 16_383) {
    throw new AerodromeSlipstreamMarketError(
      'Aerodrome Slipstream pool returned an invalid tick spacing.'
    );
  }
  return value;
}

function unitsToNumber(raw: bigint, decimals: number): number {
  const value = Number(raw) / 10 ** decimals;
  if (!Number.isFinite(value) || value < 0) {
    throw new AerodromeSlipstreamMarketError(
      'Aerodrome Slipstream contract returned an out-of-range balance.'
    );
  }
  return value;
}

function boundedBps(numerator: number, denominator: number): number {
  const value = (numerator / denominator) * 10_000;
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000) {
    throw new AerodromeSlipstreamMarketError(
      'Aerodrome Slipstream quote returned an invalid price impact.'
    );
  }
  return value;
}

async function fetchSnapshot(
  profile: AerodromeSlipstreamMarketProfile,
  rpc: AerodromeSlipstreamRpcClient,
  nowMs: number,
  signal?: AbortSignal
): Promise<AerodromeSlipstreamMarketSnapshot> {
  const blockNumber = await rpc.getBlockNumber(signal);
  const block = await rpc.getBlock(blockNumber, signal);
  const quoteInputs =
    profile.quoteAmountsToken0Raw ??
    profile.quoteAmountsToken0!.map(
      (amount) => BigInt(amount) * 10n ** BigInt(profile.token0.decimals)
    );
  const [
    factoryPoolData,
    poolFactoryData,
    token0Data,
    token1Data,
    tickSpacingData,
    feeData,
    liquidityData,
    slot0Data,
    observeData,
    token0BalanceData,
    token1BalanceData,
    ...quoteData
  ] = await Promise.all([
    rpc.call(profile.factory, encodeFactoryGetPool(profile), block.number, signal),
    rpc.call(profile.pool, encodePoolCall('factory'), block.number, signal),
    rpc.call(profile.pool, encodePoolCall('token0'), block.number, signal),
    rpc.call(profile.pool, encodePoolCall('token1'), block.number, signal),
    rpc.call(profile.pool, encodePoolCall('tickSpacing'), block.number, signal),
    rpc.call(profile.pool, encodePoolCall('fee'), block.number, signal),
    rpc.call(profile.pool, encodePoolCall('liquidity'), block.number, signal),
    rpc.call(profile.pool, encodePoolCall('slot0'), block.number, signal),
    rpc.call(profile.pool, encodeObserve(profile), block.number, signal),
    rpc.call(profile.token0.address, encodeBalanceOf(profile.pool), block.number, signal),
    rpc.call(profile.token1.address, encodeBalanceOf(profile.pool), block.number, signal),
    ...quoteInputs.map((amount) =>
      rpc.call(profile.quoterV2, encodeQuote(profile, amount), block.number, signal)
    ),
  ]);

  const factoryPool = decodeAddressResult(factoryPoolData, 'getPool');
  const poolFactory = decodeAddressResult(poolFactoryData, 'factory');
  const token0 = decodeAddressResult(token0Data, 'token0');
  const token1 = decodeAddressResult(token1Data, 'token1');
  const tickSpacing = decodeInt24Result(tickSpacingData);
  const feePips = decodeUnsignedResult(feeData, 'fee');
  const activeLiquidity = decodeUnsignedResult(liquidityData, 'liquidity');
  const token0Balance = decodeUnsignedResult(token0BalanceData, 'balanceOf', ERC20_ABI);
  const token1Balance = decodeUnsignedResult(token1BalanceData, 'balanceOf', ERC20_ABI);

  if (
    factoryPool.toLowerCase() !== profile.pool.toLowerCase() ||
    poolFactory.toLowerCase() !== profile.factory.toLowerCase() ||
    token0.toLowerCase() !== profile.token0.address.toLowerCase() ||
    token1.toLowerCase() !== profile.token1.address.toLowerCase() ||
    tickSpacing !== profile.tickSpacing ||
    feePips <= 0n ||
    feePips > BigInt(MAX_FEE_PIPS) ||
    activeLiquidity <= 0n
  ) {
    throw new AerodromeSlipstreamMarketError(
      'Aerodrome Slipstream pool provenance, fee, or liquidity validation failed.'
    );
  }

  const slot0 = decodeFunctionResult({ abi: POOL_ABI, functionName: 'slot0', data: slot0Data });
  const spotTick = Number(slot0[1]);
  if (!Number.isSafeInteger(spotTick) || spotTick < -887_272 || spotTick > 887_272) {
    throw new AerodromeSlipstreamMarketError(
      'Aerodrome Slipstream pool returned an invalid spot tick.'
    );
  }
  const observe = decodeFunctionResult({
    abi: POOL_ABI,
    functionName: 'observe',
    data: observeData,
  });
  const tickCumulatives = observe[0];
  const olderCumulative = tickCumulatives[0];
  const currentCumulative = tickCumulatives[1];
  if (
    !Array.isArray(tickCumulatives) ||
    tickCumulatives.length !== 2 ||
    typeof olderCumulative !== 'bigint' ||
    typeof currentCumulative !== 'bigint'
  ) {
    throw new AerodromeSlipstreamMarketError(
      'Aerodrome Slipstream pool returned an invalid TWAP observation.'
    );
  }
  const twapTick = uniswapV3ArithmeticMeanTick(
    olderCumulative,
    currentCumulative,
    profile.twapWindowSeconds
  );
  const spotPrice = uniswapV3Token1PerToken0FromTick(
    spotTick,
    profile.token0.decimals,
    profile.token1.decimals
  );
  const twapPrice = uniswapV3Token1PerToken0FromTick(
    twapTick,
    profile.token0.decimals,
    profile.token1.decimals
  );

  const decodedQuotes = quoteData.map((data, index) => {
    const quote = decodeFunctionResult({
      abi: QUOTER_V2_ABI,
      functionName: 'quoteExactInputSingle',
      data,
    });
    const amountOut = quote[0];
    const ticksCrossed = quote[2];
    if (typeof amountOut !== 'bigint' || amountOut <= 0n || typeof ticksCrossed !== 'number') {
      throw new AerodromeSlipstreamMarketError(
        'Aerodrome Slipstream QuoterV2 returned an invalid quote.'
      );
    }
    const amountInRaw = quoteInputs[index];
    if (amountInRaw === undefined) {
      throw new AerodromeSlipstreamMarketError(
        'Aerodrome Slipstream quote ladder is inconsistent.'
      );
    }
    const amountIn = unitsToNumber(amountInRaw, profile.token0.decimals);
    const amountOutNumber = unitsToNumber(amountOut, profile.token1.decimals);
    return {
      amountIn,
      amountInRaw: amountInRaw.toString(),
      amountOut: amountOutNumber,
      amountOutRaw: amountOut.toString(),
      effectiveToken1PerToken0: amountOutNumber / amountIn,
      initializedTicksCrossed: ticksCrossed,
    };
  });
  const referencePrice = decodedQuotes[0]?.effectiveToken1PerToken0;
  if (!referencePrice || !Number.isFinite(referencePrice) || referencePrice <= 0) {
    throw new AerodromeSlipstreamMarketError(
      'Aerodrome Slipstream QuoterV2 returned an invalid reference quote.'
    );
  }

  const observedAtMs = Math.max(nowMs, Date.now());
  const rawSourceFreshnessSeconds = (observedAtMs - block.timestamp * 1000) / 1000;
  if (
    !Number.isFinite(rawSourceFreshnessSeconds) ||
    rawSourceFreshnessSeconds < -60 ||
    rawSourceFreshnessSeconds > profile.maxSourceAgeSeconds
  ) {
    throw new AerodromeSlipstreamMarketError(
      'Aerodrome Slipstream market block is outside the freshness limit.'
    );
  }

  return {
    source: 'dex-market',
    venue: 'aerodrome-slipstream',
    chainId: profile.chainId,
    market: profile.market,
    sourceFreshnessSeconds: Math.max(0, rawSourceFreshnessSeconds),
    observedAt: new Date(observedAtMs).toISOString(),
    block: {
      number: block.number.toString(),
      hash: block.hash,
      timestamp: new Date(block.timestamp * 1000).toISOString(),
    },
    contracts: {
      factory: profile.factory,
      quoterV2: profile.quoterV2,
      pool: profile.pool,
      token0,
      token1,
      tickSpacing,
      feePips: Number(feePips),
    },
    spot: { tick: spotTick, token1PerToken0: spotPrice },
    twap: {
      windowSeconds: profile.twapWindowSeconds,
      tick: twapTick,
      token1PerToken0: twapPrice,
      deviationBpsFromSpot: boundedBps(Math.abs(twapPrice - spotPrice), spotPrice),
    },
    activeLiquidityRaw: activeLiquidity.toString(),
    poolBalances: {
      token0Raw: token0Balance.toString(),
      token0: unitsToNumber(token0Balance, profile.token0.decimals),
      token1Raw: token1Balance.toString(),
      token1: unitsToNumber(token1Balance, profile.token1.decimals),
    },
    quotes: decodedQuotes.map((quote) => ({
      ...quote,
      priceImpactBps: boundedBps(
        Math.max(0, referencePrice - quote.effectiveToken1PerToken0),
        referencePrice
      ),
    })),
  };
}

const cachedSnapshots = new Map<
  string,
  { value: AerodromeSlipstreamMarketSnapshot; expiresAt: number }
>();
const inFlightSnapshots = new Map<string, Promise<AerodromeSlipstreamMarketSnapshot>>();

/** Test hook for the short, per-profile live-data cache. */
export function resetAerodromeSlipstreamMarketCacheForTests(profileId?: string): void {
  if (profileId) {
    cachedSnapshots.delete(profileId);
    inFlightSnapshots.delete(profileId);
    return;
  }
  cachedSnapshots.clear();
  inFlightSnapshots.clear();
}

/**
 * Read fresh, block-pinned evidence from the reviewed Aerodrome CL100 market.
 * It never prepares, signs, simulates, or broadcasts a swap.
 */
export async function getAerodromeSlipstreamMarketSnapshotForProfile(
  profile: AerodromeSlipstreamMarketProfile,
  options: {
    rpc?: AerodromeSlipstreamRpcClient;
    nowMs?: number;
    signal?: AbortSignal;
    cache?: boolean;
  } = {}
): Promise<AerodromeSlipstreamMarketSnapshot> {
  assertAerodromeSlipstreamMarketProfile(profile);
  const nowMs = options.nowMs ?? Date.now();
  const cacheEnabled = !options.rpc && options.cache !== false;
  if (cacheEnabled) {
    const cached = cachedSnapshots.get(profile.id);
    if (cached && cached.expiresAt > nowMs) return cached.value;
    const inFlight = inFlightSnapshots.get(profile.id);
    if (inFlight) return inFlight;
  }

  const rpc = options.rpc ?? new AerodromeSlipstreamRpcClient(profile.rpcEndpoints);
  const request = fetchSnapshot(profile, rpc, nowMs, options.signal);
  if (cacheEnabled) inFlightSnapshots.set(profile.id, request);
  try {
    const value = await request;
    if (cacheEnabled) {
      cachedSnapshots.set(profile.id, { value, expiresAt: nowMs + profile.cacheTtlMs });
    }
    return value;
  } finally {
    if (cacheEnabled) inFlightSnapshots.delete(profile.id);
  }
}

/** Read fresh evidence from the default reviewed Aerodrome WETH/USDC pool. */
export async function getAerodromeSlipstreamMarketSnapshot(
  options: {
    rpc?: AerodromeSlipstreamRpcClient;
    nowMs?: number;
    signal?: AbortSignal;
    cache?: boolean;
  } = {}
): Promise<AerodromeSlipstreamMarketSnapshot> {
  return getAerodromeSlipstreamMarketSnapshotForProfile(
    aerodromeSlipstreamWethUsdcProfile(),
    options
  );
}
