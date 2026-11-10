/**
 * @fileoverview Public "latest daily report" endpoint.
 *
 * Returns the most recently published daily report so external agents and
 * monitoring systems can consume the recurring digest without an account.
 * This is the machine-readable counterpart of the /reports page and the
 * polling surface behind the documented collection cadence claim: callers
 * poll this endpoint; Insight does not push.
 *
 * Resolution: today's report first, then walking back up to 7 days so a
 * temporarily failed publication cycle still serves the newest available
 * report instead of a 404. The response includes `reportDate` and `ageDays`
 * so consumers can detect staleness explicitly.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, createOptionsHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { reportService } from '@/lib/reports/reportService';
import { getTodayUtc } from '@/lib/utils/date';

export const OPTIONS = createOptionsHandler();

/** How many days back to search for the newest published report. */
const MAX_LOOKBACK_DAYS = 7;

function shiftDateUtc(dateStr: string, deltaDays: number): string {
  const parsed = Date.parse(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(parsed)) return dateStr;
  return new Date(parsed + deltaDays * 86_400_000).toISOString().slice(0, 10);
}

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const today = getTodayUtc();

    let report = await reportService.getReportByDate(today);
    let ageDays = 0;
    if (!report) {
      for (let back = 1; back <= MAX_LOOKBACK_DAYS; back++) {
        const candidateDate = shiftDateUtc(today, -back);
        report = await reportService.getReportByDate(candidateDate);
        if (report) {
          ageDays = back;
          break;
        }
      }
    }

    if (!report) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'NOT_FOUND',
          `No daily report published in the last ${MAX_LOOKBACK_DAYS} days`,
          {
            retryable: true,
            details: { today, maxLookbackDays: MAX_LOOKBACK_DAYS },
          }
        ),
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const payload = {
      reportDate: report.reportDate,
      ageDays,
      report,
    };

    // Today's report may be regenerated during the day (semiStatic); anything
    // older is immutable (static), mirroring the /reports/daily/[date] route.
    const preset = ageDays === 0 ? 'semiStatic' : 'static';
    return createCachedJsonResponse(
      ApiResponseBuilder.success(payload, { requestId: context.requestId }),
      { preset }
    );
  },
  {
    middlewares: {
      logging: true,
      auth: { required: false },
      rateLimit: { preset: 'moderate' },
      cors: true,
    },
  }
);
