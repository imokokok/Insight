/* eslint-disable no-console */
/**
 * Daily oracle-feed cadence baseline runner.
 *
 * Runs the same pipeline as the authenticated HTTP fallback without invoking
 * Vercel. Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
import { runFeedCadenceBackfill } from '@/app/api/cron/feed-cadence/runner';

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('[feed-cadence] starting baseline backfill');

  const { status, body } = await runFeedCadenceBackfill();
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  if (status >= 400) {
    console.error(`[feed-cadence] FAILED (HTTP ${status}) in ${elapsed}s:`, body);
    process.exit(1);
  }

  console.log(`[feed-cadence] OK in ${elapsed}s`);
  console.log(JSON.stringify(body, null, 2));
}

main().catch((error) => {
  console.error('[feed-cadence] unhandled error:', error);
  process.exit(1);
});
