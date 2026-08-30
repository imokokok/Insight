/* eslint-disable no-console */
/**
 * Historical market-reference backfill (workflow_dispatch only).
 *
 * Pulls ~BACKFILL_DAYS of hourly candles from Coinbase Exchange (primary,
 * US-runner-safe, start/end paging) and Kraken OHLC (secondary) for the
 * universe symbols, then upserts them into `market_reference_snapshots` as
 * successful rows (volume populated from candles).
 *
 * Why: the Track-B training label (oracle-vs-market divergence) needs months
 * of reference history. Waiting for the 15-min collector to accumulate it
 * would delay validation by months; backfilling 90 days unlocks historical
 * labels immediately.
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

interface Candle {
  time: Date;
  close: number;
  volume: number;
}

async function fetchCoinbaseCandles(
  symbol: string,
  start: Date,
  end: Date,
  fetchImpl: typeof fetch
): Promise<Candle[]> {
  const product = COINBASE_PRODUCTS[symbol];
  const url =
    `https://api.exchange.coinbase.com/products/${product}/candles` +
    `?granularity=3600&start=${encodeURIComponent(start.toISOString())}` +
    `&end=${encodeURIComponent(end.toISOString())}`;
  const r = await fetchImpl(url);
  if (!r.ok) throw new Error(`coinbase candles ${r.status}`);
  const body = (await r.json()) as Array<[number, number, number, number, number, number]>;
  return body
    .filter((c) => Array.isArray(c) && c.length >= 6 && Number.isFinite(c[4]) && c[4] > 0)
    .map((c) => ({ time: new Date(c[0] * 1000), close: c[4], volume: c[5] }));
}

async function fetchKrakenOhlc(
  symbol: string,
  sinceEpoch: number,
  fetchImpl: typeof fetch
): Promise<{ candles: Candle[]; last: number }> {
  const pair = KRAKEN_PAIRS[symbol];
  const url = `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=60&since=${sinceEpoch}`;
  const r = await fetchImpl(url);
  if (!r.ok) throw new Error(`kraken ohlc ${r.status}`);
  const body = (await r.json()) as {
    result?: { last?: number | string; [key: string]: unknown };
  };
  const list = body.result?.[pair] as Array<[number, string, string, string, string, string, string, number]> | undefined;
  const candles = (list ?? [])
    .filter((c) => Array.isArray(c) && c.length >= 7 && Number.isFinite(Number(c[4])) && Number(c[4]) > 0)
    .map((c) => ({ time: new Date(Number(c[0]) * 1000), close: Number(c[4]), volume: Number(c[6]) }));
  const last = Number(body.result?.last ?? 0);
  return { candles, last };
}

async function backfillSymbol(
  symbol: string,
  days: number,
  fetchImpl: typeof fetch,
  rows: MarketReferenceRow[]
): Promise<void> {
  const now = new Date();
  const startAll = new Date(now.getTime() - days * 86400_000);

  // --- Coinbase: page backwards in 300-candle (12.5-day) windows. ----------
  let end = now;
  while (end > startAll) {
    const start = new Date(Math.max(startAll.getTime(), end.getTime() - 12.5 * 86400_000));
    let candles: Candle[] = [];
    try {
      candles = await fetchCoinbaseCandles(symbol, start, end, fetchImpl);
    } catch (error) {
      console.warn(`[backfill] coinbase ${symbol} ${start.toISOString()} failed:`, error);
      break; // abort this source rather than looping forever on an error
    }
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
    end = oldest;
  }

  // --- Kraken: page forward using the `since`/`last` cursor. ---------------
  let since = Math.floor(startAll.getTime() / 1000);
  let last = since;
  for (let i = 0; i < 100; i++) {
    let candles: Candle[] = [];
    try {
      const res = await fetchKrakenOhlc(symbol, since, fetchImpl);
      candles = res.candles;
      last = res.last;
    } catch (error) {
      console.warn(`[backfill] kraken ${symbol} since=${since} failed:`, error);
      break;
    }
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
    if (last <= since || newest >= now.getTime() / 1000 - 3600) break;
    since = Math.max(last, since + 1);
  }

  console.log(`[backfill] ${symbol}: ${rows.filter((r) => r.symbol === symbol).length} rows so far`);
}

async function main(): Promise<void> {
  const days = Number(process.argv.find((a) => a.startsWith('--days='))?.split('=')[1]) || BACKFILL_DAYS;
  console.log(`[backfill] backfilling ${days} days of market reference…`);
  const rows: MarketReferenceRow[] = [];
  for (const symbol of MARKET_REFERENCE_SYMBOLS) {
    await backfillSymbol(symbol, days, fetch, rows);
  }

  console.log(`[backfill] total rows: ${rows.length}`);
  if (rows.length === 0) {
    console.error('[backfill] nothing fetched — aborting without writing');
    process.exit(1);
  }

  const supabase = createServiceRoleClient();
  // Batch upsert in chunks to stay well under Supabase payload limits.
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
  console.log(`[backfill] inserted ${inserted} rows (idempotent, retries safe)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[backfill] failed:', error);
    process.exit(1);
  });
