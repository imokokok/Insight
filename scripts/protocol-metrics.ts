/* eslint-disable no-console */
/**
 * Protocol metrics sync runner.
 *
 * Runs on GitHub Actions:
 *   - `.github/workflows/protocol-tvl-cron.yml`        every 4h  (mode=tvl)
 *   - `.github/workflows/protocol-risk-params-cron.yml` every 6h (mode=risk-params)
 *
 * NOT via a curl to a Vercel function — so it escapes Vercel's 60s serverless
 * timeout. Risk-params mode scrapes per-asset parameters from every lending
 * protocol and can exceed the ceiling.
 *
 * Delegates to `runProtocolMetrics()` (shared with the
 * `/api/cron/protocol-metrics` route), so behaviour is identical to the HTTP
 * path — only the executor changes.
 *
 * Run locally:
 *   npx tsx --env-file=.env.local scripts/protocol-metrics.ts --mode=tvl
 *   npx tsx --env-file=.env.local scripts/protocol-metrics.ts --mode=risk-params
 *   npx tsx --env-file=.env.local scripts/protocol-metrics.ts --mode=all
 *
 * Modes: tvl | risk-params | all (default: all)
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { runProtocolMetrics } from '@/app/api/cron/protocol-metrics/runner';

function parseArgs(): { mode: string } {
  const args = process.argv.slice(2);
  let mode = 'all';
  for (const arg of args) {
    if (arg.startsWith('--mode=')) mode = arg.slice('--mode='.length);
  }
  return { mode };
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const { mode } = parseArgs();
  console.log(`[protocol-metrics] mode=${mode}`);

  const { status, body } = await runProtocolMetrics(mode);
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  if (status >= 400) {
    console.error(`[protocol-metrics] FAILED (HTTP ${status}) in ${elapsed}s:`, body);
    process.exit(1);
  }

  console.log(`[protocol-metrics] OK (HTTP ${status}) in ${elapsed}s`);
  console.log(JSON.stringify(body, null, 2));
}

main().catch((error) => {
  console.error('[protocol-metrics] unhandled error:', error);
  process.exit(1);
});
