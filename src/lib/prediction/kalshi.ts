import { z } from 'zod';

export const KALSHI_GUARD_PROTOCOL_ID = 'kalshi-prediction-mainnet' as const;
export const KALSHI_GUARD_SCHEMA_VERSION = 'insight.kalshi-guard.v2' as const;
export const DEFAULT_KALSHI_BASE_URL = 'https://external-api.kalshi.com/trade-api/v2';

const TICKER_PATTERN = /^[A-Za-z0-9._:-]{1,256}$/;
type PublicFetchOptions = { baseUrl?: string; timeoutMs?: number; fetcher?: typeof fetch };

const RawMarketSchema = z
  .object({
    ticker: z.string().trim().min(1).max(256),
    event_ticker: z.string().trim().min(1).max(256).optional(),
    series_ticker: z.string().trim().min(1).max(256).optional(),
    market_type: z.enum(['binary', 'scalar']).nullable().optional(),
    title: z.string().trim().min(1).max(2048).nullable().optional(),
    subtitle: z.string().max(2048).nullable().optional(),
    yes_sub_title: z.string().max(2048).nullable().optional(),
    no_sub_title: z.string().max(2048).nullable().optional(),
    status: z.string().trim().min(1).max(64),
    close_time: z.union([z.string(), z.number()]).nullable().optional(),
    expiration_time: z.union([z.string(), z.number()]).nullable().optional(),
    latest_expiration_time: z.union([z.string(), z.number()]).nullable().optional(),
    result: z.string().nullable().optional(),
    rules_primary: z.string().nullable().optional(),
    rules_secondary: z.string().nullable().optional(),
    yes_bid: z.union([z.string(), z.number()]).nullable().optional(),
    yes_ask: z.union([z.string(), z.number()]).nullable().optional(),
    no_bid: z.union([z.string(), z.number()]).nullable().optional(),
    no_ask: z.union([z.string(), z.number()]).nullable().optional(),
    yes_bid_dollars: z.union([z.string(), z.number()]).nullable().optional(),
    yes_ask_dollars: z.union([z.string(), z.number()]).nullable().optional(),
    no_bid_dollars: z.union([z.string(), z.number()]).nullable().optional(),
    no_ask_dollars: z.union([z.string(), z.number()]).nullable().optional(),
    last_price: z.union([z.string(), z.number()]).nullable().optional(),
    last_price_dollars: z.union([z.string(), z.number()]).nullable().optional(),
    volume: z.union([z.string(), z.number()]).nullable().optional(),
    volume_fp: z.union([z.string(), z.number()]).nullable().optional(),
    volume_24h: z.union([z.string(), z.number()]).nullable().optional(),
    volume_24h_fp: z.union([z.string(), z.number()]).nullable().optional(),
    open_interest: z.union([z.string(), z.number()]).nullable().optional(),
    open_interest_fp: z.union([z.string(), z.number()]).nullable().optional(),
    liquidity: z.union([z.string(), z.number()]).nullable().optional(),
    liquidity_dollars: z.union([z.string(), z.number()]).nullable().optional(),
    fee_type: z.string().nullable().optional(),
    fee_multiplier: z.union([z.string(), z.number()]).nullable().optional(),
    maker_fee: z.union([z.string(), z.number()]).nullable().optional(),
  })
  .passthrough();

const RawResponseSchema = z.object({ market: RawMarketSchema });

const RawOrderbookLevelSchema = z.tuple([
  z.union([z.string(), z.number()]),
  z.union([z.string(), z.number()]),
]);
const RawOrderbookResponseSchema = z.object({
  orderbook_fp: z.object({
    yes_dollars: z.array(RawOrderbookLevelSchema),
    no_dollars: z.array(RawOrderbookLevelSchema),
  }),
});

const RawSettlementSourceSchema = z
  .object({
    name: z.string().trim().min(1).max(512).nullable().optional(),
    url: z.string().trim().url().max(2048).nullable().optional(),
  })
  .passthrough();
const RawSeriesSchema = z
  .object({
    ticker: z.string().trim().min(1).max(256),
    fee_type: z.string().nullable().optional(),
    fee_multiplier: z.union([z.string(), z.number()]).nullable().optional(),
    settlement_sources: z.array(RawSettlementSourceSchema).nullable().optional(),
  })
  .passthrough();
const RawSeriesResponseSchema = z.object({ series: RawSeriesSchema });

export type KalshiOrderbookLevel = { price: number; quantity: number };
export type KalshiOrderbook = {
  yesBids: KalshiOrderbookLevel[];
  noBids: KalshiOrderbookLevel[];
  depth: number | null;
};
export type KalshiSettlementSource = { name: string | null; url: string | null };

export type KalshiMarket = {
  ticker: string;
  eventTicker: string | null;
  seriesTicker: string | null;
  marketType: 'binary' | 'scalar' | null;
  title: string;
  subtitle: string | null;
  status: string;
  closeTime: string | null;
  expirationTime: string | null;
  latestExpirationTime: string | null;
  result: 'yes' | 'no' | null;
  rulesPrimary: string | null;
  rulesSecondary: string | null;
  yesBid: number | null;
  yesAsk: number | null;
  noBid: number | null;
  noAsk: number | null;
  lastPrice: number | null;
  volume: number | null;
  volume24h: number | null;
  openInterest: number | null;
  liquidity: number | null;
  feeMetadata: {
    feeType: string | null;
    feeMultiplier: number | null;
    makerFee: number | null;
  };
  settlementSources: KalshiSettlementSource[];
  orderbook: KalshiOrderbook | null;
  metadataWarnings: string[];
};

export type KalshiMarketFetcher = (ticker: string) => Promise<KalshiMarket | null>;

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dollarsOrCents(rawDollars: unknown, rawCents: unknown): number | null {
  const dollars = numberOrNull(rawDollars);
  if (dollars !== null) return dollars;
  const cents = numberOrNull(rawCents);
  return cents === null ? null : cents / 100;
}

function fixedPointOrNumber(rawFixedPoint: unknown, rawNumber: unknown): number | null {
  const fixedPoint = numberOrNull(rawFixedPoint);
  if (fixedPoint !== null) return fixedPoint;
  return numberOrNull(rawNumber);
}

function timestampToIso(value: unknown): string | null {
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
  }
  const number = numberOrNull(value);
  if (number === null) return null;
  const millis = number > 1_000_000_000_000 ? number : number * 1000;
  const parsed = new Date(millis).getTime();
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function normalizeResult(value: string | null | undefined): 'yes' | 'no' | null {
  const result = value?.trim().toLowerCase();
  return result === 'yes' || result === 'no' ? result : null;
}

function normalizeTicker(ticker: string): string {
  const normalizedTicker = ticker.trim();
  if (!TICKER_PATTERN.test(normalizedTicker)) {
    throw new TypeError('Kalshi ticker contains unsupported characters');
  }
  return normalizedTicker;
}

function normalizeOrderbookLevels(rawLevels: Array<[string | number, string | number]>) {
  return rawLevels
    .map(([rawPrice, rawQuantity]) => {
      const price = numberOrNull(rawPrice);
      const quantity = numberOrNull(rawQuantity);
      if (price === null || quantity === null || price < 0 || price > 1 || quantity < 0) {
        throw new TypeError('Kalshi orderbook contains an invalid price level');
      }
      return { price, quantity };
    })
    .sort((left, right) => left.price - right.price);
}

function normalizeSettlementSources(
  sources: Array<{ name?: string | null; url?: string | null }>
): KalshiSettlementSource[] {
  return sources.map((source) => ({
    name: source.name ?? null,
    url: source.url ?? null,
  }));
}

async function getPublicJson(
  path: string,
  options: PublicFetchOptions,
  notFoundIsNull = false
): Promise<unknown | null> {
  const response = await (options.fetcher ?? fetch)(
    `${(options.baseUrl?.trim() || DEFAULT_KALSHI_BASE_URL).replace(/\/$/, '')}${path}`,
    {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(options.timeoutMs ?? 12_000),
    }
  );
  if (notFoundIsNull && response.status === 404) return null;
  if (!response.ok) throw new Error(`Kalshi API ${response.status} for ${path}`);
  return response.json() as Promise<unknown>;
}

export function normalizeKalshiMarket(raw: unknown): KalshiMarket {
  const market = RawMarketSchema.parse(raw);
  return {
    ticker: market.ticker,
    eventTicker: market.event_ticker ?? null,
    seriesTicker: market.series_ticker ?? null,
    marketType: market.market_type ?? null,
    title: market.title ?? market.yes_sub_title ?? market.no_sub_title ?? market.ticker,
    subtitle: market.subtitle ?? market.yes_sub_title ?? null,
    status: market.status.toLowerCase(),
    closeTime: timestampToIso(market.close_time),
    expirationTime: timestampToIso(market.expiration_time),
    latestExpirationTime: timestampToIso(market.latest_expiration_time),
    result: normalizeResult(market.result),
    rulesPrimary: market.rules_primary ?? null,
    rulesSecondary: market.rules_secondary ?? null,
    yesBid: dollarsOrCents(market.yes_bid_dollars, market.yes_bid),
    yesAsk: dollarsOrCents(market.yes_ask_dollars, market.yes_ask),
    noBid: dollarsOrCents(market.no_bid_dollars, market.no_bid),
    noAsk: dollarsOrCents(market.no_ask_dollars, market.no_ask),
    lastPrice: dollarsOrCents(market.last_price_dollars, market.last_price),
    volume: fixedPointOrNumber(market.volume_fp, market.volume),
    volume24h: fixedPointOrNumber(market.volume_24h_fp, market.volume_24h),
    openInterest: fixedPointOrNumber(market.open_interest_fp, market.open_interest),
    liquidity: dollarsOrCents(market.liquidity_dollars, market.liquidity),
    feeMetadata: {
      feeType: market.fee_type ?? null,
      feeMultiplier: numberOrNull(market.fee_multiplier),
      makerFee: numberOrNull(market.maker_fee),
    },
    settlementSources: [],
    orderbook: null,
    metadataWarnings: [],
  };
}

export async function fetchKalshiMarket(
  ticker: string,
  options: PublicFetchOptions = {}
): Promise<KalshiMarket | null> {
  const normalizedTicker = normalizeTicker(ticker);
  const body = await getPublicJson(
    `/markets/${encodeURIComponent(normalizedTicker)}`,
    options,
    true
  );
  if (body === null) return null;
  const parsed = RawResponseSchema.parse(body);
  const market = normalizeKalshiMarket(parsed.market);
  if (market.ticker !== normalizedTicker) {
    throw new Error('Kalshi market response ticker does not match the requested ticker');
  }
  return market;
}

export async function fetchKalshiOrderbook(
  ticker: string,
  options: PublicFetchOptions & { depth?: number } = {}
): Promise<KalshiOrderbook | null> {
  const normalizedTicker = normalizeTicker(ticker);
  const depth = options.depth ?? 0;
  if (!Number.isInteger(depth) || depth < 0 || depth > 100) {
    throw new RangeError('Kalshi orderbook depth must be an integer from 0 to 100');
  }
  const query = depth > 0 ? `?depth=${depth}` : '';
  const body = await getPublicJson(
    `/markets/${encodeURIComponent(normalizedTicker)}/orderbook${query}`,
    options,
    true
  );
  if (body === null) return null;
  const parsed = RawOrderbookResponseSchema.parse(body);
  return {
    yesBids: normalizeOrderbookLevels(parsed.orderbook_fp.yes_dollars),
    noBids: normalizeOrderbookLevels(parsed.orderbook_fp.no_dollars),
    depth: depth > 0 ? depth : null,
  };
}

export async function fetchKalshiSeries(
  seriesTicker: string,
  options: PublicFetchOptions = {}
): Promise<{
  feeType: string | null;
  feeMultiplier: number | null;
  settlementSources: KalshiSettlementSource[];
} | null> {
  const normalizedTicker = normalizeTicker(seriesTicker);
  const body = await getPublicJson(
    `/series/${encodeURIComponent(normalizedTicker)}`,
    options,
    true
  );
  if (body === null) return null;
  const parsed = RawSeriesResponseSchema.parse(body);
  if (parsed.series.ticker !== normalizedTicker) {
    throw new Error('Kalshi series response ticker does not match the requested ticker');
  }
  return {
    feeType: parsed.series.fee_type ?? null,
    feeMultiplier: numberOrNull(parsed.series.fee_multiplier),
    settlementSources: normalizeSettlementSources(parsed.series.settlement_sources ?? []),
  };
}

export async function fetchKalshiMarketSnapshot(
  ticker: string,
  options: PublicFetchOptions = {}
): Promise<KalshiMarket | null> {
  const market = await fetchKalshiMarket(ticker, options);
  if (market === null) return null;

  const [orderbook, series] = await Promise.allSettled([
    fetchKalshiOrderbook(ticker, { ...options, depth: 10 }),
    market.seriesTicker ? fetchKalshiSeries(market.seriesTicker, options) : Promise.resolve(null),
  ]);
  const metadataWarnings: string[] = [];
  const resolvedOrderbook = orderbook.status === 'fulfilled' ? orderbook.value : null;
  if (orderbook.status === 'rejected' || resolvedOrderbook === null) {
    metadataWarnings.push('orderbook unavailable');
  }
  const resolvedSeries = series.status === 'fulfilled' ? series.value : null;
  if (series.status === 'rejected' || resolvedSeries === null) {
    metadataWarnings.push('series metadata unavailable');
  }

  return {
    ...market,
    feeMetadata: {
      feeType: resolvedSeries?.feeType ?? market.feeMetadata.feeType,
      feeMultiplier: resolvedSeries?.feeMultiplier ?? market.feeMetadata.feeMultiplier,
      makerFee: market.feeMetadata.makerFee,
    },
    settlementSources: resolvedSeries?.settlementSources ?? [],
    orderbook: resolvedOrderbook,
    metadataWarnings,
  };
}
