import type { PriceData } from '@/types/oracle';
import type { AirnodeNetworkStats } from '@/lib/oracles/api3';
import { CACHE_CONFIG } from '@/lib/config/cacheConfig';
import { API3Client } from '@/lib/oracles/api3';
import { API3OfflineStorage } from './api3OfflineStorage';

export interface UpdateRequest {
  type: 'price' | 'historical' | 'airnodeStats' | 'dapiCoverage' | 'staking' | 'oev' | 'alerts' | 'coveragePool';
  symbol?: string;
  chain?: string;
  lastTimestamp?: number;
}

export interface IncrementalUpdateResult<T> {
  data: T;
  updated: boolean;
  timestamp: number;
  source: 'network' | 'cache' | 'offline';
}

export class API3IncrementalUpdateService {
  private client: API3Client;
  private offlineStorage: API3OfflineStorage;
  private lastUpdateTimestamp: Map<string, number> = new Map();
  private pendingUpdates: Map<string, Promise<unknown>> = new Map();
  private updateQueue: UpdateRequest[] = [];
  private isProcessing = false;

  constructor(client?: API3Client, offlineStorage?: API3OfflineStorage) {
    this.client = client || new API3Client();
    this.offlineStorage = offlineStorage || new API3OfflineStorage();
  }

  async updatePriceData(symbol: string, chain?: string): Promise<IncrementalUpdateResult<PriceData>> {
    const cacheKey = `price-${symbol}-${chain || 'default'}`;
    const lastUpdate = this.lastUpdateTimestamp.get(cacheKey) || 0;
    const now = Date.now();
    const config = CACHE_CONFIG.api3.price;

    if (now - lastUpdate < config.staleTime) {
      const cachedData = await this.offlineStorage.getData<PriceData>(cacheKey);
      if (cachedData) {
        return {
          data: cachedData,
          updated: false,
          timestamp: lastUpdate,
          source: 'cache',
        };
      }
    }

    if (this.pendingUpdates.has(cacheKey)) {
      const result = await this.pendingUpdates.get(cacheKey);
      return result as IncrementalUpdateResult<PriceData>;
    }

    const updatePromise = this.fetchPriceWithFallback(symbol, chain, cacheKey);
    this.pendingUpdates.set(cacheKey, updatePromise);

    try {
      const result = await updatePromise;
      return result;
    } finally {
      this.pendingUpdates.delete(cacheKey);
    }
  }

  private async fetchPriceWithFallback(
    symbol: string,
    chain: string | undefined,
    cacheKey: string
  ): Promise<IncrementalUpdateResult<PriceData>> {
    try {
      const data = await this.client.getPrice(symbol, chain as never);
      const now = Date.now();
      this.lastUpdateTimestamp.set(cacheKey, now);
      await this.offlineStorage.setData(cacheKey, data, CACHE_CONFIG.offline.maxAge);

      return {
        data,
        updated: true,
        timestamp: now,
        source: 'network',
      };
    } catch (error) {
      const cachedData = await this.offlineStorage.getData<PriceData>(cacheKey);
      if (cachedData) {
        return {
          data: cachedData,
          updated: false,
          timestamp: this.lastUpdateTimestamp.get(cacheKey) || 0,
          source: 'offline',
        };
      }
      throw error;
    }
  }

  async updateHistoricalData(
    symbol: string,
    lastTimestamp: number,
    chain?: string,
    period: number = 7
  ): Promise<IncrementalUpdateResult<PriceData[]>> {
    const cacheKey = `historical-${symbol}-${chain || 'default'}-${period}`;
    const config = CACHE_CONFIG.api3.historical;

    const cachedData = await this.offlineStorage.getData<PriceData[]>(cacheKey);
    if (cachedData && cachedData.length > 0) {
      const latestCachedTimestamp = Math.max(...cachedData.map(p => p.timestamp));
      if (latestCachedTimestamp > lastTimestamp) {
        const newEntries = cachedData.filter(p => p.timestamp > lastTimestamp);
        if (newEntries.length > 0) {
          return {
            data: newEntries,
            updated: true,
            timestamp: Date.now(),
            source: 'cache',
          };
        }
      }
    }

    try {
      const data = await this.client.getHistoricalPrices(symbol, chain as never, period);
      const now = Date.now();
      this.lastUpdateTimestamp.set(cacheKey, now);
      await this.offlineStorage.setData(cacheKey, data, CACHE_CONFIG.offline.maxAge);

      return {
        data,
        updated: true,
        timestamp: now,
        source: 'network',
      };
    } catch (error) {
      if (cachedData) {
        return {
          data: cachedData,
          updated: false,
          timestamp: this.lastUpdateTimestamp.get(cacheKey) || 0,
          source: 'offline',
        };
      }
      throw error;
    }
  }

  async updateNetworkStats(): Promise<IncrementalUpdateResult<AirnodeNetworkStats>> {
    const cacheKey = 'airnodeStats';
    const lastUpdate = this.lastUpdateTimestamp.get(cacheKey) || 0;
    const now = Date.now();
    const config = CACHE_CONFIG.api3.airnodeStats;

    if (now - lastUpdate < config.staleTime) {
      const cachedData = await this.offlineStorage.getData<AirnodeNetworkStats>(cacheKey);
      if (cachedData) {
        return {
          data: cachedData,
          updated: false,
          timestamp: lastUpdate,
          source: 'cache',
        };
      }
    }

    try {
      const data = await this.client.getAirnodeNetworkStats();
      this.lastUpdateTimestamp.set(cacheKey, now);
      await this.offlineStorage.setData(cacheKey, data, CACHE_CONFIG.offline.maxAge);

      return {
        data,
        updated: true,
        timestamp: now,
        source: 'network',
      };
    } catch (error) {
      const cachedData = await this.offlineStorage.getData<AirnodeNetworkStats>(cacheKey);
      if (cachedData) {
        return {
          data: cachedData,
          updated: false,
          timestamp: this.lastUpdateTimestamp.get(cacheKey) || 0,
          source: 'offline',
        };
      }
      throw error;
    }
  }

  async batchUpdate(updates: UpdateRequest[]): Promise<Map<string, IncrementalUpdateResult<unknown>>> {
    const results = new Map<string, IncrementalUpdateResult<unknown>>();
    const config = CACHE_CONFIG.incremental;

    const batches: UpdateRequest[][] = [];
    for (let i = 0; i < updates.length; i += config.batchSize) {
      batches.push(updates.slice(i, i + config.batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (update) => {
        const key = this.getUpdateKey(update);
        try {
          let result: IncrementalUpdateResult<unknown>;

          switch (update.type) {
            case 'price':
              result = await this.updatePriceData(update.symbol || '', update.chain);
              break;
            case 'historical':
              result = await this.updateHistoricalData(
                update.symbol || '',
                update.lastTimestamp || 0,
                update.chain
              );
              break;
            case 'airnodeStats':
              result = await this.updateNetworkStats();
              break;
            default:
              throw new Error(`Unknown update type: ${update.type}`);
          }

          return { key, result };
        } catch (error) {
          return {
            key,
            result: {
              data: null,
              updated: false,
              timestamp: 0,
              source: 'offline' as const,
              error,
            },
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      for (const { key, result } of batchResults) {
        results.set(key, result);
      }

      if (batches.indexOf(batch) < batches.length - 1) {
        await this.delay(config.minUpdateInterval);
      }
    }

    return results;
  }

  async smartUpdate(dataType: string): Promise<IncrementalUpdateResult<unknown>> {
    const now = Date.now();
    const cacheKey = `smart-${dataType}`;
    const lastUpdate = this.lastUpdateTimestamp.get(cacheKey) || 0;

    const config = this.getConfigForType(dataType);
    if (!config) {
      throw new Error(`Unknown data type: ${dataType}`);
    }

    const isStale = now - lastUpdate >= config.staleTime;
    const shouldRefetch = config.refetchInterval && now - lastUpdate >= config.refetchInterval;

    if (!isStale && !shouldRefetch) {
      const cachedData = await this.offlineStorage.getData<unknown>(cacheKey);
      if (cachedData) {
        return {
          data: cachedData,
          updated: false,
          timestamp: lastUpdate,
          source: 'cache',
        };
      }
    }

    return this.fetchByType(dataType, cacheKey);
  }

  private async fetchByType(
    dataType: string,
    cacheKey: string
  ): Promise<IncrementalUpdateResult<unknown>> {
    const now = Date.now();
    let data: unknown;

    switch (dataType) {
      case 'airnodeStats':
        data = await this.client.getAirnodeNetworkStats();
        break;
      case 'dapiCoverage':
        data = await this.client.getDapiCoverage();
        break;
      case 'staking':
        data = await this.client.getStakingData();
        break;
      case 'oev':
        data = await this.client.getOEVNetworkStats();
        break;
      case 'alerts':
        data = await this.client.getActiveAlerts();
        break;
      case 'coveragePool':
        data = await this.client.getCoveragePoolDetails();
        break;
      case 'firstParty':
        data = await this.client.getFirstPartyOracleData();
        break;
      case 'latency':
        data = await this.client.getLatencyDistribution();
        break;
      case 'quality':
        data = await this.client.getDataQualityMetrics();
        break;
      case 'deviations':
        data = await this.client.getDapiPriceDeviations();
        break;
      case 'sourceTrace':
        data = await this.client.getDataSourceTraceability();
        break;
      case 'coverageEvents':
        data = await this.client.getCoveragePoolEvents();
        break;
      case 'gasFees':
        data = await this.client.getGasFeeData();
        break;
      case 'qualityHistory':
        data = await this.client.getQualityHistory();
        break;
      case 'crossOracle':
        data = await this.client.getCrossOracleComparison();
        break;
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }

    this.lastUpdateTimestamp.set(cacheKey, now);
    await this.offlineStorage.setData(cacheKey, data, CACHE_CONFIG.offline.maxAge);

    return {
      data,
      updated: true,
      timestamp: now,
      source: 'network',
    };
  }

  private getConfigForType(dataType: string) {
    const configs: Record<string, (typeof CACHE_CONFIG.api3)[keyof typeof CACHE_CONFIG.api3]> = {
      price: CACHE_CONFIG.api3.price,
      historical: CACHE_CONFIG.api3.historical,
      airnodeStats: CACHE_CONFIG.api3.airnodeStats,
      dapiCoverage: CACHE_CONFIG.api3.dapiCoverage,
      staking: CACHE_CONFIG.api3.staking,
      oev: CACHE_CONFIG.api3.oev,
      alerts: CACHE_CONFIG.api3.alerts,
      coveragePool: CACHE_CONFIG.api3.coveragePool,
      firstParty: CACHE_CONFIG.api3.firstParty,
      latency: CACHE_CONFIG.api3.latency,
      quality: CACHE_CONFIG.api3.quality,
      deviations: CACHE_CONFIG.api3.deviations,
      sourceTrace: CACHE_CONFIG.api3.sourceTrace,
      coverageEvents: CACHE_CONFIG.api3.coverageEvents,
      gasFees: CACHE_CONFIG.api3.gasFees,
      qualityHistory: CACHE_CONFIG.api3.qualityHistory,
      crossOracle: CACHE_CONFIG.api3.crossOracle,
    };

    return configs[dataType];
  }

  private getUpdateKey(update: UpdateRequest): string {
    return `${update.type}-${update.symbol || ''}-${update.chain || ''}-${update.lastTimestamp || ''}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getLastUpdateTime(cacheKey: string): number | undefined {
    return this.lastUpdateTimestamp.get(cacheKey);
  }

  clearCache(): void {
    this.lastUpdateTimestamp.clear();
    this.pendingUpdates.clear();
    this.updateQueue = [];
  }

  async invalidateCache(dataType: string, symbol?: string, chain?: string): Promise<void> {
    const cacheKey = symbol ? `${dataType}-${symbol}-${chain || 'default'}` : dataType;
    this.lastUpdateTimestamp.delete(cacheKey);
    await this.offlineStorage.setData(cacheKey, null);
  }
}

export const api3IncrementalUpdateService = new API3IncrementalUpdateService();
