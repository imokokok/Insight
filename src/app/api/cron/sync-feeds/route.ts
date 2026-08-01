import { NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api/cronAuth';
import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { getBlockchainByChainId } from '@/lib/oracles/constants/chainMapping';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { api3NetworkService } from '@/lib/oracles/services/api3NetworkService';
import { feedDiscoveryService } from '@/lib/oracles/services/feedDiscovery';
import { feedSyncService } from '@/lib/oracles/services/feedSyncService';
import { invalidateAllFeedsCache } from '@/lib/oracles/utils/dynamicFeedResolver';
import { extractBaseSymbol } from '@/lib/oracles/utils/oracleDataUtils';
import { type OracleFeed, type OracleFeedInsert } from '@/lib/supabase/queries';
import { createServiceRoleClient, getAdminQueries } from '@/lib/supabase/server';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';
import { Blockchain, OracleProvider, ORACLE_PROVIDER_VALUES } from '@/types/oracle';

const logger = createLogger('CronSyncFeeds');

// Provider list is derived from the OracleProvider enum plus the
// `twap-token` pseudo-provider used by the feed sync service for
// TWAP token-specific discovery. New enum entries now appear here
// automatically without another hand-maintained list.
const TWAP_TOKEN_PSEUDO_PROVIDER = 'twap-token';
const SUPPORTED_PROVIDERS: readonly string[] = [
  ...ORACLE_PROVIDER_VALUES,
  TWAP_TOKEN_PSEUDO_PROVIDER,
];

const VERIFY_CONCURRENCY = 8;
const VERIFY_TIMEOUT_MS = 10_000;

// API3 communal proxies return the last-written price even after a dAPI's
// subscription expires, so a non-zero price is not proof of live data.
// Require the on-chain update timestamp to be within 48h (2× the typical
// 24h heartbeat) so expired dAPIs — e.g. a BSC feed still serving a price
// from months ago — are rejected during verification.
const API3_PROBE_MAX_DATA_AGE_MS = 48 * 60 * 60 * 1000;

/**
 * Probe-fetch a single feed to verify it can actually return a price.
 * Returns true if the feed successfully returns a valid price.
 */
async function probeFeed(feed: OracleFeedInsert): Promise<boolean> {
  try {
    const provider = feed.provider as OracleProvider;
    // Resolve the feed's own chain so multi-chain providers (e.g. API3 on
    // BSC/Polygon/Arbitrum) are verified on the correct chain instead of the
    // client's default (Ethereum), which would cause checkSymbolActive to
    // reject them. chain_id=0 (chain-agnostic) → undefined → default chain.
    const chain = getBlockchainByChainId(feed.chain_id);

    // API3 dAPIs are cross-chain and their per-chain activation can only be
    // confirmed by reading the communal proxy contract. The candidate feed
    // carries the dAPI name in `address`; read it directly via the network
    // service (bypassing fetchPriceWithDatabase's active-feed gate, which
    // would reject dAPIs not yet in the DB) so newly-discovered dAPIs can be
    // verified before upsert.
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
      // Drop stale dAPIs whose proxy still serves an expired last-written
      // price (see API3_PROBE_MAX_DATA_AGE_MS).
      if (typeof reading.dataAge === 'number' && reading.dataAge > API3_PROBE_MAX_DATA_AGE_MS) {
        return false;
      }
      return true;
    }

    const price = await fetchPriceWithDatabase(provider, feed.symbol, chain, false, true);
    return typeof price?.price === 'number' && Number.isFinite(price.price) && price.price > 0;
  } catch {
    return false;
  }
}

/**
 * Verify discovered feeds by actually fetching a price from each one.
 * Only feeds that return a valid price are kept; the rest are dropped
 * so they never enter the oracle_feeds table as is_active=true.
 *
 * Feeds that fail verification are logged but not upserted — they will
 * be naturally absent from the DB and won't cause failed snapshots.
 */
async function verifyDiscoveredFeeds(
  feeds: OracleFeedInsert[]
): Promise<{ verified: OracleFeedInsert[]; failedCount: number }> {
  if (feeds.length === 0) return { verified: [], failedCount: 0 };

  const results = await mapWithConcurrency(feeds, VERIFY_CONCURRENCY, async (feed) => {
    const ok = await Promise.race([
      probeFeed(feed),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), VERIFY_TIMEOUT_MS)),
    ]);
    return { feed, ok };
  });

  const verified = results.filter((r) => r.ok).map((r) => r.feed);
  const failed = results.filter((r) => !r.ok);

  if (failed.length > 0) {
    logger.info(
      `Feed verification: ${failed.length}/${feeds.length} feeds failed probe — skipped upsert. ` +
        `Failed: ${failed.map((f) => `${f.feed.provider}/${f.feed.symbol}`).join(', ')}`
    );
  }

  return { verified, failedCount: failed.length };
}

async function upsertDiscoveredFeeds(feeds: OracleFeedInsert[]): Promise<number> {
  if (feeds.length === 0) return 0;
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('oracle_feeds')
    .upsert(feeds, { onConflict: 'provider,symbol,chain_id' })
    .select();
  if (error) {
    logger.error(
      'Failed to upsert discovered feeds',
      error instanceof Error ? error : new Error(String(error))
    );
    return 0;
  }
  return data?.length || 0;
}

// Reactivation pass: probe currently-deactivated feeds directly and revive
// those that now return a valid price. Feeds are auto-deactivated after 3
// consecutive failures, but upstream outages are frequently transient —
// without this pass a feed that recovers stays is_active=false forever,
// silently dropping coverage from the daily report (e.g. DIA/redstone feeds
// that failed during a brief API outage and never came back online).
// Per-probe timeout and batch size are sized so the whole pass fits within
// the sync-feeds route's 60s maxDuration: 40 feeds ÷ 8 concurrency × 6s
// worst-case ≈ 30s, leaving ample buffer for the DB reads/writes. Feeds are
// ordered by most-recent failure first, so 40/run is enough to catch every
// freshly-deactivated feed in a single pass (deactivation is rare now that
// health tracking records successes correctly). Older/permanently-dead feeds
// are re-checked by the weekly discovery pass instead.
const REACTIVATE_TIMEOUT_MS = 6_000;
const REACTIVATE_LIMIT = 40;

/**
 * Probe an inactive feed DIRECTLY via the oracle client, bypassing the
 * active-feed gate in fetchPriceWithDatabase (which would reject the feed as
 * "unsupported" precisely because it is is_active=false). Returns true if the
 * feed currently returns a valid price, signalling it has recovered.
 */
async function probeInactiveFeed(feed: OracleFeed): Promise<boolean> {
  try {
    const provider = feed.provider as OracleProvider;
    const chain = getBlockchainByChainId(feed.chain_id);

    // API3 dAPIs are cross-chain and resolved via the communal proxy contract
    // using the dAPI name stored in `address`. Probe through the network
    // service (mirroring probeFeed) so the stale-dataAge guard still applies.
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
      if (typeof reading.dataAge === 'number' && reading.dataAge > API3_PROBE_MAX_DATA_AGE_MS) {
        return false;
      }
      return true;
    }

    // Other providers: clients expect the BASE symbol (e.g. "BTC"), while DB
    // rows may store the quoted pair (e.g. pyth "BTC/USD"). Extract the base
    // so the client resolves the feed correctly.
    const baseSymbol = extractBaseSymbol(feed.symbol);
    const client = getDefaultFactory().getClient(provider);
    const price = await Promise.race([
      client.getPrice(baseSymbol, chain),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), REACTIVATE_TIMEOUT_MS)),
    ]);
    return (
      !!price && typeof price.price === 'number' && Number.isFinite(price.price) && price.price > 0
    );
  } catch {
    return false;
  }
}

/**
 * Re-probe currently-deactivated feeds and reactivate those that now return a
 * valid price. Bounded by REACTIVATE_LIMIT per run (ordered by most-recent
 * failure first) so permanently-dead feeds don't starve the pass.
 */
async function reactivateRecoveredFeeds(
  provider?: string
): Promise<{ probed: number; reactivated: number; recovered: string[] }> {
  const queries = getAdminQueries();
  const inactiveFeeds = await queries.getInactiveFeeds(provider, REACTIVATE_LIMIT);
  if (inactiveFeeds.length === 0) {
    return { probed: 0, reactivated: 0, recovered: [] };
  }

  const results = await mapWithConcurrency(inactiveFeeds, VERIFY_CONCURRENCY, async (feed) => {
    const ok = await probeInactiveFeed(feed);
    return { feed, ok };
  });

  const recovered = results.filter((r) => r.ok);
  const recoveredLabels = recovered.map((r) => `${r.feed.provider}/${r.feed.symbol}`);
  await Promise.all(
    recovered.map((r) =>
      queries.reactivateOracleFeed(r.feed.provider, r.feed.symbol, r.feed.chain_id)
    )
  );

  if (recovered.length > 0) {
    logger.info(
      `Reactivation: ${recovered.length}/${inactiveFeeds.length} inactive feeds recovered. ` +
        `Recovered: ${recoveredLabels.join(', ')}`
    );
  }
  return {
    probed: inactiveFeeds.length,
    reactivated: recovered.length,
    recovered: recoveredLabels,
  };
}

export async function GET(request: Request) {
  const authResponse = verifyCronSecret(request);
  if (authResponse) return authResponse;

  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'discover';
    const provider = url.searchParams.get('provider') || '';

    if (provider && !SUPPORTED_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: `Unsupported provider. Supported: ${SUPPORTED_PROVIDERS.join(', ')}` },
        { status: 400 }
      );
    }

    switch (mode) {
      case 'seed': {
        // Initial seed from hardcoded data — one provider at a time
        // Call with ?provider=chainlink, ?provider=pyth, etc.
        if (!provider) {
          return NextResponse.json(
            {
              error:
                'Seed mode requires ?provider= parameter (call once per provider to stay within 10s timeout)',
            },
            { status: 400 }
          );
        }
        const results = await feedSyncService.fullSync(provider);
        // Feed rows changed — drop the cross-provider aggregate cache so
        // the next dashboard SSR / cron read picks up the new state
        // without waiting for the 5-minute TTL.
        invalidateAllFeedsCache();
        const summary = results.map((r) => ({
          provider: r.provider,
          discovered: r.discovered,
          upserted: r.upserted,
          deactivated: r.deactivated,
          errors: r.errors,
        }));
        return NextResponse.json({ success: true, mode: 'seed', provider, results: summary });
      }

      case 'discover': {
        // Discover feeds from official APIs — one provider at a time
        // Call with ?provider=chainlink, ?provider=pyth, etc.
        if (!provider) {
          return NextResponse.json(
            {
              error:
                'Discover mode requires ?provider= parameter (call once per provider to stay within 10s timeout)',
            },
            { status: 400 }
          );
        }
        const discovery = await feedDiscoveryService.discoverAll(provider);
        const discoveredFeeds = discovery[0]?.feeds || [];

        // Verify each discovered feed by actually fetching a price.
        // Only feeds that return valid data are upserted to the DB.
        const { verified, failedCount } = await verifyDiscoveredFeeds(discoveredFeeds);

        // Deactivate existing active feeds that were not rediscovered this run.
        // Only deactivate within chains that the discovery actually covered, so
        // providers like Chainlink (Ethereum-only discovery) don't wipe feeds
        // for other chains that were seeded separately.
        if (discoveredFeeds.length > 0) {
          try {
            const queries = getAdminQueries();
            const existingFeeds = await queries.getOracleFeeds(provider);
            const discoveredKeys = new Set(
              discoveredFeeds.map((f) => `${f.provider}:${f.symbol}:${f.chain_id}`)
            );
            const discoveredChainIds = new Set(discoveredFeeds.map((f) => f.chain_id));

            // Collect feeds that need deactivation, then fire all
            // deactivation calls in parallel (the RequestQueue inside
            // DatabaseQueries bounds concurrency to 15, so this is safe).
            const feedsToDeactivate = existingFeeds.filter(
              (feed) =>
                discoveredChainIds.has(feed.chain_id) &&
                !discoveredKeys.has(`${feed.provider}:${feed.symbol}:${feed.chain_id}`)
            );

            await Promise.all(
              feedsToDeactivate.map((feed) =>
                queries.deactivateOracleFeeds(feed.provider, feed.symbol, feed.chain_id)
              )
            );
          } catch (error) {
            logger.error(
              `Failed to deactivate stale feeds for ${provider}`,
              error instanceof Error ? error : new Error(String(error))
            );
          }
        }

        const upserted = await upsertDiscoveredFeeds(verified);

        // Auto-deactivate feeds that have accumulated consecutive failures.
        // This ensures persistently broken feeds are taken offline between
        // weekly discovery runs, not just when they disappear from the API.
        let healthDeactivated = 0;
        try {
          const queries = getAdminQueries();
          healthDeactivated = await queries.deactivateStaleFeeds(3);
        } catch (error) {
          logger.error(
            'Failed to auto-deactivate stale feeds by health',
            error instanceof Error ? error : new Error(String(error))
          );
        }

        // Feed rows changed (upserts + deactivations) — drop the
        // cross-provider aggregate cache so the next read sees the new
        // state without waiting for the 5-minute TTL.
        invalidateAllFeedsCache();
        const summary = [
          {
            provider: discovery[0]?.provider || provider,
            discovered: discovery[0]?.discovered || 0,
            verified: verified.length,
            verifiedFailed: failedCount,
            upserted,
            healthDeactivated,
            errors: discovery[0]?.errors.length || 0,
          },
        ];
        return NextResponse.json({ success: true, mode: 'discover', provider, results: summary });
      }

      case 'registry': {
        // Chainlink Feed Registry only
        const results = [await feedSyncService.syncChainlinkFeedsFromRegistry()];
        invalidateAllFeedsCache();
        const summary = results.map((r) => ({
          provider: r.provider,
          discovered: r.discovered,
          upserted: r.upserted,
          errors: r.errors,
        }));
        return NextResponse.json({ success: true, mode: 'registry', results: summary });
      }

      case 'verify': {
        // Verify existing feeds
        const results = [await feedSyncService.verifyChainlinkFeeds()];
        const summary = results.map((r) => ({
          provider: r.provider,
          discovered: r.discovered,
          errors: r.errors,
        }));
        return NextResponse.json({ success: true, mode: 'verify', results: summary });
      }

      case 'reactivate': {
        // Re-probe deactivated feeds and revive those that have recovered.
        // Optional ?provider= scopes the pass to one provider; omit it to run
        // across all providers (bounded by REACTIVATE_LIMIT, most-recent
        // failures first). Safe to run frequently — each probe is bounded and
        // only feeds returning a valid price are reactivated.
        const result = await reactivateRecoveredFeeds(provider || undefined);
        invalidateAllFeedsCache();
        return NextResponse.json({
          success: true,
          mode: 'reactivate',
          provider: provider || 'all',
          results: [result],
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown mode: ${mode}. Use: seed, discover, registry, verify, reactivate` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Feed sync failed', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ success: false, error: 'Sync failed' }, { status: 500 });
  }
}
