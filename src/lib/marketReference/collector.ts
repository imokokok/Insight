/**
 * Market-reference collector — the external truth layer.
 *
 * Fetches independent CEX spot prices for the Oracle Watch universe
 * (ETH/BTC/USDC/USDT, quote USD) every 15 minutes from GitHub Actions
 * (`market-reference-collect.yml`), writing one row per (symbol, exchange,
 * snapshot_ts) into `market_reference_snapshots` (migration 0037).
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
 * pubticker, verified live for BTC/ETH/USDC/USDT) gives us three dependable,
 * US-runner-safe, high-credibility sources — a 3-source median bounds any
 * single source's influence on the reference. Cross-exchange consistency is
 * computed by the `market_reference_hourly` view, not asserted here.
 */

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('MarketReference');

/** Bump when the fetch/row semantics change; pinned for reproducibility. */
export const COLLECTOR_VERSION = '1.1.0'; // 1.1.0: Binance -> Gemini third source

/** Quote currency for all rows. */
export const MARKET_REFERENCE_QUOTE = 'USD';

/** The Oracle Watch universe symbols (asset-level; CEX prices are not chain-scoped). */
export const MARKET_REFERENCE_SYMBOLS = ['ETH', 'BTC', 'USDC', 'USDT'] as const;

/** Per-exchange symbol → trading-pair mapping (quote USD). */
const COINBASE_PRODUCTS: Record<string, string> = {
  ETH: 'ETH-USD',
  BTC: 'BTC-USD',
  USDC: 'USDC-USD',
  USDT: 'USDT-USD',
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
};

// Gemini ticker symbols (lowercase base + usd). VERIFIED against the live
// API for all four universe symbols (public pubticker, no key, US-friendly).
const GEMINI_TICKERS: Record<string, string> = {
  ETH: 'ethusd',
  BTC: 'btcusd',
  USDC: 'usdcusd',
  USDT: 'usdtusd',
};

export interface ExchangeQuote {
  exchange: string;
  symbol: string;
  price: number | null;
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
}

/** Per-request timeout (ms) — abort a stalled exchange call, never hang a run. */
export const REQUEST_TIMEOUT_MS = 15_000;

/** Parse a string/unknown price from an exchange response; null if unusable. */
function parsePrice(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function fetchCoinbaseSpot(symbol: string, fetchImpl: typeof fetch): Promise<ExchangeQuote> {
  const product = COINBASE_PRODUCTS[symbol];
  const url = `https://api.coinbase.com/v2/prices/${product}/spot`;
  const r = await fetchImpl(url);
  if (!r.ok) throw new Error(`coinbase ${r.status}`);
  const body = (await r.json()) as { data?: { amount?: unknown } };
  return { exchange: 'coinbase', symbol, price: parsePrice(body.data?.amount) };
}

async function fetchKrakenSpot(symbol: string, fetchImpl: typeof fetch): Promise<ExchangeQuote> {
  const pair = KRAKEN_PAIRS[symbol];
  const url = `https://api.kraken.com/0/public/Ticker?pair=${pair}`;
  const r = await fetchImpl(url);
  if (!r.ok) throw new Error(`kraken ${r.status}`);
  // Kraken returns HTTP 200 with a non-empty `error` array on failures
  // (e.g. rate limits) — surface the real reason instead of a generic miss.
  const body = (await r.json()) as {
    error?: unknown[];
    result?: Record<string, { c?: unknown[] }>;
  };
  if (Array.isArray(body.error) && body.error.length > 0) {
    throw new Error(`kraken ${String(body.error[0])}`);
  }
  const ticker = body.result?.[pair];
  if (!ticker) {
    throw new Error(`kraken unexpected response shape (pair ${pair} not in result)`);
  }
  return { exchange: 'kraken', symbol, price: parsePrice(ticker.c?.[0]) };
}

async function fetchGeminiSpot(symbol: string, fetchImpl: typeof fetch): Promise<ExchangeQuote> {
  const ticker = GEMINI_TICKERS[symbol];
  const url = `https://api.gemini.com/v1/pubticker/${ticker}`;
  const r = await fetchImpl(url);
  if (!r.ok) throw new Error(`gemini ${r.status}`);
  const body = (await r.json()) as { last?: unknown };
  return { exchange: 'gemini', symbol, price: parsePrice(body.last) };
}

const ADAPTERS: Array<{
  name: string;
  fn: (symbol: string, f: typeof fetch) => Promise<ExchangeQuote>;
}> = [
  { name: 'coinbase', fn: fetchCoinbaseSpot },
  { name: 'kraken', fn: fetchKrakenSpot },
  { name: 'gemini', fn: fetchGeminiSpot },
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
  const snapshotIso = snapshotTs.toISOString();
  const rows: MarketReferenceRow[] = [];

  for (const symbol of MARKET_REFERENCE_SYMBOLS) {
    let successes = 0;
    for (const { name, fn } of ADAPTERS) {
      const started = now();
      let quote: ExchangeQuote;
      try {
        quote = await fn(symbol, fetchImpl);
        const latency = Math.round((now() - started) / 1000);
        const ok = quote.price !== null;
        if (ok) successes++;
        rows.push({
          snapshot_ts: snapshotIso,
          symbol,
          quote: MARKET_REFERENCE_QUOTE,
          exchange: quote.exchange,
          ref_price: quote.price,
          volume: null,
          data_age_seconds: latency,
          is_success: ok,
          error_message: ok ? null : 'unusable price from exchange',
          collector_version: COLLECTOR_VERSION,
        });
      } catch (error) {
        const latency = Math.round((now() - started) / 1000);
        rows.push({
          snapshot_ts: snapshotIso,
          symbol,
          quote: MARKET_REFERENCE_QUOTE,
          exchange: name,
          ref_price: null,
          volume: null,
          data_age_seconds: latency,
          is_success: false,
          error_message: error instanceof Error ? error.message : String(error),
          collector_version: COLLECTOR_VERSION,
        });
        logger.warn('market reference fetch failed', {
          symbol,
          exchange: name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    if (successes === 0) {
      logger.warn('market reference uncovered symbol (fail-closed, no estimate written)', {
        symbol,
      });
    }
  }

  const covered = MARKET_REFERENCE_SYMBOLS.filter((s) =>
    rows.some((r) => r.symbol === s && r.is_success)
  );
  const uncovered = MARKET_REFERENCE_SYMBOLS.filter((s) => !covered.includes(s));

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
    symbols: [...MARKET_REFERENCE_SYMBOLS],
    rows: rows.length,
    covered,
    uncovered,
    maxCrossExchangeSpreadPct,
  };
  logger.info('market reference collection complete', { ...summary });
  return { rows, summary };
}

/** Persist rows via an injected writer (Supabase client in the scripts). */
export async function insertMarketReferenceRows(
  rows: MarketReferenceRow[],
  writer: (rows: MarketReferenceRow[]) => Promise<number>
): Promise<number> {
  if (rows.length === 0) return 0;
  return writer(rows);
}
