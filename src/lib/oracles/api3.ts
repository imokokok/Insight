import type { QualityDataPoint } from '@/components/oracle/charts/DataQualityTrend';
import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import type { OHLCVDataPoint } from '@/lib/indicators';
import type { GasFeeData } from '@/types/comparison';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

import { getActiveAlerts, getAlertHistory, getAlertThresholds } from './api3/alertService';
import { getCoveragePoolEvents, getCoveragePoolClaims } from './api3/coveragePoolService';
import { getOEVNetworkStats, getOEVAuctions } from './api3/oevService';
import { getStakerRewards } from './api3/stakingService';
import { api3DataAggregator } from './api3DataAggregator';
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
  private dataCache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTTL = 60000;

  constructor(config?: OracleClientConfig) {
    super(config);
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

  private async fetchData<T>(
    dataFn: () => Promise<T>,
    cacheKey?: string
  ): Promise<T> {
    if (cacheKey) {
      const cached = this.getCached<T>(cacheKey);
      if (cached) return cached;
    }

    try {
      const data = await dataFn();
      if (cacheKey) this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.warn('Data fetch failed:', error);
      throw error;
    }
  }

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    if (!symbol) {
      throw this.createError('Symbol is required', 'INVALID_SYMBOL');
    }

    throw this.createError(
      'Direct price feeds are not available from API3. Please use the API3 data aggregator or market data service.',
      'API3_PRICE_NOT_AVAILABLE'
    );
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    if (!symbol) {
      throw this.createError('Symbol is required', 'INVALID_SYMBOL');
    }

    throw this.createError(
      'Historical prices are not available from API3. Please use a market data provider.',
      'API3_HISTORICAL_PRICES_NOT_AVAILABLE'
    );
  }

  async getAirnodeNetworkStats(): Promise<AirnodeNetworkStats> {
    return this.fetchData(
      async () => {
        const result = await api3DataAggregator.aggregateNetworkData();
        return result.data.airnodeStats;
      },
      'airnode-stats'
    );
  }

  async getDapiCoverage(): Promise<DAPICoverage> {
    return this.fetchData(
      async () => {
        const result = await api3DataAggregator.aggregateNetworkData();
        return result.data.dapiCoverage;
      },
      'dapi-coverage'
    );
  }

  async getStakingData(): Promise<StakingData> {
    return this.fetchData(
      async () => {
        const result = await api3DataAggregator.aggregateStakingData();
        return result.data;
      },
      'staking-data'
    );
  }

  async getFirstPartyOracleData(): Promise<FirstPartyOracleData> {
    return this.fetchData(
      async () => {
        const result = await api3DataAggregator.aggregateNetworkData();
        return result.data.firstPartyData;
      },
      'first-party-data'
    );
  }

  async getLatencyDistribution(): Promise<AnnotatedData<number[]>> {
    throw this.createError(
      'Latency distribution is not available from API3.',
      'API3_LATENCY_DISTRIBUTION_NOT_AVAILABLE'
    );
  }

  async getDataQualityMetrics(): Promise<{
    freshness: { lastUpdated: Date; updateInterval: number };
    completeness: { successCount: number; totalCount: number };
    reliability: { historicalAccuracy: number; responseSuccessRate: number; uptime: number };
  }> {
    throw this.createError(
      'Data quality metrics are not available from API3.',
      'API3_DATA_QUALITY_METRICS_NOT_AVAILABLE'
    );
  }

  async getDapiPriceDeviations(): Promise<DAPIPriceDeviation[]> {
    return this.fetchData(
      async () => {
        const result = await api3DataAggregator.aggregatePriceDeviations();
        return result.data;
      },
      'price-deviations'
    );
  }

  async getDataSourceTraceability(): Promise<DataSourceInfo[]> {
    return this.fetchData(
      async () => {
        const result = await api3DataAggregator.aggregateDataSources();
        return result.data;
      },
      'data-sources'
    );
  }

  async getCoveragePoolEvents(): Promise<AnnotatedData<CoveragePoolEvent[]>> {
    return getCoveragePoolEvents();
  }

  async getGasFeeData(): Promise<GasFeeData[]> {
    throw this.createError(
      'Gas fee data is not available from API3.',
      'API3_GAS_FEE_DATA_NOT_AVAILABLE'
    );
  }

  async getOHLCPrices(
    symbol: string,
    _chain?: Blockchain,
    period: number = 30
  ): Promise<AnnotatedData<OHLCVDataPoint[]>> {
    throw this.createError(
      'OHLC prices are not available from API3.',
      'API3_OHLC_PRICES_NOT_AVAILABLE'
    );
  }

  async getQualityHistory(): Promise<AnnotatedData<QualityDataPoint[]>> {
    throw this.createError(
      'Quality history is not available from API3.',
      'API3_QUALITY_HISTORY_NOT_AVAILABLE'
    );
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
    throw this.createError(
      'Cross-oracle comparison is not available from API3.',
      'API3_CROSS_ORACLE_COMPARISON_NOT_AVAILABLE'
    );
  }

  private async getCrossOracleComparisonInternal(): Promise<
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
    return this.fetchData(
      async () => {
        const result = await api3DataAggregator.aggregateCoveragePoolDetails();
        return result.data;
      },
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

  /**
   * 生成模拟价格数据
   */
  protected generateMockPrice(
    symbol: string,
    basePrice: number,
    chain?: Blockchain,
    timestamp?: number
  ): PriceData {
    return {
      provider: OracleProvider.API3,
      symbol: symbol.toUpperCase(),
      price: basePrice,
      timestamp: timestamp || Date.now(),
      decimals: 8,
      confidence: 0.95,
      change24h: 0,
      change24hPercent: 0,
      chain: chain || Blockchain.ETHEREUM,
      source: 'api3-mock',
    };
  }

  /**
   * 生成模拟历史价格数据
   */
  protected generateMockHistoricalPrices(
    symbol: string,
    basePrice: number,
    chain?: Blockchain,
    period: number = 24
  ): PriceData[] {
    const prices: PriceData[] = [];
    const now = Date.now();
    const interval = (period * 60 * 60 * 1000) / 100;

    for (let i = 99; i >= 0; i--) {
      const timestamp = now - i * interval;
      const volatility = 0.02;
      const randomChange = (Math.random() - 0.5) * 2 * volatility;
      const price = basePrice * (1 + randomChange);

      prices.push({
        provider: OracleProvider.API3,
        symbol: symbol.toUpperCase(),
        price: price,
        timestamp: timestamp,
        decimals: 8,
        confidence: 0.95,
        change24h: 0,
        change24hPercent: 0,
        chain: chain || Blockchain.ETHEREUM,
        source: 'api3-mock',
      });
    }

    return prices;
  }
}
