import { NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api/cronAuth';
import { reportService } from '@/lib/reports/reportService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('DailyReportPublish');

export async function GET(request: Request) {
  const authResponse = verifyCronSecret(request);
  if (authResponse) return authResponse;

  try {
    const now = new Date();
    const yesterday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)
    );
    const reportDate = yesterday.toISOString().split('T')[0];

    logger.info(`Publishing daily report for ${reportDate}`);

    const report = await reportService.generateDailyReport(reportDate);

    logger.info(
      `Published daily report for ${reportDate}: ${report.metrics.totalSnapshots} snapshots, ${report.metrics.overallSuccessRate}% success rate`
    );

    return NextResponse.json({
      success: true,
      reportDate,
      metrics: {
        totalSnapshots: report.metrics.totalSnapshots,
        successRate: report.metrics.overallSuccessRate,
        anomalies: report.metrics.totalAnomalies,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      'Daily report publish failed',
      error instanceof Error ? error : new Error(message)
    );
    return NextResponse.json(
      { success: false, stage: 'generate_report', error: message },
      { status: 500 }
    );
  }
}
