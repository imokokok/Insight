import {
  applyFeedHealthLifecycle,
  collectSnapshot,
  persistSelectedPriceRecords,
  resolveRequiredSnapshotSlot,
  SnapshotCollectionError,
} from '@/lib/reports/snapshotCollector';
import { commitSnapshotDataSlot } from '@/lib/supabase/adaptiveSnapshotPersistence';
import { getTursoPriceClient, readTursoPriceWriteMode } from '@/lib/turso/price/client';
import {
  acquireTursoPriceIngestLease,
  completeTursoPriceIngestLease,
  failTursoPriceIngestLease,
  type TursoIngestTriggerSource,
} from '@/lib/turso/price/controlPlaneRepository';
import { ensureTursoPriceSchema } from '@/lib/turso/price/schema';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('SnapshotIngest');
const INGEST_LEASE_MS = 12 * 60 * 1_000;
const NON_CRITICAL_TIMEOUT_MS = 5_000;

export interface SnapshotIngestResult {
  outcome: 'captured' | 'busy' | 'already_captured';
  slotMs: number;
  projection: 'committed' | 'queued' | null;
  inputCount: number;
}

async function settleNonCritical(name: string, operation: Promise<unknown>): Promise<void> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`${name} exceeded ${NON_CRITICAL_TIMEOUT_MS}ms`)),
          NON_CRITICAL_TIMEOUT_MS
        );
      }),
    ]);
  } catch (error) {
    // A cache/lifecycle side effect must never invalidate an already committed
    // raw slot. Log the bounded failure for operators instead.
    logger.warn(`Non-critical ${name} failed after raw capture`, {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Capture one idempotent 15-minute slot. In Turso-primary mode this acquires a
 * Turso lease before touching upstreams, so independent schedulers and GitHub
 * fallback runs cannot create incompatible payloads for the same slot.
 */
export async function runSnapshotIngest(
  scheduledFor: string | undefined,
  triggerSource: TursoIngestTriggerSource
): Promise<SnapshotIngestResult> {
  // The slot must come from the scheduler, never from the runner clock. A
  // delayed dispatch that used `new Date()` wrote a later slot (observed at
  // 2026-11-04 09:00/10:00), so a missing or unparseable schedule is a hard
  // failure rather than a silent clock-drift fallback.
  let snapshotTs: Date;
  try {
    snapshotTs = resolveRequiredSnapshotSlot(scheduledFor);
  } catch (error) {
    const stage = error instanceof SnapshotCollectionError ? error.stage : 'unknown';
    logger.error(
      `Snapshot run rejected (${stage}): scheduled_for "${scheduledFor ?? ''}" is missing or unparseable; runner-clock slot fallback is disabled`
    );
    throw error;
  }
  const slotMs = snapshotTs.getTime();
  const primary = readTursoPriceWriteMode() === 'primary';
  let leaseId: string | null = null;
  let client: ReturnType<typeof getTursoPriceClient> | undefined;

  if (primary) {
    client = getTursoPriceClient();
    await ensureTursoPriceSchema(client);
    const lease = await acquireTursoPriceIngestLease(
      client,
      slotMs,
      triggerSource,
      INGEST_LEASE_MS
    );
    if (lease.state === 'busy') {
      return { outcome: 'busy', slotMs, projection: null, inputCount: 0 };
    }
    if (lease.state === 'completed') {
      return { outcome: 'already_captured', slotMs, projection: null, inputCount: 0 };
    }
    leaseId = lease.leaseId;
  }

  try {
    const result = await collectSnapshot(snapshotTs, {
      reuseRpcMetadata: true,
      deferDurableSnapshotWrites: true,
      deferPriceRecordPersistence: true,
    });
    const committed = await commitSnapshotDataSlot(result.inputs, result.snapshotTs);

    if (client && leaseId) {
      await completeTursoPriceIngestLease(client, slotMs, leaseId);
    }

    // Both writes are deliberately after the durable slot commit. They retain
    // their analytical/lifecycle value while no longer consume the intake
    // critical-path budget or make raw evidence dependent on Supabase.
    await Promise.all([
      settleNonCritical(
        'rich price-record persistence',
        persistSelectedPriceRecords(result.priceRecords, result.results.length, result.snapshotTs)
      ),
      settleNonCritical('feed-health lifecycle', applyFeedHealthLifecycle(result.healthUpdates)),
    ]);

    return {
      outcome: 'captured',
      slotMs,
      projection: committed.projection,
      inputCount: result.inputs.length,
    };
  } catch (error) {
    if (client && leaseId) {
      await failTursoPriceIngestLease(client, slotMs, leaseId, error).catch((leaseError) => {
        logger.warn('Failed to release Turso ingest lease after capture failure', {
          slotMs,
          error: leaseError instanceof Error ? leaseError.message : String(leaseError),
        });
      });
    }
    throw error;
  }
}
