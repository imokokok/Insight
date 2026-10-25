import { z } from 'zod';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A cold-history request expands compressed JSON chunks in application memory.
 * Keep an individual database read small; wider report/backfill windows are
 * split by the caller into these bounded ranges.
 */
export const MAX_ARCHIVE_READ_WINDOW_DAYS = 7;
const MAX_ARCHIVE_READ_PAGES = 40;
const ARCHIVE_PAGE_SIZE = 100;

const chunkSchema = z.object({
  archive_id: z.number().int().positive().safe(),
  kind: z.enum(['price', 'hourly']),
  archive_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  provider: z.string().min(1),
  symbol: z.string().min(1),
  chain_id: z.number().int().nonnegative(),
  row_count: z.number().int().positive().max(100_000),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  payload: z.string().max(8_000_000),
});
const timestamp = z.string().refine((value) => Number.isFinite(Date.parse(value)));
const snapshotSchema = z
  .object({
    id: z.number().int().positive().safe(),
    snapshot_ts: timestamp.optional(),
    snapshot_hour: timestamp,
    provider: z.string(),
    symbol: z.string(),
    chain_id: z.number().int().nonnegative(),
    price: z.number().finite(),
    consensus_price: z.number().finite().nullable(),
    deviation_pct: z.number().finite().nullable(),
    latency_ms: z.number().int().nullable(),
    data_age_seconds: z.number().int().nullable(),
    confidence: z.number().finite().nullable(),
    is_success: z.boolean(),
    error_message: z.string().nullable(),
  })
  .passthrough();

export type ArchivedSnapshot = z.infer<typeof snapshotSchema>;

/** Decode each cold chunk once, rather than expanding a union on every page. */
export async function loadArchivedSnapshots(
  client: SupabaseClient,
  kind: 'price' | 'hourly',
  startAt: string,
  endAt: string
): Promise<ArchivedSnapshot[]> {
  const start = Date.parse(startAt);
  const end = Date.parse(endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    throw new Error('Invalid archive read window');
  }
  if (end - start > MAX_ARCHIVE_READ_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
    throw new Error(
      `Archive read window exceeds the ${MAX_ARCHIVE_READ_WINDOW_DAYS}-day safety limit`
    );
  }
  if (end === start) return [];

  // `endAt` is exclusive. Filtering through its UTC calendar date used to
  // fetch a full extra day of archive payload only to discard it below.
  const startDay = new Date(start).toISOString().slice(0, 10);
  const lastIncludedDay = new Date(end - 1).toISOString().slice(0, 10);
  const rows: ArchivedSnapshot[] = [];
  let lastId = 0;
  for (let page = 0; page < MAX_ARCHIVE_READ_PAGES; page++) {
    const { data, error } = await client
      .from('snapshot_archive_exports')
      .select('archive_id,kind,archive_day,provider,symbol,chain_id,row_count,checksum,payload')
      .eq('kind', kind)
      .gte('archive_day', startDay)
      .lte('archive_day', lastIncludedDay)
      .gt('archive_id', lastId)
      .order('archive_id', { ascending: true })
      .limit(ARCHIVE_PAGE_SIZE)
      .abortSignal(AbortSignal.timeout(30_000));
    if (error) throw new Error(`Archive read failed: ${error.message}`);
    if (!Array.isArray(data)) throw new Error('Invalid snapshot archive response');
    if (!data.length) return rows;
    for (const raw of data) {
      const chunk = chunkSchema.parse(raw);
      if (chunk.archive_id <= lastId || chunk.kind !== kind) {
        throw new Error('Invalid snapshot archive cursor or kind');
      }
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(chunk.payload));
      const checksum = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, '0')
      ).join('');
      if (checksum !== chunk.checksum) throw new Error('Snapshot archive checksum mismatch');
      const entries = z.array(snapshotSchema).parse(JSON.parse(chunk.payload));
      if (entries.length !== chunk.row_count)
        throw new Error('Snapshot archive row count mismatch');
      const seen = new Set<number>();
      for (const row of entries) {
        const time = Date.parse(kind === 'price' ? (row.snapshot_ts ?? '') : row.snapshot_hour);
        if (
          !Number.isFinite(time) ||
          new Date(time).toISOString().slice(0, 10) !== chunk.archive_day ||
          row.provider !== chunk.provider ||
          row.symbol !== chunk.symbol ||
          row.chain_id !== chunk.chain_id ||
          seen.has(time)
        ) {
          throw new Error('Snapshot archive feed identity or timestamp mismatch');
        }
        seen.add(time);
        if (time >= start && time < end) rows.push(row);
      }
      lastId = chunk.archive_id;
    }
  }
  throw new Error('Snapshot archive exceeded the bounded page limit');
}
