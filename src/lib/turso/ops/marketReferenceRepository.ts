// Turso repository for the market-reference domain (first Supabase egress
// retirement migration, 2026-11). Mirrors the write shape of
// scripts/collect-market-reference.ts: one row per
// (snapshot_ts, symbol, quote, exchange), duplicate-tolerant upsert.
//
// Mode contract (house pattern, cf. TURSO_PRICE_RECORDS_MODE):
//   'supabase' — write Supabase only (pre-migration behaviour)
//   'shadow'   — write Turso AND Supabase (verification window)
//   'turso'    — write Turso only (egress-retired end state)
import type { MarketReferenceRow } from '@/lib/marketReference/collector';

import type { Client, InStatement, InValue } from '@libsql/client/web';

export type TursoMarketRefMode = 'supabase' | 'shadow' | 'turso';

export function readTursoMarketRefMode(
  value: string | undefined = process.env.TURSO_MARKET_REF_MODE
): TursoMarketRefMode {
  if (value === undefined || value === '' || value === 'supabase') return 'supabase';
  if (value === 'shadow' || value === 'turso') return value;
  throw new Error('TURSO_MARKET_REF_MODE must be supabase, shadow, or turso');
}

function toInt(flag: boolean | undefined): 0 | 1 {
  return flag ? 1 : 0;
}

function normalizeIso(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

const INSERT_SQL = `
  INSERT INTO market_reference_snapshots (
    snapshot_ts, symbol, quote, exchange,
    ref_price, volume, bid, ask, bid_ask_spread_pct,
    data_age_seconds, source_observed_at,
    rights_scope, rights_reference, delivery_policy,
    is_success, error_message, collector_version, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (snapshot_ts, symbol, quote, exchange) DO NOTHING
`;

function bindRow(row: MarketReferenceRow, createdAt: string): InValue[] {
  return [
    normalizeIso(row.snapshot_ts),
    row.symbol,
    row.quote,
    row.exchange,
    row.ref_price,
    row.volume,
    row.bid ?? null,
    row.ask ?? null,
    row.bid_ask_spread_pct ?? null,
    row.data_age_seconds,
    normalizeIso(row.source_observed_at),
    row.rights_scope ?? 'research-quarantined',
    row.rights_reference ?? null,
    row.delivery_policy ?? 'not-authorized',
    toInt(row.is_success),
    row.error_message,
    row.collector_version,
    createdAt,
  ];
}

export interface TursoMarketRefWriteResult {
  /** Rows handed to the INSERT (before duplicate suppression). */
  submitted: number;
  /** Rows actually stored (conflicts deduplicated). */
  inserted: number;
}

/**
 * Duplicate-tolerant batch upsert, mirroring the Supabase call's
 * `ignoreDuplicates: true` semantics. Rows are written in one transaction so
 * a partial batch can never persist.
 */
export async function upsertTursoMarketReferenceRows(
  client: Client,
  rows: readonly MarketReferenceRow[]
): Promise<TursoMarketRefWriteResult> {
  if (rows.length === 0) return { submitted: 0, inserted: 0 };

  const createdAt = new Date().toISOString();
  const statements: InStatement[] = rows.map((row) => ({
    sql: INSERT_SQL,
    args: bindRow(row, createdAt),
  }));

  const results = await client.batch(statements, 'write');
  const inserted = results.reduce((sum, r) => sum + Number(r.rowsAffected ?? 0), 0);
  return { submitted: rows.length, inserted };
}

/**
 * Retention trim (90-day window, Supabase migration 0138). The collector
 * calls this on every run so no nightly cron is required. Returns removed
 * rows; a failure here must not fail the collection run (the window only
 * drifts, data correctness is unaffected).
 */
export async function trimTursoMarketReferenceRows(
  client: Client,
  retentionDays: number,
  now: Date = new Date()
): Promise<number> {
  if (!Number.isSafeInteger(retentionDays) || retentionDays < 1) {
    throw new Error('retentionDays must be a positive integer');
  }
  const cutoff = new Date(now.getTime() - retentionDays * 86_400_000).toISOString();
  const result = await client.execute({
    sql: 'DELETE FROM market_reference_snapshots WHERE snapshot_ts < ?',
    args: [cutoff],
  });
  return Number(result.rowsAffected ?? 0);
}

export interface TursoMarketReferenceSampleRow {
  snapshot_ts: string;
  symbol: string;
  quote: string;
  exchange: string;
  ref_price: number | null;
  is_success: boolean;
}

/** Latest successful quote per symbol (sample/verifier surface). */
export async function readLatestSuccessfulRows(
  client: Client,
  symbols: readonly string[],
  limitPerSymbol = 5
): Promise<TursoMarketReferenceSampleRow[]> {
  if (symbols.length === 0) return [];
  const placeholders = symbols.map(() => '?').join(', ');
  const result = await client.execute({
    sql: `
      WITH ranked AS (
        SELECT snapshot_ts, symbol, quote, exchange, ref_price, is_success,
               ROW_NUMBER() OVER (
                 PARTITION BY symbol
                 ORDER BY snapshot_ts DESC
               ) AS rn
        FROM market_reference_snapshots
        WHERE is_success = 1 AND symbol IN (${placeholders})
      )
      SELECT snapshot_ts, symbol, quote, exchange, ref_price
      FROM ranked WHERE rn <= ?
      ORDER BY symbol, snapshot_ts DESC
    `,
    args: [...symbols, limitPerSymbol],
  });
  return result.rows.map((r) => ({
    snapshot_ts: String(r.snapshot_ts),
    symbol: String(r.symbol),
    quote: String(r.quote),
    exchange: String(r.exchange),
    ref_price: r.ref_price === null ? null : Number(r.ref_price),
    is_success: true,
  }));
}

export interface MarketReferenceHourlyAggregate {
  symbol: string;
  ref_hour: string;
  /** Median ref price; SQLite has no ordered-set aggregate, so this is the
   * average of the two middle values — the standard median definition. */
  ref_price: number;
  exchange_count: number;
  min_ref_price: number;
  max_ref_price: number;
  cross_exchange_spread_pct: number;
}

export interface TursoLatestMarketReference {
  symbol: string;
  ref_hour: string;
  ref_price: number;
  exchange_count: number;
  cross_exchange_spread_pct: number;
  median_bid_ask_spread_pct: number | null;
  median_volume: number | null;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/**
 * Port of get_latest_market_reference (migration 0090). The rights predicate
 * is intentionally enforced in SQL as a second gate, even though the caller
 * also checks the reviewed rights registry before making this query.
 */
export async function readTursoLatestMarketReference(
  client: Client,
  symbol: string,
  now: Date = new Date()
): Promise<TursoLatestMarketReference | null> {
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) throw new Error('Invalid market-reference clock');
  const currentHourMs = Math.floor(nowMs / 3_600_000) * 3_600_000;
  // Match migration 0090's bounded three-hour search window exactly.
  const lowerMs = Math.floor((nowMs - 3 * 3_600_000) / 3_600_000) * 3_600_000 + 3_600_000;
  const result = await client.execute({
    sql: `SELECT snapshot_ts, exchange, ref_price, bid_ask_spread_pct, volume
          FROM market_reference_snapshots
          WHERE symbol = ? AND is_success = 1 AND ref_price > 0
            AND rights_scope = 'vendor-licensed'
            AND snapshot_ts >= ? AND snapshot_ts < ?
          ORDER BY snapshot_ts DESC`,
    args: [
      symbol.toUpperCase(),
      new Date(lowerMs).toISOString(),
      new Date(currentHourMs + 3_600_000).toISOString(),
    ],
  });

  const parsedRows = result.rows.flatMap((row) => {
    const snapshotMs = Date.parse(String(row.snapshot_ts));
    const price = Number(row.ref_price);
    const exchange = String(row.exchange).trim();
    if (
      !Number.isFinite(snapshotMs) ||
      snapshotMs < lowerMs ||
      snapshotMs >= currentHourMs + 3_600_000 ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !exchange
    ) {
      return [];
    }
    const bucketMs = Math.floor(snapshotMs / 3_600_000) * 3_600_000;
    return [{ bucketMs, exchange, price, bidAsk: row.bid_ask_spread_pct, volume: row.volume }];
  });
  if (parsedRows.length === 0) return null;

  const latestHourMs = Math.max(...parsedRows.map((row) => row.bucketMs));
  const byExchange = new Map<string, { prices: number[]; bidAsk: number[]; volume: number[] }>();
  for (const row of parsedRows) {
    if (row.bucketMs !== latestHourMs) continue;
    const group = byExchange.get(row.exchange) ?? { prices: [], bidAsk: [], volume: [] };
    group.prices.push(row.price);
    const bidAsk = Number(row.bidAsk);
    if (row.bidAsk !== null && row.bidAsk !== undefined && Number.isFinite(bidAsk) && bidAsk >= 0) {
      group.bidAsk.push(bidAsk);
    }
    const volume = Number(row.volume);
    if (row.volume !== null && row.volume !== undefined && Number.isFinite(volume) && volume >= 0) {
      group.volume.push(volume);
    }
    byExchange.set(row.exchange, group);
  }

  const prices: number[] = [];
  const bidAsk: number[] = [];
  const volume: number[] = [];
  for (const group of byExchange.values()) {
    const price = median(group.prices);
    if (price !== null) prices.push(price);
    const spread = median(group.bidAsk);
    if (spread !== null) bidAsk.push(spread);
    const tradedVolume = median(group.volume);
    if (tradedVolume !== null) volume.push(tradedVolume);
  }
  const refPrice = median(prices);
  if (refPrice === null || prices.length === 0) return null;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return {
    symbol: symbol.toUpperCase(),
    ref_hour: new Date(latestHourMs).toISOString(),
    ref_price: refPrice,
    exchange_count: prices.length,
    cross_exchange_spread_pct: maxPrice > 0 ? ((maxPrice - minPrice) / maxPrice) * 100 : 0,
    median_bid_ask_spread_pct: median(bidAsk),
    median_volume: median(volume),
  };
}

/**
 * Hourly aggregates, replacing the Supabase `market_reference_hourly` view
 * (which uses percentile_cont(0.5), unavailable in SQLite). Grouping happens
 * in SQL; the median is computed over the small per-(symbol,hour) groups in
 * JavaScript.
 */
export async function readHourlyAggregates(
  client: Client,
  symbols: readonly string[],
  hours: number = 24,
  now: Date = new Date()
): Promise<MarketReferenceHourlyAggregate[]> {
  const since = new Date(now.getTime() - hours * 3_600_000).toISOString();
  const baseArgs: InValue[] = [since];
  let symbolFilter = '';
  if (symbols.length > 0) {
    symbolFilter = ` AND symbol IN (${symbols.map(() => '?').join(', ')})`;
    baseArgs.push(...symbols);
  }
  const result = await client.execute({
    sql: `
      SELECT symbol,
             substr(snapshot_ts, 1, 13) AS hour_bucket,
             ref_price
      FROM market_reference_snapshots
      WHERE is_success = 1 AND ref_price > 0 AND snapshot_ts >= ?${symbolFilter}
      ORDER BY hour_bucket, symbol, ref_price
    `,
    args: baseArgs,
  });

  const groups = new Map<string, number[]>();
  for (const row of result.rows) {
    const key = `${String(row.symbol)}|${String(row.hour_bucket)}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(Number(row.ref_price));
    groups.set(key, bucket);
  }

  const aggregates: MarketReferenceHourlyAggregate[] = [];
  for (const [key, prices] of groups) {
    const [symbol, hourBucket] = key.split('|');
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    aggregates.push({
      symbol,
      ref_hour: `${hourBucket}:00:00Z`,
      ref_price: median,
      exchange_count: sorted.length,
      min_ref_price: min,
      max_ref_price: max,
      cross_exchange_spread_pct: max > 0 ? ((max - min) / max) * 100 : 0,
    });
  }
  aggregates.sort((a, b) =>
    a.ref_hour === b.ref_hour
      ? a.symbol.localeCompare(b.symbol)
      : a.ref_hour.localeCompare(b.ref_hour)
  );
  return aggregates;
}
