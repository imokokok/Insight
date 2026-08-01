/* eslint-disable no-console */
/**
 * One-off / manual reactivation pass. Mirrors the sync-feeds cron's
 * `reactivate` mode but runs locally (not bound by the 60s serverless budget)
 * so it can probe a larger batch in a single invocation.
 *
 * Re-probes currently-deactivated feeds DIRECTLY (bypassing the active-feed
 * gate) and revives any that now return a valid price. Used to restore
 * coverage for feeds that were auto-deactivated during a transient upstream
 * outage and never came back online.
 *
 * Run: npx tsx --env-file=.env.local scripts/reactivate-feeds.ts
 *      npx tsx --env-file=.env.local scripts/reactivate-feeds.ts --provider=dia
 *      npx tsx --env-file=.env.local scripts/reactivate-feeds.ts --dry-run
 */
import { getBlockchainByChainId } from '@/lib/oracles/constants/chainMapping';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { api3NetworkService } from '@/lib/oracles/services/api3NetworkService';
import { extractBaseSymbol } from '@/lib/oracles/utils/oracleDataUtils';
import { type OracleFeed } from '@/lib/supabase/queries';
import { getAdminQueries } from '@/lib/supabase/server';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { Blockchain, OracleProvider } from '@/types/oracle';

const PROBE_TIMEOUT_MS = 8_000;
const PROBE_CONCURRENCY = 8;
const BATCH_LIMIT = 200;
const API3_MAX_DATA_AGE_MS = 48 * 60 * 60 * 1000;

function parseArgs(): { provider?: string; dryRun: boolean } {
  const args = process.argv.slice(2);
  let provider: string | undefined;
  let dryRun = false;
  for (const a of args) {
    if (a === '--dry-run') dryRun = true;
    else if (a.startsWith('--provider=')) provider = a.slice('--provider='.length);
  }
  return { provider, dryRun };
}

async function probeInactiveFeed(feed: OracleFeed): Promise<boolean> {
  try {
    const provider = feed.provider as OracleProvider;
    const chain = getBlockchainByChainId(feed.chain_id);

    if (provider === OracleProvider.API3 && feed.address) {
      const reading = await api3NetworkService.getPrice(
        feed.symbol,
        chain ?? Blockchain.ETHEREUM,
        undefined,
        feed.address
      );
      if (
        typeof reading?.price !== 'number' ||
        !Number.isFinite(reading.price) ||
        reading.price <= 0
      ) {
        return false;
      }
      if (typeof reading.dataAge === 'number' && reading.dataAge > API3_MAX_DATA_AGE_MS) {
        return false;
      }
      return true;
    }

    const baseSymbol = extractBaseSymbol(feed.symbol);
    const client = getDefaultFactory().getClient(provider);
    const price = await Promise.race([
      client.getPrice(baseSymbol, chain),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), PROBE_TIMEOUT_MS)),
    ]);
    return (
      !!price && typeof price.price === 'number' && Number.isFinite(price.price) && price.price > 0
    );
  } catch {
    return false;
  }
}

async function main() {
  const { provider, dryRun } = parseArgs();
  const queries = getAdminQueries();

  console.log(
    `=== Feed Reactivation ${dryRun ? '(DRY RUN)' : ''} ===\n` +
      `Provider filter: ${provider ?? 'all'}  |  batch limit: ${BATCH_LIMIT}\n`
  );

  const inactiveFeeds = await queries.getInactiveFeeds(provider, BATCH_LIMIT);
  console.log(`Found ${inactiveFeeds.length} inactive feeds to probe.\n`);

  if (inactiveFeeds.length === 0) {
    console.log('Nothing to do.');
    process.exit(0);
  }

  // Group by provider for readable output.
  const byProvider = new Map<string, number>();
  for (const f of inactiveFeeds) {
    byProvider.set(f.provider, (byProvider.get(f.provider) ?? 0) + 1);
  }
  console.log('Inactive by provider:');
  for (const [p, c] of [...byProvider.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${p.padEnd(12)} ${c}`);
  }
  console.log('');

  const results = await mapWithConcurrency(inactiveFeeds, PROBE_CONCURRENCY, async (feed) => {
    const ok = await probeInactiveFeed(feed);
    return { feed, ok };
  });

  const recovered = results.filter((r) => r.ok);
  const stillDead = results.filter((r) => !r.ok);

  console.log(`\n--- Results ---`);
  console.log(`Probed:      ${results.length}`);
  console.log(`Recovered:   ${recovered.length}`);
  console.log(`Still dead:  ${stillDead.length}`);

  if (recovered.length > 0) {
    console.log(`\nRecovered feeds (will be reactivated):`);
    for (const r of recovered) {
      console.log(`  + ${r.feed.provider}/${r.feed.symbol} (chain ${r.feed.chain_id})`);
    }
  }

  if (dryRun) {
    console.log('\nDry run — no DB changes made.');
    process.exit(0);
  }

  if (recovered.length > 0) {
    console.log(`\nReactivating ${recovered.length} feeds...`);
    let reactivated = 0;
    for (const r of recovered) {
      const ok = await queries.reactivateOracleFeed(
        r.feed.provider,
        r.feed.symbol,
        r.feed.chain_id
      );
      if (ok) reactivated++;
    }
    console.log(`Reactivated ${reactivated}/${recovered.length} feeds.`);
  } else {
    console.log('\nNo feeds to reactivate.');
  }

  process.exit(0);
}

main().catch((e) => {
  console.error('Reactivation script crashed:', e);
  process.exit(1);
});
