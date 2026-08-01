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
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { runDailyReportPublish } from '@/app/api/cron/daily-report/publish/route';

async function main(): Promise<void> {
  const startedAt = Date.now();
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
