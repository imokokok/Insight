import { decodeFunctionResult, encodeFunctionData, getAddress, isAddress, parseAbi } from 'viem';

import { CHAINLINK_RPC_CONFIG } from '@/lib/oracles/services/chainlinkDataSources/rpcConfig';

/** Monad mainnet's immutable EVM chain id. */
export const MONAD_CHAIN_ID = 143;
export const MONAD_UNISWAP_V3_FACTORY = '0x204faca1764b154221e35c0d20abb3c525710498' as const;
export const MONAD_UNISWAP_V3_QUOTER_V2 = '0x661e93cca42afacb172121ef892830ca3b70f08d' as const;
export const MONAD_WMON = '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A' as const;
export const MONAD_USDC = '0x754704Bc059F8C67012fEd69BC8A327a5aafb603' as const;

/**
 * This is deliberately a DEX-market source, not an oracle feed. All reads
 * below are pinned to a single Monad block and include enough contract
 * identity to reproduce the result.
 */
export const MONAD_UNISWAP_V3_WMON_USDC = {
  pool: '0x659bD0BC4167BA25c62E05656F78043E7eD4a9da' as const,
  feeTier: 3_000,
  twapWindowSeconds: 900,
  token0: MONAD_WMON,
  token1: MONAD_USDC,
  token0Symbol: 'WMON',
  token1Symbol: 'USDC',
  token0Decimals: 18,
  token1Decimals: 6,
} as const;

const MAX_SOURCE_AGE_SECONDS = 120;
const CACHE_TTL_MS = 10_000;
const QUOTE_AMOUNTS_WMON = [1, 1_000, 100_000] as const;

const FACTORY_ABI = parseAbi(['function getPool(address,address,uint24) view returns (address)']);
const POOL_ABI = parseAbi([
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function fee() view returns (uint24)',
  'function liquidity() view returns (uint128)',
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function observe(uint32[] secondsAgos) view returns (int56[] tickCumulatives, uint160[] secondsPerLiquidityCumulativeX128s)',
]);
const ERC20_ABI = parseAbi(['function balanceOf(address) view returns (uint256)']);
const QUOTER_ABI = parseAbi([
  'function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)',
]);

type Hex = `0x${string}`;
type RpcRecord = Record<string, unknown>;

export interface MonadDexBlock {
  number: bigint;
  hash: Hex;
  timestamp: number;
}

export interface MonadDexRawLog {
  address: Hex;
  blockHash: Hex;
  blockNumber: bigint;
  data: Hex;
  logIndex: bigint;
  topics: Hex[];
  transactionHash: Hex;
}

export interface MonadDexQuote {
  amountInWmon: number;
  amountInRaw: string;
  amountOutUsdc: number;
  amountOutRaw: string;
  effectiveUsdcPerWmon: number;
  priceImpactBps: number;
  initializedTicksCrossed: number;
}

export interface MonadDexMarketSnapshot {
  source: 'dex-market';
  venue: 'uniswap-v3';
  chainId: 143;
  market: 'MON/USDC';
  sourceFreshnessSeconds: number;
  observedAt: string;
  block: {
    number: string;
    hash: Hex;
    timestamp: string;
  };
  contracts: {
    factory: Hex;
    quoterV2: Hex;
    pool: Hex;
    token0: Hex;
    token1: Hex;
    feeTier: number;
  };
  spot: {
    tick: number;
    usdcPerWmon: number;
  };
  twap: {
    windowSeconds: number;
    tick: number;
    usdcPerWmon: number;
    deviationBpsFromSpot: number;
  };
  activeLiquidityRaw: string;
  poolBalances: {
    wmonRaw: string;
    wmon: number;
    usdcRaw: string;
    usdc: number;
  };
  quotes: MonadDexQuote[];
}

export class MonadDexRpcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MonadDexRpcError';
  }
}

function isRecord(value: unknown): value is RpcRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asHex(value: unknown, field: string): Hex {
  if (typeof value !== 'string' || !/^0x(?:[0-9a-fA-F]{2})*$/.test(value)) {
    throw new MonadDexRpcError(`Monad RPC returned an invalid ${field}.`);
  }
  return value as Hex;
}

function asHexQuantity(value: unknown, field: string): bigint {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]+$/.test(value)) {
    throw new MonadDexRpcError(`Monad RPC returned an invalid ${field}.`);
  }
  try {
    return BigInt(value);
  } catch {
    throw new MonadDexRpcError(`Monad RPC returned an invalid ${field}.`);
  }
}

function rpcEndpoints(): string[] {
  const configured = CHAINLINK_RPC_CONFIG[MONAD_CHAIN_ID]?.endpoints ?? [];
  const valid = configured.filter((endpoint) => {
    try {
      return new URL(endpoint).protocol === 'https:';
    } catch {
      return false;
    }
  });
  return [...new Set(valid)];
}

/**
 * Minimal validated JSON-RPC client. Errors intentionally omit endpoint URLs:
 * an Alchemy endpoint may contain a credential in its final path segment.
 */
export class MonadDexRpcClient {
  private readonly endpoints: string[];

  constructor(endpoints: string[] = rpcEndpoints()) {
    this.endpoints = endpoints;
  }

  private async request(method: string, params: unknown[], signal?: AbortSignal): Promise<unknown> {
    if (this.endpoints.length === 0) {
      throw new MonadDexRpcError('No Monad RPC endpoint is configured.');
    }

    for (const endpoint of this.endpoints) {
      const timeout = new AbortController();
      const timeoutId = setTimeout(() => timeout.abort(), 8_000);
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
          signal: signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal,
        });
        if (!response.ok) continue;
        const body: unknown = await response.json();
        if (!isRecord(body) || !('result' in body) || body.error !== undefined) continue;
        return body.result;
      } catch {
        // Try the next independently configured endpoint. Network errors and
        // provider-specific messages must not reach customer-facing callers.
      } finally {
        clearTimeout(timeoutId);
      }
    }
    throw new MonadDexRpcError(`Monad RPC ${method} is unavailable.`);
  }

  async getChainId(signal?: AbortSignal): Promise<number> {
    const chainId = asHexQuantity(await this.request('eth_chainId', [], signal), 'chain ID');
    if (chainId !== BigInt(MONAD_CHAIN_ID)) {
      throw new MonadDexRpcError('Monad RPC returned an unexpected chain ID.');
    }
    return Number(chainId);
  }

  async getBlockNumber(signal?: AbortSignal): Promise<bigint> {
    await this.getChainId(signal);
    return asHexQuantity(await this.request('eth_blockNumber', [], signal), 'block number');
  }

  async getBlock(blockNumber: bigint, signal?: AbortSignal): Promise<MonadDexBlock> {
    const raw = await this.request(
      'eth_getBlockByNumber',
      [`0x${blockNumber.toString(16)}`, false],
      signal
    );
    if (!isRecord(raw)) throw new MonadDexRpcError('Monad RPC returned an invalid block.');
    const number = asHexQuantity(raw.number, 'block number');
    const timestamp = asHexQuantity(raw.timestamp, 'block timestamp');
    const hash = asHex(raw.hash, 'block hash');
    if (
      number !== blockNumber ||
      timestamp > BigInt(Number.MAX_SAFE_INTEGER) ||
      !/^0x[0-9a-fA-F]{64}$/.test(hash)
    ) {
      throw new MonadDexRpcError('Monad RPC returned an inconsistent block.');
    }
    return { number, hash, timestamp: Number(timestamp) };
  }

  async call(to: Hex, data: Hex, blockNumber: bigint, signal?: AbortSignal): Promise<Hex> {
    return asHex(
      await this.request('eth_call', [{ to, data }, `0x${blockNumber.toString(16)}`], signal),
      'contract call result'
    );
  }

  async getLogs(
    input: { address: Hex; topic0: Hex; fromBlock: bigint; toBlock: bigint },
    signal?: AbortSignal
  ): Promise<MonadDexRawLog[]> {
    const raw = await this.request(
      'eth_getLogs',
      [
        {
          address: input.address,
          topics: [input.topic0],
          fromBlock: `0x${input.fromBlock.toString(16)}`,
          toBlock: `0x${input.toBlock.toString(16)}`,
        },
      ],
      signal
    );
    if (!Array.isArray(raw)) throw new MonadDexRpcError('Monad RPC returned invalid logs.');

    return raw.map((item) => {
      if (!isRecord(item) || !Array.isArray(item.topics)) {
        throw new MonadDexRpcError('Monad RPC returned an invalid log.');
      }
      return {
        address: asHex(item.address, 'log address'),
        blockHash: asHex(item.blockHash, 'log block hash'),
        blockNumber: asHexQuantity(item.blockNumber, 'log block number'),
        data: asHex(item.data, 'log data'),
        logIndex: asHexQuantity(item.logIndex, 'log index'),
        topics: item.topics.map((topic) => asHex(topic, 'log topic')),
        transactionHash: asHex(item.transactionHash, 'log transaction hash'),
      };
    });
  }
}

function encodeGetPool(): Hex {
  return encodeFunctionData({
    abi: FACTORY_ABI,
    functionName: 'getPool',
    args: [MONAD_WMON, MONAD_USDC, MONAD_UNISWAP_V3_WMON_USDC.feeTier],
  });
}

function encodePoolCall(functionName: 'token0' | 'token1' | 'fee' | 'liquidity' | 'slot0'): Hex {
  return encodeFunctionData({ abi: POOL_ABI, functionName });
}

function encodeObserve(): Hex {
  return encodeFunctionData({
    abi: POOL_ABI,
    functionName: 'observe',
    args: [[MONAD_UNISWAP_V3_WMON_USDC.twapWindowSeconds, 0]],
  });
}

function encodeBalanceOf(owner: Hex): Hex {
  return encodeFunctionData({ abi: ERC20_ABI, functionName: 'balanceOf', args: [owner] });
}

function encodeQuote(amountIn: bigint): Hex {
  return encodeFunctionData({
    abi: QUOTER_ABI,
    functionName: 'quoteExactInputSingle',
    args: [
      {
        tokenIn: MONAD_WMON,
        tokenOut: MONAD_USDC,
        amountIn,
        fee: MONAD_UNISWAP_V3_WMON_USDC.feeTier,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
}

function decodeAddressResult(
  data: Hex,
  abi: typeof FACTORY_ABI | typeof POOL_ABI,
  functionName: string
): Hex {
  const result = decodeFunctionResult({ abi, functionName: functionName as never, data });
  const address = String(result);
  if (!isAddress(address))
    throw new MonadDexRpcError('Monad contract returned an invalid address.');
  return getAddress(address) as Hex;
}

function decodeUintResult(
  data: Hex,
  abi: typeof POOL_ABI | typeof ERC20_ABI,
  functionName: string
): bigint {
  const result = decodeFunctionResult({ abi, functionName: functionName as never, data });
  if (typeof result === 'number') {
    if (!Number.isSafeInteger(result) || result < 0) {
      throw new MonadDexRpcError('Monad contract returned an invalid unsigned value.');
    }
    return BigInt(result);
  }
  if (typeof result !== 'bigint' || result < 0n) {
    throw new MonadDexRpcError('Monad contract returned an invalid unsigned value.');
  }
  return result;
}

function floorDivide(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error('denominator must be positive');
  const quotient = numerator / denominator;
  return numerator < 0n && numerator % denominator !== 0n ? quotient - 1n : quotient;
}

/**
 * Uniswap arithmetic-mean tick uses floor division for negative values. Plain
 * bigint division truncates toward zero and would make a negative TWAP one
 * tick too high whenever the cumulative delta has a remainder.
 */
export function uniswapArithmeticMeanTick(
  olderCumulative: bigint,
  currentCumulative: bigint,
  windowSeconds: number
): number {
  if (!Number.isSafeInteger(windowSeconds) || windowSeconds <= 0) {
    throw new MonadDexRpcError('Monad pool returned an invalid TWAP window.');
  }
  const tick = Number(floorDivide(currentCumulative - olderCumulative, BigInt(windowSeconds)));
  if (!Number.isSafeInteger(tick) || tick < -887_272 || tick > 887_272) {
    throw new MonadDexRpcError('Monad pool returned an invalid TWAP tick.');
  }
  return tick;
}

/** Exported for deterministic tests and to document the Uniswap tick orientation. */
export function wmonUsdcPriceFromTick(tick: number): number {
  if (!Number.isInteger(tick) || tick < -887_272 || tick > 887_272) {
    throw new MonadDexRpcError('Monad pool returned an invalid tick.');
  }
  // token0=WMON (18 decimals), token1=USDC (6 decimals).
  const price = Math.pow(1.0001, tick) * 10 ** 12;
  if (!Number.isFinite(price) || price <= 0) {
    throw new MonadDexRpcError('Monad pool returned an invalid price.');
  }
  return price;
}

function unitsToNumber(raw: bigint, decimals: number): number {
  const value = Number(raw) / 10 ** decimals;
  if (!Number.isFinite(value) || value < 0) {
    throw new MonadDexRpcError('Monad contract returned an out-of-range balance.');
  }
  return value;
}

function boundedBps(numerator: number, denominator: number): number {
  const value = (numerator / denominator) * 10_000;
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000) {
    throw new MonadDexRpcError('Monad quote returned an invalid price impact.');
  }
  return value;
}

let cachedSnapshot: { value: MonadDexMarketSnapshot; expiresAt: number } | null = null;
let inFlightSnapshot: Promise<MonadDexMarketSnapshot> | null = null;

/** Test hook for the short live-data cache. */
export function resetMonadDexMarketCacheForTests(): void {
  cachedSnapshot = null;
  inFlightSnapshot = null;
}

async function fetchSnapshot(
  rpc: MonadDexRpcClient,
  nowMs: number,
  signal?: AbortSignal
): Promise<MonadDexMarketSnapshot> {
  const blockNumber = await rpc.getBlockNumber(signal);
  const block = await rpc.getBlock(blockNumber, signal);
  const blockTag = block.number;

  const quoteInputs = QUOTE_AMOUNTS_WMON.map(
    (amount) => BigInt(amount) * 10n ** BigInt(MONAD_UNISWAP_V3_WMON_USDC.token0Decimals)
  );
  const [
    factoryPoolData,
    token0Data,
    token1Data,
    feeData,
    liquidityData,
    slot0Data,
    observeData,
    wmonBalanceData,
    usdcBalanceData,
    ...quoteData
  ] = await Promise.all([
    rpc.call(MONAD_UNISWAP_V3_FACTORY, encodeGetPool(), blockTag, signal),
    rpc.call(MONAD_UNISWAP_V3_WMON_USDC.pool, encodePoolCall('token0'), blockTag, signal),
    rpc.call(MONAD_UNISWAP_V3_WMON_USDC.pool, encodePoolCall('token1'), blockTag, signal),
    rpc.call(MONAD_UNISWAP_V3_WMON_USDC.pool, encodePoolCall('fee'), blockTag, signal),
    rpc.call(MONAD_UNISWAP_V3_WMON_USDC.pool, encodePoolCall('liquidity'), blockTag, signal),
    rpc.call(MONAD_UNISWAP_V3_WMON_USDC.pool, encodePoolCall('slot0'), blockTag, signal),
    rpc.call(MONAD_UNISWAP_V3_WMON_USDC.pool, encodeObserve(), blockTag, signal),
    rpc.call(MONAD_WMON, encodeBalanceOf(MONAD_UNISWAP_V3_WMON_USDC.pool), blockTag, signal),
    rpc.call(MONAD_USDC, encodeBalanceOf(MONAD_UNISWAP_V3_WMON_USDC.pool), blockTag, signal),
    ...quoteInputs.map((amount) =>
      rpc.call(MONAD_UNISWAP_V3_QUOTER_V2, encodeQuote(amount), blockTag, signal)
    ),
  ]);

  const factoryPool = decodeAddressResult(factoryPoolData, FACTORY_ABI, 'getPool');
  const token0 = decodeAddressResult(token0Data, POOL_ABI, 'token0');
  const token1 = decodeAddressResult(token1Data, POOL_ABI, 'token1');
  const fee = decodeUintResult(feeData, POOL_ABI, 'fee');
  const activeLiquidity = decodeUintResult(liquidityData, POOL_ABI, 'liquidity');
  const wmonBalance = decodeUintResult(wmonBalanceData, ERC20_ABI, 'balanceOf');
  const usdcBalance = decodeUintResult(usdcBalanceData, ERC20_ABI, 'balanceOf');

  if (
    factoryPool.toLowerCase() !== MONAD_UNISWAP_V3_WMON_USDC.pool.toLowerCase() ||
    token0.toLowerCase() !== MONAD_WMON.toLowerCase() ||
    token1.toLowerCase() !== MONAD_USDC.toLowerCase() ||
    fee !== BigInt(MONAD_UNISWAP_V3_WMON_USDC.feeTier) ||
    activeLiquidity <= 0n
  ) {
    throw new MonadDexRpcError('Monad pool provenance or liquidity validation failed.');
  }

  const slot0 = decodeFunctionResult({ abi: POOL_ABI, functionName: 'slot0', data: slot0Data });
  const spotTick = Number(slot0[1]);
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
    throw new MonadDexRpcError('Monad pool returned an invalid TWAP observation.');
  }
  const twapTick = uniswapArithmeticMeanTick(
    olderCumulative,
    currentCumulative,
    MONAD_UNISWAP_V3_WMON_USDC.twapWindowSeconds
  );
  const spotPrice = wmonUsdcPriceFromTick(spotTick);
  const twapPrice = wmonUsdcPriceFromTick(twapTick);

  const decodedQuotes = quoteData.map((data, index) => {
    const quote = decodeFunctionResult({
      abi: QUOTER_ABI,
      functionName: 'quoteExactInputSingle',
      data,
    });
    const amountOut = quote[0];
    const ticksCrossed = quote[2];
    if (typeof amountOut !== 'bigint' || amountOut <= 0n || typeof ticksCrossed !== 'number') {
      throw new MonadDexRpcError('Monad Quoter returned an invalid quote.');
    }
    const amountInWmon = QUOTE_AMOUNTS_WMON[index];
    const amountOutUsdc = unitsToNumber(amountOut, MONAD_UNISWAP_V3_WMON_USDC.token1Decimals);
    return {
      amountInWmon,
      amountInRaw: quoteInputs[index].toString(),
      amountOutUsdc,
      amountOutRaw: amountOut.toString(),
      effectiveUsdcPerWmon: amountOutUsdc / amountInWmon,
      initializedTicksCrossed: ticksCrossed,
    };
  });
  const oneWmonPrice = decodedQuotes[0]?.effectiveUsdcPerWmon;
  if (!oneWmonPrice || !Number.isFinite(oneWmonPrice) || oneWmonPrice <= 0) {
    throw new MonadDexRpcError('Monad Quoter returned an invalid reference quote.');
  }

  // Capture freshness after all block-pinned reads complete. Monad's timestamp
  // may lead the local clock by a fraction of a second, so small negative skew
  // is represented as zero rather than a nonsensical negative data age.
  const observedAtMs = Math.max(nowMs, Date.now());
  const rawSourceFreshnessSeconds = (observedAtMs - block.timestamp * 1000) / 1000;
  if (
    !Number.isFinite(rawSourceFreshnessSeconds) ||
    rawSourceFreshnessSeconds < -60 ||
    rawSourceFreshnessSeconds > MAX_SOURCE_AGE_SECONDS
  ) {
    throw new MonadDexRpcError('Monad market block is outside the freshness limit.');
  }
  const sourceFreshnessSeconds = Math.max(0, rawSourceFreshnessSeconds);

  return {
    source: 'dex-market',
    venue: 'uniswap-v3',
    chainId: MONAD_CHAIN_ID,
    market: 'MON/USDC',
    sourceFreshnessSeconds,
    observedAt: new Date(observedAtMs).toISOString(),
    block: {
      number: block.number.toString(),
      hash: block.hash,
      timestamp: new Date(block.timestamp * 1000).toISOString(),
    },
    contracts: {
      factory: MONAD_UNISWAP_V3_FACTORY,
      quoterV2: MONAD_UNISWAP_V3_QUOTER_V2,
      pool: MONAD_UNISWAP_V3_WMON_USDC.pool,
      token0,
      token1,
      feeTier: Number(fee),
    },
    spot: { tick: spotTick, usdcPerWmon: spotPrice },
    twap: {
      windowSeconds: MONAD_UNISWAP_V3_WMON_USDC.twapWindowSeconds,
      tick: twapTick,
      usdcPerWmon: twapPrice,
      deviationBpsFromSpot: boundedBps(Math.abs(twapPrice - spotPrice), spotPrice),
    },
    activeLiquidityRaw: activeLiquidity.toString(),
    poolBalances: {
      wmonRaw: wmonBalance.toString(),
      wmon: unitsToNumber(wmonBalance, MONAD_UNISWAP_V3_WMON_USDC.token0Decimals),
      usdcRaw: usdcBalance.toString(),
      usdc: unitsToNumber(usdcBalance, MONAD_UNISWAP_V3_WMON_USDC.token1Decimals),
    },
    quotes: decodedQuotes.map((quote) => ({
      ...quote,
      priceImpactBps: boundedBps(
        Math.max(0, oneWmonPrice - quote.effectiveUsdcPerWmon),
        oneWmonPrice
      ),
    })),
  };
}

/**
 * Fresh, block-pinned market evidence for the reviewed Monad Uniswap V3
 * WMON/USDC pool. It is intentionally separate from oracle price consensus.
 */
export async function getMonadUniswapV3MarketSnapshot(
  options: {
    rpc?: MonadDexRpcClient;
    nowMs?: number;
    signal?: AbortSignal;
  } = {}
): Promise<MonadDexMarketSnapshot> {
  const nowMs = options.nowMs ?? Date.now();
  if (!options.rpc && cachedSnapshot && cachedSnapshot.expiresAt > nowMs) {
    return cachedSnapshot.value;
  }
  if (!options.rpc && inFlightSnapshot) return inFlightSnapshot;

  const request = fetchSnapshot(options.rpc ?? new MonadDexRpcClient(), nowMs, options.signal);
  if (!options.rpc) inFlightSnapshot = request;
  try {
    const value = await request;
    if (!options.rpc) cachedSnapshot = { value, expiresAt: nowMs + CACHE_TTL_MS };
    return value;
  } finally {
    if (!options.rpc) inFlightSnapshot = null;
  }
}
