import { type OracleFeed } from '@/lib/supabase/queries';
import { getAdminQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

import { extractBaseSymbol } from './oracleDataUtils';

const logger = createLogger('DynamicFeedResolver');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface FeedCacheEntry {
  feeds: Map<string, OracleFeed>;
  timestamp: number;
}

const providerCaches = new Map<string, FeedCacheEntry>();

// ─── Cross-provider aggregate cache ─────────────────────────────────
// A single DB query loads ALL active feeds and derives every aggregate
// view (providers, symbols, per-provider chain counts). This keeps P0
// callers (cron jobs, dashboard SSR, reputation service) from each
// issuing their own per-provider queries, and stays within the 5-minute
// TTL budget already used by `loadFeedsForProvider`.
interface AllFeedsCacheEntry {
  feeds: OracleFeed[];
  providers: string[];
  symbols: string[];
  chainCountByProvider: Map<string, number>;
  timestamp: number;
}

let allFeedsCache: AllFeedsCacheEntry | null = null;
let allFeedsFetchPromise: Promise<AllFeedsCacheEntry | null> | null = null;

function isAllFeedsCacheStale(): boolean {
  if (!allFeedsCache) return true;
  return Date.now() - allFeedsCache.timestamp > CACHE_TTL_MS;
}

async function loadAllActiveFeeds(): Promise<AllFeedsCacheEntry | null> {
  if (allFeedsCache && !isAllFeedsCacheStale()) {
    return allFeedsCache;
  }

  // Deduplicate concurrent callers — the cron job and dashboard SSR may
  // both request this in the same tick.
  if (allFeedsFetchPromise) return allFeedsFetchPromise;

  allFeedsFetchPromise = (async () => {
    try {
      const queries = getAdminQueries();
      // Empty provider string returns all active feeds (see getOracleFeeds).
      const feeds = await queries.getOracleFeeds('');

      const providerSet = new Set<string>();
      const symbolSet = new Set<string>();
      const chainCountByProvider = new Map<string, Set<number>>();

      for (const feed of feeds) {
        providerSet.add(feed.provider);
        symbolSet.add(extractBaseSymbol(feed.symbol).toUpperCase());

        let chainSet = chainCountByProvider.get(feed.provider);
        if (!chainSet) {
          chainSet = new Set<number>();
          chainCountByProvider.set(feed.provider, chainSet);
        }
        // chain_id === 0 means chain-agnostic (Supra/DIA/RedStone);
        // count it as a single "chain" so the metric is meaningful.
        chainSet.add(feed.chain_id);
      }

      const entry: AllFeedsCacheEntry = {
        feeds,
        providers: Array.from(providerSet).sort(),
        symbols: Array.from(symbolSet).sort(),
        chainCountByProvider: new Map(
          Array.from(chainCountByProvider.entries()).map(([p, s]) => [p, s.size])
        ),
        timestamp: Date.now(),
      };

      allFeedsCache = entry;
      logger.debug(
        `Loaded ${feeds.length} active feeds across ${entry.providers.length} providers`
      );
      return entry;
    } catch (error) {
      logger.warn(
        'Failed to load all active feeds from database',
        error instanceof Error ? error : undefined
      );
      // Don't cache null on error so the next call can retry.
      return null;
    } finally {
      allFeedsFetchPromise = null;
    }
  })();

  return allFeedsFetchPromise;
}

function cacheKey(symbol: string, chainId: number): string {
  return `${symbol.toUpperCase()}-${chainId}`;
}

function isCacheStale(provider: string): boolean {
  const cache = providerCaches.get(provider);
  if (!cache) return true;
  return Date.now() - cache.timestamp > CACHE_TTL_MS;
}

async function loadFeedsForProvider(provider: string): Promise<Map<string, OracleFeed>> {
  const cache = providerCaches.get(provider);
  if (cache && !isCacheStale(provider)) {
    return cache.feeds;
  }

  const map = new Map<string, OracleFeed>();

  try {
    const queries = getAdminQueries();
    const feeds = await queries.getOracleFeeds(provider);

    for (const feed of feeds) {
      map.set(cacheKey(feed.symbol, feed.chain_id), feed);
    }

    providerCaches.set(provider, { feeds: map, timestamp: Date.now() });
    logger.debug(`Loaded ${map.size} feeds for ${provider} from database`);
  } catch (error) {
    logger.warn(
      `Failed to load feeds for ${provider} from database`,
      error instanceof Error ? error : undefined
    );
    // Don't cache an empty map on error so the next call can retry.
  }

  return map;
}

export function matchesChainId(feed: OracleFeed, chainId?: number): boolean {
  if (chainId === undefined) return true;
  // chain_id 0 means the feed is chain-agnostic (e.g. Supra, API-offchain).
  return feed.chain_id === 0 || feed.chain_id === chainId;
}

/**
 * Resolve a feed from the database. Returns null if not found or not server-side.
 * This is the generic version used by all oracle providers.
 */
export async function resolveFeed(
  provider: string,
  symbol: string,
  chainId: number
): Promise<OracleFeed | null> {
  if (typeof window !== 'undefined') return null;

  const feeds = await loadFeedsForProvider(provider);
  return feeds.get(cacheKey(symbol, chainId)) || null;
}

/**
 * Resolve a feed's address field (the primary identifier).
 * Returns null if not found in database.
 */
export async function resolveFeedAddress(
  provider: string,
  symbol: string,
  chainId: number
): Promise<string | null> {
  const feed = await resolveFeed(provider, symbol, chainId);
  return feed?.address || null;
}

/**
 * Get the active-feeds Map (keyed by `cacheKey(symbol, chain_id)`) for a
 * provider, backed by the 5-minute cache.
 *
 * Exposed so hot-path callers can check membership / iterate without
 * allocating a new array on every request.
 */
export async function getActiveFeedsMap(provider: string): Promise<Map<string, OracleFeed>> {
  return loadFeedsForProvider(provider);
}

/**
 * Synchronous, cache-only check for whether a provider currently has an active
 * feed for a symbol. Reads the already-warm in-memory caches (populated by
 * `loadFeedsForProvider` / `loadAllActiveFeeds`) WITHOUT triggering an async DB
 * load, so it is safe to call from a synchronous context such as
 * `BaseOracleClient.isSymbolSupported` (which is a sync method).
 *
 * Returns false when the cache is cold so the caller can fall back to its
 * curated static symbol list. Used by RedStone's `isSymbolSupported` override:
 * RedStone symbols are case-sensitive (e.g. `etrUSD_FUNDAMENTAL`), and the
 * active-feed registry is the authoritative source for them, so a DB-backed
 * check lets discovered (and mixed-case) feeds count as supported even though
 * they are absent from the all-uppercase static list.
 */
export function isSymbolActiveInCacheSync(provider: string, symbol: string): boolean {
  const normalized = extractBaseSymbol(symbol).toUpperCase();

  // Per-provider cache (keyed by `${UPPERCASE}-${chainId}`). RedStone feeds are
  // chain-agnostic (chain_id=0), so check the chain-0 key.
  const providerCache = providerCaches.get(provider);
  if (providerCache && !isCacheStale(provider)) {
    if (providerCache.feeds.has(cacheKey(symbol, 0))) return true;
  }

  // Cross-provider aggregate cache — warmed by getAllActiveFeedsByProvider,
  // which resolveProvidersForSymbol awaits before iterating providers.
  if (allFeedsCache && !isAllFeedsCacheStale()) {
    return allFeedsCache.feeds.some(
      (f) => f.provider === provider && extractBaseSymbol(f.symbol).toUpperCase() === normalized
    );
  }

  return false;
}

// ─── Cross-provider aggregates (backed by `loadAllActiveFeeds`) ──────
// These are used by callers that previously hard-coded the full provider
// list (sync-feeds cron, daily-report cron, dashboard SSR) or the full
// symbol list (reputation service). Each falls back to `fallback` when
// the DB is unreachable or empty, preserving the "DB-first, hard-coded
// fallback" contract documented in project_memory.

/**
 * Get the list of providers that currently have at least one active feed
 * in the database. Returns `fallback` (typically `Object.values(OracleProvider)`)
 * when the DB is unreachable or returns no rows.
 */
export async function getActiveProviders<T extends string>(fallback: readonly T[]): Promise<T[]> {
  const entry = await loadAllActiveFeeds();
  if (!entry || entry.providers.length === 0) return [...fallback];
  // Preserve fallback ordering: keep only providers that exist in the DB,
  // in the order they appear in `fallback`. Unknown DB providers (e.g.
  // 'twap-token' which is a sync-only pseudo-provider) are appended at
  // the end in sorted order.
  const seen = new Set<string>(entry.providers);
  const ordered: T[] = [];
  const remaining: T[] = [];
  for (const p of fallback) {
    if (seen.has(p)) ordered.push(p);
  }
  for (const p of entry.providers) {
    if (!fallback.includes(p as T)) remaining.push(p as T);
  }
  return [...ordered, ...remaining.sort()];
}

/**
 * Get the distinct set of base symbols across all active feeds.
 * Returns `fallback` when the DB is unreachable or returns no rows.
 */
export async function getAllActiveSymbols(fallback: readonly string[]): Promise<string[]> {
  const entry = await loadAllActiveFeeds();
  if (!entry || entry.symbols.length === 0) return [...fallback];
  return [...entry.symbols];
}

/**
 * Get all active feeds grouped by provider, backed by the single
 * cross-provider cache (`loadAllActiveFeeds`). This lets callers that
 * need every provider's feeds (e.g. the daily-report cron, which
 * previously called `getActiveFeeds(provider)` N times = N DB queries)
 * pay a single DB round-trip instead.
 *
 * Returns an empty Map when the DB is unreachable.
 */
export async function getAllActiveFeedsByProvider(): Promise<Map<string, OracleFeed[]>> {
  const entry = await loadAllActiveFeeds();
  const result = new Map<string, OracleFeed[]>();
  if (!entry) return result;
  for (const feed of entry.feeds) {
    let list = result.get(feed.provider);
    if (!list) {
      list = [];
      result.set(feed.provider, list);
    }
    list.push(feed);
  }
  return result;
}

/**
 * Invalidate the cross-provider aggregate cache. Useful when a feed sync
 * cron run completes and callers want the next read to reflect the new
 * DB state without waiting for the 5-minute TTL.
 */
export function invalidateAllFeedsCache(): void {
  allFeedsCache = null;
}
