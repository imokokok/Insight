/* eslint-disable no-console */
/**
 * Daily report publish runner.
 *
 * Runs on GitHub Actions (`.github/workflows/daily-report-publish-cron.yml`
 * daily at 00:00 UTC) — NOT via a curl to a Vercel function — so it escapes
 * Vercel's 60s serverless timeout. Report generation aggregates a full day
 * of snapshots across every provider and can exceed the ceiling.
 *
 * Delegates to `runDailyReportPublish()` (shared with the
 * `/api/cron/daily-report/publish` route), so behaviour is identical to the
 * HTTP path — only the executor changes.
 *
 * Run locally:
 *   npx tsx --env-file=.env.local scripts/daily-report-publish.ts
 *   npx tsx --env-file=.env.local scripts/daily-report-publish.ts --if-missing
 *
 *   `--if-missing`: only generate the report if a row for the target (previous
 *   day) does NOT already exist in `daily_reports`. Used by the workflow's
 *   late-day backfill so it self-heals a dropped/late primary run without
 *   needlessly regenerating an already-published report.
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { runDailyReportPublish } from '@/app/api/cron/daily-report/publish/runner';
import { createServiceRoleClient } from '@/lib/supabase/server';

/** Target report date = the previous UTC calendar day (same logic as the route). */
function targetReportDate(now = new Date()): string {
  const yesterday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)
  );
  return yesterday.toISOString().split('T')[0];
}

/** True if a daily report for `reportDate` already exists in the DB. */
async function reportExists(reportDate: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('daily_reports')
    .select('id')
    .eq('report_date', reportDate)
    .limit(1);
  return Boolean(data && data.length > 0);
}

async function main(): Promise<void> {
  const ifMissing = process.argv.includes('--if-missing');
  const reportDate = targetReportDate();
  const startedAt = Date.now();

  if (ifMissing && (await reportExists(reportDate))) {
    console.log(`[daily-report-publish] report for ${reportDate} already exists — skipping`);
    return;
  }

  console.log('[daily-report-publish] starting publish');

  const { status, body } = await runDailyReportPublish();
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  if (status >= 400) {
    console.error(`[daily-report-publish] FAILED (HTTP ${status}) in ${elapsed}s:`, body);
    process.exit(1);
  }

  console.log(`[daily-report-publish] OK (HTTP ${status}) in ${elapsed}s`);
  console.log(JSON.stringify(body, null, 2));
}

main().catch((error) => {
  console.error('[daily-report-publish] unhandled error:', error);
  process.exit(1);
});
