import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  type ApiHandlerContext,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { type OracleFeed } from '@/lib/supabase/queries';
import { createServiceRoleClient } from '@/lib/supabase/server';

type HealthStatus = 'healthy' | 'degraded' | 'critical';

function getHealthStatus(consecutiveFailures: number): HealthStatus {
  if (consecutiveFailures === 0) return 'healthy';
  if (consecutiveFailures <= 3) return 'degraded';
  return 'critical';
}

const FeedIdParamSchema = z.object({
  feedId: z.string().uuid('Feed ID must be a valid UUID'),
});

type FeedIdParams = z.infer<typeof FeedIdParamSchema>;

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler<
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>,
  FeedIdParams
>(
  async (_request: NextRequest, context: ApiHandlerContext<unknown, unknown, FeedIdParams>) => {
    const { feedId } = context.validated!.params!;

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('oracle_feeds')
      .select('*')
      .eq('id', feedId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        ApiResponseBuilder.error('NOT_FOUND', `Feed not found: ${feedId}`, {
          requestId: context.requestId,
        }),
        { status: 404 }
      );
    }

    const feed = data as OracleFeed;
    const consecutiveFailures = feed.consecutive_failures ?? 0;
    const timeSinceLastSuccess = feed.last_success_at
      ? Date.now() - new Date(feed.last_success_at).getTime()
      : null;

    const payload = {
      feed: {
        id: feed.id,
        provider: feed.provider,
        symbol: feed.symbol,
        chain_id: feed.chain_id,
        address: feed.address,
        name: feed.name,
        is_active: feed.is_active,
        consecutive_failures: feed.consecutive_failures,
        last_success_at: feed.last_success_at,
        last_failure_at: feed.last_failure_at,
      },
      health: {
        status: getHealthStatus(consecutiveFailures),
        consecutiveFailures,
        lastSuccessAt: feed.last_success_at,
        lastFailureAt: feed.last_failure_at,
        timeSinceLastSuccess,
      },
    };

    return createCachedJsonResponse(
      ApiResponseBuilder.success(payload, { requestId: context.requestId }),
      { preset: 'realtime' }
    );
  },
  {
    // C2 deep-analysis endpoint (credit-metered)
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { params: FeedIdParamSchema },
  }
);
