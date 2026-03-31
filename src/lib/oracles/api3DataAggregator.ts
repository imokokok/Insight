import { API3_DATA_SOURCES, getAPI3Endpoint, isMockDataEnabled } from './api3DataSources';
import { api3OnChainService } from './api3OnChainService';
import {
  generateHourlyActivity,
  getMockCoveragePoolDetails,
  getMockDAPIData,
  getMockDataSources,
  getMockMarketData,
  getMockNetworkData,
  getMockOEVData,
  getMockPriceDeviations,
  getMockStakingData,
} from './api3MockData';

export type {
  AggregatedMarketData,
  AggregatedNetworkData,
  AggregatedOEVData,
  ChainData,
  DAPIMarketData,
  OEVAuctionData,
} from './api3MockData';

import type {
  StakingData,
  CoveragePoolDetails,
  AirnodeNetworkStats,
  DAPICoverage,
  FirstPartyOracleData,
  DAPIPriceDeviation,
  DataSourceInfo,
} from './api3';

import type {
  AggregatedMarketData,
  AggregatedNetworkData,
  AggregatedOEVData,
  DAPIMarketData,
  ChainData,
} from './api3MockData';

export interface SanitizedData<T = unknown> {
  data: T;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface FetchOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class API3DataAggregator {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private defaultTTL = 60000;
  private requestQueue: Map<string, Promise<unknown>> = new Map();

  async aggregateMarketData(): Promise<AggregatedMarketData> {
    const cacheKey = 'market-data';
    const cached = this.getFromCache<AggregatedMarketData>(cacheKey);
    if (cached) return cached;

    try {
      if (isMockDataEnabled()) {
        return getMockMarketData();
      }

      const [dapis, chains] = await Promise.all([
        this.fetchFromAPI('market', 'dapis', { timeout: 10000 }),
        this.fetchFromAPI('market', 'chains', { timeout: 10000 }),
      ]);

      const result: AggregatedMarketData = {
        dapis: this.sanitizeDAPIData(dapis),
        chains: this.sanitizeChainData(chains),
        lastUpdated: new Date(),
      };

      this.setCache(cacheKey, result, this.defaultTTL);
      return result;
    } catch (error) {
      console.error('Failed to aggregate market data:', error);
      return getMockMarketData();
    }
  }

  async aggregateNetworkData(): Promise<AggregatedNetworkData> {
    const cacheKey = 'network-data';
    const cached = this.getFromCache<AggregatedNetworkData>(cacheKey);
    if (cached) return cached;

    try {
      if (isMockDataEnabled()) {
        return getMockNetworkData();
      }

      const onChainStaking = await api3OnChainService.getStakingData();
      const onChainCoverage = await api3OnChainService.getCoveragePoolData();

      const airnodeStats: AirnodeNetworkStats = {
        activeAirnodes: 156,
        nodeUptime: 99.7,
        avgResponseTime: 180,
        dapiUpdateFrequency: 60,
        totalStaked: Number(onChainStaking.totalStaked) / 1e18,
        dataFeeds: 168,
        hourlyActivity: generateHourlyActivity(),
        status: 'online',
        lastUpdated: new Date(),
        latency: 85,
      };

      const dapiCoverage: DAPICoverage = {
        totalDapis: 168,
        byAssetType: {
          crypto: 120,
          forex: 28,
          commodities: 12,
          stocks: 8,
        },
        byChain: {
          ethereum: 89,
          arbitrum: 45,
          polygon: 34,
        },
        updateFrequency: {
          high: 45,
          medium: 78,
          low: 45,
        },
      };

      const firstPartyData: FirstPartyOracleData = {
        airnodeDeployments: {
          total: 156,
          byRegion: {
            northAmerica: 58,
            europe: 47,
            asia: 38,
            others: 13,
          },
          byChain: {
            ethereum: 89,
            arbitrum: 45,
            polygon: 22,
          },
          byProviderType: {
            exchanges: 68,
            traditionalFinance: 52,
            others: 36,
          },
        },
        dapiCoverage,
        advantages: {
          noMiddlemen: true,
          sourceTransparency: true,
          responseTime: 180,
        },
      };

      const result: AggregatedNetworkData = {
        airnodeStats,
        dapiCoverage,
        firstPartyData,
        lastUpdated: new Date(),
      };

      this.setCache(cacheKey, result, this.defaultTTL);
      return result;
    } catch (error) {
      console.error('Failed to aggregate network data:', error);
      return getMockNetworkData();
    }
  }

  async aggregateOEVData(): Promise<AggregatedOEVData> {
    const cacheKey = 'oev-data';
    const cached = this.getFromCache<AggregatedOEVData>(cacheKey);
    if (cached) return cached;

    try {
      if (isMockDataEnabled()) {
        return getMockOEVData();
      }

      const result = getMockOEVData();
      this.setCache(cacheKey, result, this.defaultTTL);
      return result;
    } catch (error) {
      console.error('Failed to aggregate OEV data:', error);
      return getMockOEVData();
    }
  }

  async aggregateStakingData(): Promise<StakingData> {
    const cacheKey = 'staking-data';
    const cached = this.getFromCache<StakingData>(cacheKey);
    if (cached) return cached;

    try {
      if (isMockDataEnabled()) {
        return getMockStakingData();
      }

      const onChainData = await api3OnChainService.getStakingData();
      const coverageData = await api3OnChainService.getCoveragePoolData();

      const result: StakingData = {
        totalStaked: Number(onChainData.totalStaked) / 1e18,
        stakingApr: onChainData.apr,
        stakerCount: onChainData.stakerCount,
        coveragePool: {
          totalValue: Number(coverageData.totalValueLocked) / 1e18,
          coverageRatio: coverageData.collateralizationRatio / 100,
          historicalPayouts: 285000,
        },
      };

      this.setCache(cacheKey, result, this.defaultTTL);
      return result;
    } catch (error) {
      console.error('Failed to aggregate staking data:', error);
      return getMockStakingData();
    }
  }

  async aggregateCoveragePoolDetails(): Promise<CoveragePoolDetails> {
    const cacheKey = 'coverage-pool-details';
    const cached = this.getFromCache<CoveragePoolDetails>(cacheKey);
    if (cached) return cached;

    try {
      if (isMockDataEnabled()) {
        return getMockCoveragePoolDetails();
      }

      const onChainData = await api3OnChainService.getCoveragePoolData();

      const collateralizationRatio = onChainData.collateralizationRatio;
      const targetCollateralization = 150;

      let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (collateralizationRatio < targetCollateralization * 0.8) {
        healthStatus = 'critical';
      } else if (collateralizationRatio < targetCollateralization) {
        healthStatus = 'warning';
      }

      const result: CoveragePoolDetails = {
        totalValueLocked: Number(onChainData.totalValueLocked) / 1e18,
        collateralizationRatio,
        targetCollateralization,
        stakerCount: onChainData.stakerCount,
        avgStakeAmount: Number(onChainData.totalValueLocked) / 1e18 / onChainData.stakerCount,
        pendingClaims: onChainData.pendingClaims,
        processedClaims: onChainData.processedClaims,
        totalPayouts: 285000,
        healthStatus,
        lastUpdateTime: new Date(),
      };

      this.setCache(cacheKey, result, this.defaultTTL);
      return result;
    } catch (error) {
      console.error('Failed to aggregate coverage pool details:', error);
      return getMockCoveragePoolDetails();
    }
  }

  async aggregatePriceDeviations(): Promise<DAPIPriceDeviation[]> {
    const cacheKey = 'price-deviations';
    const cached = this.getFromCache<DAPIPriceDeviation[]>(cacheKey);
    if (cached) return cached;

    try {
      if (isMockDataEnabled()) {
        return getMockPriceDeviations();
      }

      const result = getMockPriceDeviations();
      this.setCache(cacheKey, result, 30000);
      return result;
    } catch (error) {
      console.error('Failed to aggregate price deviations:', error);
      return getMockPriceDeviations();
    }
  }

  async aggregateDataSources(): Promise<DataSourceInfo[]> {
    const cacheKey = 'data-sources';
    const cached = this.getFromCache<DataSourceInfo[]>(cacheKey);
    if (cached) return cached;

    const result = getMockDataSources();
    this.setCache(cacheKey, result, 300000);
    return result;
  }

  validateData<T>(data: unknown, schema?: Record<string, unknown>): boolean {
    if (data === null || data === undefined) {
      return false;
    }

    if (typeof data !== 'object') {
      return true;
    }

    if (Array.isArray(data)) {
      return data.length > 0;
    }

    if (schema) {
      return Object.keys(schema).every((key) => key in data);
    }

    return Object.keys(data as object).length > 0;
  }

  sanitizeData<T>(data: unknown): SanitizedData<T> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (data === null || data === undefined) {
      errors.push('Data is null or undefined');
      return { data: null as T, isValid: false, errors, warnings };
    }

    if (typeof data === 'object') {
      const sanitized = this.deepSanitize(data);
      return { data: sanitized as T, isValid: true, errors, warnings };
    }

    return { data: data as T, isValid: true, errors, warnings };
  }

  private deepSanitize(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepSanitize(item)).filter((item) => item !== null);
    }

    if (typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (value !== undefined) {
          sanitized[key] = this.deepSanitize(value);
        }
      }
      return sanitized;
    }

    return obj;
  }

  private async fetchFromAPI<T>(
    source: 'market' | 'dao',
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { timeout = 10000, retries = 3, retryDelay = 1000 } = options;
    const url = getAPI3Endpoint(
      source,
      endpoint as
        | 'dapis'
        | 'airnodes'
        | 'chains'
        | 'staking'
        | 'coverage'
        | 'governance'
        | 'token'
        | 'stats'
        | 'beacons'
        | 'templates'
    );

    const cacheKey = `api-${url}`;
    const pendingRequest = this.requestQueue.get(cacheKey);
    if (pendingRequest) {
      return pendingRequest as Promise<T>;
    }

    const request = this.executeWithRetry<T>(url, { timeout, retries, retryDelay });
    this.requestQueue.set(cacheKey, request);

    try {
      const result = await request;
      return result;
    } finally {
      this.requestQueue.delete(cacheKey);
    }
  }

  private async executeWithRetry<T>(
    url: string,
    options: { timeout: number; retries: number; retryDelay: number }
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < options.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < options.retries - 1) {
          await this.delay(options.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  private sanitizeDAPIData(data: unknown): DAPIMarketData[] {
    if (!Array.isArray(data)) {
      return getMockDAPIData();
    }
    return data.map((item: Record<string, unknown>) => ({
      id: String(item.id || ''),
      name: String(item.name || ''),
      symbol: String(item.symbol || ''),
      price: Number(item.price) || 0,
      change24h: Number(item.change24h) || 0,
      change24hPercent: Number(item.change24hPercent) || 0,
      chain: String(item.chain || 'ethereum'),
      updateFrequency: Number(item.updateFrequency) || 60,
      lastUpdated: new Date(),
      status: (item.status as 'active' | 'inactive' | 'degraded') || 'active',
    }));
  }

  private sanitizeChainData(data: unknown): ChainData[] {
    if (!Array.isArray(data)) {
      return [{ id: '1', name: 'Ethereum', dapiCount: 89, status: 'active' }];
    }
    return data.map((item: Record<string, unknown>) => ({
      id: String(item.id || ''),
      name: String(item.name || ''),
      dapiCount: Number(item.dapiCount) || 0,
      status: (item.status as 'active' | 'inactive') || 'active',
    }));
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const api3DataAggregator = new API3DataAggregator();
