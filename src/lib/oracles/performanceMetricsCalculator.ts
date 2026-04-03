import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, type PriceData } from '@/types/oracle';

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

const DEFAULT_CONFIG: MetricsCalculationConfig = {
  accuracyWindowMs: 24 * 60 * 60 * 1000, // 24小时
  reliabilityWindowMs: 60 * 60 * 1000, // 1小时
  updateFrequencyWindowMs: 60 * 60 * 1000, // 1小时
  minSampleSize: 5,
  referencePriceProvider: undefined, // 默认使用所有预言机的中位数
};

export class PerformanceMetricsCalculator {
  private priceHistory: Map<string, PriceHistoryEntry[]> = new Map();
  private config: MetricsCalculationConfig;
  private readonly maxHistorySize = 1000;

  constructor(config: Partial<MetricsCalculationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
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

    // 限制历史数据大小
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  calculateAllMetrics(
    provider: OracleProvider,
    symbol: string,
    allProvidersData: Map<OracleProvider, PriceHistoryEntry[]>
  ): CalculatedPerformanceMetrics {
    const key = `${provider}-${symbol}`;
    const history = this.priceHistory.get(key) || [];

    return {
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

    const avgFrequency = timeSpan / updateCount / 1000; // 转换为秒

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
    symbol: string
  ): number | null {
    const prices: number[] = [];

    for (const [provider, history] of allProvidersData) {
      if (provider === excludeProvider) continue;

      const symbolHistory = history.filter((h) => h.success);
      if (symbolHistory.length === 0) continue;

      // 找到最接近目标时间的条目
      const closestEntry = symbolHistory.reduce((closest, current) => {
        const currentDiff = Math.abs(current.timestamp - timestamp);
        const closestDiff = Math.abs(closest.timestamp - timestamp);
        return currentDiff < closestDiff ? current : closest;
      });

      // 如果时间差太大，忽略这个条目
      if (Math.abs(closestEntry.timestamp - timestamp) > 60000) continue;

      prices.push(closestEntry.price);
    }

    if (prices.length === 0) return null;

    // 使用中位数作为参考价格
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
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
    // 基于预言机类型的去中心化评分
    const scores: Record<OracleProvider, number> = {
      [OracleProvider.CHAINLINK]: 95,
      [OracleProvider.PYTH]: 90,
      [OracleProvider.BAND_PROTOCOL]: 85,
      [OracleProvider.API3]: 80,
      [OracleProvider.REDSTONE]: 85,
      [OracleProvider.DIA]: 75,
      [OracleProvider.TELLOR]: 95,
      [OracleProvider.UMA]: 88,
      [OracleProvider.CHRONICLE]: 92,
      [OracleProvider.WINKLINK]: 70,
    };

    return scores[provider] || 80;
  }

  private calculateDataSources(provider: OracleProvider, symbol: string): number {
    const key = `${provider}-${symbol}`;
    const history = this.priceHistory.get(key) || [];

    // 统计不同数据源的数量
    const sources = new Set(history.map((h) => h.source).filter(Boolean));

    // 如果没有真实数据源，返回默认值
    if (sources.size === 0) {
      return this.getDefaultDataSources(provider);
    }

    return sources.size;
  }

  private getSupportedChainsCount(provider: OracleProvider): number {
    const chains: Record<OracleProvider, number> = {
      [OracleProvider.CHAINLINK]: 15,
      [OracleProvider.PYTH]: 10,
      [OracleProvider.BAND_PROTOCOL]: 8,
      [OracleProvider.API3]: 5,
      [OracleProvider.REDSTONE]: 6,
      [OracleProvider.DIA]: 12,
      [OracleProvider.TELLOR]: 4,
      [OracleProvider.UMA]: 5,
      [OracleProvider.CHRONICLE]: 3,
      [OracleProvider.WINKLINK]: 1,
    };

    return chains[provider] || 5;
  }

  // 默认值方法
  private getDefaultResponseTime(provider: OracleProvider): number {
    const defaults: Record<OracleProvider, number> = {
      [OracleProvider.CHAINLINK]: 450,
      [OracleProvider.PYTH]: 120,
      [OracleProvider.BAND_PROTOCOL]: 600,
      [OracleProvider.API3]: 900,
      [OracleProvider.REDSTONE]: 200,
      [OracleProvider.DIA]: 800,
      [OracleProvider.TELLOR]: 1500,
      [OracleProvider.UMA]: 1200,
      [OracleProvider.CHRONICLE]: 500,
      [OracleProvider.WINKLINK]: 600,
    };
    return defaults[provider] || 600;
  }

  private getDefaultUpdateFrequency(provider: OracleProvider): number {
    const defaults: Record<OracleProvider, number> = {
      [OracleProvider.CHAINLINK]: 3600,
      [OracleProvider.PYTH]: 1,
      [OracleProvider.BAND_PROTOCOL]: 1800,
      [OracleProvider.API3]: 3600,
      [OracleProvider.REDSTONE]: 1,
      [OracleProvider.DIA]: 3600,
      [OracleProvider.TELLOR]: 7200,
      [OracleProvider.UMA]: 7200,
      [OracleProvider.CHRONICLE]: 3600,
      [OracleProvider.WINKLINK]: 1800,
    };
    return defaults[provider] || 3600;
  }

  private getDefaultAccuracy(provider: OracleProvider): number {
    const defaults: Record<OracleProvider, number> = {
      [OracleProvider.CHAINLINK]: 99.8,
      [OracleProvider.PYTH]: 99.5,
      [OracleProvider.BAND_PROTOCOL]: 99.2,
      [OracleProvider.API3]: 98.9,
      [OracleProvider.REDSTONE]: 99.3,
      [OracleProvider.DIA]: 98.8,
      [OracleProvider.TELLOR]: 98.4,
      [OracleProvider.UMA]: 98.5,
      [OracleProvider.CHRONICLE]: 99.7,
      [OracleProvider.WINKLINK]: 98.5,
    };
    return defaults[provider] || 98.0;
  }

  private getDefaultReliability(provider: OracleProvider): number {
    const defaults: Record<OracleProvider, number> = {
      [OracleProvider.CHAINLINK]: 99.9,
      [OracleProvider.PYTH]: 99.8,
      [OracleProvider.BAND_PROTOCOL]: 99.5,
      [OracleProvider.API3]: 99.7,
      [OracleProvider.REDSTONE]: 99.8,
      [OracleProvider.DIA]: 99.5,
      [OracleProvider.TELLOR]: 99.0,
      [OracleProvider.UMA]: 99.2,
      [OracleProvider.CHRONICLE]: 99.9,
      [OracleProvider.WINKLINK]: 99.3,
    };
    return defaults[provider] || 99.0;
  }

  private getDefaultDataSources(provider: OracleProvider): number {
    const defaults: Record<OracleProvider, number> = {
      [OracleProvider.CHAINLINK]: 350,
      [OracleProvider.PYTH]: 180,
      [OracleProvider.BAND_PROTOCOL]: 150,
      [OracleProvider.API3]: 168,
      [OracleProvider.REDSTONE]: 120,
      [OracleProvider.DIA]: 80,
      [OracleProvider.TELLOR]: 50,
      [OracleProvider.UMA]: 30,
      [OracleProvider.CHRONICLE]: 25,
      [OracleProvider.WINKLINK]: 40,
    };
    return defaults[provider] || 50;
  }

  // 清理旧数据
  clearOldData(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;

    for (const [key, data] of this.priceHistory) {
      const filtered = data.filter((p) => p.timestamp >= cutoff);
      if (filtered.length === 0) {
        this.priceHistory.delete(key);
      } else {
        this.priceHistory.set(key, filtered);
      }
    }

    logger.info('Cleared old performance metrics data');
  }

  // 获取统计信息
  getStats(): { totalEntries: number; providerCount: number } {
    let totalEntries = 0;
    for (const data of this.priceHistory.values()) {
      totalEntries += data.length;
    }

    const providers = new Set<string>();
    for (const key of this.priceHistory.keys()) {
      const provider = key.split('-')[0];
      providers.add(provider);
    }

    return { totalEntries, providerCount: providers.size };
  }
}

// 单例实例
export const performanceMetricsCalculator = new PerformanceMetricsCalculator();
