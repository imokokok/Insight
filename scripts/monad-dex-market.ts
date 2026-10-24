/* eslint-disable no-console */
/**
 * Finalized Monad Uniswap V3 market-event collector.
 *
 * Runs on GitHub Actions every five minutes. It deliberately shares the same
 * implementation as the authenticated cron route, while avoiding a Vercel
 * request-duration ceiling during catch-up after an outage.
 */
import { runMonadDexMarketSync } from '@/app/api/cron/monad-dex-market/runner';

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('[monad-dex-market] starting finalized Swap-event sync');
  const { status, body } = await runMonadDexMarketSync();
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  if (status >= 400) {
    console.error(`[monad-dex-market] FAILED (HTTP ${status}) in ${elapsed}s:`, body);
    process.exit(1);
  }
  console.log(`[monad-dex-market] OK in ${elapsed}s`);
  console.log(JSON.stringify(body, null, 2));
}

main().catch((error) => {
  console.error('[monad-dex-market] unhandled error:', error);
  process.exit(1);
});
