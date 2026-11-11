import { loadArchivedSnapshots } from '@/lib/supabase/snapshotArchives';
import { getTursoOpsClient } from '@/lib/turso/ops/client';
import { readTursoPriceProjectionMode } from '@/lib/turso/ops/hourlyPriceProjectionRepository';

import type { SnapshotRow } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';

const PAGE_SIZE = 1000;
const MAX_HISTORY_READ_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const SNAPSHOT_COLUMNS =
  'id,snapshot_hour,provider,symbol,chain_id,price,consensus_price,deviation_pct,latency_ms,data_age_seconds,confidence,is_success,error_message';

type SnapshotRecord = SnapshotRow & { id: string | number };

/** Read one bounded UTC range, never returning a silently truncated report input. */
async function loadHourlySnapshotsForWindow(
  supabase: SupabaseClient,
  startAt: string,
  endAt: string
): Promise<SnapshotRow[]> {
  const snapshots: SnapshotRow[] = [];
  const seenIds = new Set<string>();
  let expectedCount: number | null = null;

  for (let offset = 0; expectedCount === null || offset < expectedCount; offset += PAGE_SIZE) {
    const { data, count, error } = await supabase
      .from('hourly_price_snapshots')
      .select(SNAPSHOT_COLUMNS, offset === 0 ? { count: 'exact' } : undefined)
      .gte('snapshot_hour', startAt)
      .lt('snapshot_hour', endAt)
      .order('snapshot_hour', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load hourly snapshots at offset ${offset}: ${error.message}`);
    }
    if (!data) {
      throw new Error(`Hourly snapshot page at offset ${offset} returned no data`);
    }
    if (offset === 0) {
      if (count === null || count === undefined || !Number.isSafeInteger(count) || count < 0) {
        throw new Error('Hourly snapshot query did not return a valid exact count');
      }
      expectedCount = count;
    }

    for (const row of data as SnapshotRecord[]) {
      if (row.id === null || row.id === undefined || seenIds.has(String(row.id))) {
        throw new Error(
          `Hourly snapshot pagination returned a missing or duplicate ID at offset ${offset}`
        );
      }
      seenIds.add(String(row.id));
      snapshots.push(row);
    }

    if (
      snapshots.length > expectedCount! ||
      (snapshots.length < expectedCount! && data.length < PAGE_SIZE)
    ) {
      throw new Error(
        `Incomplete hourly snapshots: expected ${expectedCount}, received ${snapshots.length}`
      );
    }
  }

  if (snapshots.length !== expectedCount) {
    throw new Error(
      `Incomplete hourly snapshots: expected ${expectedCount}, received ${snapshots.length}`
    );
  }
  // Hot-first reads cover rows moved into cold chunks while this request runs.
  const archived = await loadArchivedSnapshots(supabase, 'hourly', startAt, endAt);
  const merged = new Map<string, SnapshotRow>();
  for (const row of [...archived, ...snapshots]) {
    const key = JSON.stringify([
      Date.parse(row.snapshot_hour),
      row.provider,
      row.symbol,
      row.chain_id,
    ]);
    merged.set(key, row);
  }
  return [...merged.values()].sort(
    (a, b) => Date.parse(a.snapshot_hour) - Date.parse(b.snapshot_hour)
  );
}

/**
 * Turso-side window read (egress retirement 2026-11, TURSO_PRICE_PROJECTION_
 * MODE=turso): the ops data plane holds the full hourly history — backfilled
 * through 2026-11-09 plus collector writes after the projection cutover — so
 * the daily-report publisher no longer touches Supabase REST. Supabase's
 * snapshot_archive cold store is intentionally not consulted here: the Turso
 * branch serves the ≤7-day report windows this module exists for.
 */
async function loadHourlySnapshotsFromTurso(
  startAt: string,
  endAt: string
): Promise<SnapshotRow[]> {
  const client = getTursoOpsClient();
  const snapshots: SnapshotRow[] = [];
  const seenIds = new Set<string>();
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const result = await client.execute({
      sql: `SELECT id, snapshot_hour, provider, symbol, chain_id, price,
                   consensus_price, deviation_pct, latency_ms, data_age_seconds,
                   confidence, is_success, error_message
            FROM hourly_price_snapshots
            WHERE snapshot_hour >= ? AND snapshot_hour < ?
            ORDER BY snapshot_hour ASC, id ASC
            LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
      args: [startAt, endAt],
    });
    for (const row of result.rows) {
      const id = String(row.id);
      if (seenIds.has(id)) {
        throw new Error(`Hourly snapshot pagination returned a duplicate ID at offset ${offset}`);
      }
      seenIds.add(id);
      snapshots.push({
        snapshot_hour: String(row.snapshot_hour),
        provider: String(row.provider),
        symbol: String(row.symbol),
        chain_id: Number(row.chain_id),
        price: Number(row.price),
        consensus_price:
          row.consensus_price === null || row.consensus_price === undefined
            ? null
            : Number(row.consensus_price),
        deviation_pct:
          row.deviation_pct === null || row.deviation_pct === undefined
            ? null
            : Number(row.deviation_pct),
        latency_ms:
          row.latency_ms === null || row.latency_ms === undefined ? null : Number(row.latency_ms),
        data_age_seconds:
          row.data_age_seconds === null || row.data_age_seconds === undefined
            ? null
            : Number(row.data_age_seconds),
        confidence:
          row.confidence === null || row.confidence === undefined ? null : Number(row.confidence),
        is_success: Number(row.is_success) === 1,
        error_message:
          row.error_message === null || row.error_message === undefined
            ? null
            : String(row.error_message),
      });
    }
    if (result.rows.length < PAGE_SIZE) break;
  }
  return snapshots.sort((a, b) => Date.parse(a.snapshot_hour) - Date.parse(b.snapshot_hour));
}

/**
 * Read a report/backfill range in seven-day windows. This preserves complete
 * history for long maintenance jobs while preventing one request from
 * expanding months of compressed archive payload at once.
 */
export async function loadHourlySnapshotsForRange(
  supabase: SupabaseClient,
  startAt: string,
  endAt: string
): Promise<SnapshotRow[]> {
  const start = Date.parse(startAt);
  const end = Date.parse(endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    throw new Error('Invalid hourly snapshot read window');
  }
  if (end === start) return [];

  if (readTursoPriceProjectionMode() === 'turso') {
    return loadHourlySnapshotsFromTurso(startAt, endAt);
  }

  const merged = new Map<string, SnapshotRow>();
  for (let cursor = start; cursor < end; cursor += MAX_HISTORY_READ_WINDOW_MS) {
    const windowEnd = Math.min(cursor + MAX_HISTORY_READ_WINDOW_MS, end);
    const rows = await loadHourlySnapshotsForWindow(
      supabase,
      new Date(cursor).toISOString(),
      new Date(windowEnd).toISOString()
    );
    for (const row of rows) {
      merged.set(
        JSON.stringify([Date.parse(row.snapshot_hour), row.provider, row.symbol, row.chain_id]),
        row
      );
    }
  }

  return [...merged.values()].sort(
    (a, b) => Date.parse(a.snapshot_hour) - Date.parse(b.snapshot_hour)
  );
}
