import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { reportService } from '@/lib/reports/reportService';
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
    const report = await reportService.getReportByDate(date);

    if (!report) {
      return NextResponse.json(
        ApiResponseBuilder.error('NOT_FOUND', `No liquidation risk data available for ${date}`, {
          requestId: context.requestId,
        }),
        { status: 404 }
      );
    }

    const todayStr = getTodayUtc();
    const isHistorical = date < todayStr;

    return createCachedJsonResponse(
      ApiResponseBuilder.success(
        {
          reportDate: report.reportDate,
          disclaimer:
            'Stress-test results are based on representative benchmark positions, not individual user wallets.',
          risks: report.protocolLiquidationRisks,
        },
        { requestId: context.requestId }
      ),
      // Historical reports are immutable; today's report may be regenerated.
      { preset: isHistorical ? 'static' : 'semiStatic' }
    );
  },
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: DateQuerySchema },
  }
);
