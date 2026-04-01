import type { QualityDataPoint } from '@/components/oracle/charts/DataQualityTrend';
import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import type { OHLCVDataPoint } from '@/lib/indicators';
import type { GasFeeData } from '@/types/comparison';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

import { getActiveAlerts, getAlertHistory, getAlertThresholds } from './api3/alertService';
import { getCoveragePoolEvents, getCoveragePoolClaims } from './api3/coveragePoolService';
import {
  getMockAirnodeNetworkStats,
  getMockDapiCoverage,
  getMockStakingData,
  getMockFirstPartyOracleData,
  getMockDapiPriceDeviations,
  getMockDataSourceTraceability,
  getMockCoveragePoolDetails,
} from './api3/mockData';
import { getOEVNetworkStats, getOEVAuctions } from './api3/oevService';
import { getStakerRewards } from './api3/stakingService';
import { api3DataAggregator } from './api3DataAggregator';
import { isMockDataEnabled } from './api3DataSources';
import { MOCK_DATA_STATUS } from './api3MockDataAnnotations';
import { BaseOracleClient } from './base';
import { api3Symbols } from './supportedSymbols';

import type {
  AnnotatedData,
  AirnodeNetworkStats,
  DAPICoverage,
  StakingData,
  FirstPartyOracleData,
  DAPIPriceDeviation,
  DataSourceInfo,
  CoveragePoolDetails,
  CoveragePoolEvent,
  OEVNetworkStats,
  OEVAuction,
  API3Alert,
  AlertThreshold,
  CoveragePoolClaim,
  StakerReward,
} from './api3/types';
import type { OracleClientConfig } from './base';

export type {
  AnnotatedData,
  API3Alert,
  AlertThreshold,
  DAPIPriceDeviation,
  DataSourceInfo,
  CoveragePoolEvent,
  CoveragePoolDetails,
  CoveragePoolClaim,
  StakerReward,
  AirnodeNetworkStats,
  DAPICoverage,
  StakingData,
  OEVAuction,
  OEVParticipant,
  OEVNetworkStats,
  FirstPartyOracleData,
} from './api3/types';

export class API3Client extends BaseOracleClient {
  name = OracleProvider.API3;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
  ];

  defaultUpdateIntervalMinutes = 1;
  private useRealData: boolean;
  private dataCache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTTL = 60000;

  constructor(config?: OracleClientConfig) {
    super(config);
    this.useRealData = !isMockDataEnabled();
  }

  private getCached<T>(key: string): T | null {
    const cached = this.dataCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: unknown): void {
    this.dataCache.set(key, { data, timestamp: Date.now() });
  }

  private async withFallback<T>(
    realDataFn: () => Promise<T>,
    mockDataFn: () => T | Promise<T>,
    cacheKey?: string
  ): Promise<T> {
    if (cacheKey) {
      const cached = this.getCached<T>(cacheKey);
      if (cached) return cached;
    }

    if (this.useRealData) {
      try {
        const data = await realDataFn();
        if (cacheKey) this.setCache(cacheKey, data);
        return data;
      } catch (error) {
        console.warn('Real data fetch failed, falling back to mock data:', error);
        const fallbackData = await mockDataFn();
        if (cacheKey) this.setCache(cacheKey, fallbackData);
        return fallbackData;
      }
    }

    const mockData = await mockDataFn();
    if (cacheKey) this.setCache(cacheKey, mockData);
    return mockData;
  }

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      if (!symbol) {
        throw this.createError('Symbol is required', 'INVALID_SYMBOL');
      }
      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;

      return this.fetchPriceWithDatabase(symbol, chain, () =>
        this.generateMockPrice(symbol, basePrice, chain)
      );
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from API3',
        'API3_ERROR'
      );
    }
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    try {
      if (!symbol) {
        throw this.createError('Symbol is required', 'INVALID_SYMBOL');
      }
      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;

      return this.fetchHistoricalPricesWithDatabase(symbol, chain, period, () =>
        this.generateMockHistoricalPrices(symbol, basePrice, chain, period)
      );
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch historical prices from API3',
        'API3_HISTORICAL_ERROR'
      );
    }
  }

  async getAirnodeNetworkStats(): Promise<AirnodeNetworkStats> {
    return this.withFallback(
      async () => {
        const result = await api3DataAggregator.aggregateNetworkData();
        return result.data.airnodeStats;
      },
      () => getMockAirnodeNetworkStats(),
      'airnode-stats'
    );
  }

  async getDapiCoverage(): Promise<DAPICoverage> {
    return this.withFallback(
      async () => {
        const result = await api3DataAggregator.aggregateNetworkData();
        return result.data.dapiCoverage;
      },
      () => getMockDapiCoverage(),
      'dapi-coverage'
    );
  }

  async getStakingData(): Promise<StakingData> {
    return this.withFallback(
      async () => {
        const result = await api3DataAggregator.aggregateStakingData();
        return result.data;
      },
      () => getMockStakingData(),
      'staking-data'
    );
  }

  async getFirstPartyOracleData(): Promise<FirstPartyOracleData> {
    return this.withFallback(
      async () => {
        const result = await api3DataAggregator.aggregateNetworkData();
        return result.data.firstPartyData;
      },
      () => getMockFirstPartyOracleData(),
      'first-party-data'
    );
  }

  async getLatencyDistribution(): Promise<AnnotatedData<number[]>> {
    const samples: number[] = [];
    const baseLatency = 180;
    for (let i = 0; i < 100; i++) {
      const variance = (Math.random() - 0.5) * 200;
      const spike = Math.random() > 0.95 ? Math.random() * 150 : 0;
      samples.push(Math.max(50, Math.round(baseLatency + variance + spike)));
    }
    return {
      data: samples,
      annotation: MOCK_DATA_STATUS.latencyDistribution,
    };
  }

  async getDataQualityMetrics(): Promise<{
    freshness: { lastUpdated: Date; updateInterval: number };
    completeness: { successCount: number; totalCount: number };
    reliability: { historicalAccuracy: number; responseSuccessRate: number; uptime: number };
  }> {
    return {
      freshness: {
        lastUpdated: new Date(),
        updateInterval: 60,
      },
      completeness: {
        successCount: 168,
        totalCount: 168,
      },
      reliability: {
        historicalAccuracy: 99.7,
        responseSuccessRate: 99.9,
        uptime: 99.7,
      },
    };
  }

  async getDapiPriceDeviations(): Promise<DAPIPriceDeviation[]> {
    return this.withFallback(
      async () => {
        const result = await api3DataAggregator.aggregatePriceDeviations();
        return result.data;
      },
      () => getMockDapiPriceDeviations(),
      'price-deviations'
    );
  }

  async getDataSourceTraceability(): Promise<DataSourceInfo[]> {
    return this.withFallback(
      async () => {
        const result = await api3DataAggregator.aggregateDataSources();
        return result.data;
      },
      () => getMockDataSourceTraceability(),
      'data-sources'
    );
  }

  async getCoveragePoolEvents(): Promise<AnnotatedData<CoveragePoolEvent[]>> {
    return getCoveragePoolEvents();
  }

  async getGasFeeData(): Promise<GasFeeData[]> {
    const now = Date.now();
    return [
      {
        oracle: OracleProvider.API3,
        chain: 'Ethereum',
        updateCost: 0.85,
        updateFrequency: 60,
        avgGasPrice: 25,
        lastUpdate: now,
      },
      {
        oracle: OracleProvider.API3,
        chain: 'Arbitrum',
        updateCost: 0.12,
        updateFrequency: 60,
        avgGasPrice: 0.5,
        lastUpdate: now,
      },
      {
        oracle: OracleProvider.API3,
        chain: 'Polygon',
        updateCost: 0.05,
        updateFrequency: 60,
        avgGasPrice: 30,
        lastUpdate: now,
      },
      {
        oracle: OracleProvider.API3,
        chain: 'Optimism',
        updateCost: 0.08,
        updateFrequency: 60,
        avgGasPrice: 0.3,
        lastUpdate: now,
      },
      {
        oracle: OracleProvider.API3,
        chain: 'Base',
        updateCost: 0.06,
        updateFrequency: 60,
        avgGasPrice: 0.2,
        lastUpdate: now,
      },
      {
        oracle: OracleProvider.API3,
        chain: 'Avalanche',
        updateCost: 0.04,
        updateFrequency: 60,
        avgGasPrice: 25,
        lastUpdate: now,
      },
    ];
  }

  async getOHLCPrices(
    symbol: string,
    _chain?: Blockchain,
    period: number = 30
  ): Promise<AnnotatedData<OHLCVDataPoint[]>> {
    if (!symbol) {
      throw this.createError('Symbol is required', 'INVALID_SYMBOL');
    }
    const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;
    const prices: OHLCVDataPoint[] = [];
    const now = Date.now();
    const interval = 24 * 60 * 60 * 1000;

    for (let i = period; i >= 0; i--) {
      const timestamp = now - i * interval;
      const randomChange = (Math.random() - 0.5) * 0.05;
      const price = basePrice * (1 + randomChange);
      const volatility = basePrice * 0.02;

      const highOffset = volatility * Math.random();
      const lowOffset = volatility * Math.random();
      const high = price + Math.max(highOffset, lowOffset);
      const low = price - Math.max(highOffset, lowOffset);

      prices.push({
        timestamp,
        price,
        high,
        low,
        close: price,
      });
    }

    return {
      data: prices,
      annotation: MOCK_DATA_STATUS.ohlcPrices,
    };
  }

  async getQualityHistory(): Promise<AnnotatedData<QualityDataPoint[]>> {
    const history: QualityDataPoint[] = [];
    const now = Date.now();
    const interval = 60 * 60 * 1000;

    for (let i = 24; i >= 0; i--) {
      const timestamp = now - i * interval;
      const baseLatency = 180;
      const latencyVariance = (Math.random() - 0.5) * 100;

      history.push({
        timestamp,
        updateLatency: Math.max(50, Math.round(baseLatency + latencyVariance)),
        deviationFromMedian: (Math.random() - 0.5) * 0.5,
        isOutlier: Math.random() > 0.95,
        isStale: Math.random() > 0.98,
        heartbeatCompliance: 0.95 + Math.random() * 0.05,
      });
    }

    return {
      data: history,
      annotation: MOCK_DATA_STATUS.qualityHistory,
    };
  }

  async getCrossOracleComparison(): Promise<
    {
      oracle: OracleProvider;
      responseTime: number;
      accuracy: number;
      availability: number;
      costEfficiency: number;
      updateFrequency: number;
    }[]
  > {
    return [
      {
        oracle: OracleProvider.API3,
        responseTime: 180,
        accuracy: 99.7,
        availability: 99.7,
        costEfficiency: 85,
        updateFrequency: 60,
      },
      {
        oracle: OracleProvider.CHAINLINK,
        responseTime: 220,
        accuracy: 99.8,
        availability: 99.9,
        costEfficiency: 70,
        updateFrequency: 3600,
      },
      {
        oracle: OracleProvider.PYTH,
        responseTime: 150,
        accuracy: 99.6,
        availability: 99.5,
        costEfficiency: 90,
        updateFrequency: 60,
      },
      {
        oracle: OracleProvider.BAND_PROTOCOL,
        responseTime: 250,
        accuracy: 99.4,
        availability: 99.2,
        costEfficiency: 75,
        updateFrequency: 1800,
      },
      {
        oracle: OracleProvider.UMA,
        responseTime: 300,
        accuracy: 99.5,
        availability: 98.8,
        costEfficiency: 80,
        updateFrequency: 7200,
      },
    ];
  }

  async getOEVNetworkStats(): Promise<AnnotatedData<OEVNetworkStats>> {
    return getOEVNetworkStats();
  }

  async getOEVAuctions(limit: number = 20): Promise<OEVAuction[]> {
    return getOEVAuctions(limit);
  }

  async getActiveAlerts(): Promise<API3Alert[]> {
    return getActiveAlerts();
  }

  async getAlertHistory(limit: number = 20): Promise<API3Alert[]> {
    return getAlertHistory(limit);
  }

  async getAlertThresholds(): Promise<AlertThreshold[]> {
    return getAlertThresholds();
  }

  async getCoveragePoolDetails(): Promise<CoveragePoolDetails> {
    return this.withFallback(
      async () => {
        const result = await api3DataAggregator.aggregateCoveragePoolDetails();
        return result.data;
      },
      () => getMockCoveragePoolDetails(),
      'coverage-pool-details'
    );
  }

  async getCoveragePoolClaims(status?: string): Promise<CoveragePoolClaim[]> {
    return getCoveragePoolClaims(status);
  }

  async getStakerRewards(address?: string): Promise<StakerReward[]> {
    return getStakerRewards(address);
  }

  getSupportedSymbols(): string[] {
    return [...api3Symbols];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const isSymbolInList = api3Symbols.includes(
      symbol.toUpperCase() as (typeof api3Symbols)[number]
    );
    if (!isSymbolInList) {
      return false;
    }
    if (chain !== undefined) {
      return this.supportedChains.includes(chain);
    }
    return true;
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    if (!this.isSymbolSupported(symbol)) {
      return [];
    }
    return this.supportedChains;
  }
}
