import { unstable_cache } from 'next/cache';

import { getPriceOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';
import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { getActiveProviders, getAllActiveSymbols } from '@/lib/oracles/utils/dynamicFeedResolver';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, ORACLE_PROVIDER_VALUES, type PriceData } from '@/types/oracle';

const logger = createLogger('dashboard-data');

// Canonical "wanted" lists — these drive the UI layout (4 asset rows × 5
// oracle columns). The actual query list at runtime is the intersection
// of these with what the DB reports as active, so the dashboard never
// wastes fetches on pairs that have no active feed.
export const DASHBOARD_ASSETS = ['BTC', 'ETH', 'USDT', 'SOL'] as const;

const FALLBACK_MAIN_ORACLES: OracleProvider[] = [
  OracleProvider.CHAINLINK,
  OracleProvider.PYTH,
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
}

// Bound concurrent upstream oracle fetches during SSR. Without this, 20
// parallel `fetchPriceWithDatabase` calls (4 assets × 5 oracles) fan out
// simultaneously, piling up on the shared DB request queue and on upstream
// oracle rate limits. Matches the batch API route's concurrency approach.
const DASHBOARD_FETCH_CONCURRENCY = 8;

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
  const [activeSymbols, mainOracles] = await Promise.all([
    getAllActiveSymbols([]),
    resolveMainOracles(),
  ]);

  const activeSymbolSet = new Set(activeSymbols.map((s) => s.toUpperCase()));

  const queries: Array<{ provider: OracleProvider; symbol: string }> = [];
  for (const symbol of DASHBOARD_ASSETS) {
    // Skip assets that the DB reports as having no active feed anywhere;
    // fetching them would only produce "unsupported symbol" errors.
    if (activeSymbolSet.size > 0 && !activeSymbolSet.has(symbol)) continue;
    for (const provider of mainOracles) {
      queries.push({ provider, symbol });
    }
  }

  const results = await mapWithConcurrency(
    queries,
    DASHBOARD_FETCH_CONCURRENCY,
    async (query): Promise<DashboardPriceItem> => {
      try {
        const price = await fetchPriceWithDatabase(query.provider, query.symbol, undefined, true);
        return {
          provider: query.provider,
          symbol: query.symbol,
          price,
          error: null,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.warn(`Server prefetch failed for ${query.provider}/${query.symbol}: ${message}`);
        return {
          provider: query.provider,
          symbol: query.symbol,
          price: null,
          error: message,
        };
      }
    }
  );

  return {
    prices: results,
    fetchedAt: Date.now(),
    hasError: results.some((r) => r.error !== null),
    mainOracles,
  };
}

/**
 * Cached version of the dashboard initial-data fetch.
 *
 * Wraps `fetchDashboardInitialData` with Next.js `unstable_cache` so the
 * expensive 4×5 oracle price fan-out can be reused across SSR renders and
 * ISR revalidations. The TTL matches the route-level `revalidate` (15s) to
 * keep the dashboard fresh while avoiding repeated DB/upstream oracle calls.
 */
export const fetchDashboardInitialDataCached = unstable_cache(
  fetchDashboardInitialData,
  ['dashboard-initial-data'],
  { revalidate: 15 }
);
