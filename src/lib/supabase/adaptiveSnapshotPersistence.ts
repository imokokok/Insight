import { createHash } from 'node:crypto';

import { z } from 'zod';

import type { HourlySnapshotInput } from '@/lib/reports/reportService';
import { retryIdempotentSupabaseWrite } from '@/lib/supabase/idempotentWrite';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  getTursoPriceClient,
  readTursoPriceConfig,
  readTursoPriceReadCutoverMs,
  readTursoPriceWriteMode,
} from '@/lib/turso/price/client';
import {
  acknowledgeTursoPriceSlot,
  captureTursoPriceSlot,
  listPendingTursoPriceSlots,
} from '@/lib/turso/price/slotRepository';
import type { TursoPriceInput, TursoPriceSlotSummary } from '@/lib/turso/price/types';

const MAX_SNAPSHOT_PRICE = 9_999_999_999_999_999.99999999;
const MAX_DEVIATION_PCT = 9_999.9999;

const adaptiveSnapshotRowSchema = z.object({
  provider: z.string().trim().min(1).max(128),
  symbol: z
    .string()
    .trim()
    .regex(/^[A-Z0-9][A-Z0-9._-]{0,31}$/),
  chain_id: z.number().int().min(0),
  price: z.number().finite().min(0).max(MAX_SNAPSHOT_PRICE),
  consensus_price: z.number().finite().min(0).max(MAX_SNAPSHOT_PRICE).nullable(),
  deviation_pct: z.number().finite().min(-MAX_DEVIATION_PCT).max(MAX_DEVIATION_PCT).nullable(),
  latency_ms: z.number().int().min(0).max(2_147_483_647).nullable(),
  data_age_seconds: z.number().int().min(0).max(2_147_483_647).nullable(),
  confidence: z.number().finite().min(0).max(1).nullable(),
  is_success: z.boolean(),
  error_message: z.string().max(8_000).nullable(),
});

const hourlySnapshotRowSchema = adaptiveSnapshotRowSchema.extend({
  snapshot_hour: z.string().datetime({ offset: true }),
});

const adaptiveSnapshotSummarySchema = z
  .object({
    received: z.number().int().min(0),
    candidates: z.number().int().min(0),
    persisted: z.number().int().min(0),
    fullResolution: z.number().int().min(0),
    initial: z.number().int().min(0),
    stateTransition: z.number().int().min(0),
    errorChange: z.number().int().min(0),
    hourlyBaseline: z.number().int().min(0),
    priceChange: z.number().int().min(0),
    deviationChange: z.number().int().min(0),
    dataAgeChange: z.number().int().min(0),
    confidenceChange: z.number().int().min(0),
    stableSkipped: z.number().int().min(0),
  })
  .strict();

type AdaptiveSnapshotRow = z.infer<typeof adaptiveSnapshotRowSchema>;
type HourlySnapshotRow = z.infer<typeof hourlySnapshotRowSchema>;
export type AdaptiveSnapshotPersistenceSummary = z.infer<typeof adaptiveSnapshotSummarySchema>;

const snapshotSlotCommitSummarySchema = z
  .object({
    hourlyWritten: z.number().int().min(0),
    persistence: adaptiveSnapshotSummarySchema,
  })
  .strict();

export type SnapshotSlotCommitSummary = z.infer<typeof snapshotSlotCommitSummarySchema>;

const tursoProjectionSchema = z
  .object({
    hourlyWritten: z.number().int().min(0),
    replayed: z.boolean(),
  })
  .strict();

function buildRow(input: HourlySnapshotInput): AdaptiveSnapshotRow {
  return adaptiveSnapshotRowSchema.parse({
    provider: input.provider,
    symbol: input.symbol,
    chain_id: input.chainId ?? 0,
    price: input.price,
    consensus_price: input.consensusPrice ?? null,
    deviation_pct: input.deviationPct ?? null,
    latency_ms: input.latencyMs ?? null,
    data_age_seconds: input.dataAgeSeconds ?? null,
    confidence: input.confidence ?? null,
    is_success: input.isSuccess,
    error_message: input.errorMessage ?? null,
  });
}

function buildRows(inputs: HourlySnapshotInput[]): AdaptiveSnapshotRow[] {
  return inputs.map(buildRow);
}

function buildHourlyRows(inputs: HourlySnapshotInput[]): HourlySnapshotRow[] {
  return inputs.map((input) =>
    hourlySnapshotRowSchema.parse({
      ...buildRow(input),
      snapshot_hour: input.snapshotHour.toISOString(),
    })
  );
}

function buildTursoInputs(inputs: HourlySnapshotInput[]): TursoPriceInput[] {
  return inputs.map((input) => {
    const row = buildRow(input);
    const snapshotHourMs = input.snapshotHour.getTime();
    if (!Number.isSafeInteger(snapshotHourMs) || snapshotHourMs < 0) {
      throw new Error('Cannot persist a Turso snapshot with an invalid hour');
    }
    return {
      provider: row.provider,
      symbol: row.symbol,
      chainId: row.chain_id,
      price: row.price,
      consensusPrice: row.consensus_price,
      deviationPct: row.deviation_pct,
      latencyMs: row.latency_ms,
      dataAgeSeconds: row.data_age_seconds,
      confidence: row.confidence,
      isSuccess: row.is_success,
      errorMessage: row.error_message,
      snapshotHourMs,
    };
  });
}

function buildHourlyRowsFromTurso(inputs: TursoPriceInput[]): HourlySnapshotRow[] {
  return inputs.map((input) =>
    hourlySnapshotRowSchema.parse({
      provider: input.provider,
      symbol: input.symbol,
      chain_id: input.chainId,
      price: input.price,
      consensus_price: input.consensusPrice,
      deviation_pct: input.deviationPct,
      latency_ms: input.latencyMs,
      data_age_seconds: input.dataAgeSeconds,
      confidence: input.confidence,
      is_success: input.isSuccess,
      error_message: input.errorMessage,
      snapshot_hour: new Date(input.snapshotHourMs).toISOString(),
    })
  );
}

function canonicalInputHash(snapshotTs: string, rows: AdaptiveSnapshotRow[]): string {
  const canonicalRows = [...rows].sort((left, right) => {
    const leftKey = [left.provider, left.symbol, left.chain_id].join('\u0000');
    const rightKey = [right.provider, right.symbol, right.chain_id].join('\u0000');
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
  return createHash('sha256')
    .update(JSON.stringify({ snapshotTs, rows: canonicalRows }))
    .digest('hex');
}

/**
 * Persists a bounded, idempotent fine-grained snapshot batch. The database
 * keeps every core-asset sample, but skips unchanged adaptive rows until their
 * next hourly baseline. The RPC returns a per-reason audit summary.
 */
export async function persistAdaptivePriceSnapshots(
  inputs: HourlySnapshotInput[],
  snapshotTs: Date
): Promise<AdaptiveSnapshotPersistenceSummary> {
  if (!Number.isFinite(snapshotTs.getTime())) {
    throw new Error('Cannot persist adaptive snapshots with an invalid timestamp');
  }

  const rows = z.array(adaptiveSnapshotRowSchema).max(500).parse(buildRows(inputs));
  const timestamp = snapshotTs.toISOString();
  const inputHash = canonicalInputHash(timestamp, rows);
  const supabase = createServiceRoleClient();

  return retryIdempotentSupabaseWrite(async () => {
    const { data, error } = await supabase.rpc('persist_adaptive_price_snapshots', {
      p_rows: rows,
      p_snapshot_ts: timestamp,
      p_input_hash: inputHash,
    });
    if (error) {
      throw new Error(
        `Failed to persist adaptive price snapshots: ${
          typeof error.message === 'string' ? error.message : '[object Object]'
        }`
      );
    }

    const parsed = adaptiveSnapshotSummarySchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`Invalid adaptive snapshot persistence response: ${parsed.error.message}`);
    }
    return parsed.data;
  }, 'persist adaptive price snapshots');
}

/**
 * Commit the two high-volume evidence streams for a collection slot in one
 * database transaction.  The RPC invokes the existing, idempotent hourly and
 * adaptive routines, so a network retry cannot leave a slot with only one of
 * the two evidence layers written.
 */
async function commitSnapshotDataSlotToSupabase(
  inputs: HourlySnapshotInput[],
  snapshotTs: Date
): Promise<SnapshotSlotCommitSummary> {
  if (!Number.isFinite(snapshotTs.getTime())) {
    throw new Error('Cannot commit a snapshot slot with an invalid timestamp');
  }

  const rows = z.array(adaptiveSnapshotRowSchema).max(500).parse(buildRows(inputs));
  const hourlyRows = z.array(hourlySnapshotRowSchema).max(500).parse(buildHourlyRows(inputs));
  const timestamp = snapshotTs.toISOString();
  const inputHash = canonicalInputHash(timestamp, rows);
  const supabase = createServiceRoleClient();

  return retryIdempotentSupabaseWrite(async () => {
    const { data, error } = await supabase.rpc('commit_snapshot_data_slot', {
      p_hourly_rows: hourlyRows,
      p_adaptive_rows: rows,
      p_snapshot_ts: timestamp,
      p_input_hash: inputHash,
    });
    if (error) {
      throw new Error(
        `Failed to atomically commit snapshot data slot: ${
          typeof error.message === 'string' ? error.message : '[object Object]'
        }`
      );
    }

    const parsed = snapshotSlotCommitSummarySchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`Invalid snapshot slot commit response: ${parsed.error.message}`);
    }
    return parsed.data;
  }, 'commit snapshot data slot');
}

async function projectTursoPriceSlot(
  hourlyRows: HourlySnapshotRow[],
  snapshotTs: Date,
  inputHash: string,
  rawDigest: string
): Promise<{ hourlyWritten: number; replayed: boolean }> {
  const { partitionKey } = readTursoPriceConfig();
  const supabase = createServiceRoleClient();
  return retryIdempotentSupabaseWrite(async () => {
    const { data, error } = await supabase.rpc('project_turso_price_slot', {
      p_hourly_rows: hourlyRows,
      p_snapshot_ts: snapshotTs.toISOString(),
      p_input_hash: inputHash,
      p_partition_key: partitionKey,
      p_raw_digest: rawDigest,
    });
    if (error) {
      throw new Error(
        `Failed to project Turso price slot: ${
          typeof error.message === 'string' ? error.message : '[object Object]'
        }`
      );
    }
    const parsed = tursoProjectionSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`Invalid Turso price-slot projection response: ${parsed.error.message}`);
    }
    return parsed.data;
  }, 'project Turso price slot');
}

function toCommitSummary(
  hourlyWritten: number,
  persistence: TursoPriceSlotSummary
): SnapshotSlotCommitSummary {
  return snapshotSlotCommitSummarySchema.parse({ hourlyWritten, persistence });
}

function assertShadowParity(
  expected: AdaptiveSnapshotPersistenceSummary,
  actual: TursoPriceSlotSummary
): void {
  const fields = Object.keys(expected) as Array<keyof AdaptiveSnapshotPersistenceSummary>;
  for (const field of fields) {
    if (expected[field] !== actual[field]) {
      throw new Error(
        `Turso shadow persistence summary diverged for ${field}: expected=${expected[field]} actual=${actual[field]}`
      );
    }
  }
}

/**
 * Commit via the configured storage mode. `legacy` retains the existing
 * single-Supabase transaction; `shadow` verifies Turso without changing the
 * source of truth; `primary` makes Turso the raw-stream source and projects
 * only the hourly business result back into Supabase.
 */
export async function commitSnapshotDataSlot(
  inputs: HourlySnapshotInput[],
  snapshotTs: Date
): Promise<SnapshotSlotCommitSummary> {
  const mode = readTursoPriceWriteMode();
  if (mode === 'legacy') return commitSnapshotDataSlotToSupabase(inputs, snapshotTs);

  if (!Number.isSafeInteger(snapshotTs.getTime()) || snapshotTs.getTime() < 0) {
    throw new Error('Cannot commit a Turso snapshot with an invalid timestamp');
  }
  if (mode === 'primary') readTursoPriceReadCutoverMs();
  const tursoInputs = buildTursoInputs(inputs);
  const client = getTursoPriceClient();

  if (mode === 'shadow') {
    const committed = await commitSnapshotDataSlotToSupabase(inputs, snapshotTs);
    const captured = await captureTursoPriceSlot(client, tursoInputs, snapshotTs.getTime());
    assertShadowParity(committed.persistence, captured.summary);
    return committed;
  }

  const captured = await captureTursoPriceSlot(client, tursoInputs, snapshotTs.getTime());
  const projection = await projectTursoPriceSlot(
    buildHourlyRowsFromTurso(captured.inputs),
    snapshotTs,
    captured.inputHash,
    captured.rawDigest
  );
  await acknowledgeTursoPriceSlot(client, captured.slotMs, captured.inputHash);
  return toCommitSummary(projection.hourlyWritten, captured.summary);
}

/** Replay a few incomplete cross-database hand-offs without fetching new prices. */
export async function reconcilePendingTursoPriceSlots(limit: number = 4): Promise<number> {
  if (readTursoPriceWriteMode() !== 'primary') return 0;
  readTursoPriceReadCutoverMs();
  const client = getTursoPriceClient();
  const pending = await listPendingTursoPriceSlots(client, limit);
  for (const slot of pending) {
    const snapshotTs = new Date(slot.slotMs);
    if (!Number.isFinite(snapshotTs.getTime()))
      throw new Error('Invalid pending Turso slot timestamp');
    await projectTursoPriceSlot(
      buildHourlyRowsFromTurso(slot.inputs),
      snapshotTs,
      slot.inputHash,
      slot.rawDigest
    );
    await acknowledgeTursoPriceSlot(client, slot.slotMs, slot.inputHash);
  }
  return pending.length;
}
