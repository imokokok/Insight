/* eslint-disable no-console */
/**
 * One-time Oracle Watch historical backfill.
 *
 * Warm-starts `feed_health_snapshots` from months of `hourly_price_snapshots`
 * so /oracle-watch/history and the ML trainer have immediate look-back instead
 * of waiting for the 30-min recorder to slowly accumulate. Idempotent: rows
 * whose (symbol, evaluated_at) already exist are skipped, so it is safe to
 * re-run.
 *
 * Run locally:
 *   npx tsx --env-file=.env.local scripts/backfill-oracle-watch.ts [--days 30] [--symbol BTC,ETH]
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (service-role, bypasses
 * RLS — same credentials the snapshot-collect/ ml-train workflows already use).
 */
import { backfillOracleWatchHistory } from '@/lib/reports/oracleWatchBackfill';

function parseArgs(argv: string[]): { days: number; symbols?: string[] } {
  const args: { days: number; symbols?: string[] } = { days: 30 };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--days' && argv[i + 1]) {
      const d = Number(argv[i + 1]);
      if (Number.isFinite(d) && d > 0 && d <= 365) args.days = Math.floor(d);
      i += 1;
    } else if (argv[i] === '--symbol' && argv[i + 1]) {
      args.symbols = argv[i + 1]
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      i += 1;
    }
  }
  return args;
}

async function main(): Promise<void> {
  const { days, symbols } = parseArgs(process.argv);
  const startedAt = Date.now();
  console.log(
    `[backfill-oracle-watch] starting; days=${days}${symbols ? ` symbols=${symbols.join(',')}` : ' (all)'}…`
  );
  const result = await backfillOracleWatchHistory({ days, symbols });
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `[backfill-oracle-watch] done in ${elapsed}s — built ${result.built}, inserted ${result.inserted}, skipped ${result.skippedExisting}`
  );
}

main().catch((error) => {
  console.error(
    '[backfill-oracle-watch] unhandled error:',
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
