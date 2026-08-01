/* eslint-disable no-console */
/**
 * Daily billing runner.
 *
 * Runs on GitHub Actions (`.github/workflows/billing-cron.yml` daily at
 * 00:30 UTC) — NOT via a curl to a Vercel function — so it escapes Vercel's
 * 60s serverless timeout. Billing touches every API key row and previously
 * risked truncation on Vercel during cold-start DB connection latency.
 *
 * Delegates to `runBilling()` (shared with the `/api/cron/billing` route),
 * so behaviour is identical to the HTTP path — only the executor changes.
 *
 * Run locally:
 *   npx tsx --env-file=.env.local scripts/billing.ts
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { runBilling } from '@/app/api/cron/billing/route';

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('[billing] starting daily billing run');

  const { status, body } = await runBilling();
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  if (status >= 400) {
    console.error(`[billing] FAILED (HTTP ${status}) in ${elapsed}s:`, body);
    process.exit(1);
  }

  console.log(`[billing] OK (HTTP ${status}) in ${elapsed}s`);
  console.log(JSON.stringify(body, null, 2));
}

main().catch((error) => {
  console.error('[billing] unhandled error:', error);
  process.exit(1);
});
