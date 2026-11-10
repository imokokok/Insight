// Turso repository for the price-slot projection domain (egress retirement
// v2, 2026-11). The independent projector used to deliver Turso outbox slots
// back to Supabase via project_turso_price_slot; under
// TURSO_PRICE_PROJECTION_MODE=turso it lands here instead, so the delivery
// step no longer touches Supabase while Supabase is egress-restricted.
//
// Write shape mirrors the Supabase RPC contract (adaptiveSnapshotPersistence.
// projectTursoPriceSlot): idempotent hourly upsert keyed on
// (provider, symbol, chain_id, snapshot_hour) plus one delivery-ledger row per
// (slot_ms, input_hash). Re-projecting the same immutable payload is a no-op
// that reports replayed=true.
import type { HourlySnapshotRow } from '@/lib/supabase/adaptiveSnapshotPersistence';

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
    sql: `SELECT 1 FROM price_slot_projection_runs WHERE slot_ms = ? AND input_hash = ?`,
    args: [snapshotMs, input.inputHash],
  });
  const replayed = existing.rows.length > 0;

  const statements: InStatement[] = chunkHourlyRows(input.hourlyRows).flatMap((chunk) =>
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
      input.hourlyRows.length,
      projectedAt,
    ],
  });

  await client.batch(statements, 'write');
  return { hourlyWritten: input.hourlyRows.length, replayed };
}
