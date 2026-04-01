/**
 * Price Query Utilities
 * Shared utilities for price query functionality
 */

import { getOracleClient } from '@/lib/oracles';
import type { OracleProvider, Blockchain, PriceData } from '@/types/oracle';

import { priceCache, createCacheKey, CACHE_CONFIG } from './cacheUtils';

/**
 * Fetch price data for a specific provider, chain, and symbol
 * Includes caching logic to avoid redundant requests
 *
 * @param provider - The oracle provider
 * @param chain - The blockchain
 * @param symbol - The token symbol
 * @returns Promise resolving to price data
 */
export async function fetchPriceData(
  provider: OracleProvider,
  chain: Blockchain,
  symbol: string
): Promise<PriceData> {
  const cacheKey = createCacheKey('price', provider, chain, symbol);

  // Check cache first
  const cachedData = priceCache.get(cacheKey) as PriceData | undefined;
  if (cachedData) {
    return cachedData;
  }

  // Fetch from API
  const client = getOracleClient(provider);
  const priceData = await client.getPrice(symbol, chain);

  // Enhance with provider and chain info
  const result: PriceData = {
    ...priceData,
    provider,
    chain,
  };

  // Cache the result
  priceCache.set(cacheKey, result, CACHE_CONFIG.PRICE_TTL);

  return result;
}

/**
 * Fetch historical price data
 *
 * @param provider - The oracle provider
 * @param chain - The blockchain
 * @param symbol - The token symbol
 * @param timeRange - Time range in hours
 * @returns Promise resolving to array of price data
 */
export async function fetchHistoricalPrices(
  provider: OracleProvider,
  chain: Blockchain,
  symbol: string,
  timeRange: number
): Promise<PriceData[]> {
  const client = getOracleClient(provider);
  return client.getHistoricalPrices(symbol, chain, timeRange);
}

/**
 * Clear price data cache for specific parameters
 *
 * @param provider - The oracle provider
 * @param chain - The blockchain
 * @param symbol - The token symbol
 */
export function clearPriceCache(provider: OracleProvider, chain: Blockchain, symbol: string): void {
  const cacheKey = createCacheKey('price', provider, chain, symbol);
  priceCache.clear(cacheKey);
}

/**
 * Get cache statistics
 *
 * @returns Object containing cache size and TTL info
 */
export function getCacheStats(): { size: number } {
  return {
    size: priceCache.getSize(),
  };
}

/**
 * Calculate price statistics from an array of prices
 *
 * @param prices - Array of price values
 * @returns Statistics object with avg, max, min, range, stdDev
 */
export function calculatePriceStats(prices: number[]): {
  avg: number;
  max: number;
  min: number;
  range: number;
  variance: number;
  standardDeviation: number;
  standardDeviationPercent: number;
} {
  const validPrices = prices.filter((p) => p > 0 && !isNaN(p));

  if (validPrices.length === 0) {
    return {
      avg: 0,
      max: 0,
      min: 0,
      range: 0,
      variance: 0,
      standardDeviation: 0,
      standardDeviationPercent: 0,
    };
  }

  const avg = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
  const max = Math.max(...validPrices);
  const min = Math.min(...validPrices);
  const range = max - min;

  // Calculate variance
  const variance =
    validPrices.length > 1
      ? validPrices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / validPrices.length
      : 0;

  const standardDeviation = Math.sqrt(variance);
  const standardDeviationPercent = avg > 0 ? (standardDeviation / avg) * 100 : 0;

  return {
    avg,
    max,
    min,
    range,
    variance,
    standardDeviation,
    standardDeviationPercent,
  };
}

/**
 * Calculate average change percentage from price data array
 *
 * @param priceData - Array of price data objects
 * @returns Average change percentage or undefined if no data
 */
export function calculateAvgChange24h(
  priceData: Array<{ change24hPercent?: number }>
): number | undefined {
  const changes = priceData
    .map((p) => p.change24hPercent)
    .filter((c): c is number => c !== undefined && !isNaN(c));

  if (changes.length === 0) {
    return undefined;
  }

  return changes.reduce((a, b) => a + b, 0) / changes.length;
}

/**
 * Create a promise that rejects after a specified timeout
 *
 * @param ms - Timeout in milliseconds
 * @returns Promise that rejects after timeout
 */
export function createTimeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
  });
}

/**
 * Wrap a promise with a timeout
 *
 * @param promise - The promise to wrap
 * @param ms - Timeout in milliseconds
 * @returns Promise that resolves with original value or rejects on timeout
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, createTimeoutPromise(ms)]);
}

/**
 * Limit concurrency of async operations
 *
 * @param items - Array of items to process
 * @param handler - Async function to process each item
 * @param maxConcurrent - Maximum number of concurrent operations
 * @returns Array of settled results
 */
export async function limitConcurrency<T, R>(
  items: T[],
  handler: (item: T) => Promise<R>,
  maxConcurrent: number
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const index = i;

    const promise = Promise.allSettled([handler(item)]).then(([result]) => {
      results[index] = result;
    });

    const wrapped = promise.then(() => {
      const idx = executing.indexOf(wrapped);
      if (idx > -1) executing.splice(idx, 1);
    });

    executing.push(wrapped);

    if (executing.length >= maxConcurrent) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}
