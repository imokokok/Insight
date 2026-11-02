import {
  applyFeedHealthLifecycle,
  collectSnapshot,
  persistSelectedPriceRecords,
  resolveSnapshotSlot,
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
const MAX_GITHUB_FALLBACK_GRACE_SECONDS = 14 * 60;

export interface SnapshotIngestResult {
  outcome: 'captured' | 'busy' | 'already_captured' | 'deferred';
  slotMs: number;
  projection: 'committed' | 'queued' | null;
  inputCount: number;
}

/**
 * The GitHub runner is deliberately a delayed fallback for the independent
 * Cloudflare scheduler. Keep this runtime guard in addition to the two
 * scheduler offsets: it prevents an accidental schedule regression from
 * immediately turning GitHub back into a competing primary collector.
 */
export function readGithubFallbackGraceMs(
  value: string | undefined = process.env.SNAPSHOT_INGEST_FALLBACK_GRACE_SECONDS
): number {
  if (value === undefined || value.trim() === '') return 0;
  if (!/^\d+$/.test(value)) {
    throw new Error('SNAPSHOT_INGEST_FALLBACK_GRACE_SECONDS must be an integer');
  }
  const seconds = Number(value);
  if (
    !Number.isSafeInteger(seconds) ||
    seconds < 0 ||
    seconds > MAX_GITHUB_FALLBACK_GRACE_SECONDS
  ) {
    throw new Error(
      `SNAPSHOT_INGEST_FALLBACK_GRACE_SECONDS must be between 0 and ${MAX_GITHUB_FALLBACK_GRACE_SECONDS}`
    );
  }
  return seconds * 1_000;
}

export function shouldDeferGithubFallback(
  primary: boolean,
  triggerSource: TursoIngestTriggerSource,
  slotMs: number,
  nowMs: number = Date.now(),
  graceMs: number = readGithubFallbackGraceMs()
): boolean {
  return primary && triggerSource === 'github_actions' && nowMs < slotMs + graceMs;
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
  const snapshotTs = resolveSnapshotSlot(scheduledFor);
  const slotMs = snapshotTs.getTime();
  const primary = readTursoPriceWriteMode() === 'primary';
  let leaseId: string | null = null;
  let client: ReturnType<typeof getTursoPriceClient> | undefined;

  if (primary) {
    if (triggerSource === 'github_actions') {
      const graceMs = readGithubFallbackGraceMs();
      if (shouldDeferGithubFallback(primary, triggerSource, slotMs, Date.now(), graceMs)) {
        logger.info('Deferred GitHub fallback until the Cloudflare primary grace window closes', {
          slotMs,
          graceMs,
        });
        return { outcome: 'deferred', slotMs, projection: null, inputCount: 0 };
      }
    }
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
