import { type NextRequest } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { getDeviationTimeline } from '@/lib/api/services/deviationService';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { getDaysAgoUtc, getTodayUtc } from '@/lib/utils/date';

import { DeviationQuerySchema } from './querySchema';

export const OPTIONS = createOptionsHandler();

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
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: DeviationQuerySchema },
  }
);
