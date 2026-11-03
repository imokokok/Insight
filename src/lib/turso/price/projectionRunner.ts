import { reconcilePendingTursoPriceSlots } from '@/lib/supabase/adaptiveSnapshotPersistence';
import { getTursoPriceClient, readTursoPriceWriteMode } from '@/lib/turso/price/client';
import { readTursoPriceProjectionMaxLagSeconds } from '@/lib/turso/price/projectionConfig';
import { ensureTursoPriceSchema } from '@/lib/turso/price/schema';
import {
  getTursoPriceProjectionBacklog,
  pruneExpiredTursoPriceEvents,
} from '@/lib/turso/price/slotRepository';

export interface TursoPriceProjectionRun {
  before: Awaited<ReturnType<typeof getTursoPriceProjectionBacklog>>;
  projected: {
    selected: number;
    projected: number;
    retrying: number;
    quarantined: number;
    batches: number;
  };
  after: Awaited<ReturnType<typeof getTursoPriceProjectionBacklog>>;
  oldestLagSeconds: number;
  maintenance: Awaited<ReturnType<typeof pruneExpiredTursoPriceEvents>>;
}

/**
 * Drain a bounded number of immutable Turso outbox batches. The bounded loop
 * lets the independent Cloudflare scheduler recover a multi-hour Supabase
 * outage in one invocation without turning a transient downstream failure
 * into an unbounded serverless request.
 */
export async function runTursoPriceProjection(
  batchSize: number,
  maximumBatches: number
): Promise<TursoPriceProjectionRun> {
  if (readTursoPriceWriteMode() !== 'primary') {
    throw new Error('Turso price projection requires primary write mode');
  }

  const client = getTursoPriceClient();
  await ensureTursoPriceSchema(client);
  const before = await getTursoPriceProjectionBacklog(client);
  const projected = {
    selected: 0,
    projected: 0,
    retrying: 0,
    quarantined: 0,
    batches: 0,
  };

  for (let batch = 0; batch < maximumBatches; batch++) {
    const result = await reconcilePendingTursoPriceSlots(batchSize);
    projected.selected += result.selected;
    projected.projected += result.projected;
    projected.retrying += result.retrying;
    projected.quarantined += result.quarantined;
    projected.batches++;

    // No more work, or every selected slot was held back by retry/backoff.
    // In the latter case, stop rather than repeatedly hammering Supabase.
    if (result.selected < batchSize || result.projected === 0) break;
  }

  const maintenance = await pruneExpiredTursoPriceEvents(client);
  const after = await getTursoPriceProjectionBacklog(client);
  const oldestLagSeconds =
    after.oldestSlotMs === null
      ? 0
      : Math.max(0, Math.floor((Date.now() - after.oldestSlotMs) / 1000));

  return { before, projected, after, oldestLagSeconds, maintenance };
}

export function assertTursoPriceProjectionHealthy(run: TursoPriceProjectionRun): void {
  const maximumLagSeconds = readTursoPriceProjectionMaxLagSeconds();
  if (run.after.quarantinedCount > 0) {
    throw new Error(
      `Turso price projection has ${run.after.quarantinedCount} quarantined immutable slot(s); ` +
        'review and explicitly requeue the preserved evidence'
    );
  }
  if (run.after.pendingCount > 0 && run.oldestLagSeconds > maximumLagSeconds) {
    throw new Error(
      `Turso price projection backlog exceeded ${maximumLagSeconds}s: ` +
        `${run.after.pendingCount} pending slot(s), oldest=${run.oldestLagSeconds}s`
    );
  }
}
