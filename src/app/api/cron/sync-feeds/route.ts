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

// Graceful pruning: a feed missing from a discovery run is only deactivated
// after it fails re-verification ABSENT_PRUNE_THRESHOLD consecutive times.
// One flaky discovery run must never kill a live feed (this was the root cause
// of the 233-API3 bulk deactivation). PRUNE_COOLING_MS: a feed that returned a
// successful price within this window is never pruned, even if re-verification
// fails — it is clearly still live upstream.
const ABSENT_PRUNE_THRESHOLD = 2;
const PRUNE_COOLING_MS = 48 * 60 * 60 * 1000;

/** Structured result returned by `runFeedSync` for both the HTTP route and the GH Actions script. */
export interface FeedSyncResult {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Probe-fetch a single feed to verify it can actually return a price.
 * Returns true if the feed successfully returns a valid price.
 */
async function probeFeed(feed: OracleFeed | OracleFeedInsert): Promise<boolean> {
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
  const now = new Date().toISOString();
  // Rediscovered feeds are confirmed present: reset the absent counter and
  // stamp last_discovery_at so they don't accumulate toward the prune
  // threshold and are never re-pruned while they keep showing up.
  const rows = feeds.map((f) => ({
    ...f,
    absent_discovery_runs: 0,
    last_discovery_at: now,
  }));
  const { data, error } = await supabase
    .from('oracle_feeds')
    .upsert(rows, { onConflict: 'provider,symbol,chain_id' })
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
// Per-probe timeout and batch size were originally sized for the sync-feeds
// route's 60s maxDuration; now that this runs on GH Actions the 60s ceiling no
// longer applies. REACTIVATE_LIMIT was raised 40 → 200 so a large batch of
// feeds deactivated by a transient incident (e.g. the 233-API3 bulk event)
// recovers in a single 12h pass instead of trickling in over many days.
// Feeds are ordered by most-recent failure first; older / permanently-dead
// feeds are re-checked by the weekly discovery pass.
const REACTIVATE_TIMEOUT_MS = 6_000;
const REACTIVATE_LIMIT = 200;

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
    // rows may store the quoted pair (e.g. redstone "BTC/USD"). Extract the base
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

/**
 * Core feed-sync pipeline, extracted from the GET handler so the same logic
 * runs from the Vercel route AND the GitHub Actions `scripts/sync-feeds.ts`
 * job. The GH Actions job escapes Vercel's 60s timeout — critical for
 * `discover` mode, which probes many feeds per provider and previously got
 * truncated mid-run on Vercel.
 *
 * @returns `{ status, body }` — the HTTP route wraps this in NextResponse;
 *          the script reads `status` to decide its exit code.
 */
export async function runFeedSync(mode: string, provider: string): Promise<FeedSyncResult> {
  try {
    if (provider && !SUPPORTED_PROVIDERS.includes(provider)) {
      return {
        status: 400,
        body: { error: `Unsupported provider. Supported: ${SUPPORTED_PROVIDERS.join(', ')}` },
      };
    }

    switch (mode) {
      case 'seed': {
        // Initial seed from hardcoded data — one provider at a time
        if (!provider) {
          return {
            status: 400,
            body: {
              error:
                'Seed mode requires --provider (call once per provider to stay within 10s timeout)',
            },
          };
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
        return { status: 200, body: { success: true, mode: 'seed', provider, results: summary } };
      }

      case 'discover': {
        // Discover feeds from official APIs — one provider at a time
        if (!provider) {
          return {
            status: 400,
            body: {
              error:
                'Discover mode requires --provider (call once per provider to stay within 10s timeout)',
            },
          };
        }
        const discovery = await feedDiscoveryService.discoverAll(provider);
        const discoveredFeeds = discovery[0]?.feeds || [];

        // Verify each discovered feed by actually fetching a price.
        // Only feeds that return valid data are upserted to the DB.
        const { verified, failedCount } = await verifyDiscoveredFeeds(discoveredFeeds);

        // Graceful pruning of feeds active in the DB but absent from this
        // discovery run. A single discovery miss can be a transient upstream /
        // API blip, so each absent feed is re-verified by actually fetching its
        // price before any decision:
        //   - re-verified OK  → keep active, reset its absent counter
        //   - re-verify fails → bump absent counter; deactivate only once it
        //     reaches ABSENT_PRUNE_THRESHOLD, and never if the feed succeeded
        //     within PRUNE_COOLING_MS (recently-live feeds stay up).
        // This replaces the old behavior that bulk-killed every absent feed in
        // one pass (the root cause of the 233-API3 mass deactivation).
        // Deactivation still only happens within chains discovery covered, so
        // providers like Chainlink (Ethereum-only discovery) don't wipe feeds
        // for other chains seeded separately.
        let discoverPruned = 0;
        if (discoveredFeeds.length > 0) {
          try {
            const queries = getAdminQueries();
            const existingFeeds = await queries.getOracleFeeds(provider);
            const discoveredKeys = new Set(
              discoveredFeeds.map((f) => `${f.provider}:${f.symbol}:${f.chain_id}`)
            );
            const discoveredChainIds = new Set(discoveredFeeds.map((f) => f.chain_id));

            const feedsToReconcile = existingFeeds.filter(
              (feed) =>
                discoveredChainIds.has(feed.chain_id) &&
                !discoveredKeys.has(`${feed.provider}:${feed.symbol}:${feed.chain_id}`)
            );

            // Re-verify each absent feed (bounded by VERIFY_TIMEOUT_MS, same as
            // discovery verification). The RequestQueue inside DatabaseQueries
            // bounds DB write concurrency to 15, so the parallel writes below
            // are safe.
            const reconciliation = await mapWithConcurrency(
              feedsToReconcile,
              VERIFY_CONCURRENCY,
              async (feed) => {
                const ok = await Promise.race([
                  probeFeed(feed),
                  new Promise<boolean>((resolve) =>
                    setTimeout(() => resolve(false), VERIFY_TIMEOUT_MS)
                  ),
                ]);
                return { feed, ok };
              }
            );

            const reVerified = reconciliation.filter((r) => r.ok);
            const stillAbsent = reconciliation.filter((r) => !r.ok);

            // Re-verified feeds stay active: stamp last_discovery_at and reset
            // the absent counter so they don't drift toward the prune threshold.
            await Promise.all(
              reVerified.map((r) =>
                queries.recordFeedDiscovered(r.feed.provider, r.feed.symbol, r.feed.chain_id)
              )
            );

            // Failed feeds: skip pruning inside the cooling window, otherwise
            // accumulate and deactivate only at the threshold.
            for (const { feed } of stillAbsent) {
              const lastSuccess = feed.last_success_at
                ? new Date(feed.last_success_at).getTime()
                : 0;
              if (lastSuccess > Date.now() - PRUNE_COOLING_MS) {
                // Recently successful — keep it; treat as rediscovered.
                await queries.recordFeedDiscovered(feed.provider, feed.symbol, feed.chain_id);
                continue;
              }
              const runs = await queries.incrementAbsentDiscoveryRuns(
                feed.provider,
                feed.symbol,
                feed.chain_id
              );
              if (runs >= ABSENT_PRUNE_THRESHOLD) {
                await queries.deactivateOracleFeeds(feed.provider, feed.symbol, feed.chain_id);
                discoverPruned++;
              }
            }

            if (reVerified.length > 0 || discoverPruned > 0) {
              logger.info(
                `Graceful pruning (${provider}): ${reVerified.length} re-verified & kept, ` +
                  `${stillAbsent.length - discoverPruned} still absent (cooling/under threshold), ` +
                  `${discoverPruned} deactivated.`
              );
            }
          } catch (error) {
            logger.error(
              `Failed to reconcile feeds for ${provider}`,
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
            pruned: discoverPruned,
            errors: discovery[0]?.errors.length || 0,
          },
        ];
        return {
          status: 200,
          body: { success: true, mode: 'discover', provider, results: summary },
        };
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
        return { status: 200, body: { success: true, mode: 'registry', results: summary } };
      }

      case 'verify': {
        // Verify existing feeds
        const results = [await feedSyncService.verifyChainlinkFeeds()];
        const summary = results.map((r) => ({
          provider: r.provider,
          discovered: r.discovered,
          errors: r.errors,
        }));
        return { status: 200, body: { success: true, mode: 'verify', results: summary } };
      }

      case 'reactivate': {
        // Re-probe deactivated feeds and revive those that have recovered.
        // Optional --provider scopes the pass to one provider; omit it to run
        // across all providers (bounded by REACTIVATE_LIMIT, most-recent
        // failures first). Safe to run frequently — each probe is bounded and
        // only feeds returning a valid price are reactivated.
        const result = await reactivateRecoveredFeeds(provider || undefined);
        invalidateAllFeedsCache();
        return {
          status: 200,
          body: {
            success: true,
            mode: 'reactivate',
            provider: provider || 'all',
            results: [result],
          },
        };
      }

      default:
        return {
          status: 400,
          body: {
            error: `Unknown mode: ${mode}. Use: seed, discover, registry, verify, reactivate`,
          },
        };
    }
  } catch (error) {
    logger.error('Feed sync failed', error instanceof Error ? error : new Error(String(error)));
    return { status: 500, body: { success: false, error: 'Sync failed' } };
  }
}

export async function GET(request: Request) {
  const authResponse = verifyCronSecret(request);
  if (authResponse) return authResponse;

  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'discover';
  const provider = url.searchParams.get('provider') || '';

  const { status, body } = await runFeedSync(mode, provider);
  return NextResponse.json(body, { status });
}
