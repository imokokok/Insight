import { NextResponse } from 'next/server';

import { reportService } from '@/lib/reports/reportService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ReportDetailApi');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(_request: Request, { params }: { params: Promise<{ date: string }> }) {
  try {
    const { date } = await params;

    if (!DATE_REGEX.test(date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    const report = await reportService.getReportByDate(date);

    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }

    const response = NextResponse.json({ success: true, data: report });

    // Historical reports are immutable; today's report updates hourly.
    // Allow edge caching with a short stale window for the current day.
    const todayStr = new Date().toISOString().slice(0, 10);
    const isHistorical = date < todayStr;
    if (isHistorical) {
      response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    } else {
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    }
    return response;
  } catch (error) {
    logger.error(
      'Failed to load report detail',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ success: false, error: 'Failed to load report' }, { status: 500 });
  }
}
