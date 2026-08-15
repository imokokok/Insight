import { feedCache, feedCacheKey, getFeedFromDatabase, isFeedCacheStale } from './cache';
import { CHAINLINK_PRICE_FEEDS, type ChainlinkPriceFeed } from './priceFeedConfig';
import { CHAINLINK_RPC_CONFIG, type ChainlinkRPCConfig } from './rpcConfig';

export type { ChainlinkPriceFeed } from './priceFeedConfig';
export { CHAINLINK_PRICE_FEEDS } from './priceFeedConfig';
export { CHAINLINK_RPC_CONFIG } from './rpcConfig';
export { CHAINLINK_AGGREGATOR_ABI } from './abi';

function getFeedFromHardcoded(symbol: string, chainId: number): ChainlinkPriceFeed | null {
  const feeds = CHAINLINK_PRICE_FEEDS[symbol.toUpperCase()];
  if (!feeds) return null;
  return feeds[chainId] || null;
}

/**
 * Get Chainlink price feed info from database first, falling back to hardcoded
 * data so basic assets work when the database is unavailable.
 */
export async function getChainlinkPriceFeedAsync(
  symbol: string,
  chainId: number
): Promise<ChainlinkPriceFeed | null> {
  if (typeof window !== 'undefined') {
    return null;
  }

  const dbFeed = await getFeedFromDatabase(symbol, chainId);
  if (dbFeed) {
    return dbFeed;
  }

  return getFeedFromHardcoded(symbol, chainId);
}

/**
 * Synchronous version — reads from database cache if available.
 * Falls back to hardcoded data only if cache is empty (not yet seeded).
 */
export function getChainlinkPriceFeed(symbol: string, chainId: number): ChainlinkPriceFeed | null {
  // Check database cache first
  if (!isFeedCacheStale() && feedCache) {
    return feedCache.get(feedCacheKey(symbol, chainId)) || null;
  }
  // Hardcoded fallback for bootstrapping before seed
  return getFeedFromHardcoded(symbol, chainId);
}

export function getChainlinkRPCConfig(chainId: number): ChainlinkRPCConfig | null {
  return CHAINLINK_RPC_CONFIG[chainId] || null;
}

export function getSupportedSymbols(): string[] {
  return Object.keys(CHAINLINK_PRICE_FEEDS);
}

export function isPriceFeedSupported(symbol: string, chainId: number): boolean {
  return getChainlinkPriceFeed(symbol, chainId) !== null;
}
