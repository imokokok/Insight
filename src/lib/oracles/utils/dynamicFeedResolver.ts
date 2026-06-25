import { type OracleFeed } from '@/lib/supabase/queries';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('DynamicFeedResolver');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface FeedCacheEntry {
  feeds: Map<string, OracleFeed>;
  timestamp: number;
}

const providerCaches = new Map<string, FeedCacheEntry>();

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
    const queries = getServerQueries();
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
  }

  return map;
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
