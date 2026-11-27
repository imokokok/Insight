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

interface DashboardPriceQuery {
  provider: OracleProvider;
  symbol: string;
  chain: Blockchain;
}

interface IndexedDashboardPriceQuery {
  query: DashboardPriceQuery;
  index: number;
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

// Limit pressure on shared chain RPCs while allowing independent chains to run
// at the same time. At most two symbols per chain and four chains are active.
const DASHBOARD_CHAIN_GROUP_CONCURRENCY = 4;
const DASHBOARD_PER_CHAIN_CONCURRENCY = 2;
// A failed provider should not be retried for every homepage cache refresh.
// This is intentionally scoped to the public dashboard: paid pre-trade checks
// retain their stricter live-data behavior. Successful/stale database data is
// retained while the affected provider cools down.
const DASHBOARD_FAILURE_COOLDOWN_MS = 5 * 60_000;

interface DashboardPriceCircuitEntry {
  retryAfter: number;
  lastSuccess?: DashboardPriceItem;
}

const dashboardPriceCircuit = new Map<string, DashboardPriceCircuitEntry>();

function dashboardPriceKey(provider: OracleProvider, symbol: string, chain: Blockchain): string {
  return `${provider}:${symbol}:${chain}`;
}

async function fetchDashboardPrice(
  provider: OracleProvider,
  symbol: string,
  chain: Blockchain
): Promise<DashboardPriceItem> {
  const key = dashboardPriceKey(provider, symbol, chain);
  const circuit = dashboardPriceCircuit.get(key);
  if (circuit && circuit.retryAfter > Date.now()) {
    return (
      circuit.lastSuccess ?? {
        provider,
        symbol,
        price: null,
        error: 'Provider temporarily unavailable; retry deferred',
      }
    );
  }

  try {
    const price = await fetchPriceWithDatabase(provider, symbol, chain, true);
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
      queries.push({ provider, symbol, chain });
    }
  }

  const queriesByChain = new Map<Blockchain, IndexedDashboardPriceQuery[]>();
  queries.forEach((query, index) => {
    const chainQueries = queriesByChain.get(query.chain) ?? [];
    chainQueries.push({ query, index });
    queriesByChain.set(query.chain, chainQueries);
  });

  const results: DashboardPriceItem[] = new Array(queries.length);
  await mapWithConcurrency(
    Array.from(queriesByChain.values()),
    DASHBOARD_CHAIN_GROUP_CONCURRENCY,
    async (chainQueries) => {
      // Preserve result order while bounding calls through the same RPC domain.
      await mapWithConcurrency(
        chainQueries,
        DASHBOARD_PER_CHAIN_CONCURRENCY,
        async ({ query, index }) => {
          results[index] = await fetchDashboardPrice(query.provider, query.symbol, query.chain);
        }
      );
    }
  );

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
