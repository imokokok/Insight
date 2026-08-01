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

main().catch((error) => {
  console.error('[sync-feeds] unhandled error:', error);
  process.exit(1);
});
