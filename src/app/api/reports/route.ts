import { NextResponse } from 'next/server';

import { reportService } from '@/lib/reports/reportService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ReportsApi');

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '30', 10), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10), 0);

    const reports = await reportService.listReports(limit, offset);

    return NextResponse.json({
      success: true,
      data: reports,
      meta: {
        limit,
        offset,
        count: reports.length,
      },
    });
  } catch (error) {
    logger.error(
      'Failed to list reports',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ success: false, error: 'Failed to load reports' }, { status: 500 });
  }
}
