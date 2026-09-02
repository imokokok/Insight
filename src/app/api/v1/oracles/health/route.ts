import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { getOracleHealthReport } from '@/lib/oracles/services/oracleHealthService';
import { getTodayUtc } from '@/lib/utils/date';

const DateQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .optional(),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const date = context.validated!.query!.date ?? getTodayUtc();
    const healthReport = await getOracleHealthReport(date);

    if (!healthReport) {
      return NextResponse.json(
        ApiResponseBuilder.error('NOT_FOUND', `No oracle health data available for ${date}`, {
          requestId: context.requestId,
        }),
        { status: 404 }
      );
    }

    return createCachedJsonResponse(
      ApiResponseBuilder.success(healthReport, { requestId: context.requestId }),
      { preset: 'realtime' }
    );
  },
  {
    // C2 deep-analysis endpoint (credit-metered)
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: DateQuerySchema },
  }
);
