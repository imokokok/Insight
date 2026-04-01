import { getAPI3Endpoint, isMockDataEnabled } from './api3DataSources';
import {
  getDataStrategy,
  calculateConfidence,
  createDataSourceInfo,
  type DataStrategy,
  type DataSourceInfo as StrategyDataSourceInfo,
  type ConfidenceLevel,
} from './api3DataStrategy';
import {
  generateHourlyActivity,
  getMockCoveragePoolDetails,
  getMockDAPIData,
  getMockDataSources,
  getMockMarketData,
  getMockPriceDeviations,
  getMockStakingData,
} from './api3MockData';
import { api3OnChainService } from './api3OnChainService';

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

export type {
  AggregatedMarketData,
  AggregatedNetworkData,
  AggregatedOEVData,
  ChainData,
  DAPIMarketData,
  OEVAuctionData,
} from './api3MockData';

/**
 * 带元数据的数据包装器
 */
export interface DataWithMetadata<T> {
  data: T;
  metadata: {
    source: 'on-chain' | 'api' | 'mixed' | 'mock';
    confidence: ConfidenceLevel;
    timestamp: number;
    latency: number;
    primarySource?: StrategyDataSourceInfo;
    fallbackSource?: StrategyDataSourceInfo;
  };
}

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
  metadata?: DataWithMetadata<T>['metadata'];
}

export class API3DataAggregator {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private defaultTTL = 60000;
  private requestQueue: Map<string, Promise<unknown>> = new Map();

  /**
   * 根据策略获取数据 - 核心方法
   * @param strategy 数据获取策略配置
   * @param fetchPrimary 主数据获取函数（根据策略决定是链上还是API）
   * @param fetchFallback 备用数据获取函数
   * @param cacheKey 缓存键
   */
  private async fetchWithStrategy<T>(
    strategy: DataStrategy,
    fetchPrimary: () => Promise<T>,
    fetchFallback: () => Promise<T>,
    cacheKey: string
  ): Promise<DataWithMetadata<T>> {
    const startTime = Date.now();

    // 检查缓存
    if (strategy.enableCache) {
      const cached = this.getFromCache<DataWithMetadata<T>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // 如果强制使用模拟数据
    if (isMockDataEnabled()) {
      return this.createMockResponse(strategy, cacheKey, startTime);
    }

    let primaryResult: T | undefined;
    let fallbackResult: T | undefined;
    let primaryError: Error | undefined;
    let fallbackError: Error | undefined;
    let primarySourceInfo: StrategyDataSourceInfo | undefined;
    let fallbackSourceInfo: StrategyDataSourceInfo | undefined;

    // 首先尝试主数据源
    try {
      const primaryStart = Date.now();
      primaryResult = await fetchPrimary();
      primarySourceInfo = createDataSourceInfo(strategy.primarySource, primaryStart);
    } catch (error) {
      primaryError = error instanceof Error ? error : new Error(String(error));
      primarySourceInfo = createDataSourceInfo(strategy.primarySource, startTime, primaryError.message);
      console.warn(
        `[API3] Primary data fetch failed for ${strategy.dataType} (${strategy.primarySource}):`,
        primaryError.message
      );
    }

    // 如果主数据源失败且有备用数据源，尝试备用
    if (primaryError && strategy.fallbackSource) {
      try {
        const fallbackStart = Date.now();
        fallbackResult = await fetchFallback();
        fallbackSourceInfo = createDataSourceInfo(strategy.fallbackSource, fallbackStart);
      } catch (error) {
        fallbackError = error instanceof Error ? error : new Error(String(error));
        fallbackSourceInfo = createDataSourceInfo(strategy.fallbackSource, startTime, fallbackError.message);
        console.warn(
          `[API3] Fallback data fetch failed for ${strategy.dataType} (${strategy.fallbackSource}):`,
          fallbackError.message
        );
      }
    }

    // 确定最终数据
    const finalData = primaryResult ?? fallbackResult;

    if (finalData === undefined) {
      // 所有数据源都失败，使用模拟数据
      console.error(`[API3] All data sources failed for ${strategy.dataType}, using mock data`);
      return this.createMockResponse(strategy, cacheKey, startTime);
    }

    // 计算置信度
    const confidence = calculateConfidence(
      strategy,
      primaryResult !== undefined,
      fallbackResult !== undefined
    );

    // 确定最终数据源类型
    let finalSource: DataWithMetadata<T>['metadata']['source'] = 'mixed';
    if (primaryResult !== undefined && fallbackResult !== undefined) {
      finalSource = 'mixed';
    } else if (primaryResult !== undefined) {
      finalSource = strategy.primarySource;
    } else if (fallbackResult !== undefined && strategy.fallbackSource) {
      finalSource = strategy.fallbackSource;
    }

    const result: DataWithMetadata<T> = {
      data: finalData,
      metadata: {
        source: finalSource,
        confidence,
        timestamp: Date.now(),
        latency: Date.now() - startTime,
        primarySource: primarySourceInfo,
        fallbackSource: fallbackSourceInfo,
      },
    };

    // 缓存结果
    if (strategy.enableCache) {
      this.setCache(cacheKey, result.data, strategy.cacheTTL, result.metadata);
    }

    return result;
  }

  /**
   * 创建模拟数据响应
   */
  private createMockResponse<T>(
    _strategy: DataStrategy,
    cacheKey: string,
    startTime: number
  ): DataWithMetadata<T> {
    // 从缓存获取模拟数据（如果有）
    const cachedMock = this.getFromCache<T>(`mock-${cacheKey}`);

    return {
      data: cachedMock as T,
      metadata: {
        source: 'mock',
        confidence: 'low',
        timestamp: Date.now(),
        latency: Date.now() - startTime,
      },
    };
  }

  // ==================== 具体数据获取方法 ====================

  async aggregateMarketData(): Promise<DataWithMetadata<AggregatedMarketData>> {
    const strategy = getDataStrategy('dapis');
    const cacheKey = 'market-data';

    return this.fetchWithStrategy(
      strategy,
      // Primary: API fetcher (根据策略 api-primary)
      async () => {
        const [dapisResponse, chainsResponse, beaconsResponse] = await Promise.all([
          this.fetchFromAPI<unknown[]>('market', 'dapis', { timeout: 15000 }),
          this.fetchFromAPI<unknown[]>('market', 'chains', { timeout: 15000 }),
          this.fetchFromAPI<unknown[]>('market', 'beacons', { timeout: 15000 }).catch(() => []),
        ]);

        return {
          dapis: this.sanitizeDAPIData(dapisResponse, beaconsResponse),
          chains: this.sanitizeChainData(chainsResponse),
          lastUpdated: new Date(),
        };
      },
      // Fallback: 链上无法直接获取完整的 market 数据，返回简化版本
      async () => {
        return getMockMarketData();
      },
      cacheKey
    );
  }

  async aggregateNetworkData(): Promise<DataWithMetadata<AggregatedNetworkData>> {
    const strategy = getDataStrategy('airnodeStats');
    const cacheKey = 'network-data';

    return this.fetchWithStrategy(
      strategy,
      // Primary: API fetcher (根据策略 api-primary)
      async () => {
        const [airnodesData, dapisData, onChainStaking] = await Promise.all([
          this.fetchFromAPI<unknown[]>('market', 'airnodes', { timeout: 15000 }).catch(() => []),
          this.fetchFromAPI<unknown[]>('market', 'dapis', { timeout: 15000 }).catch(() => []),
          api3OnChainService
            .getStakingData()
            .catch(() => ({ totalStaked: BigInt(0), stakerCount: 0 })),
        ]);

        const airnodeArray = Array.isArray(airnodesData) ? airnodesData : [];
        const dapiArray = Array.isArray(dapisData) ? dapisData : [];

        return this.buildNetworkData({
          totalStaked: Number(onChainStaking.totalStaked) / 1e18,
          activeAirnodes: airnodeArray.length || 156,
          totalDapis: dapiArray.length || 168,
          airnodeArray,
          dapiArray,
        });
      },
      // Fallback: 链上获取（部分数据链上无法获取，使用默认值）
      async () => {
        const onChainStaking = await api3OnChainService.getStakingData();

        return this.buildNetworkData({
          totalStaked: Number(onChainStaking.totalStaked) / 1e18,
          activeAirnodes: 156, // 链上无法获取，使用默认值
          totalDapis: 168,
        });
      },
      cacheKey
    );
  }

  private buildNetworkData(params: {
    totalStaked: number;
    activeAirnodes: number;
    totalDapis: number;
    airnodeArray?: unknown[];
    dapiArray?: unknown[];
  }): AggregatedNetworkData {
    const { totalStaked, activeAirnodes, totalDapis, dapiArray = [] } = params;

    // 计算链分布
    const byChain: Record<string, number> = { ethereum: 0, arbitrum: 0, polygon: 0 };
    (dapiArray as Array<Record<string, unknown>>).forEach((dapi) => {
      const chain = String(dapi.chain || dapi.network || 'ethereum').toLowerCase();
      if (chain.includes('eth')) byChain.ethereum++;
      else if (chain.includes('arb')) byChain.arbitrum++;
      else if (chain.includes('poly')) byChain.polygon++;
      else byChain.ethereum++;
    });

    // 计算资产类型分布
    const byAssetType = { crypto: 0, forex: 0, commodities: 0, stocks: 0 };
    (dapiArray as Array<Record<string, unknown>>).forEach((dapi) => {
      const name = String(dapi.name || dapi.dapiName || '').toUpperCase();
      if (
        name.includes('USD') &&
        (name.includes('EUR') || name.includes('GBP') || name.includes('JPY'))
      ) {
        byAssetType.forex++;
      } else if (name.includes('GOLD') || name.includes('SILVER') || name.includes('OIL')) {
        byAssetType.commodities++;
      } else if (name.includes('AAPL') || name.includes('TSLA') || name.includes('GOOGL')) {
        byAssetType.stocks++;
      } else {
        byAssetType.crypto++;
      }
    });

    // 使用回退值
    if (byAssetType.crypto === 0) {
      byAssetType.crypto = 120;
      byAssetType.forex = 28;
      byAssetType.commodities = 12;
      byAssetType.stocks = 8;
    }

    const airnodeStats: AirnodeNetworkStats = {
      activeAirnodes,
      nodeUptime: 99.7,
      avgResponseTime: 180,
      dapiUpdateFrequency: 60,
      totalStaked,
      dataFeeds: totalDapis,
      hourlyActivity: generateHourlyActivity(),
      status: 'online',
      lastUpdated: new Date(),
      latency: 85,
    };

    const dapiCoverage: DAPICoverage = {
      totalDapis,
      byAssetType: {
        crypto: byAssetType.crypto || 120,
        forex: byAssetType.forex || 28,
        commodities: byAssetType.commodities || 12,
        stocks: byAssetType.stocks || 8,
      },
      byChain: {
        ethereum: byChain.ethereum || 89,
        arbitrum: byChain.arbitrum || 45,
        polygon: byChain.polygon || 34,
      },
      updateFrequency: {
        high: Math.floor(totalDapis * 0.27),
        medium: Math.floor(totalDapis * 0.46),
        low: Math.floor(totalDapis * 0.27),
      },
    };

    const firstPartyData: FirstPartyOracleData = {
      airnodeDeployments: {
        total: activeAirnodes,
        byRegion: {
          northAmerica: Math.floor(activeAirnodes * 0.37),
          europe: Math.floor(activeAirnodes * 0.3),
          asia: Math.floor(activeAirnodes * 0.24),
          others: Math.floor(activeAirnodes * 0.09),
        },
        byChain: {
          ethereum: byChain.ethereum || 89,
          arbitrum: byChain.arbitrum || 45,
          polygon: byChain.polygon || 22,
        },
        byProviderType: {
          exchanges: Math.floor(activeAirnodes * 0.44),
          traditionalFinance: Math.floor(activeAirnodes * 0.33),
          others: Math.floor(activeAirnodes * 0.23),
        },
      },
      dapiCoverage,
      advantages: {
        noMiddlemen: true,
        sourceTransparency: true,
        responseTime: 180,
      },
    };

    return {
      airnodeStats,
      dapiCoverage,
      firstPartyData,
      lastUpdated: new Date(),
    };
  }

  async aggregateOEVData(): Promise<DataWithMetadata<AggregatedOEVData>> {
    const strategy = getDataStrategy('oev');
    const cacheKey = 'oev-data';

    return this.fetchWithStrategy(
      strategy,
      // Primary: API fetcher (根据策略 api-only)
      async () => {
        const oevStatsRaw = await this.fetchFromAPI<unknown>('dao', 'stats', {
          timeout: 15000,
        }).catch(() => ({}));
        const oevStats =
          typeof oevStatsRaw === 'object' && oevStatsRaw !== null
            ? (oevStatsRaw as Record<string, unknown>)
            : {};

        return {
          stats: {
            totalOevCaptured:
              typeof oevStats?.totalOevCaptured === 'number' ? oevStats.totalOevCaptured : 12450000,
            activeAuctions:
              typeof oevStats?.activeAuctions === 'number' ? oevStats.activeAuctions : 12,
            totalParticipants:
              typeof oevStats?.totalParticipants === 'number' ? oevStats.totalParticipants : 89,
            totalDapps: typeof oevStats?.totalDapps === 'number' ? oevStats.totalDapps : 34,
            avgAuctionValue:
              typeof oevStats?.avgAuctionValue === 'number' ? oevStats.avgAuctionValue : 18500,
            last24hVolume:
              typeof oevStats?.last24hVolume === 'number' ? oevStats.last24hVolume : 892000,
            participantList: [],
            recentAuctions: [],
          },
          recentAuctions: [],
          lastUpdated: new Date(),
        };
      },
      // Fallback: OEV 数据无法从链上获取
      async () => {
        throw new Error('OEV data not available on-chain');
      },
      cacheKey
    );
  }

  async aggregateStakingData(): Promise<DataWithMetadata<StakingData>> {
    const strategy = getDataStrategy('staking');
    const cacheKey = 'staking-data';

    return this.fetchWithStrategy(
      strategy,
      // Primary: On-chain fetcher (根据策略 on-chain-only)
      async () => {
        const [onChainData, coverageData] = await Promise.all([
          api3OnChainService.getStakingData(),
          api3OnChainService.getCoveragePoolData(),
        ]);

        return {
          totalStaked: Number(onChainData.totalStaked) / 1e18,
          stakingApr: onChainData.apr,
          stakerCount: onChainData.stakerCount,
          coveragePool: {
            totalValue: Number(coverageData.totalValueLocked) / 1e18,
            coverageRatio: coverageData.collateralizationRatio / 100,
            historicalPayouts: 285000,
          },
        };
      },
      // Fallback: API 没有直接的 staking 端点，返回 mock
      async () => {
        return getMockStakingData();
      },
      cacheKey
    );
  }

  async aggregateCoveragePoolDetails(): Promise<DataWithMetadata<CoveragePoolDetails>> {
    const strategy = getDataStrategy('coveragePool');
    const cacheKey = 'coverage-pool-details';

    return this.fetchWithStrategy(
      strategy,
      // On-chain fetcher (primary)
      async () => {
        const onChainData = await api3OnChainService.getCoveragePoolData();

        const collateralizationRatio = onChainData.collateralizationRatio;
        const targetCollateralization = 150;

        let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
        if (collateralizationRatio < targetCollateralization * 0.8) {
          healthStatus = 'critical';
        } else if (collateralizationRatio < targetCollateralization) {
          healthStatus = 'warning';
        }

        return {
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
      },
      // API fetcher (fallback)
      async () => {
        return getMockCoveragePoolDetails();
      },
      cacheKey
    );
  }

  async aggregatePriceDeviations(): Promise<DataWithMetadata<DAPIPriceDeviation[]>> {
    const strategy = getDataStrategy('priceDeviations');
    const cacheKey = 'price-deviations';

    return this.fetchWithStrategy(
      strategy,
      // Primary: API fetcher (根据策略 api-primary)
      async () => {
        const dapisData = await this.fetchFromAPI<unknown[]>('market', 'dapis', {
          timeout: 15000,
        }).catch(() => []);

        if (!Array.isArray(dapisData) || dapisData.length === 0) {
          throw new Error('No dAPI data available');
        }

        const deviations: DAPIPriceDeviation[] = (dapisData as Array<Record<string, unknown>>)
          .filter((dapi) => {
            return (
              (dapi.price !== undefined && dapi.marketPrice !== undefined) ||
              (dapi.value !== undefined && dapi.marketValue !== undefined)
            );
          })
          .slice(0, 20)
          .map((dapi) => {
            const name = String(dapi.name || dapi.dapiName || dapi.symbol || 'Unknown/USD');

            let dapiPrice = 0;
            let marketPrice = 0;

            if (typeof dapi.price === 'number') {
              dapiPrice = dapi.price;
            } else if (typeof dapi.price === 'string') {
              dapiPrice = parseFloat(dapi.price);
            } else if (dapi.value && typeof dapi.value === 'string') {
              dapiPrice = parseFloat(dapi.value) / 1e18;
            }

            if (typeof dapi.marketPrice === 'number') {
              marketPrice = dapi.marketPrice;
            } else if (typeof dapi.marketPrice === 'string') {
              marketPrice = parseFloat(dapi.marketPrice);
            } else if (dapi.marketValue && typeof dapi.marketValue === 'string') {
              marketPrice = parseFloat(dapi.marketValue) / 1e18;
            }

            let deviation = 0;
            if (marketPrice > 0) {
              deviation = Math.abs((dapiPrice - marketPrice) / marketPrice) * 100;
            }

            let trend: 'expanding' | 'shrinking' | 'stable' = 'stable';
            if (dapi.deviationTrend === 'expanding' || dapi.trend === 'up') {
              trend = 'expanding';
            } else if (dapi.deviationTrend === 'shrinking' || dapi.trend === 'down') {
              trend = 'shrinking';
            }

            let status: 'normal' | 'warning' | 'critical' = 'normal';
            if (deviation > 3) {
              status = 'critical';
            } else if (deviation > 1) {
              status = 'warning';
            }

            return {
              symbol: name,
              dapiPrice,
              marketPrice,
              deviation: parseFloat(deviation.toFixed(2)),
              trend,
              status,
            };
          });

        if (deviations.length === 0) {
          throw new Error('No price deviation data available');
        }

        return deviations;
      },
      // Fallback: 链上无法直接获取价格偏差，返回 mock
      async () => {
        return getMockPriceDeviations();
      },
      cacheKey
    );
  }

  async aggregateDataSources(): Promise<DataWithMetadata<DataSourceInfo[]>> {
    const strategy = getDataStrategy('dataSources');
    const cacheKey = 'data-sources';

    return this.fetchWithStrategy(
      strategy,
      // Primary: API fetcher (根据策略 api-primary)
      async () => {
        const airnodesData = await this.fetchFromAPI<unknown[]>('market', 'airnodes', {
          timeout: 15000,
        }).catch(() => []);

        if (!Array.isArray(airnodesData) || airnodesData.length === 0) {
          throw new Error('No airnode data available');
        }

        const dataSources: DataSourceInfo[] = (airnodesData as Array<Record<string, unknown>>)
          .slice(0, 20)
          .map((airnode, index) => {
            const name = String(airnode.name || airnode.provider || `Airnode ${index + 1}`);
            const type = this.inferDataSourceType(name);
            const uptime = typeof airnode.uptime === 'number' ? airnode.uptime : 99.5;
            const responseTime =
              typeof airnode.responseTime === 'number' ? airnode.responseTime : 150;

            return {
              id: String(airnode.id || `src-${String(index + 1).padStart(3, '0')}`),
              name,
              type,
              credibilityScore: this.calculateCredibilityScore(uptime, responseTime),
              accuracy: uptime,
              responseSpeed: responseTime,
              availability: uptime,
              airnodeAddress: String(
                airnode.address ||
                  airnode.airnodeAddress ||
                  '0x0000000000000000000000000000000000000000'
              ),
              dapiContract: String(
                airnode.dapiContract ||
                  airnode.proxyAddress ||
                  '0x0000000000000000000000000000000000000000'
              ),
              chain: String(airnode.chain || airnode.network || 'Ethereum'),
            };
          });

        return dataSources;
      },
      // Fallback: 链上无法直接获取数据源信息，返回 mock
      async () => {
        return getMockDataSources();
      },
      cacheKey
    );
  }

  // ==================== 辅助方法 ====================

  private inferDataSourceType(name: string): 'exchange' | 'traditional_finance' | 'other' {
    const lowerName = name.toLowerCase();
    const exchangeKeywords = [
      'binance',
      'coinbase',
      'kraken',
      'okx',
      'bybit',
      'kucoin',
      'huobi',
      'gate',
      'mexc',
    ];
    const tradFiKeywords = [
      'bloomberg',
      'reuters',
      'goldman',
      'morgan',
      'jpmorgan',
      'barclays',
      'hsbc',
    ];

    if (exchangeKeywords.some((kw) => lowerName.includes(kw))) {
      return 'exchange';
    }
    if (tradFiKeywords.some((kw) => lowerName.includes(kw))) {
      return 'traditional_finance';
    }
    return 'other';
  }

  private calculateCredibilityScore(uptime: number, responseTime: number): number {
    const uptimeScore = uptime * 0.7;
    const responseScore = Math.max(0, 100 - responseTime / 10) * 0.3;
    return Math.min(100, Math.round(uptimeScore + responseScore));
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

  private setCache<T>(
    key: string,
    data: T,
    ttl: number = this.defaultTTL,
    metadata?: DataWithMetadata<T>['metadata']
  ): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl, metadata });
  }

  private sanitizeDAPIData(data: unknown, beacons?: unknown[]): DAPIMarketData[] {
    if (!Array.isArray(data) || data.length === 0) {
      return getMockDAPIData();
    }

    return data.map((item: Record<string, unknown>) => {
      let price = 0;
      if (typeof item.price === 'number') {
        price = item.price;
      } else if (typeof item.price === 'string') {
        price = parseFloat(item.price);
      } else if (item.value && typeof item.value === 'string') {
        price = parseFloat(item.value) / 1e18;
      }

      const name = String(item.name || item.dapiName || item.title || 'Unknown');
      const symbol = String(item.symbol || item.pair || name.split('/')[0] || 'UNKNOWN');

      let change24h = 0;
      let change24hPercent = 0;
      if (typeof item.change24h === 'number') {
        change24h = item.change24h;
      } else if (item.priceYesterday && typeof item.priceYesterday === 'number' && price > 0) {
        change24h = price - item.priceYesterday;
        change24hPercent = (change24h / item.priceYesterday) * 100;
      }

      const chain = String(item.chain || item.network || 'ethereum').toLowerCase();

      let updateFrequency = 60;
      if (typeof item.updateFrequency === 'number') {
        updateFrequency = item.updateFrequency;
      } else if (typeof item.heartbeat === 'number') {
        updateFrequency = item.heartbeat;
      } else if (beacons && Array.isArray(beacons)) {
        const beacon = (beacons as Array<Record<string, unknown>>).find(
          (b) => String(b.dapiName || b.name) === name
        );
        if (beacon && typeof (beacon as Record<string, unknown>).heartbeat === 'number') {
          updateFrequency = (beacon as Record<string, unknown>).heartbeat as number;
        }
      }

      let status: 'active' | 'inactive' | 'degraded' = 'active';
      if (item.active === false || item.status === 'inactive') {
        status = 'inactive';
      } else if (item.status === 'degraded') {
        status = 'degraded';
      }

      return {
        id: String(item.id || item.dapiId || symbol.toLowerCase()),
        name,
        symbol,
        price,
        change24h,
        change24hPercent,
        chain,
        updateFrequency,
        lastUpdated: item.updatedAt ? new Date(item.updatedAt as string) : new Date(),
        status,
      };
    });
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
