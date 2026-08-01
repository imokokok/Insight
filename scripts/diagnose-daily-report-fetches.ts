/* eslint-disable no-console */
/**
 * Diagnostic script that mirrors the daily-report cron's `fetchBatchPrices`
 * logic and captures per-feed failures with full error detail.
 *
 * Run: npx tsx --env-file=.env.local scripts/diagnose-daily-report-fetches.ts
 *
 * Output: per-provider / per-reason failure breakdown so we can see exactly
 * which feeds are failing and why.
 */
import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { getBlockchainByChainId } from '@/lib/oracles/constants/chainMapping';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { getAllActiveFeedsByProvider } from '@/lib/oracles/utils/dynamicFeedResolver';
import { extractBaseSymbol } from '@/lib/oracles/utils/oracleDataUtils';
import { REPORT_ASSETS, REPORT_PROVIDERS } from '@/lib/reports/reportService';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import type { OracleProvider, PriceData } from '@/types/oracle';

interface FeedAttempt {
  provider: string;
  symbol: string;
  feedChainId: number;
  chainLabel: string;
  feedSymbol: string;
  ok: boolean;
  price: number | null;
  error: string | null;
  errorName: string | null;
  durationMs: number;
}

const CONCURRENCY = 8;

function classifyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('unsupported symbol') || m.includes('not in active feeds'))
    return 'unsupported-symbol';
  if (m.includes('timeout') || m.includes('timed out')) return 'timeout';
  if (
    m.includes('contract call reverted') ||
    m.includes('revert') ||
    m.includes('execution reverted')
  )
    return 'contract-revert';
  if (m.includes('no price') || m.includes('returned 0') || m.includes('invalid price'))
    return 'no-price-returned';
  if (
    m.includes('network') ||
    m.includes('fetch') ||
    m.includes('econnreset') ||
    m.includes('enotfound')
  )
    return 'network';
  if (m.includes('not configured') || m.includes('missing') || m.includes('no address'))
    return 'config-missing';
  if (m.includes('rate limit') || m.includes('429')) return 'rate-limit';
  return 'other';
}

async function main() {
  console.log('=== Daily Report Fetch Diagnostics ===\n');
  console.log(
    `REPORT_ASSETS: ${REPORT_ASSETS.length}, REPORT_PROVIDERS: ${REPORT_PROVIDERS.length}`
  );

  const activeFeedsByProvider = await getAllActiveFeedsByProvider();

  // Print active-feed inventory per provider
  console.log('\n--- Active feeds inventory (from DB) ---');
  const providerFeedCounts = new Map<string, number>();
  for (const [provider, feeds] of activeFeedsByProvider.entries()) {
    providerFeedCounts.set(provider, feeds.length);
    const symbols = new Set(feeds.map((f) => extractBaseSymbol(f.symbol).toUpperCase()));
    console.log(
      `${provider.padEnd(12)} ${String(feeds.length).padStart(3)} feeds, ${String(symbols.size).padStart(2)} symbols`
    );
  }

  const factory = getDefaultFactory();

  // Build query list exactly like fetchBatchPrices
  type Query = {
    provider: OracleProvider;
    symbol: string;
    chain?: ReturnType<typeof getBlockchainByChainId>;
    feedChainId: number;
    feedSymbol: string;
  };
  const queries: Query[] = [];
  const skipped: { provider: string; symbol: string; reason: string }[] = [];

  for (const symbol of REPORT_ASSETS) {
    for (const provider of REPORT_PROVIDERS) {
      const upperSymbol = symbol.toUpperCase();
      const activeFeeds = activeFeedsByProvider.get(provider) ?? [];
      const client = factory.getClient(provider);

      const matchedFeeds = activeFeeds.filter(
        (feed) => extractBaseSymbol(feed.symbol).toUpperCase() === upperSymbol
      );

      if (matchedFeeds.length > 0) {
        for (const feed of matchedFeeds) {
          queries.push({
            provider,
            symbol,
            chain: getBlockchainByChainId(feed.chain_id),
            feedChainId: feed.chain_id,
            feedSymbol: feed.symbol,
          });
        }
      } else if (activeFeeds.length === 0) {
        if (client.isSymbolSupported(symbol)) {
          queries.push({
            provider,
            symbol,
            chain: undefined,
            feedChainId: 0,
            feedSymbol: symbol,
          });
        } else {
          skipped.push({ provider, symbol, reason: 'not supported (no DB feeds)' });
        }
      } else {
        skipped.push({ provider, symbol, reason: 'symbol not in active feeds' });
      }
    }
  }

  console.log(`\n--- Query plan ---`);
  console.log(`Total queries to fetch: ${queries.length}`);
  console.log(`Skipped (no fetch attempted): ${skipped.length}`);

  const attempts: FeedAttempt[] = await mapWithConcurrency(
    queries,
    CONCURRENCY,
    async (q): Promise<FeedAttempt> => {
      const start = Date.now();
      try {
        const price: PriceData = await fetchPriceWithDatabase(
          q.provider,
          q.symbol,
          q.chain,
          true,
          true
        );
        const dur = Date.now() - start;
        const ok =
          typeof price?.price === 'number' && Number.isFinite(price.price) && price.price > 0;
        return {
          provider: q.provider,
          symbol: q.symbol,
          feedChainId: q.feedChainId,
          chainLabel: q.chain ?? 'default',
          feedSymbol: q.feedSymbol,
          ok,
          price: ok ? price.price : null,
          error: ok ? null : 'price returned but invalid (<=0 or non-finite)',
          errorName: 'InvalidPrice',
          durationMs: dur,
        };
      } catch (error) {
        const dur = Date.now() - start;
        const message = error instanceof Error ? error.message : String(error);
        const name = error instanceof Error ? error.constructor.name : 'Unknown';
        return {
          provider: q.provider,
          symbol: q.symbol,
          feedChainId: q.feedChainId,
          chainLabel: q.chain ?? 'default',
          feedSymbol: q.feedSymbol,
          ok: false,
          price: null,
          error: message,
          errorName: name,
          durationMs: dur,
        };
      }
    }
  );

  // Summary
  const success = attempts.filter((a) => a.ok);
  const failed = attempts.filter((a) => !a.ok);
  console.log(`\n--- Results ---`);
  console.log(`Success: ${success.length} / ${attempts.length}`);
  console.log(`Failed:  ${failed.length} / ${attempts.length}`);

  // Group failures by provider
  console.log(`\n--- Failures by provider ---`);
  const byProvider = new Map<string, FeedAttempt[]>();
  for (const f of failed) {
    const list = byProvider.get(f.provider) ?? [];
    list.push(f);
    byProvider.set(f.provider, list);
  }
  for (const [provider, list] of byProvider) {
    console.log(`\n[${provider}] ${list.length} failure(s):`);
    for (const f of list) {
      const reason = classifyError(f.error ?? '');
      console.log(
        `  • ${f.symbol.padEnd(8)} chain=${String(f.chainLabel).padEnd(10)} feedSymbol=${f.feedSymbol.padEnd(14)} ` +
          `(${reason}) [${f.durationMs}ms] ${f.errorName}`
      );
      console.log(`      msg: ${f.error}`);
    }
  }

  // Group failures by reason
  console.log(`\n--- Failures by reason ---`);
  const byReason = new Map<string, number>();
  for (const f of failed) {
    const reason = classifyError(f.error ?? '');
    byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
  }
  for (const [reason, count] of byReason) {
    console.log(`  ${reason.padEnd(22)} ${count}`);
  }

  // Print all distinct raw error messages (truncated) for visibility
  console.log(`\n--- Distinct raw error messages ---`);
  const distinct = new Map<string, number>();
  for (const f of failed) {
    const key = f.error ?? '';
    distinct.set(key, (distinct.get(key) ?? 0) + 1);
  }
  for (const [msg, count] of [...distinct.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  [${count}x] ${msg.slice(0, 300)}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Diagnostic script crashed:', err);
  process.exit(1);
});
