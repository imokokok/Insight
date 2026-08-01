import { NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api/cronAuth';
import { reportService } from '@/lib/reports/reportService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('DailyReportPublish');

/** Structured result returned by `runDailyReportPublish` for both the HTTP route and the GH Actions script. */
export interface DailyReportPublishResult {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Generates and persists the previous day's daily report. Extracted from the
 * GET handler so the same logic runs from both the Vercel route AND the
 * GitHub Actions `scripts/daily-report-publish.ts` job. The GH Actions job
 * escapes Vercel's 60s serverless timeout — report generation aggregates a
 * full day of snapshots across every provider and can exceed the ceiling.
 *
 * @returns `{ status, body }` — the HTTP route wraps this in NextResponse;
 *          the script reads `status` to decide its exit code.
 */
export async function runDailyReportPublish(): Promise<DailyReportPublishResult> {
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

    return {
      status: 200,
      body: {
        success: true,
        reportDate,
        metrics: {
          totalSnapshots: report.metrics.totalSnapshots,
          successRate: report.metrics.overallSuccessRate,
          anomalies: report.metrics.totalAnomalies,
        },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      'Daily report publish failed',
      error instanceof Error ? error : new Error(message)
    );
    return {
      status: 500,
      body: { success: false, stage: 'generate_report', error: message },
    };
  }
}

/**
 * GET /api/cron/daily-report/publish
 *
 * Generates and persists the previous day's daily report. Triggered daily at
 * 00:00 UTC by GitHub Actions (daily-report-publish-cron.yml).
 *
 * Auth: CRON_SECRET Bearer token (see verifyCronSecret).
 * This route does NOT use createApiHandler — it's a simple cron trigger,
 * not a user-facing API.
 */
export async function GET(request: Request) {
  const authResponse = verifyCronSecret(request);
  if (authResponse) return authResponse;

  const { status, body } = await runDailyReportPublish();
  return NextResponse.json(body, { status });
}
