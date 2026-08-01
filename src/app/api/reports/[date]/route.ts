import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler } from '@/lib/api/handler';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { reportService } from '@/lib/reports/reportService';
import { getTodayUtc } from '@/lib/utils/date';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ReportDetailApi');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const date = context.validated?.params?.date || '';

    if (!DATE_REGEX.test(date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    try {
      const report = await reportService.getReportByDate(date);

      if (!report) {
        return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
      }

      const response = NextResponse.json({ success: true, data: report });

      const isHistorical = date < getTodayUtc();
      response.headers.set(
        'Cache-Control',
        isHistorical ? CACHE_PRESETS.static : CACHE_PRESETS.semiStatic
      );
      return response;
    } catch (error) {
      logger.error(
        'Failed to load report detail',
        error instanceof Error ? error : new Error(String(error))
      );
      return NextResponse.json({ success: false, error: 'Failed to load report' }, { status: 500 });
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
