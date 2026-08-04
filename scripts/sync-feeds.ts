/* eslint-disable no-console */
/**
 * Oracle feed sync / discovery / reactivation runner.
 *
 * Runs on GitHub Actions (`.github/workflows/feed-discovery.yml` weekly matrix
 * and `feed-reactivation.yml` every 12h) — NOT via a curl to a Vercel
 * function — so it escapes Vercel's 60s serverless timeout. This matters most
 * for `discover` mode, which probes every candidate feed for a provider and
 * previously got truncated mid-run on Vercel (the workflow curled with
 * --max-time 600, but the function was killed at 60s).
 *
 * Delegates to `runFeedSync()` (shared with the `/api/cron/sync-feeds` route),
 * so behaviour is identical to the HTTP path — only the executor changes.
 *
 * Run locally:
 *   npx tsx --env-file=.env.local scripts/sync-feeds.ts --mode=discover --provider=chainlink
 *   npx tsx --env-file=.env.local scripts/sync-feeds.ts --mode=reactivate
 *   npx tsx --env-file=.env.local scripts/sync-feeds.ts --mode=reactivate --provider=dia
 *
 * Modes: seed, discover, registry, verify, reactivate
 *   discover / seed / registry / verify: require --provider
 *   reactivate: --provider optional (omit = all providers, bounded)
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { runFeedSync } from '@/app/api/cron/sync-feeds/route';

function parseArgs(): { mode: string; provider: string } {
  const args = process.argv.slice(2);
  let mode = 'discover';
  let provider = '';
  for (const arg of args) {
    if (arg.startsWith('--mode=')) mode = arg.slice('--mode='.length);
    else if (arg.startsWith('--provider=')) provider = arg.slice('--provider='.length);
  }
  return { mode, provider };
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const { mode, provider } = parseArgs();
  console.log(`[sync-feeds] mode=${mode} provider=${provider || '(all)'}`);

  const { status, body } = await runFeedSync(mode, provider);
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  if (status >= 400) {
    console.error(`[sync-feeds] FAILED (HTTP ${status}) in ${elapsed}s:`, body);
    process.exit(1);
  }

  console.log(`[sync-feeds] OK (HTTP ${status}) in ${elapsed}s`);
  console.log(JSON.stringify(body, null, 2));
}

// Hard wall-clock deadline: defend against any single provider's run hanging
// past GitHub Actions' 15m job limit. The most recent failure was the reflector
// provider — a degraded Stellar RPC left fetch sockets pending after the probe
// Promise.race resolved, keeping the Node process alive after runFeedSync had
// already returned. (The RPC-side timeout now aborts those fetches, but this
// deadline is kept as a backstop for any future unbounded call.) Defaults to
// 12m so a hung provider fails fast with a clear message instead of hitting the
// 15m ceiling; override via SYNC_FEEDS_DEADLINE_MS.
const HARD_DEADLINE_MS = Number(process.env.SYNC_FEEDS_DEADLINE_MS) || 12 * 60 * 1000;
const deadlineTimer = setTimeout(() => {
  console.error(`[sync-feeds] hard deadline (${HARD_DEADLINE_MS}ms) exceeded — forcing exit`);
  process.exit(1);
}, HARD_DEADLINE_MS);
// Don't let the deadline timer itself keep the event loop alive on the happy
// path; it only fires if the run is still in progress when it elapses.
deadlineTimer.unref?.();

main()
  .then(() => {
    clearTimeout(deadlineTimer);
    // Force-exit on success: probe verification uses Promise.race timeouts that
    // resolve the result but can leave the underlying fetch (e.g. a slow upstream
    // RPC socket) pending. Those orphaned handles would keep Node alive long
    // after runFeedSync has returned, so exit explicitly once the work is done.
    // A short grace window lets any fire-and-forget DB writes (price/health
    // records) flush before we tear the process down.
    const graceTimer = setTimeout(() => process.exit(0), 2000);
    graceTimer.unref?.();
  })
  .catch((error) => {
    clearTimeout(deadlineTimer);
    console.error('[sync-feeds] unhandled error:', error);
    process.exit(1);
  });
