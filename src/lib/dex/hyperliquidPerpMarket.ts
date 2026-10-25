/**
 * Read-only Hyperliquid perpetual-market evidence.
 *
 * Hyperliquid is a central-limit order book, not an AMM.  Accordingly this
 * module exposes the exchange's market context and derives bounded book-impact
 * estimates from its published L2 snapshot; it never calls the exchange API's
 * order endpoint, signs a payload, or presents an estimate as an executable
 * quote.
 */

export const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info' as const;
export const HYPERLIQUID_MAINNET_NETWORK = 'hyperliquid:mainnet' as const;

export const HYPERLIQUID_REVIEWED_PERP_MARKETS = ['BTC', 'ETH', 'HYPE'] as const;
export type HyperliquidReviewedPerpMarket = (typeof HYPERLIQUID_REVIEWED_PERP_MARKETS)[number];

type JsonRecord = Record<string, unknown>;
type Fetcher = typeof fetch;

export interface HyperliquidPerpMarketProfile {
  id: string;
  network: typeof HYPERLIQUID_MAINNET_NETWORK;
  venue: 'hyperliquid-perp';
  coin: HyperliquidReviewedPerpMarket;
  market: string;
  quoteNotionalsUsd: readonly number[];
  maxSourceAgeSeconds: number;
  cacheTtlMs: number;
}

export interface HyperliquidBookImpactEstimate {
  side: 'buy' | 'sell';
  targetNotionalUsd: number;
  filledNotionalUsd: number;
  filledBase: number;
  averagePrice: number | null;
  /** Difference from the best displayed price, excluding fees and queue position. */
  priceImpactBps: number | null;
  complete: boolean;
}

export interface HyperliquidPerpMarketSnapshot {
  source: 'dex-market';
  venue: 'hyperliquid-perp';
  network: typeof HYPERLIQUID_MAINNET_NETWORK;
  market: string;
  coin: HyperliquidReviewedPerpMarket;
  sourceFreshnessSeconds: number;
  observedAt: string;
  book: {
    timestamp: string;
    displayedLevelsPerSide: number;
    bestBid: number;
    bestAsk: number;
    spreadBps: number;
    bidDepthNotionalUsd: number;
    askDepthNotionalUsd: number;
  };
  perpetual: {
    markPrice: number;
    midPrice: number;
    oraclePrice: number;
    markDeviationBpsFromOracle: number;
    fundingRate: number;
    openInterest: number;
    dayNotionalVolume: number;
    sizeDecimals: number;
    maxLeverage: number;
  };
  estimates: HyperliquidBookImpactEstimate[];
}

export class HyperliquidPerpMarketError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HyperliquidPerpMarketError';
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, field: string, minimum: number, allowZero = false): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim().length > 0
        ? Number(value)
        : NaN;
  if (!Number.isFinite(parsed) || (allowZero ? parsed < minimum : parsed <= minimum)) {
    throw new HyperliquidPerpMarketError(`Hyperliquid returned an invalid ${field}.`);
  }
  return parsed;
}

function safeTimestamp(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new HyperliquidPerpMarketError(`Hyperliquid returned an invalid ${field}.`);
  }
  return value;
}

function safeInteger(value: unknown, field: string, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new HyperliquidPerpMarketError(`Hyperliquid returned an invalid ${field}.`);
  }
  return Number(value);
}

function bps(numerator: number, denominator: number, field: string): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    throw new HyperliquidPerpMarketError(`Hyperliquid cannot derive ${field}.`);
  }
  return ((numerator - denominator) / denominator) * 10_000;
}

function reviewedMarket(value: unknown): HyperliquidReviewedPerpMarket {
  if (
    typeof value !== 'string' ||
    !HYPERLIQUID_REVIEWED_PERP_MARKETS.includes(value as HyperliquidReviewedPerpMarket)
  ) {
    throw new HyperliquidPerpMarketError(
      'Hyperliquid market is not in Insight’s reviewed perpetual-market allowlist.'
    );
  }
  return value as HyperliquidReviewedPerpMarket;
}

/** First reviewed Hyperliquid perps set. Additional instruments need an explicit profile review. */
export function hyperliquidPerpMarketProfile(
  market: HyperliquidReviewedPerpMarket = 'BTC'
): HyperliquidPerpMarketProfile {
  const coin = reviewedMarket(market);
  const quoteNotionalsUsd =
    coin === 'BTC'
      ? [10_000, 100_000, 1_000_000]
      : coin === 'ETH'
        ? [5_000, 50_000, 500_000]
        : [1_000, 10_000, 100_000];
  return {
    id: `hyperliquid-perp-${coin.toLowerCase()}`,
    network: HYPERLIQUID_MAINNET_NETWORK,
    venue: 'hyperliquid-perp',
    coin,
    market: `${coin}-PERP`,
    quoteNotionalsUsd,
    maxSourceAgeSeconds: 30,
    cacheTtlMs: 5_000,
  };
}

/** Reject malformed profiles before a public market endpoint is read. */
export function assertHyperliquidPerpMarketProfile(profile: HyperliquidPerpMarketProfile): void {
  if (
    !profile.id ||
    profile.network !== HYPERLIQUID_MAINNET_NETWORK ||
    profile.venue !== 'hyperliquid-perp' ||
    profile.market !== `${profile.coin}-PERP` ||
    !HYPERLIQUID_REVIEWED_PERP_MARKETS.includes(profile.coin) ||
    !Number.isSafeInteger(profile.maxSourceAgeSeconds) ||
    profile.maxSourceAgeSeconds < 1 ||
    !Number.isSafeInteger(profile.cacheTtlMs) ||
    profile.cacheTtlMs < 1 ||
    profile.quoteNotionalsUsd.length === 0
  ) {
    throw new HyperliquidPerpMarketError(
      'Hyperliquid perpetual market profile has invalid metadata.'
    );
  }
  let previous = 0;
  for (const notional of profile.quoteNotionalsUsd) {
    if (!Number.isFinite(notional) || notional <= previous || notional <= 0) {
      throw new HyperliquidPerpMarketError(
        'Hyperliquid perpetual market profile has an unordered quote ladder.'
      );
    }
    previous = notional;
  }
}

async function infoRequest(
  body: JsonRecord,
  fetcher: Fetcher,
  signal?: AbortSignal
): Promise<unknown> {
  const timeout = new AbortController();
  const timeoutId = setTimeout(() => timeout.abort(), 8_000);
  try {
    const response = await fetcher(HYPERLIQUID_INFO_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal,
    });
    if (!response.ok)
      throw new HyperliquidPerpMarketError('Hyperliquid market evidence is unavailable.');
    return await response.json();
  } catch (error) {
    if (error instanceof HyperliquidPerpMarketError) throw error;
    throw new HyperliquidPerpMarketError('Hyperliquid market evidence is unavailable.');
  } finally {
    clearTimeout(timeoutId);
  }
}

type ParsedBookLevel = { price: number; size: number };

function parsedBookLevels(value: unknown, side: 'bids' | 'asks'): ParsedBookLevel[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) {
    throw new HyperliquidPerpMarketError(`Hyperliquid returned an invalid ${side} book.`);
  }
  return value.map((entry, index) => {
    if (!isRecord(entry))
      throw new HyperliquidPerpMarketError(`Hyperliquid returned an invalid ${side} book.`);
    const price = finiteNumber(entry.px, `${side}[${index}].px`, 0);
    const size = finiteNumber(entry.sz, `${side}[${index}].sz`, 0);
    if (!Number.isSafeInteger(entry.n) || Number(entry.n) < 1) {
      throw new HyperliquidPerpMarketError(`Hyperliquid returned an invalid ${side}[${index}].n.`);
    }
    return { price, size };
  });
}

function assertBookOrder(levels: readonly ParsedBookLevel[], side: 'bids' | 'asks'): void {
  for (let index = 1; index < levels.length; index += 1) {
    const previous = levels[index - 1]!;
    const current = levels[index]!;
    const ordered =
      side === 'bids' ? previous.price > current.price : previous.price < current.price;
    if (!ordered)
      throw new HyperliquidPerpMarketError(`Hyperliquid ${side} book is not strictly ordered.`);
  }
}

function parseMarketContext(value: unknown, profile: HyperliquidPerpMarketProfile) {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !isRecord(value[0]) ||
    !Array.isArray(value[1])
  ) {
    throw new HyperliquidPerpMarketError(
      'Hyperliquid returned an invalid perpetual market context.'
    );
  }
  const universe = value[0].universe;
  const contexts = value[1];
  if (!Array.isArray(universe) || universe.length !== contexts.length) {
    throw new HyperliquidPerpMarketError('Hyperliquid perpetual market metadata is inconsistent.');
  }
  const index = universe.findIndex((entry) => isRecord(entry) && entry.name === profile.coin);
  if (index < 0 || !isRecord(universe[index]) || !isRecord(contexts[index])) {
    throw new HyperliquidPerpMarketError('Hyperliquid reviewed perpetual market is unavailable.');
  }
  const metadata = universe[index];
  const context = contexts[index];
  if (metadata.isDelisted === true) {
    throw new HyperliquidPerpMarketError('Hyperliquid reviewed perpetual market is delisted.');
  }
  return {
    markPrice: finiteNumber(context.markPx, 'markPx', 0),
    midPrice: finiteNumber(context.midPx, 'midPx', 0),
    oraclePrice: finiteNumber(context.oraclePx, 'oraclePx', 0),
    fundingRate: finiteNumber(context.funding, 'funding', -1, true),
    openInterest: finiteNumber(context.openInterest, 'openInterest', 0, true),
    dayNotionalVolume: finiteNumber(context.dayNtlVlm, 'dayNtlVlm', 0, true),
    sizeDecimals: safeInteger(metadata.szDecimals, 'szDecimals', 0, 18),
    maxLeverage: safeInteger(metadata.maxLeverage, 'maxLeverage', 1, 100),
  };
}

function parseBook(value: unknown, profile: HyperliquidPerpMarketProfile) {
  if (
    !isRecord(value) ||
    value.coin !== profile.coin ||
    !Array.isArray(value.levels) ||
    value.levels.length !== 2
  ) {
    throw new HyperliquidPerpMarketError('Hyperliquid returned an invalid L2 book snapshot.');
  }
  const bids = parsedBookLevels(value.levels[0], 'bids');
  const asks = parsedBookLevels(value.levels[1], 'asks');
  assertBookOrder(bids, 'bids');
  assertBookOrder(asks, 'asks');
  if (bids[0]!.price >= asks[0]!.price) {
    throw new HyperliquidPerpMarketError('Hyperliquid returned a crossed L2 book snapshot.');
  }
  return { timestamp: safeTimestamp(value.time, 'book time'), bids, asks };
}

function estimateBookImpact(
  levels: readonly ParsedBookLevel[],
  side: 'buy' | 'sell',
  targetNotionalUsd: number
): HyperliquidBookImpactEstimate {
  let remaining = targetNotionalUsd;
  let filledNotionalUsd = 0;
  let filledBase = 0;
  for (const level of levels) {
    if (remaining <= 0) break;
    const availableNotional = level.price * level.size;
    const takenNotional = Math.min(remaining, availableNotional);
    filledNotionalUsd += takenNotional;
    filledBase += takenNotional / level.price;
    remaining -= takenNotional;
  }
  const complete = remaining <= 1e-8;
  const averagePrice = filledBase > 0 ? filledNotionalUsd / filledBase : null;
  const bestPrice = levels[0]?.price;
  const priceImpactBps =
    averagePrice !== null && bestPrice !== undefined
      ? side === 'buy'
        ? bps(averagePrice, bestPrice, 'buy price impact')
        : bps(bestPrice, averagePrice, 'sell price impact')
      : null;
  return {
    side,
    targetNotionalUsd,
    filledNotionalUsd,
    filledBase,
    averagePrice,
    priceImpactBps,
    complete,
  };
}

const cachedSnapshots = new Map<
  string,
  { expiresAt: number; value: HyperliquidPerpMarketSnapshot }
>();
const inFlightSnapshots = new Map<string, Promise<HyperliquidPerpMarketSnapshot>>();

/** Test hook for the bounded per-market public-data cache. */
export function resetHyperliquidPerpMarketCacheForTests(profileId?: string): void {
  if (profileId) {
    cachedSnapshots.delete(profileId);
    inFlightSnapshots.delete(profileId);
    return;
  }
  cachedSnapshots.clear();
  inFlightSnapshots.clear();
}

/**
 * Fetch a consistent-enough public market read from Hyperliquid's Info API.
 * The snapshot is deliberately conservative: an invalid, stale, crossed, or
 * incomplete L2 response rejects rather than returning a plausible estimate.
 */
export async function getHyperliquidPerpMarketSnapshot(
  profile: HyperliquidPerpMarketProfile = hyperliquidPerpMarketProfile(),
  options: { fetcher?: Fetcher; nowMs?: number; signal?: AbortSignal } = {}
): Promise<HyperliquidPerpMarketSnapshot> {
  assertHyperliquidPerpMarketProfile(profile);
  const nowMs = options.nowMs ?? Date.now();
  const useCache =
    options.fetcher === undefined && options.signal === undefined && options.nowMs === undefined;
  if (useCache) {
    const cached = cachedSnapshots.get(profile.id);
    if (cached && cached.expiresAt > nowMs) return cached.value;
    const inFlight = inFlightSnapshots.get(profile.id);
    if (inFlight) return inFlight;
  }
  const request = (async (): Promise<HyperliquidPerpMarketSnapshot> => {
    const fetcher = options.fetcher ?? fetch;
    const [contextPayload, bookPayload] = await Promise.all([
      infoRequest({ type: 'metaAndAssetCtxs' }, fetcher, options.signal),
      infoRequest({ type: 'l2Book', coin: profile.coin }, fetcher, options.signal),
    ]);
    const perpetual = parseMarketContext(contextPayload, profile);
    const book = parseBook(bookPayload, profile);
    if (book.timestamp > nowMs + 5_000) {
      throw new HyperliquidPerpMarketError('Hyperliquid L2 book timestamp is in the future.');
    }
    const sourceFreshnessSeconds = Math.max(0, (nowMs - book.timestamp) / 1_000);
    if (sourceFreshnessSeconds > profile.maxSourceAgeSeconds) {
      throw new HyperliquidPerpMarketError('Hyperliquid L2 book exceeded its freshness limit.');
    }
    const bestBid = book.bids[0]!.price;
    const bestAsk = book.asks[0]!.price;
    const estimates = profile.quoteNotionalsUsd.flatMap((targetNotionalUsd) => [
      estimateBookImpact(book.asks, 'buy', targetNotionalUsd),
      estimateBookImpact(book.bids, 'sell', targetNotionalUsd),
    ]);
    return {
      source: 'dex-market',
      venue: 'hyperliquid-perp',
      network: HYPERLIQUID_MAINNET_NETWORK,
      market: profile.market,
      coin: profile.coin,
      sourceFreshnessSeconds,
      observedAt: new Date(nowMs).toISOString(),
      book: {
        timestamp: new Date(book.timestamp).toISOString(),
        displayedLevelsPerSide: Math.min(book.bids.length, book.asks.length),
        bestBid,
        bestAsk,
        spreadBps: bps(bestAsk, bestBid, 'bid-ask spread'),
        bidDepthNotionalUsd: book.bids.reduce((sum, level) => sum + level.price * level.size, 0),
        askDepthNotionalUsd: book.asks.reduce((sum, level) => sum + level.price * level.size, 0),
      },
      perpetual: {
        ...perpetual,
        markDeviationBpsFromOracle: bps(
          perpetual.markPrice,
          perpetual.oraclePrice,
          'mark-oracle deviation'
        ),
      },
      estimates,
    };
  })();
  if (useCache) inFlightSnapshots.set(profile.id, request);
  try {
    const value = await request;
    if (useCache) cachedSnapshots.set(profile.id, { value, expiresAt: nowMs + profile.cacheTtlMs });
    return value;
  } finally {
    if (useCache) inFlightSnapshots.delete(profile.id);
  }
}
