import { NextResponse } from 'next/server';

import { createApiHandler, createOptionsHandler } from '@/lib/api/handler';
import { ApiResponseBuilder } from '@/lib/api/response';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { loadSnapshotHistoryPage } from '@/lib/supabase/snapshotHistory';
import { getTursoPriceClient, readTursoPriceWriteMode } from '@/lib/turso/price/client';
import { getTursoPriceIngestStatus } from '@/lib/turso/price/controlPlaneRepository';
import { readTursoPriceProjectionMaxLagSeconds } from '@/lib/turso/price/projectionConfig';
import { ensureTursoPriceSchema } from '@/lib/turso/price/schema';
import { getTursoPriceProjectionBacklog } from '@/lib/turso/price/slotRepository';

const MAX_SNAPSHOT_AGE_MS = 45 * 60 * 1000;
const MAX_SCHEDULER_AGE_MS = 25 * 60 * 1000;
const CHECK_TIMEOUT_MS = 2500;

type ProjectionCheck = 'ok' | 'catching_up' | 'lagging' | 'quarantined' | 'unknown';
type DependencyCheck = 'ok' | 'stale' | 'unavailable' | 'unknown';

function describeProjection(
  backlog: {
    pendingCount: number;
    oldestSlotMs: number | null;
    retryingCount: number;
    quarantinedCount: number;
  } | null
): {
  check: ProjectionCheck;
  details?: {
    pendingSlots: number;
    oldestLagSeconds: number;
    maxLagSeconds: number;
    retryingSlots: number;
    quarantinedSlots: number;
  };
} {
  if (backlog === null) return { check: 'unknown' };
  const maxLagSeconds = readTursoPriceProjectionMaxLagSeconds();
  const oldestLagSeconds =
    backlog.oldestSlotMs === null
      ? 0
      : Math.max(0, Math.floor((Date.now() - backlog.oldestSlotMs) / 1_000));
  const check =
    backlog.quarantinedCount > 0
      ? 'quarantined'
      : backlog.pendingCount === 0 || oldestLagSeconds === 0
        ? 'ok'
        : oldestLagSeconds <= maxLagSeconds
          ? 'catching_up'
          : 'lagging';
  return {
    check,
    details: {
      pendingSlots: backlog.pendingCount,
      oldestLagSeconds,
      maxLagSeconds,
      retryingSlots: backlog.retryingCount,
      quarantinedSlots: backlog.quarantinedCount,
    },
  };
}

async function withTimeout<T>(operation: PromiseLike<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Readiness check timed out')), timeoutMs);
  });

  try {
    return await Promise.race([Promise.resolve(operation), timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/** A bounded authenticated query distinguishes PostgREST/DB failure from a healthy Turso raw stream. */
async function checkSupabaseQueryLiveness(): Promise<void> {
  const { error } = await createServiceRoleClient()
    .from('oracle_feeds')
    .select('id')
    .limit(1)
    .abortSignal(AbortSignal.timeout(CHECK_TIMEOUT_MS));
  if (error) throw new Error('Supabase query liveness check failed');
}

export const OPTIONS = createOptionsHandler();
export const dynamic = 'force-dynamic';

// Keep the middleware path independent of Supabase so this endpoint can
// report database unavailability (below) instead of timing out before its
// bounded readiness query runs.
export const GET = createApiHandler(
  async (_request, context) => {
    const startedAt = Date.now();

    try {
      const tursoPrimary = readTursoPriceWriteMode() === 'primary';
      let rawCapture: DependencyCheck = 'unknown';
      let scheduler: DependencyCheck = 'unknown';
      let supabase: DependencyCheck = 'unknown';
      let latestSnapshotAt: number | null = null;
      let projection: ReturnType<typeof describeProjection> | undefined;

      if (tursoPrimary) {
        try {
          const client = getTursoPriceClient();
          await withTimeout(ensureTursoPriceSchema(client), CHECK_TIMEOUT_MS);
          const ingest = await withTimeout(getTursoPriceIngestStatus(client), CHECK_TIMEOUT_MS);
          latestSnapshotAt = ingest.latestCapturedSlotMs;
          const snapshotAgeMs = latestSnapshotAt === null ? null : Date.now() - latestSnapshotAt;
          rawCapture =
            snapshotAgeMs !== null && snapshotAgeMs >= 0 && snapshotAgeMs <= MAX_SNAPSHOT_AGE_MS
              ? 'ok'
              : 'stale';
          scheduler =
            snapshotAgeMs !== null && snapshotAgeMs >= 0 && snapshotAgeMs <= MAX_SCHEDULER_AGE_MS
              ? 'ok'
              : 'stale';
          projection = describeProjection(
            await withTimeout(getTursoPriceProjectionBacklog(client), CHECK_TIMEOUT_MS)
          );
        } catch {
          rawCapture = 'unavailable';
          scheduler = 'unavailable';
          projection = describeProjection(null);
        }
        try {
          await withTimeout(checkSupabaseQueryLiveness(), CHECK_TIMEOUT_MS);
          supabase = 'ok';
        } catch {
          supabase = 'unavailable';
        }
      } else {
        // Legacy mode has only Supabase-backed history, so retain the bounded
        // compatibility probe while exposing that no independent data plane is
        // configured yet.
        try {
          const recentRows = await withTimeout(
            loadSnapshotHistoryPage(
              createServiceRoleClient(),
              'price',
              new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              new Date().toISOString(),
              ['snapshot_ts'],
              { ascending: false, inclusiveBefore: true, limit: 1 }
            ),
            CHECK_TIMEOUT_MS
          );
          latestSnapshotAt = recentRows[0]?.snapshot_ts
            ? new Date(recentRows[0].snapshot_ts).getTime()
            : null;
          const snapshotAgeMs = latestSnapshotAt === null ? null : Date.now() - latestSnapshotAt;
          rawCapture =
            snapshotAgeMs !== null && snapshotAgeMs >= 0 && snapshotAgeMs <= MAX_SNAPSHOT_AGE_MS
              ? 'ok'
              : 'stale';
          supabase = 'ok';
        } catch {
          rawCapture = 'unavailable';
          supabase = 'unavailable';
        }
      }

      const projectionReady =
        projection === undefined || projection.check === 'ok' || projection.check === 'catching_up';
      const ready =
        rawCapture === 'ok' &&
        (tursoPrimary ? scheduler === 'ok' : true) &&
        supabase === 'ok' &&
        projectionReady;

      const response = NextResponse.json(
        ready
          ? ApiResponseBuilder.success(
              {
                status: 'ready',
                runtime: { node: process.version },
                checks: {
                  tursoRawCapture: rawCapture,
                  scheduler,
                  supabase,
                  ...(projection ? { projection: projection.check } : {}),
                },
                latestSnapshotAt:
                  latestSnapshotAt === null ? null : new Date(latestSnapshotAt).toISOString(),
                ...(projection?.details ? { projection: projection.details } : {}),
                latencyMs: Date.now() - startedAt,
              },
              { requestId: context.requestId }
            )
          : ApiResponseBuilder.error('SERVICE_UNAVAILABLE', 'Service dependencies are not ready', {
              retryable: true,
              requestId: context.requestId,
              details: {
                runtime: { node: process.version },
                checks: {
                  tursoRawCapture: rawCapture,
                  scheduler,
                  supabase,
                  ...(projection ? { projection: projection.check } : {}),
                },
                latestSnapshotAt:
                  latestSnapshotAt === null ? null : new Date(latestSnapshotAt).toISOString(),
                ...(projection?.details ? { projection: projection.details } : {}),
              },
            }),
        { status: ready ? 200 : 503 }
      );
      response.headers.set('Cache-Control', CACHE_PRESETS.noStore);
      return response;
    } catch {
      const response = NextResponse.json(
        ApiResponseBuilder.error('SERVICE_UNAVAILABLE', 'Service dependencies are not ready', {
          retryable: true,
          requestId: context.requestId,
          details: {
            runtime: { node: process.version },
            checks: {
              tursoRawCapture: 'unavailable',
              scheduler: 'unknown',
              supabase: 'unknown',
            },
          },
        }),
        { status: 503 }
      );
      response.headers.set('Cache-Control', CACHE_PRESETS.noStore);
      return response;
    }
  },
  {
    middlewares: {
      logging: true,
      auth: false,
      cors: true,
    },
  }
);
