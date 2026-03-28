import { createLogger } from '@/lib/utils/logger';

import type {
  OracleMarketData,
  AssetData,
  TVSTrendData,
  ChainBreakdown,
  ProtocolDetail,
  AssetCategory,
  ComparisonData,
  BenchmarkData,
  CorrelationData,
  RiskMetrics,
  AnomalyData,
} from '../types';

const logger = createLogger('DataCache');

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  timeRange: string;
  expiresAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  entries: CacheEntryInfo[];
}

export interface CacheEntryInfo {
  key: string;
  timeRange: string;
  timestamp: number;
  expiresAt: number;
  isExpired: boolean;
  size: number;
}

export type CacheKey =
  | 'oracleData'
  | 'assets'
  | 'trendData'
  | 'chainBreakdown'
  | 'protocolDetails'
  | 'assetCategories'
  | 'comparisonData'
  | 'benchmarkData'
  | 'correlationData'
  | 'riskMetrics'
  | 'anomalies';

export interface MarketDataCache {
  oracleData: CacheEntry<OracleMarketData[]>;
  assets: CacheEntry<AssetData[]>;
  trendData: CacheEntry<TVSTrendData[]>;
  chainBreakdown: CacheEntry<ChainBreakdown[]>;
  protocolDetails: CacheEntry<ProtocolDetail[]>;
  assetCategories: CacheEntry<AssetCategory[]>;
  comparisonData: CacheEntry<ComparisonData[]>;
  benchmarkData: CacheEntry<BenchmarkData[]>;
  correlationData: CacheEntry<CorrelationData>;
  riskMetrics: CacheEntry<RiskMetrics | null>;
  anomalies: CacheEntry<AnomalyData[]>;
}

export const CACHE_EXPIRY_TIMES: Record<string, number> = {
  '1H': 1 * 60 * 1000,
  '24H': 5 * 60 * 1000,
  '7D': 15 * 60 * 1000,
  '30D': 30 * 60 * 1000,
  '90D': 60 * 60 * 1000,
  '1Y': 2 * 60 * 60 * 1000,
  ALL: 4 * 60 * 60 * 1000,
};

class DataCacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
  };

  private generateKey(key: CacheKey, timeRange: string): string {
    return `${key}:${timeRange}`;
  }

  private getExpiryTime(timeRange: string): number {
    return CACHE_EXPIRY_TIMES[timeRange] ?? CACHE_EXPIRY_TIMES['30D'];
  }

  private estimateSize(data: unknown): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  isCacheValid<T>(entry: CacheEntry<T> | undefined): boolean {
    if (!entry) return false;
    return Date.now() < entry.expiresAt;
  }

  get<T>(key: CacheKey, timeRange: string): CacheEntry<T> | undefined {
    const fullKey = this.generateKey(key, timeRange);
    const entry = this.cache.get(fullKey) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      logger.debug(`Cache miss for key: ${fullKey}`);
      return undefined;
    }

    if (!this.isCacheValid(entry)) {
      this.cache.delete(fullKey);
      this.stats.misses++;
      logger.debug(`Cache expired for key: ${fullKey}`);
      return undefined;
    }

    this.stats.hits++;
    logger.debug(`Cache hit for key: ${fullKey}`);
    return entry;
  }

  set<T>(key: CacheKey, timeRange: string, data: T): void {
    const fullKey = this.generateKey(key, timeRange);
    const now = Date.now();
    const expiryTime = this.getExpiryTime(timeRange);

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      timeRange,
      expiresAt: now + expiryTime,
    };

    this.cache.set(fullKey, entry as CacheEntry<unknown>);
    logger.debug(`Cache set for key: ${fullKey}, expires in ${expiryTime}ms`);
  }

  remove(key: CacheKey, timeRange: string): boolean {
    const fullKey = this.generateKey(key, timeRange);
    return this.cache.delete(fullKey);
  }

  clearByKey(key: CacheKey): number {
    let count = 0;
    const prefix = `${key}:`;
    const keys = Array.from(this.cache.keys());
    for (const k of keys) {
      if (k.startsWith(prefix)) {
        this.cache.delete(k);
        count++;
      }
    }
    return count;
  }

  clearAll(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    logger.info('Cache cleared');
  }

  clearExpired(): number {
    const now = Date.now();
    let count = 0;
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      logger.debug(`Cleared ${count} expired cache entries`);
    }
    return count;
  }

  getStats(): CacheStats {
    const entries: CacheEntryInfo[] = [];
    const now = Date.now();
    const cacheEntries = Array.from(this.cache.entries());

    for (const [key, entry] of cacheEntries) {
      const [cacheKey, timeRange] = key.split(':');
      entries.push({
        key: cacheKey,
        timeRange,
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt,
        isExpired: entry.expiresAt <= now,
        size: this.estimateSize(entry.data),
      });
    }

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate,
      entries,
    };
  }

  has(key: CacheKey, timeRange: string): boolean {
    const fullKey = this.generateKey(key, timeRange);
    const entry = this.cache.get(fullKey);
    return entry !== undefined && this.isCacheValid(entry);
  }

  getTimeUntilExpiry(key: CacheKey, timeRange: string): number | null {
    const entry = this.get(key, timeRange);
    if (!entry) return null;
    return Math.max(0, entry.expiresAt - Date.now());
  }
}

export const dataCache = new DataCacheManager();

export function getCachedOracleData(timeRange: string): OracleMarketData[] | undefined {
  const entry = dataCache.get<OracleMarketData[]>('oracleData', timeRange);
  return entry?.data;
}

export function setCachedOracleData(timeRange: string, data: OracleMarketData[]): void {
  dataCache.set('oracleData', timeRange, data);
}

export function getCachedAssets(timeRange: string): AssetData[] | undefined {
  const entry = dataCache.get<AssetData[]>('assets', timeRange);
  return entry?.data;
}

export function setCachedAssets(timeRange: string, data: AssetData[]): void {
  dataCache.set('assets', timeRange, data);
}

export function getCachedTrendData(timeRange: string): TVSTrendData[] | undefined {
  const entry = dataCache.get<TVSTrendData[]>('trendData', timeRange);
  return entry?.data;
}

export function setCachedTrendData(timeRange: string, data: TVSTrendData[]): void {
  dataCache.set('trendData', timeRange, data);
}

export function getCachedChainBreakdown(timeRange: string): ChainBreakdown[] | undefined {
  const entry = dataCache.get<ChainBreakdown[]>('chainBreakdown', timeRange);
  return entry?.data;
}

export function setCachedChainBreakdown(timeRange: string, data: ChainBreakdown[]): void {
  dataCache.set('chainBreakdown', timeRange, data);
}

export function getCachedProtocolDetails(timeRange: string): ProtocolDetail[] | undefined {
  const entry = dataCache.get<ProtocolDetail[]>('protocolDetails', timeRange);
  return entry?.data;
}

export function setCachedProtocolDetails(timeRange: string, data: ProtocolDetail[]): void {
  dataCache.set('protocolDetails', timeRange, data);
}

export function getCachedAssetCategories(timeRange: string): AssetCategory[] | undefined {
  const entry = dataCache.get<AssetCategory[]>('assetCategories', timeRange);
  return entry?.data;
}

export function setCachedAssetCategories(timeRange: string, data: AssetCategory[]): void {
  dataCache.set('assetCategories', timeRange, data);
}

export function getCachedComparisonData(timeRange: string): ComparisonData[] | undefined {
  const entry = dataCache.get<ComparisonData[]>('comparisonData', timeRange);
  return entry?.data;
}

export function setCachedComparisonData(timeRange: string, data: ComparisonData[]): void {
  dataCache.set('comparisonData', timeRange, data);
}

export function getCachedBenchmarkData(timeRange: string): BenchmarkData[] | undefined {
  const entry = dataCache.get<BenchmarkData[]>('benchmarkData', timeRange);
  return entry?.data;
}

export function setCachedBenchmarkData(timeRange: string, data: BenchmarkData[]): void {
  dataCache.set('benchmarkData', timeRange, data);
}

export function getCachedCorrelationData(timeRange: string): CorrelationData | undefined {
  const entry = dataCache.get<CorrelationData>('correlationData', timeRange);
  return entry?.data;
}

export function setCachedCorrelationData(timeRange: string, data: CorrelationData): void {
  dataCache.set('correlationData', timeRange, data);
}

export function getCachedRiskMetrics(timeRange: string): RiskMetrics | null | undefined {
  const entry = dataCache.get<RiskMetrics | null>('riskMetrics', timeRange);
  return entry?.data;
}

export function setCachedRiskMetrics(timeRange: string, data: RiskMetrics | null): void {
  dataCache.set('riskMetrics', timeRange, data);
}

export function getCachedAnomalies(timeRange: string): AnomalyData[] | undefined {
  const entry = dataCache.get<AnomalyData[]>('anomalies', timeRange);
  return entry?.data;
}

export function setCachedAnomalies(timeRange: string, data: AnomalyData[]): void {
  dataCache.set('anomalies', timeRange, data);
}
