import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, type PriceData } from '@/types/oracle';

import { type PriceHistoryEntry } from '../interfaces';

import { memoryManager, type MemoryStats } from './memoryManager';
import { getPerformanceMetricsConfig, getProviderDefaults } from './performanceMetricsConfig';

import type { PerformanceMetricsConfig } from './performanceMetricsConfig';

const logger = createLogger('performanceMetricsCalculator');

/**
 * Find the entry whose timestamp is closest to `targetTimestamp` using binary
 * search. The input MUST be sorted ascending by timestamp.
 *
 * Pure optimization — equivalent to a `.reduce()` linear scan that picks the
 * entry minimizing `Math.abs(entry.timestamp - target)` (with ties broken in
 * favor of the FIRST such entry in array order), but O(log M) instead of O(M).
 */
function findClosestByTimestamp(
  sortedEntries: readonly PriceHistoryEntry[],
  targetTimestamp: number
): PriceHistoryEntry | undefined {
  if (sortedEntries.length === 0) return undefined;
  if (sortedEntries.length === 1) return sortedEntries[0];

  let low = 0;
  let high = sortedEntries.length - 1;

  // Binary search for the first entry with timestamp >= targetTimestamp.
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (sortedEntries[mid].timestamp < targetTimestamp) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  // `low` is the first entry with timestamp >= targetTimestamp.
  // The closest is either `low` or `low - 1`.
  // `low` can equal `sortedEntries.length` when the target is past every entry;
  // the last entry is then the closest. Guard `curr` against undefined and
  // non-finite timestamps to avoid a TypeError.
  if (low >= sortedEntries.length) return sortedEntries[sortedEntries.length - 1];
  if (low === 0) return sortedEntries[0];

  const prev = sortedEntries[low - 1];
  const curr = sortedEntries[low];

  if (!curr || !Number.isFinite(curr.timestamp)) return prev;

  const currDiff = Math.abs(curr.timestamp - targetTimestamp);
  const prevDiff = Math.abs(prev.timestamp - targetTimestamp);

  if (currDiff < prevDiff) {
    // `curr` is the first entry with its timestamp (any earlier entry has a
    // strictly smaller timestamp), so it is already the first in array order
    // with this minimum diff.
    return curr;
  }

  // `prev` wins or ties. Among entries sharing prev's timestamp (which are
  // adjacent since the array is sorted), walk back to the FIRST one to match
  // the original `.reduce()` tie-break semantics. Cost is bounded by the run
  // length of duplicate timestamps, which is typically 1.
  let firstWithPrevTimestamp = low - 1;
  while (
    firstWithPrevTimestamp > 0 &&
    sortedEntries[firstWithPrevTimestamp - 1].timestamp === prev.timestamp
  ) {
    firstWithPrevTimestamp--;
  }
  return sortedEntries[firstWithPrevTimestamp];
}

export interface CalculatedPerformanceMetrics {
  provider: OracleProvider;
  responseTime: number;
  updateFrequency: number;
  accuracy: number;
  reliability: number;
  decentralization: number;
  dataSources: number;
  supportedChains: number;
  lastCalculated: number;
  sampleSize: number;
}

interface MetricsCalculationConfig {
  accuracyWindowMs: number;
  reliabilityWindowMs: number;
  updateFrequencyWindowMs: number;
  minSampleSize: number;
  referencePriceProvider?: OracleProvider;
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class PerformanceMetricsCalculator {
  private priceHistory: Map<string, PriceHistoryEntry[]> = new Map();
  private metricsCache: Map<string, CacheEntry<CalculatedPerformanceMetrics>> = new Map();
  private config: MetricsCalculationConfig;

  constructor(config: Partial<MetricsCalculationConfig> = {}) {
    const metricsConfig = getPerformanceMetricsConfig();
    this.config = {
      accuracyWindowMs: metricsConfig.calculation.accuracyWindowMs,
      reliabilityWindowMs: metricsConfig.calculation.reliabilityWindowMs,
      updateFrequencyWindowMs: metricsConfig.calculation.updateFrequencyWindowMs,
      minSampleSize: metricsConfig.calculation.minSampleSize,
      referencePriceProvider: undefined,
      ...config,
    };
  }

  addPriceData(
    provider: OracleProvider,
    symbol: string,
    data: PriceData,
    responseTime: number,
    success: boolean
  ): void {
    const key = `${provider}-${symbol}`;
    if (!this.priceHistory.has(key)) {
      this.priceHistory.set(key, []);
    }

    const history = this.priceHistory.get(key)!;
    history.push({
      price: data.price,
      timestamp: data.timestamp,
      responseTime,
      success,
      source: data.source,
    });

    const metricsConfig = getPerformanceMetricsConfig();
    const memConfig = metricsConfig.memoryManagement;

    if (memConfig.enabled) {
      const cleanedHistory = memoryManager.smartCleanup(history);
      if (cleanedHistory.length !== history.length) {
        this.priceHistory.set(key, cleanedHistory);
      }
    } else if (history.length > metricsConfig.calculation.maxHistorySize) {
      history.shift();
    }

    const cacheEntry = this.metricsCache.get(key);
    // A cache entry only needs invalidating once it is stale; there is nothing
    // to invalidate when one does not exist yet (deleting a missing key is a
    // no-op), so only the stale case is handled here.
    if (cacheEntry && Date.now() - cacheEntry.timestamp > 5000) {
      this.invalidateCache(provider, symbol);
    }
  }

  calculateAllMetrics(
    provider: OracleProvider,
    symbol: string,
    allProvidersData: Map<OracleProvider, PriceHistoryEntry[]>
  ): CalculatedPerformanceMetrics {
    const cacheKey = `${provider}-${symbol}`;
    const metricsConfig = getPerformanceMetricsConfig();

    if (metricsConfig.cache.enabled) {
      const cached = this.metricsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < metricsConfig.cache.ttlMs) {
        logger.debug(`Returning cached metrics for ${provider}-${symbol}`);
        return cached.value;
      }
    }

    const key = `${provider}-${symbol}`;
    const history = this.priceHistory.get(key) || [];

    const metrics: CalculatedPerformanceMetrics = {
      provider,
      responseTime: this.calculateAverageResponseTime(provider, symbol),
      updateFrequency: this.calculateUpdateFrequency(provider, symbol),
      accuracy: this.calculateAccuracy(provider, symbol, allProvidersData),
      reliability: this.calculateReliability(provider, symbol),
      decentralization: this.calculateDecentralizationScore(provider),
      dataSources: this.calculateDataSources(provider, symbol),
      supportedChains: this.getSupportedChainsCount(provider),
      lastCalculated: Date.now(),
      sampleSize: history.length,
    };

    if (metricsConfig.cache.enabled) {
      this.setCache(cacheKey, metrics, metricsConfig);
    }

    return metrics;
  }

  private calculateAverageResponseTime(provider: OracleProvider, symbol: string): number {
    const key = `${provider}-${symbol}`;
    const history = this.priceHistory.get(key) || [];

    if (history.length < this.config.minSampleSize) {
      return this.getDefaultResponseTime(provider);
    }

    const now = Date.now();
    const windowStart = now - this.config.reliabilityWindowMs;
    const recentHistory = history.filter((h) => h.timestamp >= windowStart && h.success);

    if (recentHistory.length === 0) {
      return this.getDefaultResponseTime(provider);
    }

    const avgResponseTime =
      recentHistory.reduce((sum, h) => sum + h.responseTime, 0) / recentHistory.length;

    logger.debug(`Calculated response time for ${provider}: ${avgResponseTime.toFixed(0)}ms`);
    return Math.round(avgResponseTime);
  }

  private calculateUpdateFrequency(provider: OracleProvider, symbol: string): number {
    const key = `${provider}-${symbol}`;
    const history = this.priceHistory.get(key) || [];

    if (history.length < 2) {
      return this.getDefaultUpdateFrequency(provider);
    }

    const now = Date.now();
    const windowStart = now - this.config.updateFrequencyWindowMs;
    const recentHistory = history
      .filter((h) => h.timestamp >= windowStart && h.success)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (recentHistory.length < 2) {
      return this.getDefaultUpdateFrequency(provider);
    }

    const timeSpan = recentHistory[recentHistory.length - 1].timestamp - recentHistory[0].timestamp;
    const updateCount = recentHistory.length - 1;

    if (timeSpan <= 0 || updateCount <= 0) {
      return this.getDefaultUpdateFrequency(provider);
    }

    const avgFrequency = timeSpan / updateCount / 1000;

    logger.debug(`Calculated update frequency for ${provider}: ${avgFrequency.toFixed(0)}s`);
    return Math.round(avgFrequency);
  }

  private calculateAccuracy(
    provider: OracleProvider,
    symbol: string,
    allProvidersData: Map<OracleProvider, PriceHistoryEntry[]>
  ): number {
    const key = `${provider}-${symbol}`;
    const history = this.priceHistory.get(key) || [];

    if (history.length < this.config.minSampleSize) {
      return this.getDefaultAccuracy(provider);
    }

    const now = Date.now();
    const windowStart = now - this.config.accuracyWindowMs;
    const recentHistory = history.filter((h) => h.timestamp >= windowStart && h.success);

    if (recentHistory.length === 0) {
      return this.getDefaultAccuracy(provider);
    }

    // Pre-resolve, filter (success-only) and sort each OTHER provider's
    // history ONCE so that the per-entry reference-price lookup below can
    // use O(log M) binary search instead of an O(M) `.reduce()` scan per
    // provider per entry. Same source-resolution rule as the original
    // (`this.priceHistory.get(key) || history`), so outputs are identical.
    const sortedOtherHistories = new Map<OracleProvider, PriceHistoryEntry[]>();
    for (const [otherProvider, otherHistory] of allProvidersData) {
      if (otherProvider === provider) continue;
      const providerKey = `${otherProvider}-${symbol}`;
      const providerHistory = this.priceHistory.get(providerKey) || otherHistory;
      const successOnly = providerHistory.filter((h) => h.success);
      if (successOnly.length === 0) continue;
      successOnly.sort((a, b) => a.timestamp - b.timestamp);
      sortedOtherHistories.set(otherProvider, successOnly);
    }

    let totalDeviation = 0;
    let validComparisons = 0;

    for (const entry of recentHistory) {
      const referencePrice = this.calculateReferencePrice(entry.timestamp, sortedOtherHistories);

      if (referencePrice === null) continue;

      const deviation = Math.abs(entry.price - referencePrice) / referencePrice;
      totalDeviation += deviation;
      validComparisons++;
    }

    if (validComparisons === 0) {
      return this.getDefaultAccuracy(provider);
    }

    const avgDeviation = totalDeviation / validComparisons;
    const accuracy = Math.max(0, 100 - avgDeviation * 100);

    logger.debug(`Calculated accuracy for ${provider}: ${accuracy.toFixed(2)}%`);
    return Math.min(99.99, Math.round(accuracy * 100) / 100);
  }

  private calculateReferencePrice(
    timestamp: number,
    sortedOtherHistories: Map<OracleProvider, PriceHistoryEntry[]>
  ): number | null {
    const prices: number[] = [];
    const metricsConfig = getPerformanceMetricsConfig();

    for (const [, entries] of sortedOtherHistories) {
      // `entries` is pre-sorted ascending by timestamp; binary search for the
      // closest entry. Equivalent to the original `.reduce()` linear scan
      // but O(log M) instead of O(M).
      const closestEntry = findClosestByTimestamp(entries, timestamp);
      if (!closestEntry) continue;

      if (
        Math.abs(closestEntry.timestamp - timestamp) >
        metricsConfig.calculation.referencePriceMaxTimeDiff
      )
        continue;

      prices.push(closestEntry.price);
    }

    if (prices.length === 0) return null;

    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private calculateReliability(provider: OracleProvider, symbol: string): number {
    const key = `${provider}-${symbol}`;
    const history = this.priceHistory.get(key) || [];

    if (history.length < this.config.minSampleSize) {
      return this.getDefaultReliability(provider);
    }

    const now = Date.now();
    const windowStart = now - this.config.reliabilityWindowMs;
    const recentHistory = history.filter((h) => h.timestamp >= windowStart);

    if (recentHistory.length === 0) {
      return this.getDefaultReliability(provider);
    }

    const successCount = recentHistory.filter((h) => h.success).length;
    const reliability = (successCount / recentHistory.length) * 100;

    logger.debug(`Calculated reliability for ${provider}: ${reliability.toFixed(2)}%`);
    return Math.round(reliability * 100) / 100;
  }

  private calculateDecentralizationScore(provider: OracleProvider): number {
    const defaults = getProviderDefaults(provider);
    return defaults.decentralizationScore;
  }

  private calculateDataSources(provider: OracleProvider, symbol: string): number {
    const key = `${provider}-${symbol}`;
    const history = this.priceHistory.get(key) || [];

    const sources = new Set(history.map((h) => h.source).filter(Boolean));

    if (sources.size === 0) {
      return this.getDefaultDataSources(provider);
    }

    return sources.size;
  }

  private getSupportedChainsCount(provider: OracleProvider): number {
    const defaults = getProviderDefaults(provider);
    return defaults.supportedChains;
  }

  private getDefaultResponseTime(provider: OracleProvider): number {
    const defaults = getProviderDefaults(provider);
    return defaults.responseTime;
  }

  private getDefaultUpdateFrequency(provider: OracleProvider): number {
    const defaults = getProviderDefaults(provider);
    return defaults.updateFrequency;
  }

  private getDefaultAccuracy(provider: OracleProvider): number {
    const defaults = getProviderDefaults(provider);
    return defaults.accuracy;
  }

  private getDefaultReliability(provider: OracleProvider): number {
    const defaults = getProviderDefaults(provider);
    return defaults.reliability;
  }

  private getDefaultDataSources(provider: OracleProvider): number {
    const defaults = getProviderDefaults(provider);
    return defaults.dataSources;
  }

  private invalidateCache(provider: OracleProvider, symbol: string): void {
    const cacheKey = `${provider}-${symbol}`;
    this.metricsCache.delete(cacheKey);
  }

  private setCache(
    key: string,
    value: CalculatedPerformanceMetrics,
    config: PerformanceMetricsConfig
  ): void {
    if (this.metricsCache.size >= config.cache.maxSize) {
      const oldestKey = this.metricsCache.keys().next().value;
      if (oldestKey) {
        this.metricsCache.delete(oldestKey);
      }
    }

    this.metricsCache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  clearAllData(): void {
    this.priceHistory.clear();
    this.metricsCache.clear();
    logger.info('Cleared all performance metrics data and cache');
  }

  getStats(): { totalEntries: number; providerCount: number; cacheSize: number } {
    let totalEntries = 0;
    for (const data of this.priceHistory.values()) {
      totalEntries += data.length;
    }

    const providers = new Set<string>();
    for (const key of this.priceHistory.keys()) {
      const provider = key.split('-')[0];
      providers.add(provider);
    }

    return {
      totalEntries,
      providerCount: providers.size,
      cacheSize: this.metricsCache.size,
    };
  }

  getMemoryStats(): MemoryStats {
    const stats = memoryManager.getMemoryStats(this.priceHistory);
    memoryManager.checkMemoryThreshold(stats);
    return stats;
  }

  getDetailedStats(): {
    basic: { totalEntries: number; providerCount: number; cacheSize: number };
    memory: MemoryStats;
    entriesByProvider: Record<string, number>;
  } {
    const basic = this.getStats();
    const memory = this.getMemoryStats();
    const entriesByProvider: Record<string, number> = {};

    for (const [key, entries] of this.priceHistory) {
      const provider = key.split('-')[0];
      entriesByProvider[provider] = (entriesByProvider[provider] || 0) + entries.length;
    }

    return {
      basic,
      memory,
      entriesByProvider,
    };
  }
}
