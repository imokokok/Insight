// Turso repository for the price-slot projection domain (egress retirement
// v2, 2026-11). The independent projector used to deliver Turso outbox slots
// back to Supabase via project_turso_price_slot; under
// TURSO_PRICE_PROJECTION_MODE=turso it lands here instead, so the delivery
// step no longer touches Supabase while Supabase is egress-restricted.
//
// Write shape mirrors the Supabase RPC contract (adaptiveSnapshotPersistence.
// projectTursoPriceSlot): idempotent hourly upsert keyed on
// (provider, symbol, chain_id, snapshot_hour) plus one delivery-ledger row per
// (slot_ms, input_hash). The first successful slot in each UTC hour supplies
// that hour's business snapshot; later slots still receive delivery receipts
// but do not rewrite the same hourly keys. Re-projecting an immutable payload
// is a no-op that reports replayed=true.
import type { HourlySnapshotRow } from '@/lib/supabase/adaptiveSnapshotPersistence';
import {
  evaluateCaptureContinuity,
  expectedRecentSlotMs,
  type CaptureContinuity,
} from '@/lib/supabase/captureContinuity';

import type { Client, InStatement, InValue } from '@libsql/client/web';

export type TursoPriceProjectionMode = 'supabase' | 'turso';

/**
 * Delivery target for the Turso price-slot outbox. Unlike the market-ref
 * migration there is no shadow mode: the raw slot already carries full
 * evidence in Turso, and dual-writing would burn Supabase egress during the
 * restricted window this migration exists to escape.
 */
export function readTursoPriceProjectionMode(
  value: string | undefined = process.env.TURSO_PRICE_PROJECTION_MODE
): TursoPriceProjectionMode {
  if (value === undefined || value === '' || value === 'supabase') return 'supabase';
  if (value === 'turso') return value;
  throw new Error('TURSO_PRICE_PROJECTION_MODE must be supabase or turso');
}

export interface TursoPriceSlotProjectionInput {
  hourlyRows: readonly HourlySnapshotRow[];
  snapshotTs: Date;
  inputHash: string;
  partitionKey: string;
  rawDigest: string;
}

export interface TursoPriceSlotProjectionResult {
  hourlyWritten: number;
  replayed: boolean;
}

function toInt(flag: boolean | undefined): 0 | 1 {
  return flag ? 1 : 0;
}

const HOURLY_UPSERT_CHUNK = 200;

/** Read the active Turso projection ledger used when projection mode is `turso`. */
export async function readTursoPriceSlotContinuity(
  client: Client,
  nowMs: number
): Promise<CaptureContinuity> {
  const expected = expectedRecentSlotMs(nowMs);
  const result = await client.execute({
    sql: `SELECT DISTINCT slot_ms FROM price_slot_projection_runs
      WHERE slot_ms >= ? AND slot_ms <= ?`,
    args: [expected[expected.length - 1] ?? nowMs, expected[0] ?? nowMs],
  });

  return evaluateCaptureContinuity(
    result.rows.map((row) => Number(row.slot_ms)).filter(Number.isFinite),
    nowMs
  );
}

const HOURLY_UPSERT_SQL = `
  INSERT INTO hourly_price_snapshots (
    provider, symbol, chain_id, price,
    consensus_price, deviation_pct, latency_ms, data_age_seconds,
    confidence, is_success, error_message, snapshot_hour, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (provider, symbol, chain_id, snapshot_hour) DO UPDATE SET
    price = excluded.price,
    consensus_price = excluded.consensus_price,
    deviation_pct = excluded.deviation_pct,
    latency_ms = excluded.latency_ms,
    data_age_seconds = excluded.data_age_seconds,
    confidence = excluded.confidence,
    is_success = excluded.is_success,
    error_message = excluded.error_message
`;

function bindHourlyRow(row: HourlySnapshotRow, createdAt: string): InValue[] {
  return [
    row.provider,
    row.symbol,
    row.chain_id,
    row.price,
    row.consensus_price,
    row.deviation_pct,
    row.latency_ms,
    row.data_age_seconds,
    row.confidence,
    toInt(row.is_success),
    row.error_message,
    row.snapshot_hour,
    createdAt,
  ];
}

function chunkHourlyRows(rows: readonly HourlySnapshotRow[]): HourlySnapshotRow[][] {
  const chunks: HourlySnapshotRow[][] = [];
  for (let index = 0; index < rows.length; index += HOURLY_UPSERT_CHUNK) {
    chunks.push(rows.slice(index, index + HOURLY_UPSERT_CHUNK));
  }
  return chunks;
}

/**
 * Idempotent slot delivery, mirroring project_turso_price_slot. Hourly rows
 * and the delivery ledger are written in one transaction so a retry can never
 * leave the slot acknowledged without both layers landing.
 */
export async function writeProjectedTursoPriceSlot(
  client: Client,
  input: TursoPriceSlotProjectionInput
): Promise<TursoPriceSlotProjectionResult> {
  const snapshotMs = input.snapshotTs.getTime();
  if (!Number.isSafeInteger(snapshotMs) || snapshotMs < 0) {
    throw new Error('Cannot project a Turso price slot with an invalid timestamp');
  }

  const projectedAt = new Date().toISOString();
  const existing = await client.execute({
    sql: `SELECT hourly_written FROM price_slot_projection_runs WHERE slot_ms = ? AND input_hash = ?`,
    args: [snapshotMs, input.inputHash],
  });
  const replayed = existing.rows.length > 0;
  let hourlyRowsToWrite: readonly HourlySnapshotRow[] = [];

  if (!replayed && input.hourlyRows.length > 0) {
    const hourStartMs = Math.floor(snapshotMs / 3_600_000) * 3_600_000;
    const earlierHourlyProjection = await client.execute({
      sql: `SELECT 1 FROM price_slot_projection_runs
        WHERE slot_ms >= ? AND slot_ms < ? AND hourly_written > 0 LIMIT 1`,
      args: [hourStartMs, hourStartMs + 3_600_000],
    });
    if (earlierHourlyProjection.rows.length === 0) {
      hourlyRowsToWrite = input.hourlyRows;
    }
  }

  // Preserve the original receipt count on retries. Later slots in the same
  // hour are acknowledged with zero hourly rows written.
  const hourlyWritten = replayed
    ? Number((existing.rows[0] as Record<string, unknown>).hourly_written)
    : hourlyRowsToWrite.length;

  const statements: InStatement[] = chunkHourlyRows(hourlyRowsToWrite).flatMap((chunk) =>
    chunk.map((row) => ({
      sql: HOURLY_UPSERT_SQL,
      args: bindHourlyRow(row, projectedAt),
    }))
  );
  statements.push({
    sql: `
      INSERT INTO price_slot_projection_runs (
        slot_ms, input_hash, raw_digest, partition_key, hourly_written, projected_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (slot_ms, input_hash) DO UPDATE SET
        raw_digest = excluded.raw_digest,
        partition_key = excluded.partition_key,
        hourly_written = excluded.hourly_written,
        projected_at = excluded.projected_at
    `,
    args: [
      snapshotMs,
      input.inputHash,
      input.rawDigest,
      input.partitionKey,
      hourlyWritten,
      projectedAt,
    ],
  });

  await client.batch(statements, 'write');
  return { hourlyWritten, replayed };
}

export interface TursoOracleHistoryBaselineRow {
  hour: string;
  max_deviation_pct: number;
  consensus_price: number;
  participant_count: number;
}

function medianInterpolated(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  // percentile_cont(0.5) semantics: linear interpolation for even counts.
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * JS port of the get_oracle_history_baseline RPC (migration 0063): per
 * completed hour in [sinceMs, beforeMs), max(abs(deviation_pct || 0)),
 * median(price) with percentile_cont linear interpolation, and row count.
 * Rows mirror the RPC's filters: is_success, price > 0.
 *
 * Hours are keyed on the parsed timestamp, so collector rows (".000Z") and
 * backfilled rows ("+00:00") group together despite their different ISO text
 * forms. The SQL string window is widened by one hour on both sides because
 * the two text forms do not order identically at an exact boundary; precise
 * filtering happens here.
 */
export async function readTursoOracleHistoryBaseline(
  client: Client,
  symbol: string,
  sinceMs: number,
  beforeMs: number
): Promise<TursoOracleHistoryBaselineRow[]> {
  if (!Number.isFinite(sinceMs) || !Number.isFinite(beforeMs) || beforeMs <= sinceMs) {
    throw new Error('Invalid oracle history baseline window');
  }
  const lower = new Date(sinceMs - 3_600_000).toISOString();
  const upper = new Date(beforeMs).toISOString();
  const result = await client.execute({
    sql: `SELECT snapshot_hour, price, deviation_pct
          FROM hourly_price_snapshots
          WHERE symbol = upper(trim(?)) AND is_success = 1
            AND snapshot_hour >= ? AND snapshot_hour < ?`,
    args: [symbol, lower, upper],
  });
  interface HourGroup {
    deviations: number[];
    prices: number[];
  }
  const groups = new Map<number, HourGroup>();
  for (const row of result.rows) {
    const tsMs = Date.parse(String(row.snapshot_hour));
    if (!Number.isFinite(tsMs) || tsMs < sinceMs || tsMs >= beforeMs) continue;
    if (tsMs % 3_600_000 !== 0) continue; // completed hours only, like the RPC
    const price = Number(row.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    // SQLite cannot store NaN; a NULL deviation is the RPC's coalesce(…, 0).
    const deviation =
      row.deviation_pct === null || row.deviation_pct === undefined
        ? 0
        : Math.abs(Number(row.deviation_pct));
    const group = groups.get(tsMs) ?? { deviations: [], prices: [] };
    group.deviations.push(Number.isFinite(deviation) ? deviation : 0);
    group.prices.push(price);
    groups.set(tsMs, group);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tsMs, group]) => ({
      hour: new Date(tsMs).toISOString(),
      max_deviation_pct: Math.max(...group.deviations, 0),
      consensus_price: medianInterpolated(group.prices),
      participant_count: group.prices.length,
    }));
}

export interface TursoHourlyUpsertRow {
  snapshot_hour: string;
  provider: string;
  symbol: string;
  chain_id: number;
  price: number;
  consensus_price: number | null;
  deviation_pct: number | null;
  latency_ms: number | null;
  data_age_seconds: number | null;
  confidence: number | null;
  is_success: boolean;
  error_message: string | null;
}

export const TURSO_HOURLY_HISTORY_FIELDS = [
  'id',
  'snapshot_hour',
  'provider',
  'symbol',
  'chain_id',
  'price',
  'consensus_price',
  'deviation_pct',
  'latency_ms',
  'data_age_seconds',
  'confidence',
  'is_success',
  'error_message',
  'created_at',
] as const;

export type TursoHourlyHistoryField = (typeof TURSO_HOURLY_HISTORY_FIELDS)[number];

export interface TursoHourlyHistoryPageOptions {
  providers?: string[];
  symbol?: string;
  chainId?: number;
  successOnly?: boolean;
  ascending?: boolean;
  limit?: number;
  offset?: number;
  inclusiveBefore?: boolean;
}

/**
 * Supabase archives hourly history through the last complete archived day;
 * missing or malformed configuration keeps reads on Supabase.
 */
export function readTursoHourlyHistoryReadCutoverMs(
  value: string | undefined = process.env.TURSO_HOURLY_HISTORY_READ_CUTOVER_AT
): number | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 0 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    new Date(parsed).toISOString() !== value
  ) {
    return undefined;
  }
  return parsed;
}

function historyInteger(value: unknown, field: string): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error(`Invalid Turso ${field}`);
  return number;
}

/**
 * Read the bounded Turso hourly projection page using the same ordering and
 * filters as get_snapshot_history_page. The caller splits at the recorded
 * projection cutover so Supabase remains the source for older archive pages.
 */
export async function loadTursoHourlyHistoryPage(
  client: Client,
  fromMs: number,
  beforeMs: number,
  selected: readonly TursoHourlyHistoryField[],
  options: TursoHourlyHistoryPageOptions = {}
): Promise<Record<TursoHourlyHistoryField, unknown>[]> {
  const limit = options.limit ?? 1000;
  const offset = options.offset ?? 0;
  if (
    !Number.isSafeInteger(fromMs) ||
    fromMs < 0 ||
    !Number.isSafeInteger(beforeMs) ||
    beforeMs < fromMs ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 10001 ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    selected.length === 0 ||
    selected.some((field) => !TURSO_HOURLY_HISTORY_FIELDS.includes(field))
  ) {
    throw new Error('Invalid Turso hourly history page');
  }

  const where = ['snapshot_hour >= ?'];
  const args: (string | number)[] = [new Date(fromMs).toISOString()];
  where.push(options.inclusiveBefore ? 'snapshot_hour <= ?' : 'snapshot_hour < ?');
  args.push(new Date(beforeMs).toISOString());
  if (options.providers) {
    if (options.providers.length === 0) return [];
    where.push(`provider IN (${options.providers.map(() => '?').join(', ')})`);
    args.push(...options.providers);
  }
  if (options.symbol !== undefined) {
    where.push('symbol = ?');
    args.push(options.symbol);
  }
  if (options.chainId !== undefined) {
    if (!Number.isSafeInteger(options.chainId) || options.chainId < 0) {
      throw new Error('Invalid Turso hourly history chain id');
    }
    where.push('chain_id = ?');
    args.push(options.chainId);
  }
  if (options.successOnly) where.push('is_success = 1 AND price > 0');

  const uniqueFields = [...new Set<TursoHourlyHistoryField>(selected)];
  const order = options.ascending ? 'ASC' : 'DESC';
  const selectFields = uniqueFields.map((field) =>
    field === 'is_success' ? 'is_success = 1 AS is_success' : field
  );
  const result = await client.execute({
    sql: `SELECT ${selectFields.join(', ')}
          FROM hourly_price_snapshots
          WHERE ${where.join(' AND ')}
          ORDER BY snapshot_hour ${order}, id ${order}
          LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  return result.rows.map((row) => {
    const value = { ...row } as Record<string, unknown>;
    value.id = historyInteger(value.id, 'hourly history id');
    value.chain_id = historyInteger(value.chain_id, 'hourly history chain id');
    value.is_success = Number(value.is_success) === 1 || value.is_success === true;
    return value as Record<TursoHourlyHistoryField, unknown>;
  });
}

/**
 * JS port of the upsert_hourly_price_snapshots RPC (migrations 0099/0113):
 * dedupe the batch to one row per (snapshot_hour, provider, symbol, chain_id)
 * — success beats failure, later ordinality breaks ties — then write with a
 * conditional upsert that only replaces an existing row when the existing row
 * is a failure and the incoming row is a success. Returns rows written.
 */
export async function upsertTursoHourlySnapshots(
  client: Client,
  rows: TursoHourlyUpsertRow[]
): Promise<number> {
  if (rows.length === 0) return 0;
  if (rows.length > 500) {
    throw new Error('Expected an hourly snapshot batch of at most 500 rows');
  }

  const dedup = new Map<string, TursoHourlyUpsertRow>();
  for (const row of rows) {
    // Normalize the hour to a canonical ISO string: the Postgres RPC casts to
    // timestamptz (format-agnostic), while SQLite keys the UNIQUE index on raw
    // text where ".000Z" and "+00:00" are different strings for one instant.
    const normalized: TursoHourlyUpsertRow = {
      ...row,
      snapshot_hour: new Date(row.snapshot_hour).toISOString(),
    };
    const key = `${normalized.snapshot_hour}|${normalized.provider}|${normalized.symbol}|${normalized.chain_id}`;
    const existing = dedup.get(key);
    if (!existing) {
      dedup.set(key, normalized);
    } else if (normalized.is_success !== existing.is_success) {
      if (normalized.is_success) dedup.set(key, normalized);
    } else {
      dedup.set(key, normalized); // same outcome → later ordinality wins
    }
  }

  const nowIso = new Date().toISOString();
  const sql = `INSERT INTO hourly_price_snapshots (
                 snapshot_hour, provider, symbol, chain_id, price,
                 consensus_price, deviation_pct, latency_ms, data_age_seconds,
                 confidence, is_success, error_message, created_at
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT (provider, symbol, chain_id, snapshot_hour) DO UPDATE
                 SET price = excluded.price,
                     consensus_price = excluded.consensus_price,
                     deviation_pct = excluded.deviation_pct,
                     latency_ms = excluded.latency_ms,
                     data_age_seconds = excluded.data_age_seconds,
                     confidence = excluded.confidence,
                     is_success = excluded.is_success,
                     error_message = excluded.error_message
                 WHERE NOT hourly_price_snapshots.is_success
                   AND excluded.is_success`;
  const batch = [...dedup.values()].map((row) => ({
    sql,
    args: [
      row.snapshot_hour,
      row.provider,
      row.symbol,
      row.chain_id,
      row.price,
      row.consensus_price,
      row.deviation_pct,
      row.latency_ms,
      row.data_age_seconds,
      row.confidence,
      row.is_success ? 1 : 0,
      row.error_message,
      nowIso,
    ] as InValue[],
  }));
  const results = await client.batch(batch, 'write');
  return results.reduce((sum, r) => sum + Number(r.rowsAffected ?? 0), 0);
}
