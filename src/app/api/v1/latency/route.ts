import { type NextRequest } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { getLatencyStatistics } from '@/lib/api/services/latencyService';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { SafeProviderSchema, SafeSymbolSchema } from '@/lib/security/validation';
import { get7dAgoUtc, getTodayUtc } from '@/lib/utils/date';

const LatencyQuerySchema = z.object({
  provider: SafeProviderSchema.optional(),
  symbol: SafeSymbolSchema.optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .optional(),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { provider, symbol, from, to } = context.validated!.query!;

    const result = await getLatencyStatistics({
      from: from ?? get7dAgoUtc(),
      to: to ?? getTodayUtc(),
      provider,
      symbol,
    });

    return createCachedJsonResponse(
      ApiResponseBuilder.success(result, { requestId: context.requestId }),
      { preset: 'realtime' }
    );
  },
  {
    // Tier 2 deep-analysis endpoint
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: LatencyQuerySchema },
  }
);
