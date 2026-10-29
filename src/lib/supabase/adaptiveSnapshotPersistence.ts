import { createHash } from 'node:crypto';

import { z } from 'zod';

import type { HourlySnapshotInput } from '@/lib/reports/reportService';
import { retryIdempotentSupabaseWrite } from '@/lib/supabase/idempotentWrite';
import { createServiceRoleClient } from '@/lib/supabase/server';

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
export type AdaptiveSnapshotPersistenceSummary = z.infer<typeof adaptiveSnapshotSummarySchema>;

function buildRows(inputs: HourlySnapshotInput[]): AdaptiveSnapshotRow[] {
  return inputs.map((input) =>
    adaptiveSnapshotRowSchema.parse({
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
