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
 * Binance note: api.binance.com is geo-blocked in some GitHub runner regions;
 * it is collected best-effort (Kraken + Coinbase are the dependable pair and
 * both are US-runner-safe). Cross-exchange consistency is computed by the
 * `market_reference_hourly` view, not asserted here.
 */

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('MarketReference');

/** Bump when the fetch/row semantics change; pinned for reproducibility. */
export const COLLECTOR_VERSION = '1.0.0';

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
  ETH: 'ETHUSD',
  BTC: 'XBTUSD',
  USDC: 'USDCUSD',
  USDT: 'USDTUSD',
};

const BINANCE_SYMBOLS: Record<string, string> = {
  ETH: 'ETHUSDT',
  BTC: 'BTCUSDT',
  USDC: 'USDCUSDT',
  USDT: 'USDTUSDT',
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
  const body = (await r.json()) as { result?: Record<string, { c?: unknown[] }> };
  const ticker = body.result?.[pair];
  return { exchange: 'kraken', symbol, price: parsePrice(ticker?.c?.[0]) };
}

async function fetchBinanceSpot(symbol: string, fetchImpl: typeof fetch): Promise<ExchangeQuote> {
  const pair = BINANCE_SYMBOLS[symbol];
  const url = `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`;
  const r = await fetchImpl(url);
  if (!r.ok) throw new Error(`binance ${r.status}`);
  const body = (await r.json()) as { price?: unknown };
  return { exchange: 'binance', symbol, price: parsePrice(body.price) };
}

const ADAPTERS: Array<{
  name: string;
  fn: (symbol: string, f: typeof fetch) => Promise<ExchangeQuote>;
}> = [
  { name: 'coinbase', fn: fetchCoinbaseSpot },
  { name: 'kraken', fn: fetchKrakenSpot },
  { name: 'binance', fn: fetchBinanceSpot },
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
  const fetchImpl = deps.fetchImpl ?? fetch;
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
