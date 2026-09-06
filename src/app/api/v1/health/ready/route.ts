import { NextResponse } from 'next/server';

import { createApiHandler, createOptionsHandler } from '@/lib/api/handler';
import { ApiResponseBuilder } from '@/lib/api/response';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { createServiceRoleClient } from '@/lib/supabase/server';

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

export const GET = createApiHandler(
  async (_request, context) => {
    const startedAt = Date.now();

    try {
      const { data, error } = await withTimeout(
        createServiceRoleClient()
          .from('price_snapshots')
          .select('snapshot_ts')
          .order('snapshot_ts', { ascending: false })
          .limit(1)
          .maybeSingle(),
        CHECK_TIMEOUT_MS
      );

      const latestSnapshotAt = data?.snapshot_ts ? new Date(data.snapshot_ts).getTime() : null;
      const snapshotAgeMs = latestSnapshotAt == null ? null : Date.now() - latestSnapshotAt;
      const databaseReady = !error;
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
      rateLimit: { preset: 'lenient' },
      cors: true,
    },
  }
);
