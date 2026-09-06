/* eslint-disable no-console */
/**
 * Safety outcome backfill runner.
 *
 * Runs on GitHub Actions (`.github/workflows/safety-outcome-cron.yml` every
 * 2h) — NOT via a curl to a Vercel function — so it escapes Vercel's 60s
 * serverless timeout. The backfill joins against hourly_price_snapshots and
 * can exceed the ceiling during cold-start DB connection latency.
 *
 * Delegates to `runSafetyOutcomeBackfill()` (shared with the
 * `/api/cron/safety-outcome` route), so behaviour is identical to the HTTP
 * path — only the executor changes.
 *
 * Run locally:
 *   npx tsx --env-file=.env.local scripts/safety-outcome.ts
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { runSafetyOutcomeBackfill } from '@/app/api/cron/safety-outcome/runner';

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('[safety-outcome] starting backfill');

  const { status, body } = await runSafetyOutcomeBackfill();
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  if (status >= 400) {
    console.error(`[safety-outcome] FAILED (HTTP ${status}) in ${elapsed}s:`, body);
    process.exit(1);
  }

  console.log(`[safety-outcome] OK (HTTP ${status}) in ${elapsed}s`);
  console.log(JSON.stringify(body, null, 2));
}

main().catch((error) => {
  console.error('[safety-outcome] unhandled error:', error);
  process.exit(1);
});
