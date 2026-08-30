/* eslint-disable no-console */
/**
 * Historical market-reference backfill (workflow_dispatch only).
 *
 * Pulls ~BACKFILL_DAYS of hourly candles from Coinbase Exchange (primary,
 * start/end paging) and Kraken OHLC (secondary) for the universe symbols,
 * then upserts them into `market_reference_snapshots` as successful rows
 * (volume populated from candles).
 *
 * Why: the Track-B training label (oracle-vs-market divergence) needs months
 * of reference history. Waiting for the 15-min collector to accumulate it
 * would delay validation by months; backfilling 90 days unlocks historical
 * labels immediately.
 *
 * Hardening (from live-run failures):
 *  - every request has a 15s AbortController timeout — a stalled exchange API
 *    can never hang the run;
 *  - Coinbase paging is capped at 12 pages with an advance guard (if the API
 *    stops honoring start/end and returns the same page, bail instead of
 *    looping forever);
 *  - Kraken paging is capped at 12 pages with a cursor-advance guard;
 *  - rows are flushed per symbol (idempotent upsert) so partial progress
 *    survives a later failure;
 *  - a hard deadline force-exits the process so the workflow fails fast with
 *    a visible error instead of riding the job timeout.
 *
 * Run locally:
 *   npx tsx --env-file=.env.local scripts/backfill-market-reference.ts
 *   npx tsx --env-file=.env.local scripts/backfill-market-reference.ts --days 30
 */
import { createServiceRoleClient } from '@/lib/supabase/server';

import {
  MARKET_REFERENCE_QUOTE,
  MARKET_REFERENCE_SYMBOLS,
  type MarketReferenceRow,
} from '@/lib/marketReference/collector';

const BACKFILL_DAYS = Number(process.env.BACKFILL_DAYS) || 90;
const COLLECTOR_VERSION = 'backfill-1.0.0';

const COINBASE_PRODUCTS: Record<string, string> = {
  ETH: 'ETH-USD',
  BTC: 'BTC-USD',
  USDC: 'USDC-USD',
  USDT: 'USDT-USD',
};

const KRAKEN_PAIRS: Record<string, string> = {
  // Canonical Kraken names — VERIFIED against the live API: Ticker/OHLC
  // responses are keyed by the canonical name (ETH -> XETHZUSD, BTC ->
  // XXBTZUSD, USDT -> USDTZUSD; USDC -> USDCUSD). Matches collector.ts.
  ETH: 'XETHZUSD',
  BTC: 'XXBTZUSD',
  USDC: 'USDCUSD',
  USDT: 'USDTZUSD',
};

/** Per-request timeout (ms) — abort a stalled call, never hang the run. */
const REQUEST_TIMEOUT_MS = 15_000;
/** Hard deadline (ms): force-exit so the workflow fails fast, not at 20 min. */
const HARD_DEADLINE_MS = 11 * 60 * 1000;

interface Candle {
  time: Date;
  close: number;
  volume: number;
}

/** Fetch with a hard timeout so a stalled exchange API cannot hang the run. */
async function fetchWithTimeout(url: string, ms = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCoinbaseCandles(symbol: string, start: Date, end: Date): Promise<Candle[]> {
  const product = COINBASE_PRODUCTS[symbol];
  const url =
    `https://api.exchange.coinbase.com/products/${product}/candles` +
    `?granularity=3600&start=${encodeURIComponent(start.toISOString())}` +
    `&end=${encodeURIComponent(end.toISOString())}`;
  const r = await fetchWithTimeout(url);
  if (!r.ok) throw new Error(`coinbase candles ${r.status}`);
  const body = (await r.json()) as Array<[number, number, number, number, number, number]>;
  return body
    .filter((c) => Array.isArray(c) && c.length >= 6 && Number.isFinite(c[4]) && c[4] > 0)
    .map((c) => ({ time: new Date(c[0] * 1000), close: c[4], volume: c[5] }));
}

async function fetchKrakenOhlc(
  symbol: string,
  sinceEpoch: number
): Promise<Candle[]> {
  const pair = KRAKEN_PAIRS[symbol];
  const url = `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=60&since=${sinceEpoch}`;
  const r = await fetchWithTimeout(url);
  if (!r.ok) throw new Error(`kraken ohlc ${r.status}`);
  const body = (await r.json()) as {
    error?: unknown[];
    result?: { last?: number | string; [key: string]: unknown };
  };
  if (Array.isArray(body.error) && body.error.length > 0) {
    throw new Error(`kraken ${String(body.error[0])}`);
  }
  const list = body.result?.[pair] as
    | Array<[number, string, string, string, string, string, string, number]>
    | undefined;
  if (!list) throw new Error(`kraken unexpected response shape (pair ${pair} not in result)`);
  return (list ?? [])
    .filter(
      (c) => Array.isArray(c) && c.length >= 7 && Number.isFinite(Number(c[4])) && Number(c[4]) > 0
    )
    .map((c) => ({ time: new Date(Number(c[0]) * 1000), close: Number(c[4]), volume: Number(c[6]) }));
}

async function backfillSymbol(
  symbol: string,
  days: number,
  rows: MarketReferenceRow[]
): Promise<void> {
  const now = new Date();
  const startAll = new Date(now.getTime() - days * 86400_000);

  // --- Coinbase: page backwards in 300-candle (12.5-day) windows. -----------
  // Hard cap + advance guard: if the API ever stops honoring start/end, `end`
  // stops advancing and we bail instead of looping forever.
  let end = now;
  for (let page = 0; page < 12 && end > startAll; page++) {
    const start = new Date(Math.max(startAll.getTime(), end.getTime() - 12.5 * 86400_000));
    let candles: Candle[] = [];
    try {
      candles = await fetchCoinbaseCandles(symbol, start, end);
    } catch (error) {
      console.warn(
        `[backfill] coinbase ${symbol} page ${page} (${start.toISOString()}) failed:`,
        error instanceof Error ? error.message : error
      );
      break;
    }
    console.log(`[backfill] coinbase ${symbol} page ${page}: ${candles.length} candles`);
    for (const c of candles) {
      rows.push({
        snapshot_ts: c.time.toISOString(),
        symbol,
        quote: MARKET_REFERENCE_QUOTE,
        exchange: 'coinbase',
        ref_price: c.close,
        volume: c.volume,
        data_age_seconds: null,
        is_success: true,
        error_message: null,
        collector_version: COLLECTOR_VERSION,
      });
    }
    if (candles.length === 0) break;
    const oldest = candles[candles.length - 1].time;
    if (oldest.getTime() >= end.getTime()) {
      console.warn(`[backfill] coinbase ${symbol} page ${page} did not advance; aborting source`);
      break;
    }
    end = oldest;
  }

  // --- Kraken: page forward using the `since` cursor. -----------------------
  let since = Math.floor(startAll.getTime() / 1000);
  for (let i = 0; i < 12; i++) {
    let candles: Candle[] = [];
    try {
      candles = await fetchKrakenOhlc(symbol, since);
    } catch (error) {
      console.warn(
        `[backfill] kraken ${symbol} since=${since} failed:`,
        error instanceof Error ? error.message : error
      );
      break;
    }
    console.log(`[backfill] kraken ${symbol} page ${i}: ${candles.length} candles`);
    if (candles.length === 0) break;
    for (const c of candles) {
      rows.push({
        snapshot_ts: c.time.toISOString(),
        symbol,
        quote: MARKET_REFERENCE_QUOTE,
        exchange: 'kraken',
        ref_price: c.close,
        volume: c.volume,
        data_age_seconds: null,
        is_success: true,
        error_message: null,
        collector_version: COLLECTOR_VERSION,
      });
    }
    const newest = candles[candles.length - 1].time.getTime() / 1000;
    if (newest >= now.getTime() / 1000 - 3600) break; // reached the present hour
    if (newest <= since) {
      console.warn(`[backfill] kraken ${symbol} cursor not advancing (since=${since}); aborting`);
      break;
    }
    since = Math.max(Number.isFinite(newest) ? newest : since + 1, since + 1);
  }

  console.log(
    `[backfill] ${symbol}: ${rows.filter((r) => r.symbol === symbol).length} rows so far`
  );
}

/** Upsert a batch; idempotent (ignoreDuplicates) so partial progress persists. */
async function flushRows(rows: MarketReferenceRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const supabase = createServiceRoleClient();
  const CHUNK = 2000;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from('market_reference_snapshots').upsert(chunk, {
      onConflict: 'snapshot_ts,symbol,quote,exchange',
      ignoreDuplicates: true,
    });
    if (error) throw new Error(error.message);
    inserted += chunk.length;
  }
  return inserted;
}

async function main(): Promise<void> {
  const days =
    Number(process.argv.find((a) => a.startsWith('--days='))?.split('=')[1]) || BACKFILL_DAYS;
  console.log(`[backfill] backfilling ${days} days of market reference…`);
  let rows: MarketReferenceRow[] = [];
  let inserted = 0;
  for (const symbol of MARKET_REFERENCE_SYMBOLS) {
    await backfillSymbol(symbol, days, rows);
    inserted += await flushRows(rows);
    console.log(`[backfill] flushed ${rows.length} rows for ${symbol} (cumulative ${inserted})`);
    rows = [];
  }

  console.log(`[backfill] done: ${inserted} rows upserted (idempotent, retries safe)`);
  if (inserted === 0) {
    console.error('[backfill] nothing fetched — aborting without writing');
    process.exit(1);
  }
}

// Hard deadline: fail fast and loudly instead of riding the 20-min job timeout.
const deadlineTimer = setTimeout(() => {
  console.error(`[backfill] hard deadline (${HARD_DEADLINE_MS}ms) exceeded — forcing exit`);
  process.exit(1);
}, HARD_DEADLINE_MS);
deadlineTimer.unref?.();

main()
  .then(() => {
    clearTimeout(deadlineTimer);
    const graceTimer = setTimeout(() => process.exit(0), 2000);
    graceTimer.unref?.();
  })
  .catch((error) => {
    clearTimeout(deadlineTimer);
    console.error('[backfill] failed:', error);
    process.exit(1);
  });
