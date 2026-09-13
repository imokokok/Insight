/**
 * Market-reference collector — the external truth layer.
 *
 * Fetches independent CEX spot prices for the Oracle Watch universe
 * (the demand-led 12-asset set below, quote USD) every 15 minutes from GitHub Actions
 * (`market-reference-collect.yml`), writing one row per (symbol, exchange,
 * snapshot_ts) into `market_reference_snapshots` (migration 0038).
 *
 * Why this exists (see the data-strategy analysis):
 *  - Oracle-consensus labels cannot see manipulation when ALL providers move
 *    together. A CEX reference is a non-derived, independent source — the
 *    same "non-derived group" concept as the Watch independence gate — and
 *    oracle-vs-market divergence is the closest thing to a manipulation
 *    ground truth available without inside information.
 *  - This layer is EVIDENCE, not a decision input: it never relaxes a verdict
 *    gate and never enters signed receipts. It feeds (a) the training
 *    pipeline's `oracle_vs_market_deviation_pct` feature + Track-B label and
 *    (b) a Watch ADVISORY divergence reason code.
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
 * Gemini note: replaced Binance as the third source. Binance's public API is
 * geo-blocked (HTTP 451) on GitHub US runners, so it contributed zero
 * successful rows in production. Gemini (NY-regulated, public keyless
 * pubticker) gives us a third source where it lists the asset, while Coinbase
 * and Kraken retain two-source coverage for the full demand-led universe.
 * For supported assets, three independent sources provide a stronger median;
 * unsupported pairs remain explicit failed observations rather than estimates.
 * Cross-exchange consistency is computed by the `market_reference_hourly`
 * view, not asserted here.
 */

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('MarketReference');

/** Bump when the fetch/row semantics change; pinned for reproducibility. */
export const COLLECTOR_VERSION = '1.2.0'; // 1.2.0: demand-led universe + ticker liquidity context

/** Quote currency for all rows. */
export const MARKET_REFERENCE_QUOTE = 'USD';

/** The Oracle Watch universe symbols (asset-level; CEX prices are not chain-scoped). */
export const MARKET_REFERENCE_SYMBOLS = [
  'ETH',
  'BTC',
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
] as const;

/** Core assets retain 15-minute coverage; demand-led additions run hourly. */
export const MARKET_REFERENCE_CORE_SYMBOLS = ['ETH', 'BTC', 'USDC', 'USDT'] as const;

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

// Gemini ticker symbols (lowercase base + usd). VERIFIED against the live
// API for all four universe symbols (public pubticker, no key, US-friendly).
const GEMINI_TICKERS: Record<string, string> = {
  ETH: 'ethusd',
  BTC: 'btcusd',
  USDC: 'usdcusd',
  USDT: 'usdtusd',
  SOL: 'solusd',
  XRP: 'xrpusd',
  HYPE: 'hypeusd',
};

export interface ExchangeQuote {
  exchange: string;
  symbol: string;
  price: number | null;
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
}

export interface MarketReferenceDeps {
  fetchImpl?: typeof fetch;
  now?: () => number;
  /** Optional bounded subset used by the free-tier cadence router. */
  symbols?: readonly string[];
}

/** Per-request timeout (ms) — abort a stalled exchange call, never hang a run. */
export const REQUEST_TIMEOUT_MS = 15_000;

/** Parse a string/unknown price from an exchange response; null if unusable. */
function parsePrice(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
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

async function fetchCoinbaseSpot(symbol: string, fetchImpl: typeof fetch): Promise<ExchangeQuote> {
  const product = requirePair(COINBASE_PRODUCTS, symbol, 'coinbase');
  // Exchange ticker is as public/keyless as the old spot endpoint, and returns
  // bid/ask + 24h base volume in the same request (no extra free-tier cost).
  const url = `https://api.exchange.coinbase.com/products/${product}/ticker`;
  const r = await fetchImpl(url);
  if (!r.ok) throw new Error(`coinbase ${r.status}`);
  const body = (await r.json()) as {
    price?: unknown;
    bid?: unknown;
    ask?: unknown;
    volume?: unknown;
  };
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
  const body = (await r.json()) as {
    error?: unknown[];
    result?: Record<string, { a?: unknown[]; b?: unknown[]; c?: unknown[]; v?: unknown[] }>;
  };
  if (Array.isArray(body.error) && body.error.length > 0) {
    throw new Error(`kraken ${String(body.error[0])}`);
  }
  // Kraken normalizes aliases in response keys. Use the sole returned ticker
  // instead of coupling every newly supported asset to its canonical key.
  const ticker = Object.values(body.result ?? {})[0];
  if (!ticker) {
    throw new Error(`kraken unexpected response shape (pair ${pair} not in result)`);
  }
  return {
    exchange: 'kraken',
    symbol,
    price: parsePrice(ticker.c?.[0]),
    ask: parsePrice(ticker.a?.[0]),
    bid: parsePrice(ticker.b?.[0]),
    volume: parsePrice(ticker.v?.[1] ?? ticker.v?.[0]),
  };
}

async function fetchGeminiSpot(symbol: string, fetchImpl: typeof fetch): Promise<ExchangeQuote> {
  const ticker = requirePair(GEMINI_TICKERS, symbol, 'gemini');
  const url = `https://api.gemini.com/v1/pubticker/${ticker}`;
  const r = await fetchImpl(url);
  if (!r.ok) throw new Error(`gemini ${r.status}`);
  const body = (await r.json()) as {
    last?: unknown;
    bid?: unknown;
    ask?: unknown;
    volume?: Record<string, unknown>;
  };
  return {
    exchange: 'gemini',
    symbol,
    price: parsePrice(body.last),
    bid: parsePrice(body.bid),
    ask: parsePrice(body.ask),
    volume: parsePrice(body.volume?.[symbol] ?? body.volume?.[symbol.toUpperCase()]),
  };
}

const ADAPTERS: Array<{
  name: string;
  fn: (symbol: string, f: typeof fetch) => Promise<ExchangeQuote>;
  supports?: (symbol: string) => boolean;
}> = [
  { name: 'coinbase', fn: fetchCoinbaseSpot },
  { name: 'kraken', fn: fetchKrakenSpot },
  { name: 'gemini', fn: fetchGeminiSpot, supports: (symbol) => Boolean(GEMINI_TICKERS[symbol]) },
];

/**
 * Collect one pass: for every universe symbol, query all configured exchanges,
 * returning one row per (symbol, exchange). Each exchange failure is captured
 * as an explicit failed row (auditable) rather than silently skipped.
 * Client-measured latency is recorded per request as the freshness proxy.
 */
export async function collectMarketReference(
  snapshotTs: Date,
  deps: MarketReferenceDeps = {}
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

  for (const symbol of symbols) {
    // Three requests per asset run concurrently. Assets remain sequential so a
    // 12-symbol pass never bursts 36 requests at the free public APIs.
    const symbolRows = await Promise.all(
      ADAPTERS.filter(({ supports }) => !supports || supports(symbol)).map(
        async ({ name, fn }): Promise<MarketReferenceRow> => {
          const started = now();
          try {
            const quote = await fn(symbol, fetchImpl);
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
              is_success: false,
              error_message: message,
              collector_version: COLLECTOR_VERSION,
            };
          }
        }
      )
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
  };
  logger.info('market reference collection complete', { ...summary });
  return { rows, summary };
}
