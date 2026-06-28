import { NextResponse } from 'next/server';

import { reportService } from '@/lib/reports/reportService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ReportsApi');

export async function GET(request: Request) {
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

    // Reports update at most hourly; allow downstream/edge caching.
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (error) {
    logger.error(
      'Failed to list reports',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ success: false, error: 'Failed to load reports' }, { status: 500 });
  }
}
