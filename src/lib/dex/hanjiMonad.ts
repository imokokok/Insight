import { getAddress, isAddress, keccak256 } from 'viem';

import { CHAINLINK_RPC_CONFIG } from '@/lib/oracles/services/chainlinkDataSources/rpcConfig';

import { UniswapV3MarketRpcClient, type UniswapV3Hex } from './uniswapV3Market';

/**
 * Hanji is a Monad CLOB.  This reader deliberately publishes only bounded
 * market context from its documented public order-book API; it does not build
 * an order, approve a token, or treat a displayed L2 level as a fill promise.
 */
export const HANJI_MONAD_CHAIN_ID = 143;
export const HANJI_MONAD_HTTP_API = 'https://api-monad.hanji.io' as const;
export const HANJI_MONAD_MARKET = 'MON/USDC' as const;
export const HANJI_MONAD_ORDERBOOK = '0xc35b1ca1a2c398a21df5783b3a5ea6a2d56f298f' as const;
export const HANJI_MONAD_FAST_QUOTER = '0x1aed222dda944a87703c918745b11be13f8eef10' as const;

/** EIP-1967 slot; checking this prevents a proxy-shell-only identity check. */
const EIP1967_IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc' as const;

/** Pinned after a Monad mainnet read on 2026-10-26. */
export const HANJI_MONAD_CODE_IDENTITY = {
  orderbookProxy: '0x2a379136bc5a2c3898cea5822c02fec4de3df947acae03ccefba199552bb8270',
  orderbookImplementation: '0x0f9369b46b7c417667b7ec4657c7f23488e0322e20f56b488d5572b4dc4332ff',
  fastQuoterProxy: '0x42f10189bc9088d8ba41b4e23756795d2e6e076255adbdf5fae19e00fad5ea34',
  fastQuoterImplementation: '0xb97d395773eb12eae85092605b4cd8827e73cba2983c70299e42ceb4093532d1',
} as const;

const HANJI_MONAD_IMPLEMENTATIONS = {
  orderbook: '0xcfde4d548208f995413b087e5874dc048383e50f',
  fastQuoter: '0xe8e1b06864577752616aabf17e3a7d7026ad93c9',
} as const;

const MAX_LEVELS_PER_SIDE = 20;
const MILLIS_PER_SECOND = 1_000;
const MAX_BOOK_AGE_SECONDS = 30;
const MAX_CHAIN_BLOCK_AGE_SECONDS = 120;

type JsonRecord = Record<string, unknown>;
type Fetcher = typeof fetch;

export interface HanjiMonadBookLevel {
  priceUsdcPerMon: number;
  sizeMon: number;
  lastTouched: string;
}

export interface HanjiMonadBookImpactEstimate {
  side: 'buy' | 'sell';
  targetNotionalUsdc: number;
  filledNotionalUsdc: number;
  filledMon: number;
  averageUsdcPerMon: number | null;
  priceImpactBps: number | null;
  complete: boolean;
}

export interface HanjiMonadMarketSnapshot {
  source: 'dex-market';
  venue: 'hanji';
  chainId: typeof HANJI_MONAD_CHAIN_ID;
  market: typeof HANJI_MONAD_MARKET;
  sourceFreshnessSeconds: number;
  observedAt: string;
  block: { number: string; hash: UniswapV3Hex; timestamp: string };
  contracts: {
    orderbook: typeof HANJI_MONAD_ORDERBOOK;
    fastQuoter: typeof HANJI_MONAD_FAST_QUOTER;
    orderbookImplementation: typeof HANJI_MONAD_IMPLEMENTATIONS.orderbook;
    fastQuoterImplementation: typeof HANJI_MONAD_IMPLEMENTATIONS.fastQuoter;
    codeIdentity: typeof HANJI_MONAD_CODE_IDENTITY;
  };
  book: {
    timestamp: string;
    aggregation: number;
    displayedLevelsPerSide: number;
    bestBidUsdcPerMon: number;
    bestAskUsdcPerMon: number;
    spreadBps: number;
    bidDepthUsdc: number;
    askDepthUsdc: number;
  };
  estimates: HanjiMonadBookImpactEstimate[];
}

export class HanjiMonadMarketError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HanjiMonadMarketError';
  }
}

function monadRpcEndpoints(): string[] {
  return [
    ...new Set(
      (CHAINLINK_RPC_CONFIG[HANJI_MONAD_CHAIN_ID]?.endpoints ?? []).filter((endpoint) => {
        try {
          return new URL(endpoint).protocol === 'https:';
        } catch {
          return false;
        }
      })
    ),
  ];
}

export class HanjiMonadRpcClient extends UniswapV3MarketRpcClient {
  constructor(endpoints: string[] = monadRpcEndpoints()) {
    super(HANJI_MONAD_CHAIN_ID, endpoints);
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, field: string, minimum: number): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim().length > 0
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= minimum) {
    throw new HanjiMonadMarketError(`Hanji returned an invalid ${field}.`);
  }
  return parsed;
}

function timestampMilliseconds(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new HanjiMonadMarketError(`Hanji returned an invalid ${field}.`);
  }
  return Number(value);
}

function assertStrictOrder(levels: readonly HanjiMonadBookLevel[], side: 'bids' | 'asks'): void {
  for (let index = 1; index < levels.length; index += 1) {
    const prior = levels[index - 1]!;
    const current = levels[index]!;
    const ordered =
      side === 'bids'
        ? prior.priceUsdcPerMon > current.priceUsdcPerMon
        : prior.priceUsdcPerMon < current.priceUsdcPerMon;
    if (!ordered) throw new HanjiMonadMarketError(`Hanji ${side} are not strictly ordered.`);
  }
}

/** Hanji's documented API returns contract-scaled price and size values. */
function parseLevels(
  value: unknown,
  side: 'bids' | 'asks',
  priceScalingFactor: number,
  sizeScalingFactor: number
): HanjiMonadBookLevel[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_LEVELS_PER_SIDE) {
    throw new HanjiMonadMarketError(`Hanji returned an unusable ${side} book.`);
  }
  const levels = value.map((entry, index) => {
    if (!isRecord(entry))
      throw new HanjiMonadMarketError(`Hanji returned an invalid ${side} level.`);
    const rawPrice = finiteNumber(entry.price, `${side}[${index}].price`, 0);
    const rawSize = finiteNumber(entry.size, `${side}[${index}].size`, 0);
    const lastTouchedMs = timestampMilliseconds(entry.lastTouched, `${side}[${index}].lastTouched`);
    const priceUsdcPerMon = rawPrice / 10 ** priceScalingFactor;
    const sizeMon = rawSize / 10 ** sizeScalingFactor;
    if (
      !Number.isFinite(priceUsdcPerMon) ||
      !Number.isFinite(sizeMon) ||
      priceUsdcPerMon <= 0 ||
      sizeMon <= 0
    ) {
      throw new HanjiMonadMarketError(`Hanji returned an unscalable ${side} level.`);
    }
    return { priceUsdcPerMon, sizeMon, lastTouched: new Date(lastTouchedMs).toISOString() };
  });
  assertStrictOrder(levels, side);
  return levels;
}

function estimateImpact(
  side: 'buy' | 'sell',
  levels: readonly HanjiMonadBookLevel[],
  targetNotionalUsdc: number
): HanjiMonadBookImpactEstimate {
  const best = levels[0]!.priceUsdcPerMon;
  let remaining = targetNotionalUsdc;
  let filledNotionalUsdc = 0;
  let filledMon = 0;
  for (const level of levels) {
    const levelNotional = level.priceUsdcPerMon * level.sizeMon;
    const takeNotional = Math.min(remaining, levelNotional);
    filledNotionalUsdc += takeNotional;
    filledMon += takeNotional / level.priceUsdcPerMon;
    remaining -= takeNotional;
    if (remaining <= 0) break;
  }
  const averageUsdcPerMon = filledMon > 0 ? filledNotionalUsdc / filledMon : null;
  return {
    side,
    targetNotionalUsdc,
    filledNotionalUsdc,
    filledMon,
    averageUsdcPerMon,
    priceImpactBps:
      averageUsdcPerMon === null
        ? null
        : side === 'buy'
          ? ((averageUsdcPerMon - best) / best) * 10_000
          : ((best - averageUsdcPerMon) / best) * 10_000,
    complete: remaining <= 0,
  };
}

async function fetchBook(fetcher: Fetcher, signal?: AbortSignal): Promise<unknown> {
  const timeout = new AbortController();
  const timeoutId = setTimeout(() => timeout.abort(), 8_000);
  try {
    const response = await fetcher(
      `${HANJI_MONAD_HTTP_API}/orderbook?market=${HANJI_MONAD_ORDERBOOK}&limit=${MAX_LEVELS_PER_SIDE}`,
      {
        method: 'GET',
        cache: 'no-store',
        signal: signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal,
      }
    );
    if (!response.ok)
      throw new HanjiMonadMarketError('Hanji Monad market evidence is unavailable.');
    return await response.json();
  } catch (error) {
    if (error instanceof HanjiMonadMarketError) throw error;
    throw new HanjiMonadMarketError('Hanji Monad market evidence is unavailable.');
  } finally {
    clearTimeout(timeoutId);
  }
}

function decodeImplementation(storage: UniswapV3Hex, field: string): UniswapV3Hex {
  if (!/^0x[0-9a-fA-F]{64}$/.test(storage)) {
    throw new HanjiMonadMarketError(`Hanji returned invalid ${field} proxy storage.`);
  }
  const address = `0x${storage.slice(-40)}`;
  if (
    !isAddress(address) ||
    address.toLowerCase() === '0x0000000000000000000000000000000000000000'
  ) {
    throw new HanjiMonadMarketError(`Hanji returned invalid ${field} implementation.`);
  }
  return getAddress(address) as UniswapV3Hex;
}

function assertCode(code: UniswapV3Hex, expected: string, label: string): void {
  if (code === '0x' || keccak256(code).toLowerCase() !== expected.toLowerCase()) {
    throw new HanjiMonadMarketError(
      `${label} runtime code does not match the reviewed deployment.`
    );
  }
}

/**
 * Fresh Hanji MON/USDC CLOB context with source freshness and on-chain
 * proxy/implementation identity checks.  The off-chain book cannot prove a
 * later on-chain fill, so this surface intentionally stops before execution.
 */
export async function getHanjiMonadMarketSnapshot(
  options: {
    rpc?: HanjiMonadRpcClient;
    fetcher?: Fetcher;
    nowMs?: number;
    signal?: AbortSignal;
  } = {}
): Promise<HanjiMonadMarketSnapshot> {
  const rpc = options.rpc ?? new HanjiMonadRpcClient();
  const fetcher = options.fetcher ?? fetch;
  const nowMs = options.nowMs ?? Date.now();
  const blockNumber = await rpc.getBlockNumber(options.signal);
  const [block, rawBook, orderbookProxyCode, quoterProxyCode, orderbookStorage, quoterStorage] =
    await Promise.all([
      rpc.getBlock(blockNumber, options.signal),
      fetchBook(fetcher, options.signal),
      rpc.getCode(HANJI_MONAD_ORDERBOOK, blockNumber, options.signal),
      rpc.getCode(HANJI_MONAD_FAST_QUOTER, blockNumber, options.signal),
      rpc.getStorageAt(
        HANJI_MONAD_ORDERBOOK,
        EIP1967_IMPLEMENTATION_SLOT,
        blockNumber,
        options.signal
      ),
      rpc.getStorageAt(
        HANJI_MONAD_FAST_QUOTER,
        EIP1967_IMPLEMENTATION_SLOT,
        blockNumber,
        options.signal
      ),
    ]);
  const chainFreshnessSeconds = Math.max(0, nowMs / MILLIS_PER_SECOND - block.timestamp);
  if (
    chainFreshnessSeconds > MAX_CHAIN_BLOCK_AGE_SECONDS ||
    block.timestamp * MILLIS_PER_SECOND > nowMs + MILLIS_PER_SECOND
  ) {
    throw new HanjiMonadMarketError('Hanji Monad chain evidence is stale or future-dated.');
  }
  assertCode(orderbookProxyCode, HANJI_MONAD_CODE_IDENTITY.orderbookProxy, 'Hanji orderbook proxy');
  assertCode(quoterProxyCode, HANJI_MONAD_CODE_IDENTITY.fastQuoterProxy, 'Hanji fast quoter proxy');
  const orderbookImplementation = decodeImplementation(orderbookStorage, 'orderbook');
  const fastQuoterImplementation = decodeImplementation(quoterStorage, 'fast quoter');
  if (
    orderbookImplementation.toLowerCase() !== HANJI_MONAD_IMPLEMENTATIONS.orderbook ||
    fastQuoterImplementation.toLowerCase() !== HANJI_MONAD_IMPLEMENTATIONS.fastQuoter
  ) {
    throw new HanjiMonadMarketError(
      'Hanji proxy implementation is outside the reviewed allowlist.'
    );
  }
  const [orderbookImplementationCode, quoterImplementationCode] = await Promise.all([
    rpc.getCode(orderbookImplementation, blockNumber, options.signal),
    rpc.getCode(fastQuoterImplementation, blockNumber, options.signal),
  ]);
  assertCode(
    orderbookImplementationCode,
    HANJI_MONAD_CODE_IDENTITY.orderbookImplementation,
    'Hanji orderbook implementation'
  );
  assertCode(
    quoterImplementationCode,
    HANJI_MONAD_CODE_IDENTITY.fastQuoterImplementation,
    'Hanji fast quoter implementation'
  );

  if (!isRecord(rawBook) || !isRecord(rawBook.levels)) {
    throw new HanjiMonadMarketError('Hanji returned an invalid order-book response.');
  }
  const bookTimestampMs = timestampMilliseconds(rawBook.timestamp, 'orderbook timestamp');
  const aggregation = finiteNumber(rawBook.aggregation, 'orderbook aggregation', -1);
  if (!Number.isSafeInteger(aggregation)) {
    throw new HanjiMonadMarketError('Hanji returned an invalid orderbook aggregation.');
  }
  const bookFreshnessSeconds = Math.max(0, (nowMs - bookTimestampMs) / MILLIS_PER_SECOND);
  if (bookFreshnessSeconds > MAX_BOOK_AGE_SECONDS || bookTimestampMs > nowMs + MILLIS_PER_SECOND) {
    throw new HanjiMonadMarketError('Hanji Monad order-book snapshot is stale or future-dated.');
  }
  const bids = parseLevels(rawBook.levels.bids, 'bids', 6, 0);
  const asks = parseLevels(rawBook.levels.asks, 'asks', 6, 0);
  const latestBestLevelMs = Math.min(
    Date.parse(bids[0]!.lastTouched),
    Date.parse(asks[0]!.lastTouched)
  );
  if (
    !Number.isFinite(latestBestLevelMs) ||
    latestBestLevelMs > nowMs + MILLIS_PER_SECOND ||
    nowMs - latestBestLevelMs > MAX_BOOK_AGE_SECONDS * MILLIS_PER_SECOND
  ) {
    throw new HanjiMonadMarketError('Hanji Monad best bid or ask is stale.');
  }
  const bestBidUsdcPerMon = bids[0]!.priceUsdcPerMon;
  const bestAskUsdcPerMon = asks[0]!.priceUsdcPerMon;
  if (bestBidUsdcPerMon >= bestAskUsdcPerMon) {
    throw new HanjiMonadMarketError('Hanji Monad book is crossed or locked.');
  }
  const notionalLadder = [10, 100, 1_000];
  return {
    source: 'dex-market',
    venue: 'hanji',
    chainId: HANJI_MONAD_CHAIN_ID,
    market: HANJI_MONAD_MARKET,
    sourceFreshnessSeconds: Math.max(bookFreshnessSeconds, chainFreshnessSeconds),
    observedAt: new Date(nowMs).toISOString(),
    block: {
      number: block.number.toString(),
      hash: block.hash,
      timestamp: new Date(block.timestamp * MILLIS_PER_SECOND).toISOString(),
    },
    contracts: {
      orderbook: HANJI_MONAD_ORDERBOOK,
      fastQuoter: HANJI_MONAD_FAST_QUOTER,
      orderbookImplementation: HANJI_MONAD_IMPLEMENTATIONS.orderbook,
      fastQuoterImplementation: HANJI_MONAD_IMPLEMENTATIONS.fastQuoter,
      codeIdentity: HANJI_MONAD_CODE_IDENTITY,
    },
    book: {
      timestamp: new Date(bookTimestampMs).toISOString(),
      aggregation,
      displayedLevelsPerSide: Math.min(bids.length, asks.length),
      bestBidUsdcPerMon,
      bestAskUsdcPerMon,
      spreadBps: ((bestAskUsdcPerMon - bestBidUsdcPerMon) / bestBidUsdcPerMon) * 10_000,
      bidDepthUsdc: bids.reduce((sum, level) => sum + level.priceUsdcPerMon * level.sizeMon, 0),
      askDepthUsdc: asks.reduce((sum, level) => sum + level.priceUsdcPerMon * level.sizeMon, 0),
    },
    estimates: notionalLadder.flatMap((targetNotionalUsdc) => [
      estimateImpact('buy', asks, targetNotionalUsdc),
      estimateImpact('sell', bids, targetNotionalUsdc),
    ]),
  };
}
