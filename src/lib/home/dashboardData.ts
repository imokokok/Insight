import { unstable_cache } from 'next/cache';

import { getPriceOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';
import { DASHBOARD_ASSETS } from '@/lib/home/dashboardConstants';
import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { reputationService, type OracleReputation } from '@/lib/oracles/services/reputationService';
import {
  getActiveProviders,
  getAllActiveFeedsByProviderWithStatus,
} from '@/lib/oracles/utils/dynamicFeedResolver';
import { resolveOracleFeedBlockchain } from '@/lib/oracles/utils/feedChain';
import { extractBaseSymbol, isUsdDenominatedFeedSymbol } from '@/lib/oracles/utils/oracleDataUtils';
import type {
  SnapshotBatchPriceClient,
  SnapshotBatchPriceRequest,
  SnapshotBatchPriceResult,
} from '@/lib/oracles/utils/snapshotBatch';
import { getLatestPriceSnapshotFromDatabase } from '@/lib/oracles/utils/storage';
import type { OracleFeed } from '@/lib/supabase/queries';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';
import {
  OracleProvider,
  ORACLE_PROVIDER_VALUES,
  type Blockchain,
  type PriceData,
} from '@/types/oracle';

const logger = createLogger('dashboard-data');

const FALLBACK_MAIN_ORACLES: OracleProvider[] = [
  OracleProvider.CHAINLINK,
  OracleProvider.REDSTONE,
  OracleProvider.API3,
  OracleProvider.DIA,
];

export interface DashboardPriceItem {
  provider: string;
  symbol: string;
  price: PriceData | null;
  error: string | null;
}

export interface ServerDashboardData {
  prices: DashboardPriceItem[];
  fetchedAt: number;
  hasError: boolean;
  // The resolved oracle list that produced `prices`. Passed to the client
  // so its refetch queries match the server-rendered tiles instead of
  // re-deriving from a (now removed) hard-coded constant.
  mainOracles: OracleProvider[];
  // Included in the server payload so the health table does not issue an
  // immediate second request after hydration.
  reputations: OracleReputation[];
}

export function createEmptyDashboardData(): ServerDashboardData {
  return {
    prices: [],
    fetchedAt: 0,
    hasError: false,
    mainOracles: FALLBACK_MAIN_ORACLES,
    reputations: [],
  };
}

// Bound concurrent upstream oracle fetches during SSR so the dashboard does
// not pile onto the shared DB request queue or upstream oracle rate limits.
const DASHBOARD_FETCH_CONCURRENCY = 8;
// A failed provider should not be retried for every homepage cache refresh.
// This is intentionally scoped to the public dashboard: paid pre-trade checks
// retain their stricter live-data behavior. Successful/stale database data is
// retained while the affected provider cools down.
const DASHBOARD_FAILURE_COOLDOWN_MS = 5 * 60_000;

interface DashboardPriceCircuitEntry {
  retryAfter: number;
  lastSuccess?: DashboardPriceItem;
}

interface DashboardPriceQuery {
  provider: OracleProvider;
  symbol: string;
  chain: Blockchain;
  feedAddress?: `0x${string}`;
}

interface IndexedDashboardPriceQuery {
  index: number;
  query: DashboardPriceQuery;
}

type DashboardFetchTask =
  | { kind: 'single'; entry: IndexedDashboardPriceQuery }
  | { kind: 'chainlink-batch'; entries: IndexedDashboardPriceQuery[] };

const dashboardPriceCircuit = new Map<string, DashboardPriceCircuitEntry>();

function dashboardPriceKey(provider: OracleProvider, symbol: string, chain: Blockchain): string {
  return `${provider}:${symbol}:${chain}`;
}

function getDashboardCircuitResponse(
  provider: OracleProvider,
  symbol: string,
  chain: Blockchain
): DashboardPriceItem | null {
  const circuit = dashboardPriceCircuit.get(dashboardPriceKey(provider, symbol, chain));
  if (!circuit || circuit.retryAfter <= Date.now()) return null;
  return (
    circuit.lastSuccess ?? {
      provider,
      symbol,
      price: null,
      error: 'Provider temporarily unavailable; retry deferred',
    }
  );
}

async function fetchDashboardPrice(
  provider: OracleProvider,
  symbol: string,
  chain: Blockchain
): Promise<DashboardPriceItem> {
  const key = dashboardPriceKey(provider, symbol, chain);
  const circuit = dashboardPriceCircuit.get(key);
  const circuitResponse = getDashboardCircuitResponse(provider, symbol, chain);
  if (circuitResponse) return circuitResponse;

  try {
    const price = await fetchPriceWithDatabase(
      provider,
      symbol,
      chain,
      true,
      false,
      undefined,
      undefined,
      {
        // The dashboard can label a collector snapshot as a degraded fallback;
        // paid pre-trade and other live API callers retain their strict defaults.
        // The 15-minute collector owns feed health, so homepage reads skip a
        // Supabase write for each individual price within this Worker call.
        allowSnapshotFallback: true,
        recordFeedHealth: false,
      }
    );
    const result: DashboardPriceItem = { provider, symbol, price, error: null };
    dashboardPriceCircuit.set(key, { retryAfter: 0, lastSuccess: result });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    dashboardPriceCircuit.set(key, {
      retryAfter: Date.now() + DASHBOARD_FAILURE_COOLDOWN_MS,
      lastSuccess: circuit?.lastSuccess,
    });
    logger.warn(`Server prefetch failed for ${provider}/${symbol}: ${message}`);
    return (
      circuit?.lastSuccess ?? {
        provider,
        symbol,
        price: null,
        error: message,
      }
    );
  }
}

function isSnapshotBatchPriceClient(client: unknown): client is SnapshotBatchPriceClient {
  return (
    typeof client === 'object' &&
    client !== null &&
    'getSnapshotPricesBatch' in client &&
    typeof client.getSnapshotPricesBatch === 'function'
  );
}

async function fetchDashboardChainlinkBatch(
  entries: IndexedDashboardPriceQuery[]
): Promise<Array<{ index: number; result: DashboardPriceItem }>> {
  const results = new Map<number, DashboardPriceItem>();
  const pending = entries.filter(({ index, query }) => {
    const circuitResponse = getDashboardCircuitResponse(query.provider, query.symbol, query.chain);
    if (!circuitResponse) return true;
    results.set(index, circuitResponse);
    return false;
  });

  if (pending.length === 0) {
    return entries.map(({ index }) => ({ index, result: results.get(index)! }));
  }

  const client = getDefaultFactory().getClient(OracleProvider.CHAINLINK);
  if (!isSnapshotBatchPriceClient(client)) {
    return Promise.all(
      pending.map(async ({ index, query }) => ({
        index,
        result: await fetchDashboardPrice(query.provider, query.symbol, query.chain),
      }))
    ).then((fetched) => {
      for (const item of fetched) results.set(item.index, item.result);
      return entries.map(({ index }) => ({ index, result: results.get(index)! }));
    });
  }

  const requests: SnapshotBatchPriceRequest[] = pending.map(({ index, query }) => ({
    id: `dashboard-${index}`,
    symbol: query.symbol,
    chain: query.chain,
    feedAddress: query.feedAddress,
  }));

  let batch: SnapshotBatchPriceResult[];
  try {
    // The dashboard's active-feed registry authenticates each address before
    // this call. Reusing the existing Multicall path keeps same-chain reads to
    // one outer RPC request instead of retrying each feed independently.
    batch = await client.getSnapshotPricesBatch(requests);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown batch failure';
    batch = requests.map((request) => ({
      id: request.id,
      price: null,
      error: new Error(message),
    }));
  }

  const batchById = new Map(batch.map((item) => [item.id, item]));
  await Promise.all(
    pending.map(async ({ index, query }) => {
      const key = dashboardPriceKey(query.provider, query.symbol, query.chain);
      const circuit = dashboardPriceCircuit.get(key);
      const outcome = batchById.get(`dashboard-${index}`);
      if (outcome?.price && !outcome.error) {
        const result: DashboardPriceItem = {
          provider: query.provider,
          symbol: query.symbol,
          price: outcome.price,
          error: null,
        };
        dashboardPriceCircuit.set(key, { retryAfter: 0, lastSuccess: result });
        results.set(index, result);
        return;
      }

      const message = outcome?.error?.message ?? 'Missing Chainlink batch result';
      logger.warn(`Dashboard Chainlink batch failed for ${query.symbol}: ${message}`);
      const fallback = await getLatestPriceSnapshotFromDatabase(
        query.provider,
        query.symbol,
        query.chain
      );
      if (fallback) {
        const result: DashboardPriceItem = {
          provider: query.provider,
          symbol: query.symbol,
          price: fallback,
          error: null,
        };
        dashboardPriceCircuit.set(key, {
          retryAfter: Date.now() + DASHBOARD_FAILURE_COOLDOWN_MS,
          lastSuccess: result,
        });
        results.set(index, result);
        logger.warn('Dashboard is serving the latest Chainlink snapshot after a batch failure', {
          symbol: query.symbol,
          chain: query.chain,
        });
        return;
      }

      dashboardPriceCircuit.set(key, {
        retryAfter: Date.now() + DASHBOARD_FAILURE_COOLDOWN_MS,
        lastSuccess: circuit?.lastSuccess,
      });
      results.set(
        index,
        circuit?.lastSuccess ?? {
          provider: query.provider,
          symbol: query.symbol,
          price: null,
          error: message,
        }
      );
    })
  );

  return entries.map(({ index }) => ({ index, result: results.get(index)! }));
}

/**
 * Choose a chain on which this provider can actually serve the dashboard
 * symbol. Prefer a matching active registry feed on the provider's default
 * chain; otherwise use the first matching registered chain that the client
 * supports. Only use the client's curated support list when the active-feed
 * registry itself is empty or unavailable; a healthy, nonempty registry is
 * authoritative for the dashboard's supported provider/symbol pairs.
 */
function resolveDashboardChain(
  provider: OracleProvider,
  symbol: string,
  feeds: OracleFeed[],
  allowStaticFallback: boolean
): Blockchain | null {
  const client = getDefaultFactory().getClient(provider);
  const defaultChain = client.getDefaultChain();
  const supportedChains = [...new Set(client.getSupportedChainsForSymbol(symbol))];
  const registeredChains = new Set<Blockchain>();
  let hasMatchingRegisteredFeed = false;

  for (const feed of feeds) {
    if (
      extractBaseSymbol(feed.symbol).toUpperCase() !== symbol ||
      !isUsdDenominatedFeedSymbol(feed.symbol)
    ) {
      continue;
    }

    hasMatchingRegisteredFeed = true;
    // Source-bound Solana rows carry metadata that resolves chain_id=0 to
    // Solana. Other chain-agnostic rows can use any chain supported by the
    // provider, preferring its default.
    const resolvedChain = resolveOracleFeedBlockchain(feed);
    if (resolvedChain) {
      registeredChains.add(resolvedChain);
    } else if (feed.chain_id === 0 && supportedChains.length > 0) {
      for (const chain of supportedChains) registeredChains.add(chain);
    } else if (feed.chain_id === 0) {
      registeredChains.add(defaultChain);
    }
  }

  if (!hasMatchingRegisteredFeed && !allowStaticFallback) return null;

  const candidateChains = hasMatchingRegisteredFeed
    ? supportedChains.length > 0
      ? supportedChains.filter((chain) => registeredChains.has(chain))
      : [...registeredChains]
    : supportedChains;

  if (candidateChains.length === 0) return null;
  return candidateChains.includes(defaultChain) ? defaultChain : candidateChains[0];
}

function resolveChainlinkFeedAddress(
  symbol: string,
  chain: Blockchain,
  feeds: OracleFeed[]
): `0x${string}` | undefined {
  const matchingFeeds = feeds.filter(
    (feed) =>
      extractBaseSymbol(feed.symbol).toUpperCase() === symbol &&
      isUsdDenominatedFeedSymbol(feed.symbol) &&
      resolveOracleFeedBlockchain(feed) === chain
  );
  const selected =
    matchingFeeds.find((feed) => feed.symbol.toUpperCase() === symbol) ??
    matchingFeeds.find((feed) => feed.symbol !== feed.symbol.toUpperCase()) ??
    matchingFeeds[0];
  if (!selected || !/^0x[0-9a-f]{40}$/i.test(selected.address)) return undefined;
  return selected.address as `0x${string}`;
}

async function fetchDashboardPrices(queries: DashboardPriceQuery[]): Promise<DashboardPriceItem[]> {
  const indexed = queries.map((query, index) => ({ index, query }));
  const tasks: DashboardFetchTask[] = [];
  const chainlinkGroups = new Map<Blockchain, IndexedDashboardPriceQuery[]>();

  for (const entry of indexed) {
    if (entry.query.provider === OracleProvider.CHAINLINK && entry.query.feedAddress) {
      const group = chainlinkGroups.get(entry.query.chain) ?? [];
      group.push(entry);
      chainlinkGroups.set(entry.query.chain, group);
    } else {
      tasks.push({ kind: 'single', entry });
    }
  }
  for (const entries of chainlinkGroups.values()) {
    tasks.push({ kind: 'chainlink-batch', entries });
  }

  const taskResults = await mapWithConcurrency(tasks, DASHBOARD_FETCH_CONCURRENCY, async (task) => {
    if (task.kind === 'chainlink-batch') return fetchDashboardChainlinkBatch(task.entries);
    return [
      {
        index: task.entry.index,
        result: await fetchDashboardPrice(
          task.entry.query.provider,
          task.entry.query.symbol,
          task.entry.query.chain
        ),
      },
    ];
  });

  const results = new Array<DashboardPriceItem>(queries.length);
  for (const item of taskResults.flat()) results[item.index] = item.result;
  return results;
}

/**
 * Resolve the dashboard's "main oracles" list dynamically:
 * 1. Start from the market-cap-sorted provider config (so the order is
 *    stable and meaningful, not enum-order).
 * 2. Intersect with providers that actually have active feeds in the DB
 *    (via `getActiveProviders`, which falls back to the full enum when
 *    the DB is unreachable).
 * 3. Take the top 5.
 *
 * This keeps the dashboard following the rest of the app as feeds are
 * added/deactivated, without ever shrinking to nothing (the fallback
 * list kicks in when the DB is empty or unreachable).
 */
async function resolveMainOracles(): Promise<OracleProvider[]> {
  const ranked = getPriceOracleProvidersSortedByMarketCap();
  const activeProviders = await getActiveProviders(ORACLE_PROVIDER_VALUES);
  const activeSet = new Set<string>(activeProviders);
  const filtered = ranked.filter((p) => activeSet.has(p));
  if (filtered.length === 0) return FALLBACK_MAIN_ORACLES;
  return filtered.slice(0, 5);
}

export async function fetchDashboardInitialData(): Promise<ServerDashboardData> {
  // Resolve the active symbol/provider sets once per SSR. These hit the
  // 5-minute aggregate cache in dynamicFeedResolver, so in the common
  // case they return immediately without a DB round-trip.
  const [feedRegistry, mainOracles, reputations] = await Promise.all([
    getAllActiveFeedsByProviderWithStatus(),
    resolveMainOracles(),
    reputationService.getReputations().catch((error) => {
      logger.warn('Server reputation prefetch failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }),
  ]);

  const queries: DashboardPriceQuery[] = [];
  const allowStaticFallback = feedRegistry.errored || feedRegistry.feeds.size === 0;
  for (const symbol of DASHBOARD_ASSETS) {
    for (const provider of mainOracles) {
      const feeds = feedRegistry.feeds.get(provider) ?? [];
      const chain = resolveDashboardChain(provider, symbol, feeds, allowStaticFallback);
      if (!chain) continue;
      queries.push({
        provider,
        symbol,
        chain,
        feedAddress:
          provider === OracleProvider.CHAINLINK && !allowStaticFallback
            ? resolveChainlinkFeedAddress(symbol, chain, feeds)
            : undefined,
      });
    }
  }

  const results = await fetchDashboardPrices(queries);

  return {
    prices: results,
    fetchedAt: Date.now(),
    hasError: results.some((r) => r.error !== null),
    mainOracles,
    reputations,
  };
}

/**
 * Cached version of the dashboard initial-data fetch.
 *
 * Wraps `fetchDashboardInitialData` with Next.js `unstable_cache` so the
 * expensive 4×5 oracle price fan-out can be reused across SSR renders and
 * ISR revalidations. The TTL matches the route-level `revalidate` (60s) to
 * keep the dashboard fresh while avoiding repeated DB/upstream oracle calls.
 */
export const fetchDashboardInitialDataCached = unstable_cache(
  fetchDashboardInitialData,
  ['dashboard-initial-data'],
  { revalidate: 60 }
);
