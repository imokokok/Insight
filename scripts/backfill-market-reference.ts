/* eslint-disable no-console */
/**
 * Historical market-reference backfill (workflow_dispatch only).
 *
 * Pulls ~BACKFILL_DAYS of hourly candles from Coinbase Exchange (primary,
 * start/end paging), Kraken OHLC (secondary), and Crypto.com for WBTC/USD,
 * then upserts them into `market_reference_snapshots` as successful rows
 * (volume populated from candles). WBTC is never backfilled from Coinbase's
 * DEX experience as though it were a CEX market.
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
 *   npx tsx --env-file=.env.local scripts/backfill-market-reference.ts --days=30
 */
import {
  MARKET_REFERENCE_QUOTE,
  MARKET_REFERENCE_SYMBOLS,
  type MarketReferenceRow,
} from '@/lib/marketReference/collector';
import { createServiceRoleClient } from '@/lib/supabase/server';

const COLLECTOR_VERSION = 'backfill-1.2.0';

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
  // Canonical Kraken names — VERIFIED against the live API: Ticker/OHLC
  // responses are keyed by the canonical name (ETH -> XETHZUSD, BTC ->
  // XXBTZUSD, USDT -> USDTZUSD; USDC -> USDCUSD). Matches collector.ts.
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

const CRYPTO_COM_INSTRUMENTS: Record<string, string> = {
  WBTC: 'WBTC_USD',
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
  if (!product) throw new Error(`coinbase does not list ${symbol}/USD`);
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

async function fetchKrakenOhlc(symbol: string, sinceEpoch: number): Promise<Candle[]> {
  const pair = KRAKEN_PAIRS[symbol];
  if (!pair) throw new Error(`kraken does not list ${symbol}/USD`);
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
  const resultKey = Object.keys(body.result ?? {}).find((key) => key !== 'last');
  const list = (resultKey ? body.result?.[resultKey] : undefined) as
    | Array<[number, string, string, string, string, string, string, number]>
    | undefined;
  if (!list) throw new Error(`kraken unexpected response shape (pair ${pair} not in result)`);
  return (list ?? [])
    .filter(
      (c) => Array.isArray(c) && c.length >= 7 && Number.isFinite(Number(c[4])) && Number(c[4]) > 0
    )
    .map((c) => ({
      time: new Date(Number(c[0]) * 1000),
      close: Number(c[4]),
      volume: Number(c[6]),
    }));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseTimestampMs(value: unknown): number | null {
  const timestamp =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d{13}$/.test(value)
        ? Number(value)
        : Number.NaN;
  return Number.isSafeInteger(timestamp) && timestamp > 0 ? timestamp : null;
}

async function fetchCryptoComCandles(
  symbol: string,
  startMs: number,
  endMs: number
): Promise<Candle[]> {
  const instrument = CRYPTO_COM_INSTRUMENTS[symbol];
  if (!instrument) throw new Error(`crypto.com does not list ${symbol}/USD`);
  const params = new URLSearchParams({
    instrument_name: instrument,
    timeframe: '1h',
    count: '168',
    start_ts: String(startMs),
    end_ts: String(endMs),
  });
  const url = `https://api.crypto.com/exchange/v1/public/get-candlestick?${params.toString()}`;
  const r = await fetchWithTimeout(url);
  if (!r.ok) throw new Error(`crypto.com candles ${r.status}`);

  const body = asRecord(await r.json());
  if (!body) throw new Error('crypto.com unexpected candlestick response shape');
  if (body.code !== 0 && body.code !== '0') {
    throw new Error(`crypto.com candlestick API error (${String(body.code)})`);
  }
  const result = asRecord(body.result);
  if (result?.instrument_name !== instrument || !Array.isArray(result.data)) {
    throw new Error(`crypto.com candles missing ${instrument} data`);
  }

  return result.data.flatMap((rawCandle): Candle[] => {
    const candle = asRecord(rawCandle);
    if (!candle) return [];
    const timeMs = parseTimestampMs(candle.t);
    const close =
      typeof candle.c === 'string' || typeof candle.c === 'number' ? Number(candle.c) : NaN;
    const volume =
      typeof candle.v === 'string' || typeof candle.v === 'number' ? Number(candle.v) : NaN;
    if (
      timeMs === null ||
      timeMs < startMs ||
      timeMs >= endMs ||
      !Number.isFinite(close) ||
      close <= 0 ||
      !Number.isFinite(volume) ||
      volume < 0
    ) {
      return [];
    }
    return [{ time: new Date(timeMs), close, volume }];
  });
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
  // stops advancing and we bail instead of looping forever. Skip symbols with
  // no direct Coinbase CEX pair, including WBTC.
  if (COINBASE_PRODUCTS[symbol]) {
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
          bid: null,
          ask: null,
          bid_ask_spread_pct: null,
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
  } else {
    console.log(`[backfill] coinbase ${symbol}: no direct USD market; skipping source`);
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
        bid: null,
        ask: null,
        bid_ask_spread_pct: null,
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

  // --- Crypto.com: hourly WBTC/USD candles in bounded 7-day windows. ---------
  // Each 7-day window contains at most 168 hourly candles. This path only
  // exists for direct CCY_PAIR instruments.
  if (CRYPTO_COM_INSTRUMENTS[symbol]) {
    const windowMs = 7 * 86400_000;
    for (let startMs = startAll.getTime(); startMs < now.getTime(); startMs += windowMs) {
      const endMs = Math.min(startMs + windowMs, now.getTime());
      let candles: Candle[] = [];
      try {
        candles = await fetchCryptoComCandles(symbol, startMs, endMs);
      } catch (error) {
        console.warn(
          `[backfill] crypto.com ${symbol} window ${new Date(startMs).toISOString()} failed:`,
          error instanceof Error ? error.message : error
        );
        break;
      }
      console.log(`[backfill] crypto.com ${symbol} window: ${candles.length} candles`);
      for (const c of candles) {
        rows.push({
          snapshot_ts: c.time.toISOString(),
          symbol,
          quote: MARKET_REFERENCE_QUOTE,
          exchange: 'crypto.com',
          ref_price: c.close,
          volume: c.volume,
          bid: null,
          ask: null,
          bid_ask_spread_pct: null,
          data_age_seconds: null,
          is_success: true,
          error_message: null,
          collector_version: COLLECTOR_VERSION,
        });
      }
    }
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
  const requestedDays =
    process.argv.find((a) => a.startsWith('--days='))?.split('=')[1] ??
    process.env.BACKFILL_DAYS ??
    '90';
  const days = Number(requestedDays);
  if (!Number.isSafeInteger(days) || days < 1 || days > 150) {
    throw new RangeError('Backfill days must be an integer from 1 to 150');
  }
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
