import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler } from '@/lib/api/handler';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { reportService } from '@/lib/reports/reportService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ReportsApi');

export const GET = createApiHandler(
  async (request: NextRequest) => {
    try {
      const url = new URL(request.url);
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '30', 10), 100);
      const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10), 0);

      // Return lightweight summaries by default. This selects only the
      // columns the list view renders (report_date, summary, metrics,
      // deviation_events) and trims each row to a ReportSummary, avoiding
      // transfer of the large nested arrays (coverageMatrix, etc.).
      const reports = await reportService.listReportSummaries(limit, offset);

      const response = NextResponse.json({
        success: true,
        data: reports,
        meta: {
          limit,
          offset,
          count: reports.length,
        },
      });

      response.headers.set('Cache-Control', CACHE_PRESETS.static);
      return response;
    } catch (error) {
      logger.error(
        'Failed to list reports',
        error instanceof Error ? error : new Error(String(error))
      );
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load reports' } },
        { status: 500 }
      );
    }
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: false },
    },
    skipInternalAuthAndRateLimit: true,
  }
);
