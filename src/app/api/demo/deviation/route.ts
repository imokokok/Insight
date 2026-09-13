import { type NextRequest } from 'next/server';

import { DeviationQuerySchema } from '@/app/api/v1/deviation/querySchema';
import { ApiResponseBuilder, createApiHandler } from '@/lib/api/handler';
import { getDeviationTimeline } from '@/lib/api/services/deviationService';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { getDaysAgoUtc, getTodayUtc } from '@/lib/utils/date';

/** Public, IP-rate-limited chart data. Developer access remains on metered v1. */
export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { symbol, from, to, interval } = context.validated!.query!;
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
    middlewares: { logging: true, rateLimit: { preset: 'moderate' } },
    validation: { query: DeviationQuerySchema },
  }
);
