import { type NextRequest } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_PROTOCOL_TIER_MIDDLEWARES,
} from '@/lib/api/handler';
import { getIncidentAggregation } from '@/lib/api/services/incidentService';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { SafeProviderSchema } from '@/lib/security/validation';
import { get7dAgoUtc, getTodayUtc } from '@/lib/utils/date';

const IncidentsQuerySchema = z.object({
  provider: SafeProviderSchema.optional(),
  minSeverity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { provider, minSeverity, from, to, limit, offset } = context.validated!.query!;

    const result = await getIncidentAggregation({
      from: from ?? get7dAgoUtc(),
      to: to ?? getTodayUtc(),
      provider,
      minSeverity,
      limit,
      offset,
    });

    return createCachedJsonResponse(
      ApiResponseBuilder.success(result, { requestId: context.requestId }),
      { preset: 'semiStatic' }
    );
  },
  {
    // C2 deep-analysis endpoint (credit-metered)
    middlewares: V1_PROTOCOL_TIER_MIDDLEWARES,
    validation: { query: IncidentsQuerySchema },
  }
);
