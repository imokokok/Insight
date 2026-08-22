import {
  getCatalogSupportedSymbols,
  getFeedFromCatalog,
} from '../../constants/chainlinkCatalogLoader';

import { feedCache, feedCacheKey, getFeedFromDatabase, isFeedCacheStale } from './cache';
import { CHAINLINK_PRICE_FEEDS, type ChainlinkPriceFeed } from './priceFeedConfig';
import { CHAINLINK_RPC_CONFIG, type ChainlinkRPCConfig } from './rpcConfig';

export type { ChainlinkPriceFeed } from './priceFeedConfig';
export { CHAINLINK_PRICE_FEEDS } from './priceFeedConfig';
export { CHAINLINK_AGGREGATOR_ABI } from './abi';

function getFeedFromHardcoded(symbol: string, chainId: number): ChainlinkPriceFeed | null {
  const feeds = CHAINLINK_PRICE_FEEDS[symbol.toUpperCase()];
  if (!feeds) return null;
  return feeds[chainId] || null;
}

/**
 * Get Chainlink price feed info from database first, then the committed catalog
 * directory (official universe), falling back to the curated hardcoded map so
 * basic assets work when the database is unavailable.
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

  // Directory-first: the committed catalog is the canonical official universe.
  // Fall back to the curated hardcoded map only if the catalog has no entry.
  return getFeedFromCatalog(symbol, chainId) ?? getFeedFromHardcoded(symbol, chainId);
}

/**
 * Synchronous version — reads from database cache if available.
 * Falls back to the catalog directory, then the curated hardcoded map (for
 * bootstrapping before the DB is seeded).
 */
export function getChainlinkPriceFeed(symbol: string, chainId: number): ChainlinkPriceFeed | null {
  // Check database cache first. On a cache hit we return immediately; on a
  // cache miss we must still fall through to the catalog / curated map rather
  // than returning null. The cache is populated ONLY from oracle_feeds, so any
  // symbol that lives in the committed catalog (or curated map) but has no DB
  // row — e.g. TBTC, which discovery's verify step cannot probe because it is
  // itself gated on this resolver — would otherwise be permanently unresolvable
  // once the cache is warm. This preserves the documented resolution priority
  // (DB cache → catalog directory → curated hardcoded map).
  if (!isFeedCacheStale() && feedCache) {
    const cached = feedCache.get(feedCacheKey(symbol, chainId));
    if (cached) return cached;
  }
  // Catalog directory before the curated hardcoded fallback
  return getFeedFromCatalog(symbol, chainId) ?? getFeedFromHardcoded(symbol, chainId);
}

export function getChainlinkRPCConfig(chainId: number): ChainlinkRPCConfig | null {
  return CHAINLINK_RPC_CONFIG[chainId] || null;
}

export function getSupportedSymbols(): string[] {
  // The catalog is the broader official universe; union with the curated map so
  // legacy callers still observe every symbol we explicitly track.
  return Array.from(
    new Set([...getCatalogSupportedSymbols(), ...Object.keys(CHAINLINK_PRICE_FEEDS)])
  ).sort();
}

export function isPriceFeedSupported(symbol: string, chainId: number): boolean {
  return getChainlinkPriceFeed(symbol, chainId) !== null;
}
