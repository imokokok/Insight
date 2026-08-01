import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { getCorrelationAnalysis } from '@/lib/api/services/correlationService';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { SafeSymbolSchema } from '@/lib/security/validation';
import { get7dAgoUtc, getTodayUtc } from '@/lib/utils/date';

const CorrelationQuerySchema = z.object({
  symbol: SafeSymbolSchema,
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
    const { symbol, from, to } = context.validated!.query!;

    const result = await getCorrelationAnalysis({
      symbol,
      from: from ?? get7dAgoUtc(),
      to: to ?? getTodayUtc(),
    });

    if (result.providers.length < 2) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'INSUFFICIENT_DATA',
          `At least 2 providers with deviation data are required for correlation analysis. Found ${result.providers.length} for ${symbol}.`,
          {
            requestId: context.requestId,
            details: { symbol, providersFound: result.providers.length },
          }
        ),
        { status: 400 }
      );
    }

    const payload = {
      symbol: result.symbol,
      from: result.from,
      to: result.to,
      dataPoints: result.dataPoints,
      providers: result.providers,
      matrix: result.matrix,
      pairs: result.pairs,
    };

    return createCachedJsonResponse(
      ApiResponseBuilder.success(payload, { requestId: context.requestId }),
      { preset: 'shortLived' }
    );
  },
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: CorrelationQuerySchema },
  }
);
