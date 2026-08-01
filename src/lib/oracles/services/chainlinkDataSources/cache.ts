import { type OracleFeed } from '@/lib/supabase/queries';
import { getAdminQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

import { CHAINLINK_PRICE_FEEDS } from './priceFeedConfig';

import type { ChainlinkPriceFeed } from './priceFeedConfig';

const logger = createLogger('ChainlinkDataSources');

// ─── In-memory cache for database-sourced feeds ──────────────────────
// Avoids hitting Supabase on every price fetch. Refreshed periodically.
const FEED_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export let feedCache: Map<string, ChainlinkPriceFeed> | null = null;
let feedCacheTimestamp = 0;

export function feedCacheKey(symbol: string, chainId: number): string {
  return `${symbol.toUpperCase()}-${chainId}`;
}

export function isFeedCacheStale(): boolean {
  return !feedCache || Date.now() - feedCacheTimestamp > FEED_CACHE_TTL_MS;
}

function oracleFeedToPriceFeed(feed: OracleFeed): ChainlinkPriceFeed {
  return {
    address: feed.address as `0x${string}`,
    name: feed.name,
    symbol: feed.symbol,
    decimals: feed.decimals,
    category: feed.category as ChainlinkPriceFeed['category'],
  };
}

async function loadFeedsFromDatabase(): Promise<Map<string, ChainlinkPriceFeed>> {
  const map = new Map<string, ChainlinkPriceFeed>();

  let dbLoaded = false;
  try {
    const queries = getAdminQueries();
    const feeds = await queries.getOracleFeeds('chainlink');

    for (const feed of feeds) {
      map.set(feedCacheKey(feed.symbol, feed.chain_id), oracleFeedToPriceFeed(feed));
    }

    dbLoaded = true;
    logger.info(`Loaded ${map.size} chainlink feeds from database`);
  } catch (error) {
    logger.warn(
      'Failed to load feeds from database, will use hardcoded fallback',
      error instanceof Error ? error : undefined
    );
  }

  // Only seed hardcoded feeds when the database is unavailable or empty.
  // When the DB loaded successfully, its feed list is authoritative — feeds
  // that exist in the hardcoded list but not in the DB were likely removed
  // by feed-discovery (e.g. deactivated as stale) and should stay absent.
  if (!dbLoaded || map.size === 0) {
    for (const [symbol, feedsByChainId] of Object.entries(CHAINLINK_PRICE_FEEDS)) {
      for (const [chainIdStr, feed] of Object.entries(feedsByChainId)) {
        const key = feedCacheKey(symbol, Number(chainIdStr));
        if (!map.has(key)) {
          map.set(key, feed);
        }
      }
    }
  }

  return map;
}

export async function getFeedFromDatabase(
  symbol: string,
  chainId: number
): Promise<ChainlinkPriceFeed | null> {
  // Check cache first
  if (!isFeedCacheStale() && feedCache) {
    return feedCache.get(feedCacheKey(symbol, chainId)) || null;
  }

  // Refresh cache
  feedCache = await loadFeedsFromDatabase();
  feedCacheTimestamp = Date.now();

  return feedCache.get(feedCacheKey(symbol, chainId)) || null;
}
