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
import { ensureTursoPriceSchema } from '@/lib/turso/price/schema';
import {
  acknowledgeTursoPriceSlot,
  captureTursoPriceSlot,
  latestAcknowledgedTursoPriceSlot,
  listPendingTursoPriceSlots,
  replaceTursoPricePersistenceProjection,
} from '@/lib/turso/price/slotRepository';
import type {
  TursoPriceInput,
  TursoPricePersistenceState,
  TursoPricePolicy,
  TursoPriceSlotSummary,
} from '@/lib/turso/price/types';
import { createLogger } from '@/lib/utils/logger';

const MAX_SNAPSHOT_PRICE = 9_999_999_999_999_999.99999999;
const MAX_DEVIATION_PCT = 9_999.9999;
const logger = createLogger('AdaptiveSnapshotPersistence');

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
    // Legacy and shadow modes complete this synchronously. Primary mode puts
    // the immutable slot in Turso's durable outbox and lets the independent
    // projector deliver the business projection without delaying collection.
    projection: z.enum(['committed', 'queued']).default('committed'),
  })
  .strict();

export type SnapshotSlotCommitSummary = z.infer<typeof snapshotSlotCommitSummarySchema>;

const finiteNumber = z.coerce.number().finite();
const supabasePersistenceTimestampSchema = z
  .object({
    last_snapshot_ts: z.string().datetime({ offset: true }),
  })
  .strict();
const supabasePersistenceStateSchema = z
  .object({
    provider: z.string().trim().min(1).max(128),
    symbol: z
      .string()
      .trim()
      .regex(/^[A-Z0-9][A-Z0-9._-]{0,31}$/),
    chain_id: z.number().int().min(0),
    last_snapshot_ts: z.string().datetime({ offset: true }),
    last_price: finiteNumber.min(0).max(MAX_SNAPSHOT_PRICE),
    last_deviation_pct: finiteNumber.min(-MAX_DEVIATION_PCT).max(MAX_DEVIATION_PCT).nullable(),
    last_data_age_seconds: z.number().int().min(0).max(2_147_483_647).nullable(),
    last_confidence: finiteNumber.min(0).max(1).nullable(),
    last_is_success: z.boolean(),
    last_error_message: z.string().max(8_000).nullable(),
  })
  .strict();
const supabasePersistencePolicySchema = z
  .object({
    policy_key: z.string().trim().min(1).max(32),
    resolution: z.enum(['full', 'adaptive']),
    price_change_bps: z.number().int().min(1).max(100_000),
    deviation_change_bps: z.number().int().min(1).max(100_000),
    data_age_change_seconds: z.number().int().min(1).max(2_147_483_647),
    confidence_change: finiteNumber.min(0.0001).max(1),
  })
  .strict();

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

function timestampMs(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid ${label}`);
  }
  return parsed;
}

function confidenceToE4(value: number): number {
  const scaled = Math.round(value * 10_000);
  if (Math.abs(value * 10_000 - scaled) > 1e-9 || scaled < 1 || scaled > 10_000) {
    throw new Error('Invalid Supabase persistence confidence threshold');
  }
  return scaled;
}

async function readLatestSupabasePersistenceStateMs(): Promise<number | null> {
  const { data, error } = await createServiceRoleClient()
    .from('price_snapshot_persistence_state')
    .select('last_snapshot_ts')
    .order('last_snapshot_ts', { ascending: false })
    .limit(1);
  if (error) {
    throw new Error(`Failed to read Supabase persistence state checkpoint: ${error.message}`);
  }
  if (!data || data.length === 0) return null;
  return timestampMs(
    supabasePersistenceTimestampSchema.parse(data[0]).last_snapshot_ts,
    'Supabase persistence checkpoint'
  );
}

async function readSupabasePersistenceStates(): Promise<TursoPricePersistenceState[]> {
  const { data, error } = await createServiceRoleClient()
    .from('price_snapshot_persistence_state')
    .select(
      'provider,symbol,chain_id,last_snapshot_ts,last_price,last_deviation_pct,last_data_age_seconds,last_confidence,last_is_success,last_error_message'
    );
  if (error) {
    throw new Error(`Failed to read Supabase persistence state: ${error.message}`);
  }
  return z
    .array(supabasePersistenceStateSchema)
    .parse(data ?? [])
    .map((state) => ({
      provider: state.provider,
      symbol: state.symbol,
      chainId: state.chain_id,
      lastSnapshotMs: timestampMs(state.last_snapshot_ts, 'Supabase persistence state timestamp'),
      lastPrice: state.last_price,
      lastDeviationPct: state.last_deviation_pct,
      lastDataAgeSeconds: state.last_data_age_seconds,
      lastConfidence: state.last_confidence,
      lastIsSuccess: state.last_is_success,
      lastErrorMessage: state.last_error_message,
    }));
}

async function readSupabasePersistencePolicies(): Promise<TursoPricePolicy[]> {
  const { data, error } = await createServiceRoleClient()
    .from('price_snapshot_persistence_policies')
    .select(
      'policy_key,resolution,price_change_bps,deviation_change_bps,data_age_change_seconds,confidence_change'
    );
  if (error) {
    throw new Error(`Failed to read Supabase persistence policies: ${error.message}`);
  }
  return z
    .array(supabasePersistencePolicySchema)
    .parse(data ?? [])
    .map((policy) => ({
      policyKey: policy.policy_key,
      resolution: policy.resolution,
      priceChangeBps: policy.price_change_bps,
      deviationChangeBps: policy.deviation_change_bps,
      dataAgeChangeSeconds: policy.data_age_change_seconds,
      confidenceChangeE4: confidenceToE4(policy.confidence_change),
    }));
}

/**
 * A shadow session may resume after `legacy` has advanced Supabase, or after a
 * prior Turso capture wrote evidence but failed parity validation. Before the
 * next capture, rebase Turso's mutable decision state to the last known
 * Supabase state. The immutable Turso slot history remains intact.
 */
async function rebaseTursoShadowStateIfNeeded(
  client: ReturnType<typeof getTursoPriceClient>
): Promise<void> {
  const [lastSupabaseStateMs, lastAcknowledgedTursoSlotMs] = await Promise.all([
    readLatestSupabasePersistenceStateMs(),
    latestAcknowledgedTursoPriceSlot(client),
  ]);
  if (
    lastAcknowledgedTursoSlotMs !== null &&
    (lastSupabaseStateMs === null || lastSupabaseStateMs <= lastAcknowledgedTursoSlotMs)
  ) {
    return;
  }

  const [states, policies] = await Promise.all([
    readSupabasePersistenceStates(),
    readSupabasePersistencePolicies(),
  ]);
  await replaceTursoPricePersistenceProjection(client, states, policies);
  logger.info('Rebased Turso shadow persistence state from Supabase', {
    states: states.length,
    policies: policies.length,
    lastSupabaseStateMs,
    lastAcknowledgedTursoSlotMs,
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
  persistence: TursoPriceSlotSummary,
  projection: 'committed' | 'queued' = 'committed'
): SnapshotSlotCommitSummary {
  return snapshotSlotCommitSummarySchema.parse({ hourlyWritten, persistence, projection });
}

const shadowWriteShapeFields = [
  'received',
  'candidates',
  'persisted',
  'fullResolution',
  'stableSkipped',
] as const;

const shadowReasonFields = [
  'initial',
  'stateTransition',
  'errorChange',
  'hourlyBaseline',
  'priceChange',
  'deviationChange',
  'dataAgeChange',
  'confidenceChange',
] as const;

function assertShadowWriteShape(
  expected: AdaptiveSnapshotPersistenceSummary,
  actual: TursoPriceSlotSummary
): void {
  for (const field of shadowWriteShapeFields) {
    if (expected[field] !== actual[field]) {
      throw new Error(
        `Turso shadow persistence write shape diverged for ${field}: expected=${expected[field]} actual=${actual[field]}`
      );
    }
  }

  const reasonDifferences = shadowReasonFields.flatMap((field) =>
    expected[field] === actual[field]
      ? []
      : [`${field}: expected=${expected[field]} actual=${actual[field]}`]
  );
  if (reasonDifferences.length > 0) {
    // Turso starts with no adaptive-state rows. Its first shadow slot can
    // classify otherwise-identical writes as `initial` while Supabase uses a
    // more specific historical reason. The write shape remains exact; logging
    // preserves visibility until the state is warm on subsequent slots.
    logger.warn('Turso shadow write reasons differ while write shape matches', {
      differences: reasonDifferences,
    });
  }
}

/**
 * Commit via the configured storage mode. `legacy` retains the existing
 * single-Supabase transaction; `shadow` verifies Turso without changing the
 * source of truth; `primary` makes Turso the raw-stream source and projects
 * queues its hourly business projection for the independent projector.
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
  await ensureTursoPriceSchema(client);

  if (mode === 'shadow') {
    await rebaseTursoShadowStateIfNeeded(client);
    const committed = await commitSnapshotDataSlotToSupabase(inputs, snapshotTs);
    const captured = await captureTursoPriceSlot(client, tursoInputs, snapshotTs.getTime());
    assertShadowWriteShape(committed.persistence, captured.summary);
    await acknowledgeTursoPriceSlot(client, captured.slotMs, captured.inputHash);
    return committed;
  }

  const captured = await captureTursoPriceSlot(client, tursoInputs, snapshotTs.getTime());
  return toCommitSummary(0, captured.summary, 'queued');
}

/** Replay a few incomplete cross-database hand-offs without fetching new prices. */
export async function reconcilePendingTursoPriceSlots(limit: number = 4): Promise<number> {
  if (readTursoPriceWriteMode() !== 'primary') return 0;
  readTursoPriceReadCutoverMs();
  const client = getTursoPriceClient();
  await ensureTursoPriceSchema(client);
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
