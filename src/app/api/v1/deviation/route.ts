import { type NextRequest } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { getDeviationTimeline } from '@/lib/api/services/deviationService';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { SafeSymbolSchema } from '@/lib/security/validation';
import { getDaysAgoUtc, getTodayUtc } from '@/lib/utils/date';

const DeviationQuerySchema = z.object({
  symbol: SafeSymbolSchema,
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .optional(),
  interval: z.enum(['1h', '6h', '24h']).optional().default('24h'),
});

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
