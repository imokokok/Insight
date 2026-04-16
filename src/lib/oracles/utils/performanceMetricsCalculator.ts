import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, type PriceData } from '@/types/oracle';

import { memoryManager, type MemoryStats } from './memoryManager';
import { getPerformanceMetricsConfig, getProviderDefaults } from './performanceMetricsConfig';

import type { PerformanceMetricsConfig } from './performanceMetricsConfig';

const logger = createLogger('performanceMetricsCalculator');

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

export interface PriceHistoryEntry {
  price: number;
  timestamp: number;
  responseTime: number;
  success: boolean;
  source?: string;
}

export interface MetricsCalculationConfig {
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

    this.invalidateCache(provider, symbol);
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

    let totalDeviation = 0;
    let validComparisons = 0;

    for (const entry of recentHistory) {
      const referencePrice = this.calculateReferencePrice(
        entry.timestamp,
        provider,
        allProvidersData,
        symbol
      );

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
    excludeProvider: OracleProvider,
    allProvidersData: Map<OracleProvider, PriceHistoryEntry[]>,
    _symbol: string
  ): number | null {
    const prices: number[] = [];
    const metricsConfig = getPerformanceMetricsConfig();

    for (const [provider, history] of allProvidersData) {
      if (provider === excludeProvider) continue;

      const symbolHistory = history.filter((h) => h.success);
      if (symbolHistory.length === 0) continue;

      const closestEntry = symbolHistory.reduce((closest, current) => {
        const currentDiff = Math.abs(current.timestamp - timestamp);
        const closestDiff = Math.abs(closest.timestamp - timestamp);
        return currentDiff < closestDiff ? current : closest;
      });

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

  clearCache(): void {
    this.metricsCache.clear();
    logger.info('Cleared metrics cache');
  }

  clearOldData(maxAgeMs?: number): void {
    const config = getPerformanceMetricsConfig();
    const ageMs = maxAgeMs ?? config.memoryManagement.maxAgeMs;
    const cutoff = Date.now() - ageMs;

    for (const [key, data] of this.priceHistory) {
      const filtered = memoryManager.cleanupByTime(data, ageMs);
      if (filtered.length === 0) {
        this.priceHistory.delete(key);
        this.metricsCache.delete(key);
      } else {
        this.priceHistory.set(key, filtered);
      }
    }

    logger.info('Cleared old performance metrics data', {
      maxAgeMs: ageMs,
      cutoffTime: new Date(cutoff).toISOString(),
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
