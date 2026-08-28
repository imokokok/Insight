/* eslint-disable no-console */
/**
 * Low-frequency Oracle Watch feed-health snapshot collector.
 *
 * Runs on GitHub Actions (`/.github/workflows/oracle-watch-collect.yml`, every
 * 30 minutes) — NOT inside Vercel — so it is not bound by the 60s serverless
 * timeout. Each pass evaluates the curated target list through
 * `getOracleWatchSignal` (live cross-oracle consensus + ML manipulation risk +
 * provider reputation) and appends one row per symbol to `feed_health_snapshots`.
 * That table is the time-series spine that powers the /oracle-watch/history API
 * and gives agents a retrospective credibility curve without them having to poll
 * and store it themselves.
 *
 * Run locally:
 *   npx tsx --env-file=.env.local scripts/collect-oracle-watch.ts
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (service-role, bypasses
 * RLS — same credentials the snapshot-collect/ ml-train workflows already use).
 */
import { collectOracleWatchSnapshots } from '@/lib/reports/oracleWatchCollector';

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('[collect-oracle-watch] starting; targets from collector module…');
  const { collected } = await collectOracleWatchSnapshots();
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[collect-oracle-watch] done in ${elapsed}s — ${collected} snapshots appended`);
}

// Hard deadline so a hung oracle client fails the GH job fast instead of
// timing out at the workflow limit. Mirrors the snapshot-collect script.
const HARD_DEADLINE_MS = Number(process.env.ORACLE_WATCH_DEADLINE_MS) || 8 * 60 * 1000;
const deadlineTimer = setTimeout(() => {
  console.error(
    `[collect-oracle-watch] hard deadline (${HARD_DEADLINE_MS}ms) exceeded — forcing exit`
  );
  process.exit(1);
}, HARD_DEADLINE_MS);
deadlineTimer.unref?.();

main()
  .then(() => {
    clearTimeout(deadlineTimer);
    const graceTimer = setTimeout(() => process.exit(0), 2000);
    graceTimer.unref?.();
  })
  .catch((error) => {
    clearTimeout(deadlineTimer);
    console.error(
      '[collect-oracle-watch] unhandled error:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  });
