import { NextResponse } from 'next/server';

import { createApiHandler, createOptionsHandler } from '@/lib/api/handler';
import { ApiResponseBuilder } from '@/lib/api/response';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { loadSnapshotHistoryPage } from '@/lib/supabase/snapshotHistory';

const MAX_SNAPSHOT_AGE_MS = 45 * 60 * 1000;
const CHECK_TIMEOUT_MS = 2500;

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

export const OPTIONS = createOptionsHandler();
export const dynamic = 'force-dynamic';

// Keep the middleware path independent of Supabase so this endpoint can
// report database unavailability (below) instead of timing out before its
// bounded readiness query runs.
export const GET = createApiHandler(
  async (_request, context) => {
    const startedAt = Date.now();

    try {
      // Two days is deliberately wider than the freshness SLO: if it is empty,
      // the service is stale either way, without scanning an unbounded history.
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

      const latestSnapshotAt = recentRows[0]?.snapshot_ts
        ? new Date(recentRows[0].snapshot_ts).getTime()
        : null;
      const snapshotAgeMs = latestSnapshotAt == null ? null : Date.now() - latestSnapshotAt;
      const databaseReady = true;
      const dataFresh =
        snapshotAgeMs != null && snapshotAgeMs >= 0 && snapshotAgeMs <= MAX_SNAPSHOT_AGE_MS;
      const ready = databaseReady && dataFresh;

      const response = NextResponse.json(
        ready
          ? ApiResponseBuilder.success(
              {
                status: 'ready',
                checks: { database: 'ok', dataFreshness: 'ok' },
                latestSnapshotAt: new Date(latestSnapshotAt!).toISOString(),
                latencyMs: Date.now() - startedAt,
              },
              { requestId: context.requestId }
            )
          : ApiResponseBuilder.error('SERVICE_UNAVAILABLE', 'Service dependencies are not ready', {
              retryable: true,
              requestId: context.requestId,
              details: {
                checks: {
                  database: databaseReady ? 'ok' : 'unavailable',
                  dataFreshness: dataFresh ? 'ok' : 'stale',
                },
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
          details: { checks: { database: 'unavailable', dataFreshness: 'unknown' } },
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
