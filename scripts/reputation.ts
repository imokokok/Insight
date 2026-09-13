/* eslint-disable no-console */
/**
 * Hourly reputation runner.
 *
 * Runs the same pipeline as the authenticated HTTP fallback without invoking
 * Vercel. Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
import { runReputationCalculation } from '@/app/api/cron/reputation/runner';

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('[reputation] starting hourly calculation');

  const { status, body } = await runReputationCalculation();
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  if (status >= 400) {
    console.error(`[reputation] FAILED (HTTP ${status}) in ${elapsed}s:`, body);
    process.exit(1);
  }

  console.log(`[reputation] OK in ${elapsed}s`);
  console.log(JSON.stringify(body, null, 2));
}

main().catch((error) => {
  console.error('[reputation] unhandled error:', error);
  process.exit(1);
});
