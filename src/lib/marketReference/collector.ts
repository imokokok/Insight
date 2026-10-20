/**
 * Market-reference collector — the external truth layer.
 *
 * Fetches independent CEX spot prices for the Oracle Watch universe
 * (the demand-led 13-asset set below, quote USD) every 15 minutes from GitHub Actions
 * (`market-reference-collect.yml`), writing one row per (symbol, exchange,
 * snapshot_ts) into `market_reference_snapshots` (migration 0038).
 *
 * Why this exists (see the data-strategy analysis):
 *  - Oracle-consensus labels cannot see manipulation when ALL providers move
 *    together. A CEX reference is a non-derived, independent source — the
 *    same "non-derived group" concept as the Watch independence gate — and
 *    oracle-vs-market divergence is the closest thing to a manipulation
 *    ground truth available without inside information.
 *  - This layer is evidence, not an oracle-verdict input: it never relaxes
 *    that verdict or enters the existing oracle attestation. It feeds (a) the
 *    training pipeline's `oracle_vs_market_deviation_pct` feature + Track-B
 *    label, (b) a Watch ADVISORY divergence reason, and (c) the separate
 *    decision-input assessment, which binds the hourly reference snapshot in
 *    its own signature.
 *
 * Standards compliance (from the partnership archives):
 *  - APS SOURCE discipline: `COLLECTOR_VERSION` is pinned to the repo commit
 *    that defines this file's behavior; regenerate must be byte-identical.
 *  - Headless price-integrity ladder: present → valid → fresh → positive,
 *    fail-closed. A symbol with zero successful exchanges yields only failed
 *    rows — never a stale or estimated price.
 *  - InterAI evidence model: each row is attributable (exchange, collector
 *    version, client-measured latency) so provenance is separable from
 *    applicability.
 *
 * Source coverage: Coinbase, Kraken, and Gemini provide broad direct-USD spot
 * coverage; Crypto.com adds a direct WBTC/USD market. Bitstamp and Bitfinex
 * add optional direct-USD spot coverage, while Binance currently adds a
 * WBTC/USDT × USDT/USD composite through its dedicated public-market-data host.
 * Binance's standard API host returned HTTP 451 on a GitHub-hosted runner in
 * prior checks; the dedicated host is a separate route whose GitHub-runner
 * availability still requires an actual runner check. Optional sources remain
 * license-gated, and unsupported pairs remain explicit failed observations.
 * Solana-native SPL assets (the CAIP-19 registry) have no direct CEX USD venue
 * in this free set: jupiter (Lite tier, the aggregated-liquidity baseline),
 * dexscreener and geckoterminal price them from public Solana pools — one
 * batch request each per run — giving every Solana asset a three-source
 * cross-checkable market reference. Cross-exchange
 * consistency is computed by the `market_reference_hourly` view, not asserted
 * here.
 */

import {
  hasCustomerMarketReferenceRights,
  MARKET_REFERENCE_SOURCE_RIGHTS,
  type EvidenceRightsScope,
  type MarketReferenceSourceRights,
  type MarketReferenceDeliveryPolicy,
  type MarketReferenceVenue,
} from '@/lib/dataRights/evidenceRights';
import { createDexScreenerFetcher } from '@/lib/marketReference/dexscreener';
import { createGeckoTerminalFetcher } from '@/lib/marketReference/geckoterminal';
import { createJupiterLiteFetcher } from '@/lib/marketReference/jupiter';
import { isSolanaDexPricedSymbol } from '@/lib/marketReference/solanaDexSources';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('MarketReference');

/** Bump when the fetch/row semantics change; pinned for reproducibility. */
export const COLLECTOR_VERSION = '1.9.1'; // 1.9.1: dexscreener pair-staleness gate (pair updatedAt, 24h window)

/** Quote currency for all rows. */
export const MARKET_REFERENCE_QUOTE = 'USD';

/** The Oracle Watch universe symbols (asset-level; CEX prices are not chain-scoped). */
export const MARKET_REFERENCE_SYMBOLS = [
  'ETH',
  'BTC',
  'WBTC',
  'USDC',
  'USDT',
  // Highest-volume assets in the real pre_trade_checks distribution that are
  // available from at least two of our existing free public exchanges.
  'SOL',
  'ADA',
  'XRP',
  'ICP',
  'HYPE',
  'TAO',
  'VVV',
  'STG',
  // Solana-native SPL assets (CAIP-19 registry). SOL itself is CEX-priced
  // above; these have no direct CEX USD venue in our free set and are priced
  // by the two Solana DEX-derived sources (dexscreener, geckoterminal).
  'WIF',
  'BONK',
  'POPCAT',
  'JUP',
  'PYTH',
  'RAY',
] as const;

/** Core assets retain 15-minute coverage; demand-led additions run hourly. */
export const MARKET_REFERENCE_CORE_SYMBOLS = ['ETH', 'BTC', 'WBTC', 'USDC', 'USDT'] as const;

/** Per-exchange symbol → trading-pair mapping (quote USD). */
const COINBASE_PRODUCTS: Record<string, string> = {
  ETH: 'ETH-USD',
  BTC: 'BTC-USD',
  USDC: 'USDC-USD',
  USDT: 'USDT-USD',
  SOL: 'SOL-USD',
  ADA: 'ADA-USD',
  XRP: 'XRP-USD',
  ICP: 'ICP-USD',
  HYPE: 'HYPE-USD',
  TAO: 'TAO-USD',
  VVV: 'VVV-USD',
  STG: 'STG-USD',
};

const KRAKEN_PAIRS: Record<string, string> = {
  // Canonical Kraken pair names — VERIFIED against the live API: Kraken
  // normalizes aliases and keys the Ticker response by the canonical name
  // (ETHUSD -> XETHZUSD, XBTUSD -> XXBTZUSD, USDTUSD -> USDTZUSD; USDCUSD
  // stays as-is). The request param AND the result lookup must both use these.
  ETH: 'XETHZUSD',
  BTC: 'XXBTZUSD',
  WBTC: 'WBTCUSD',
  USDC: 'USDCUSD',
  USDT: 'USDTZUSD',
  SOL: 'SOLUSD',
  ADA: 'ADAUSD',
  XRP: 'XRPUSD',
  ICP: 'ICPUSD',
  HYPE: 'HYPEUSD',
  TAO: 'TAOUSD',
  VVV: 'VVVUSD',
  STG: 'STGUSD',
};

// Gemini ticker symbols (lowercase base + usd), public pubticker and no key.
const GEMINI_TICKERS: Record<string, string> = {
  ETH: 'ethusd',
  BTC: 'btcusd',
  USDC: 'usdcusd',
  USDT: 'usdtusd',
  SOL: 'solusd',
  XRP: 'xrpusd',
  HYPE: 'hypeusd',
};

/** Crypto.com is currently used only as WBTC's second direct USD spot venue. */
const CRYPTO_COM_INSTRUMENTS: Record<string, string> = {
  WBTC: 'WBTC_USD',
};

/** Reject a ticker that cannot reasonably represent a current 15-minute sample. */
export const MAX_SOURCE_TICKER_AGE_MS = 15 * 60 * 1000;
const MAX_SOURCE_TICKER_FUTURE_SKEW_MS = 60 * 1000;

export interface ExchangeQuote {
  exchange: string;
  symbol: string;
  price: number | null;
  /** Source-side timestamp when the venue exposes or can independently verify it. */
  sourceObservedAt?: string | null;
  bid?: number | null;
  ask?: number | null;
  volume?: number | null;
  error?: string;
}

/** One persisted row per (symbol, exchange). */
export interface MarketReferenceRow {
  snapshot_ts: string;
  symbol: string;
  quote: string;
  exchange: string;
  ref_price: number | null;
  volume: number | null;
  bid: number | null;
  ask: number | null;
  bid_ask_spread_pct: number | null;
  data_age_seconds: number | null;
  /** Nullable source timestamp; present for venues with verifiable source time. */
  source_observed_at?: string | null;
  /** Rights classification applied before this row may be persisted or consumed. */
  rights_scope?: EvidenceRightsScope;
  /** Reviewed agreement reference for customer-eligible vendor data, never a credential. */
  rights_reference?: string | null;
  /** Whether the source permits raw delivery or only Insight-derived analytics. */
  delivery_policy?: MarketReferenceDeliveryPolicy;
  is_success: boolean;
  error_message: string | null;
  collector_version: string;
}

export interface MarketReferenceSummary {
  snapshot_ts: string;
  symbols: string[];
  rows: number;
  /** Symbols with ≥1 successful exchange quote. */
  covered: string[];
  /** Symbols with zero successful quotes (fail-closed). */
  uncovered: string[];
  /** Max pairwise cross-exchange deviation (%) across covered symbols. */
  maxCrossExchangeSpreadPct: number | null;
  /** Venues admitted for this run after the rights gate. */
  eligibleExchanges: MarketReferenceVenue[];
  collectionPurpose: MarketReferenceCollectionPurpose;
}

export type MarketReferenceCollectionPurpose = 'synthetic-test' | 'customer-facing';

export interface MarketReferenceDeps {
  /** Required to make the data-use boundary explicit at every call site. */
  purpose: MarketReferenceCollectionPurpose;
  fetchImpl?: typeof fetch;
  now?: () => number;
  /** Optional bounded subset used by the free-tier cadence router. */
  symbols?: readonly string[];
  /**
   * Explicit optional-source selection for deterministic synthetic tests. It
   * never grants customer-facing rights.
   */
  enabledExchanges?: readonly MarketReferenceVenue[];
  /** Reviewed source-rights register; defaults to the repository register. */
  sourceRights?: Readonly<Record<MarketReferenceVenue, MarketReferenceSourceRights>>;
}

/** Per-request timeout (ms) — abort a stalled exchange call, never hang a run. */
export const REQUEST_TIMEOUT_MS = 15_000;

type SpotFetcher = (
  symbol: string,
  fetchImpl: typeof fetch,
  now: () => number
) => Promise<ExchangeQuote>;

/** A per-run bound fetcher: one symbol in, one venue quote out. */
export type BoundSpotFetcher = (symbol: string) => Promise<ExchangeQuote>;

interface MarketReferenceAdapter {
  name: MarketReferenceVenue;
  fn?: SpotFetcher;
  supports?: (symbol: string) => boolean;
  /** Optional collectors remain off unless a test/research caller names them. */
  requiresExplicitAdmission?: boolean;
  bind?: (fetchImpl: typeof fetch, now: () => number) => BoundSpotFetcher;
}

/** Parse a string/unknown price from an exchange response; null if unusable. */
function parsePrice(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function arrayValue(value: unknown, index: number): unknown {
  return Array.isArray(value) ? value[index] : undefined;
}

function requirePair(mapping: Record<string, string>, symbol: string, exchange: string): string {
  const pair = mapping[symbol];
  if (!pair) throw new Error(`${exchange} does not list ${symbol}/USD`);
  return pair;
}

function spreadPct(bid: number | null | undefined, ask: number | null | undefined): number | null {
  if (bid == null || ask == null || bid <= 0 || ask <= 0 || ask < bid) return null;
  const midpoint = (bid + ask) / 2;
  return midpoint > 0 ? ((ask - bid) / midpoint) * 100 : null;
}

function parseSourceTimestamp(value: unknown): number | null {
  let timestamp: number;
  if (typeof value === 'number') {
    timestamp = value;
  } else if (typeof value === 'string' && value.trim() !== '') {
    const trimmed = value.trim();
    timestamp = /^\d+(?:\.\d+)?$/.test(trimmed) ? Number(trimmed) : Date.parse(trimmed);
  } else {
    return null;
  }

  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  // Bitstamp uses Unix seconds; Bitfinex/Binance trade timestamps are ms.
  const timestampMs = timestamp < 100_000_000_000 ? timestamp * 1000 : timestamp;
  return Number.isSafeInteger(timestampMs) ? timestampMs : null;
}

function requireFreshSourceTimestamp(value: unknown, now: () => number, exchange: string): string {
  const timestampMs = parseSourceTimestamp(value);
  if (timestampMs === null) throw new Error(`${exchange} source timestamp is missing or invalid`);

  const ageMs = now() - timestampMs;
  if (ageMs > MAX_SOURCE_TICKER_AGE_MS || ageMs < -MAX_SOURCE_TICKER_FUTURE_SKEW_MS) {
    throw new Error(
      `${exchange} source timestamp outside freshness window (${Math.round(ageMs / 1000)}s)`
    );
  }
  return new Date(timestampMs).toISOString();
}

async function fetchCoinbaseSpot(symbol: string, fetchImpl: typeof fetch): Promise<ExchangeQuote> {
  const product = requirePair(COINBASE_PRODUCTS, symbol, 'coinbase');
  // Exchange ticker is as public/keyless as the old spot endpoint, and returns
  // bid/ask + 24h base volume in the same request (no extra free-tier cost).
  const url = `https://api.exchange.coinbase.com/products/${product}/ticker`;
  const r = await fetchImpl(url);
  if (!r.ok) throw new Error(`coinbase ${r.status}`);
  const body = asRecord(await r.json());
  if (!body) throw new Error('coinbase unexpected response shape');
  return {
    exchange: 'coinbase',
    symbol,
    price: parsePrice(body.price),
    bid: parsePrice(body.bid),
    ask: parsePrice(body.ask),
    volume: parsePrice(body.volume),
  };
}

async function fetchKrakenSpot(symbol: string, fetchImpl: typeof fetch): Promise<ExchangeQuote> {
  const pair = requirePair(KRAKEN_PAIRS, symbol, 'kraken');
  const url = `https://api.kraken.com/0/public/Ticker?pair=${pair}`;
  const r = await fetchImpl(url);
  if (!r.ok) throw new Error(`kraken ${r.status}`);
  // Kraken returns HTTP 200 with a non-empty `error` array on failures
  // (e.g. rate limits) — surface the real reason instead of a generic miss.
  const body = asRecord(await r.json());
  if (!body) throw new Error('kraken unexpected response shape');
  if (Array.isArray(body.error) && body.error.length > 0) {
    throw new Error(`kraken ${String(body.error[0])}`);
  }
  // Kraken normalizes aliases in response keys. Use the sole returned ticker
  // instead of coupling every newly supported asset to its canonical key.
  const result = asRecord(body.result);
  const ticker = Object.values(result ?? {})
    .map(asRecord)
    .find((value) => value !== null);
  if (!ticker) {
    throw new Error(`kraken unexpected response shape (pair ${pair} not in result)`);
  }
  return {
    exchange: 'kraken',
    symbol,
    price: parsePrice(arrayValue(ticker.c, 0)),
    ask: parsePrice(arrayValue(ticker.a, 0)),
    bid: parsePrice(arrayValue(ticker.b, 0)),
    volume: parsePrice(arrayValue(ticker.v, 1) ?? arrayValue(ticker.v, 0)),
  };
}

async function fetchGeminiSpot(symbol: string, fetchImpl: typeof fetch): Promise<ExchangeQuote> {
  const ticker = requirePair(GEMINI_TICKERS, symbol, 'gemini');
  const url = `https://api.gemini.com/v1/pubticker/${ticker}`;
  const r = await fetchImpl(url);
  if (!r.ok) throw new Error(`gemini ${r.status}`);
  const body = asRecord(await r.json());
  if (!body) throw new Error('gemini unexpected response shape');
  const volume = asRecord(body.volume);
  return {
    exchange: 'gemini',
    symbol,
    price: parsePrice(body.last),
    bid: parsePrice(body.bid),
    ask: parsePrice(body.ask),
    volume: parsePrice(volume?.[symbol] ?? volume?.[symbol.toUpperCase()]),
  };
}

async function fetchCryptoComSpot(
  symbol: string,
  fetchImpl: typeof fetch,
  now: () => number
): Promise<ExchangeQuote> {
  const instrument = requirePair(CRYPTO_COM_INSTRUMENTS, symbol, 'crypto.com');
  const url = `https://api.crypto.com/exchange/v1/public/get-tickers?instrument_name=${encodeURIComponent(instrument)}`;
  const r = await fetchImpl(url);
  if (!r.ok) throw new Error(`crypto.com ${r.status}`);

  const body = asRecord(await r.json());
  if (!body) throw new Error('crypto.com unexpected response shape');
  if (body.code !== 0 && body.code !== '0') {
    throw new Error(`crypto.com API error (${String(body.code)})`);
  }

  const result = asRecord(body.result);
  if (!Array.isArray(result?.data)) throw new Error('crypto.com ticker data is missing');
  const ticker = result.data.map(asRecord).find((entry) => entry?.i === instrument);
  if (!ticker) throw new Error(`crypto.com ticker missing instrument ${instrument}`);

  const timestampMs =
    typeof ticker.t === 'number'
      ? ticker.t
      : typeof ticker.t === 'string' && /^\d{13}$/.test(ticker.t)
        ? Number(ticker.t)
        : Number.NaN;
  if (!Number.isSafeInteger(timestampMs) || timestampMs <= 0) {
    throw new Error('crypto.com ticker timestamp is missing or invalid');
  }

  const price = parsePrice(ticker.a);
  const bid = parsePrice(ticker.b);
  const ask = parsePrice(ticker.k);
  if (price === null || bid === null || ask === null || ask < bid) {
    throw new Error('crypto.com ticker has an invalid latest price or best bid/ask');
  }
  if (price < bid || price > ask) {
    throw new Error('crypto.com latest trade price is outside the best bid/ask');
  }

  const ageMs = now() - timestampMs;
  if (ageMs > MAX_SOURCE_TICKER_AGE_MS || ageMs < -MAX_SOURCE_TICKER_FUTURE_SKEW_MS) {
    throw new Error(
      `crypto.com ticker timestamp outside freshness window (${Math.round(ageMs / 1000)}s)`
    );
  }

  return {
    exchange: 'crypto.com',
    symbol,
    price,
    bid,
    ask,
    volume: parsePrice(ticker.v),
  };
}

async function loadBitstampUsdSpotMarkets(
  fetchImpl: typeof fetch
): Promise<Record<string, string>> {
  const r = await fetchImpl('https://www.bitstamp.net/api/v2/markets/');
  if (!r.ok) throw new Error(`bitstamp markets ${r.status}`);
  const body: unknown = await r.json();
  if (!Array.isArray(body)) throw new Error('bitstamp markets response is not an array');

  const pairs: Record<string, string> = {};
  for (const rawMarket of body) {
    const market = asRecord(rawMarket);
    if (!market) continue;
    const base = typeof market.base_currency === 'string' ? market.base_currency.toUpperCase() : '';
    const quote =
      typeof market.counter_currency === 'string' ? market.counter_currency.toUpperCase() : '';
    const kind = typeof market.market_type === 'string' ? market.market_type.toUpperCase() : '';
    const status = typeof market.trading === 'string' ? market.trading.toUpperCase() : '';
    const pair = typeof market.market_symbol === 'string' ? market.market_symbol.trim() : '';
    if (!base || quote !== 'USD' || kind !== 'SPOT' || status !== 'ENABLED' || !pair) continue;
    if (pairs[base] && pairs[base] !== pair) {
      throw new Error(`bitstamp has ambiguous USD spot markets for ${base}`);
    }
    pairs[base] = pair;
  }
  return pairs;
}

function createBitstampFetcher(fetchImpl: typeof fetch, now: () => number): BoundSpotFetcher {
  let marketsPromise: Promise<Record<string, string>> | null = null;
  const markets = () => {
    marketsPromise ??= loadBitstampUsdSpotMarkets(fetchImpl);
    return marketsPromise;
  };

  return async (symbol) => {
    const marketSymbol = (await markets())[symbol.toUpperCase()];
    if (!marketSymbol) throw new Error(`bitstamp does not list an enabled ${symbol}/USD spot pair`);

    const r = await fetchImpl(
      `https://www.bitstamp.net/api/v2/ticker/${encodeURIComponent(marketSymbol)}/`
    );
    if (!r.ok) throw new Error(`bitstamp ${r.status}`);
    const body = asRecord(await r.json());
    if (!body) throw new Error('bitstamp ticker response is not an object');
    if (typeof body.market_type === 'string' && body.market_type.toUpperCase() !== 'SPOT') {
      throw new Error(`bitstamp returned non-spot market for ${symbol}/USD`);
    }

    const sourceObservedAt = requireFreshSourceTimestamp(body.timestamp, now, 'bitstamp');
    return {
      exchange: 'bitstamp',
      symbol,
      price: parsePrice(body.last),
      bid: parsePrice(body.bid),
      ask: parsePrice(body.ask),
      volume: parsePrice(body.volume),
      sourceObservedAt,
    };
  };
}

function bitfinexUsdPair(symbol: string, catalog: readonly string[]): string | null {
  const candidates = catalog.filter((pair) => {
    const normalized = pair.toUpperCase();
    const base = symbol.toUpperCase();
    return normalized === `${base}USD` || normalized === `${base}:USD`;
  });
  if (candidates.length > 1) {
    throw new Error(`bitfinex has ambiguous USD spot markets for ${symbol}`);
  }
  return candidates[0] ?? null;
}

async function loadBitfinexUsdSpotTickers(
  symbols: readonly string[],
  fetchImpl: typeof fetch
): Promise<Map<string, { pair: string; ticker: unknown[] }>> {
  const catalogResponse = await fetchImpl(
    'https://api-pub.bitfinex.com/v2/conf/pub:list:pair:exchange'
  );
  if (!catalogResponse.ok) throw new Error(`bitfinex markets ${catalogResponse.status}`);
  const rawCatalog: unknown = await catalogResponse.json();
  if (!Array.isArray(rawCatalog) || !Array.isArray(rawCatalog[0])) {
    throw new Error('bitfinex market catalog response is malformed');
  }
  const catalog = rawCatalog[0].filter((pair): pair is string => typeof pair === 'string');
  const requested = new Map<string, string>();
  for (const symbol of symbols) {
    const pair = bitfinexUsdPair(symbol, catalog);
    if (pair) requested.set(symbol, pair);
  }

  const result = new Map<string, { pair: string; ticker: unknown[] }>();
  if (requested.size === 0) return result;

  const tickerSymbols = [...requested.values()]
    .map((pair) => encodeURIComponent(`t${pair}`))
    .join(',');
  const tickerResponse = await fetchImpl(
    `https://api-pub.bitfinex.com/v2/tickers?symbols=${tickerSymbols}`
  );
  if (!tickerResponse.ok) throw new Error(`bitfinex tickers ${tickerResponse.status}`);
  const rawTickers: unknown = await tickerResponse.json();
  if (!Array.isArray(rawTickers)) throw new Error('bitfinex ticker response is not an array');

  const tickerByPair = new Map<string, unknown[]>();
  for (const rawTicker of rawTickers) {
    if (!Array.isArray(rawTicker) || typeof rawTicker[0] !== 'string') continue;
    tickerByPair.set(rawTicker[0], rawTicker);
  }
  for (const [symbol, pair] of requested) {
    const ticker = tickerByPair.get(`t${pair}`);
    if (ticker) result.set(symbol, { pair, ticker });
  }
  return result;
}

async function fetchBitfinexLatestTrade(
  pair: string,
  fetchImpl: typeof fetch,
  now: () => number
): Promise<{ price: number; sourceObservedAt: string }> {
  const apiSymbol = `t${pair}`;
  const url = `https://api-pub.bitfinex.com/v2/trades/${encodeURIComponent(apiSymbol)}/hist?limit=1&sort=-1`;
  const r = await fetchImpl(url);
  if (!r.ok) throw new Error(`bitfinex trades ${r.status}`);
  const body: unknown = await r.json();
  const trade = Array.isArray(body) ? body[0] : null;
  if (!Array.isArray(trade)) throw new Error(`bitfinex latest trade is missing for ${pair}`);
  const sourceObservedAt = requireFreshSourceTimestamp(trade[1], now, 'bitfinex');
  const price = parsePrice(trade[3]);
  if (price === null) throw new Error(`bitfinex latest trade price is invalid for ${pair}`);
  return { price, sourceObservedAt };
}

function createBitfinexFetcher(fetchImpl: typeof fetch, now: () => number): BoundSpotFetcher {
  let tickersPromise: Promise<Map<string, { pair: string; ticker: unknown[] }>> | null = null;
  const tickers = () => {
    tickersPromise ??= loadBitfinexUsdSpotTickers(MARKET_REFERENCE_SYMBOLS, fetchImpl);
    return tickersPromise;
  };

  return async (symbol) => {
    const tickerData = (await tickers()).get(symbol);
    if (!tickerData) throw new Error(`bitfinex does not list ${symbol}/USD spot`);
    const latestTrade = await fetchBitfinexLatestTrade(tickerData.pair, fetchImpl, now);
    return {
      exchange: 'bitfinex',
      symbol,
      price: latestTrade.price,
      bid: parsePrice(tickerData.ticker[1]),
      ask: parsePrice(tickerData.ticker[3]),
      volume: parsePrice(tickerData.ticker[8]),
      sourceObservedAt: latestTrade.sourceObservedAt,
    };
  };
}

const BINANCE_MARKET_DATA_BASE_URL = 'https://data-api.binance.vision/api/v3';
const BINANCE_WBTC_USDT = 'WBTCUSDT';
const BINANCE_USDT_USD = 'USDTUSD';

function binanceUrl(path: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params);
  return `${BINANCE_MARKET_DATA_BASE_URL}/${path}?${query.toString()}`;
}

function validateBinanceResponse(body: unknown, endpoint: string): Record<string, unknown> {
  const record = asRecord(body);
  if (!record) throw new Error(`binance ${endpoint} response is not an object`);
  if (typeof record.code === 'number' && record.code < 0) {
    throw new Error(`binance ${endpoint} API error (${record.code}): ${String(record.msg ?? '')}`);
  }
  return record;
}

function validateBinanceSpotMarkets(body: unknown): void {
  const record = validateBinanceResponse(body, 'exchangeInfo');
  if (!Array.isArray(record.symbols)) {
    throw new Error('binance exchangeInfo symbols are missing');
  }
  const markets = new Map<string, Record<string, unknown>>();
  for (const rawMarket of record.symbols) {
    const market = asRecord(rawMarket);
    if (market && typeof market.symbol === 'string') {
      markets.set(market.symbol, market);
    }
  }

  for (const [symbol, baseAsset, quoteAsset] of [
    [BINANCE_WBTC_USDT, 'WBTC', 'USDT'],
    [BINANCE_USDT_USD, 'USDT', 'USD'],
  ] as const) {
    const market = markets.get(symbol);
    if (
      !market ||
      market.status !== 'TRADING' ||
      market.baseAsset !== baseAsset ||
      market.quoteAsset !== quoteAsset ||
      market.isSpotTradingAllowed !== true
    ) {
      throw new Error(`binance does not list an enabled ${baseAsset}/${quoteAsset} spot market`);
    }
  }
}

function parseBinanceLatestTrade(
  body: unknown,
  symbol: string,
  now: () => number
): { price: number; timestampMs: number } {
  if (!Array.isArray(body) || body.length === 0) {
    throw new Error(`binance latest trade is missing for ${symbol}`);
  }
  const trade = asRecord(body[body.length - 1]);
  const price = parsePrice(trade?.price);
  if (price === null) throw new Error(`binance latest trade price is invalid for ${symbol}`);
  const timestampMs = parseSourceTimestamp(trade?.time);
  if (timestampMs === null) throw new Error(`binance latest trade time is invalid for ${symbol}`);
  requireFreshSourceTimestamp(timestampMs, now, `binance ${symbol}`);
  return { price, timestampMs };
}

function parseBinanceBookTicker(body: unknown, symbol: string): { bid: number; ask: number } {
  const ticker = validateBinanceResponse(body, `bookTicker ${symbol}`);
  const bid = parsePrice(ticker.bidPrice);
  const ask = parsePrice(ticker.askPrice);
  if (ticker.symbol !== symbol || bid === null || ask === null || ask < bid) {
    throw new Error(`binance ${symbol} best bid/ask is missing or invalid`);
  }
  return { bid, ask };
}

function parseNonNegative(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function createBinanceFetcher(fetchImpl: typeof fetch, now: () => number): BoundSpotFetcher {
  return async (symbol) => {
    if (symbol.toUpperCase() !== 'WBTC') {
      throw new Error('binance adapter only supports WBTC/USD cross-market pricing');
    }

    const [
      catalogResponse,
      wbtcTradesResponse,
      fxTradesResponse,
      wbtcBookResponse,
      fxBookResponse,
      volumeResponse,
    ] = await Promise.all([
      fetchImpl(
        binanceUrl('exchangeInfo', {
          symbols: JSON.stringify([BINANCE_WBTC_USDT, BINANCE_USDT_USD]),
        })
      ),
      fetchImpl(binanceUrl('trades', { symbol: BINANCE_WBTC_USDT, limit: '1' })),
      fetchImpl(binanceUrl('trades', { symbol: BINANCE_USDT_USD, limit: '1' })),
      fetchImpl(binanceUrl('ticker/bookTicker', { symbol: BINANCE_WBTC_USDT })),
      fetchImpl(binanceUrl('ticker/bookTicker', { symbol: BINANCE_USDT_USD })),
      fetchImpl(binanceUrl('ticker/24hr', { symbol: BINANCE_WBTC_USDT })),
    ]);

    const responses = [
      ['exchangeInfo', catalogResponse],
      ['WBTCUSDT trades', wbtcTradesResponse],
      ['USDTUSD trades', fxTradesResponse],
      ['WBTCUSDT book', wbtcBookResponse],
      ['USDTUSD book', fxBookResponse],
      ['WBTCUSDT 24h ticker', volumeResponse],
    ] as const;
    for (const [name, response] of responses) {
      if (!response.ok) throw new Error(`binance ${name} ${response.status}`);
    }

    const [catalogBody, wbtcTradesBody, fxTradesBody, wbtcBookBody, fxBookBody, volumeBody] =
      await Promise.all(responses.map(([, response]) => response.json()));
    validateBinanceSpotMarkets(catalogBody);

    const wbtcTrade = parseBinanceLatestTrade(wbtcTradesBody, BINANCE_WBTC_USDT, now);
    const fxTrade = parseBinanceLatestTrade(fxTradesBody, BINANCE_USDT_USD, now);
    const wbtcBook = parseBinanceBookTicker(wbtcBookBody, BINANCE_WBTC_USDT);
    const fxBook = parseBinanceBookTicker(fxBookBody, BINANCE_USDT_USD);
    const volumeTicker = validateBinanceResponse(volumeBody, `24hr ${BINANCE_WBTC_USDT}`);
    if (volumeTicker.symbol !== BINANCE_WBTC_USDT) {
      throw new Error('binance 24h ticker returned an unexpected market');
    }
    const volume = parseNonNegative(volumeTicker.volume);
    if (volume === null) throw new Error('binance WBTCUSDT 24h volume is invalid');

    const bid = wbtcBook.bid * fxBook.bid;
    const ask = wbtcBook.ask * fxBook.ask;
    const price = (bid + ask) / 2;
    if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask < bid) {
      throw new Error('binance WBTC/USD cross-market order book is invalid');
    }
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('binance WBTC/USD cross-market midpoint is invalid');
    }

    return {
      exchange: 'binance',
      symbol,
      price,
      bid,
      ask,
      volume,
      sourceObservedAt: new Date(
        Math.min(wbtcTrade.timestampMs, fxTrade.timestampMs)
      ).toISOString(),
    };
  };
}

const ADAPTERS: MarketReferenceAdapter[] = [
  { name: 'coinbase', fn: fetchCoinbaseSpot },
  { name: 'kraken', fn: fetchKrakenSpot, supports: (symbol) => Boolean(KRAKEN_PAIRS[symbol]) },
  { name: 'gemini', fn: fetchGeminiSpot, supports: (symbol) => Boolean(GEMINI_TICKERS[symbol]) },
  {
    name: 'crypto.com',
    fn: fetchCryptoComSpot,
    supports: (symbol) => Boolean(CRYPTO_COM_INSTRUMENTS[symbol]),
  },
  {
    name: 'bitstamp',
    requiresExplicitAdmission: true,
    bind: createBitstampFetcher,
  },
  {
    name: 'bitfinex',
    requiresExplicitAdmission: true,
    bind: createBitfinexFetcher,
  },
  {
    name: 'binance',
    requiresExplicitAdmission: true,
    bind: createBinanceFetcher,
    supports: (symbol) => symbol.toUpperCase() === 'WBTC',
  },
  {
    // Solana DEX-derived sources: each prices the whole CAIP-19 Solana
    // registry with exactly ONE batch request per run (see solanaDexSources).
    name: 'dexscreener',
    bind: createDexScreenerFetcher,
    supports: isSolanaDexPricedSymbol,
  },
  {
    name: 'geckoterminal',
    bind: createGeckoTerminalFetcher,
    supports: isSolanaDexPricedSymbol,
  },
  {
    name: 'jupiter',
    bind: createJupiterLiteFetcher,
    supports: isSolanaDexPricedSymbol,
  },
];

function adapterAdmitted(
  adapter: MarketReferenceAdapter,
  deps: MarketReferenceDeps,
  rights: Readonly<Record<MarketReferenceVenue, MarketReferenceSourceRights>>,
  now: number
): boolean {
  if (deps.purpose === 'customer-facing') {
    return hasCustomerMarketReferenceRights(rights[adapter.name], now);
  }
  // A synthetic run must inject its own fetch implementation. This keeps the
  // test mode from accidentally contacting a real vendor endpoint.
  if (!deps.fetchImpl) return false;
  return (
    !adapter.requiresExplicitAdmission || deps.enabledExchanges?.includes(adapter.name) === true
  );
}

function rightsForCollection(
  purpose: MarketReferenceCollectionPurpose,
  venue: MarketReferenceVenue,
  rights: Readonly<Record<MarketReferenceVenue, MarketReferenceSourceRights>>
): Pick<MarketReferenceRow, 'rights_scope' | 'rights_reference' | 'delivery_policy'> {
  if (purpose === 'synthetic-test') {
    return {
      rights_scope: 'synthetic',
      rights_reference: null,
      delivery_policy: 'not-authorized',
    };
  }
  const sourceRights = rights[venue];
  return {
    rights_scope: purpose === 'customer-facing' ? 'vendor-licensed' : sourceRights.rightsScope,
    rights_reference: purpose === 'customer-facing' ? sourceRights.agreementReference : null,
    delivery_policy: purpose === 'customer-facing' ? sourceRights.deliveryPolicy : 'not-authorized',
  };
}

/**
 * Collect one pass: for every universe symbol, query all configured exchanges,
 * returning one row per (symbol, exchange). Each exchange failure is captured
 * as an explicit failed row (auditable) rather than silently skipped.
 * Client-measured latency is recorded per request as the freshness proxy.
 */
export async function collectMarketReference(
  snapshotTs: Date,
  deps: MarketReferenceDeps
): Promise<{ rows: MarketReferenceRow[]; summary: MarketReferenceSummary }> {
  const rawFetch = deps.fetchImpl ?? fetch;
  // Hard per-request timeout so a stalled exchange API cannot hang a 15-min
  // collection run (the workflow deadline is a backstop, not the first line).
  const fetchImpl = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await rawFetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };
  const now = deps.now ?? Date.now;
  const symbols = deps.symbols ? [...deps.symbols] : [...MARKET_REFERENCE_SYMBOLS];
  const snapshotIso = snapshotTs.toISOString();
  const rows: MarketReferenceRow[] = [];
  const sourceRights = deps.sourceRights ?? MARKET_REFERENCE_SOURCE_RIGHTS;
  const adapters = ADAPTERS.filter((adapter) =>
    adapterAdmitted(adapter, deps, sourceRights, now())
  ).map((adapter) => ({
    ...adapter,
    fetchQuote: adapter.bind
      ? adapter.bind(fetchImpl, now)
      : (symbol: string) => {
          if (!adapter.fn) throw new Error(`${adapter.name} adapter has no fetcher`);
          return adapter.fn(symbol, fetchImpl, now);
        },
  }));

  for (const symbol of symbols) {
    // Requests for each asset run concurrently. Assets remain sequential so a
    // full pass stays bounded at the free public APIs.
    const symbolRows = await Promise.all(
      adapters
        .filter(({ supports }) => !supports || supports(symbol))
        .map(async ({ name, fetchQuote }): Promise<MarketReferenceRow> => {
          const started = now();
          try {
            const quote = await fetchQuote(symbol);
            const latency = Math.round((now() - started) / 1000);
            const ok = quote.price !== null;
            return {
              snapshot_ts: snapshotIso,
              symbol,
              quote: MARKET_REFERENCE_QUOTE,
              exchange: quote.exchange,
              ref_price: quote.price,
              volume: quote.volume ?? null,
              bid: quote.bid ?? null,
              ask: quote.ask ?? null,
              bid_ask_spread_pct: spreadPct(quote.bid, quote.ask),
              data_age_seconds: latency,
              ...(quote.sourceObservedAt ? { source_observed_at: quote.sourceObservedAt } : {}),
              ...rightsForCollection(deps.purpose, name, sourceRights),
              is_success: ok,
              error_message: ok ? null : 'unusable price from exchange',
              collector_version: COLLECTOR_VERSION,
            };
          } catch (error) {
            const latency = Math.round((now() - started) / 1000);
            const message = error instanceof Error ? error.message : String(error);
            logger.warn('market reference fetch failed', {
              symbol,
              exchange: name,
              error: message,
            });
            return {
              snapshot_ts: snapshotIso,
              symbol,
              quote: MARKET_REFERENCE_QUOTE,
              exchange: name,
              ref_price: null,
              volume: null,
              bid: null,
              ask: null,
              bid_ask_spread_pct: null,
              data_age_seconds: latency,
              ...rightsForCollection(deps.purpose, name, sourceRights),
              is_success: false,
              error_message: message,
              collector_version: COLLECTOR_VERSION,
            };
          }
        })
    );
    rows.push(...symbolRows);
    const successes = symbolRows.filter((row) => row.is_success).length;
    if (successes === 0) {
      logger.warn('market reference uncovered symbol (fail-closed, no estimate written)', {
        symbol,
      });
    }
  }

  const covered = symbols.filter((s) => rows.some((r) => r.symbol === s && r.is_success));
  const uncovered = symbols.filter((s) => !covered.includes(s));

  // Cross-exchange consistency: max pairwise deviation over successful quotes.
  let maxCrossExchangeSpreadPct: number | null = null;
  for (const symbol of covered) {
    const prices = rows
      .filter((r) => r.symbol === symbol && r.is_success && r.ref_price !== null)
      .map((r) => r.ref_price as number);
    if (prices.length < 2) continue;
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    if (max > 0) {
      const spread = ((max - min) / max) * 100;
      if (maxCrossExchangeSpreadPct === null || spread > maxCrossExchangeSpreadPct) {
        maxCrossExchangeSpreadPct = spread;
      }
    }
  }

  const summary: MarketReferenceSummary = {
    snapshot_ts: snapshotIso,
    symbols,
    rows: rows.length,
    covered,
    uncovered,
    maxCrossExchangeSpreadPct,
    eligibleExchanges: adapters.map((adapter) => adapter.name),
    collectionPurpose: deps.purpose,
  };
  logger.info('market reference collection complete', { ...summary });
  return { rows, summary };
}
