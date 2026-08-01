import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { reportService } from '@/lib/reports/reportService';
import { getTodayUtc } from '@/lib/utils/date';

const DateParamSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { date } = context.validated!.params!;
    const report = await reportService.getReportByDate(date);

    if (!report) {
      return NextResponse.json(
        ApiResponseBuilder.error('NOT_FOUND', `Daily report not found for ${date}`, {
          requestId: context.requestId,
        }),
        { status: 404 }
      );
    }

    const isHistorical = date < getTodayUtc();

    return createCachedJsonResponse(
      ApiResponseBuilder.success(report, { requestId: context.requestId }),
      // Historical daily reports are immutable; today's report may be regenerated.
      { preset: isHistorical ? 'static' : 'semiStatic' }
    );
  },
  {
    middlewares: V1_READ_ONLY_MIDDLEWARES,
    validation: { params: DateParamSchema },
  }
);
