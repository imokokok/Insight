import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, createOptionsHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { getDeviationTimeline } from '@/lib/api/services/deviationService';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { getDaysAgoUtc, getTodayUtc } from '@/lib/utils/date';

import { DeviationQuerySchema } from './querySchema';

export const OPTIONS = createOptionsHandler();

/**
 * Public-tier limit for anonymous callers: deviation timelines longer than 30
 * days keep the authenticated path so the free tier stays a discovery surface,
 * not a free historical data warehouse.
 */
const PUBLIC_TIER_MAX_RANGE_DAYS = 30;
const DAY_MS = 86_400_000;

/** Presence of a credential header opts the caller into the full query space. */
function hasApiCredential(request: NextRequest): boolean {
  return Boolean(request.headers.get('x-api-key') ?? request.headers.get('authorization'));
}

function startOfDayUtc(value: string): number | null {
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(parsed) ? null : parsed;
}

export const GET = createApiHandler(
  async (request: NextRequest, context) => {
    const { symbol, from, to, interval } = context.validated!.query!;

    // Anonymous callers: enforce the 30-day window. The service defaults are
    // from = 7 days ago, to = today, so the common no-parameter call is well
    // inside the public tier; only an explicit long `from` needs the gate.
    if (!hasApiCredential(request) && from) {
      const fromMs = startOfDayUtc(from);
      const toMs = to ? startOfDayUtc(to) : startOfDayUtc(getTodayUtc());
      if (fromMs !== null && toMs !== null) {
        const rangeDays = Math.round((toMs - fromMs) / DAY_MS);
        if (rangeDays > PUBLIC_TIER_MAX_RANGE_DAYS) {
          return NextResponse.json(
            ApiResponseBuilder.error(
              'UNAUTHORIZED',
              'Authentication required for deviation timelines longer than 30 days',
              {
                details: {
                  publicTierLimits: { rangeDays: PUBLIC_TIER_MAX_RANGE_DAYS },
                  upgradeHint:
                    'Provide an API key (x-api-key header) for full-history deviation timelines.',
                  requested: { from, to: to ?? getTodayUtc(), rangeDays },
                },
              }
            ),
            { status: 401 }
          );
        }
      }
    }

    const result = await getDeviationTimeline({
      symbol,
      from: from ?? getDaysAgoUtc(7),
      to: to ?? getTodayUtc(),
      interval,
    });

    return createCachedJsonResponse(
      ApiResponseBuilder.success(result, { requestId: context.requestId }),
      { preset: 'shortLived' }
    );
  },
  {
    middlewares: {
      logging: true,
      auth: { required: false },
      rateLimit: { preset: 'moderate' },
      cors: true,
    },
    validation: { query: DeviationQuerySchema },
  }
);
