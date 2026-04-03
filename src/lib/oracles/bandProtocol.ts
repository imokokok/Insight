import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

import { bandRpcService } from './bandProtocol/bandRpcService';
import {
  generateAllDataSources,
  generateBandMarketData,
  generateValidators,
  generateNetworkStats,
  generateCrossChainStats,
  generateCrossChainTrend,
  generateHistoricalBandPrices,
} from './bandProtocol/mockData';
import { EventType, EVENT_TYPE_VALUES } from './bandProtocol/types';
import {
  calculateTechnicalIndicators,
  seededRandom,
  globalSeed,
  dataCache,
} from './bandProtocol/utils';
import { BaseOracleClient } from './base';
import { bandProtocolSymbols } from './supportedSymbols';

import type {
  BandProtocolMarketData,
  ValidatorInfo,
  BandNetworkStats,
  CrossChainStats,
  CrossChainTrend,
  TrendPeriod,
  HistoricalPricePoint,
  ValidatorHistory,
  HistoryPeriod,
  BandCrossChainSnapshot,
  CrossChainPriceComparison,
  ChainEvent,
  OracleScript,
  IBCConnection,
  IBCTransferStats,
  IBCTransferTrend,
  StakingInfo,
  StakingDistribution,
  StakingReward,
  RiskMetrics,
  RiskTrendData,
  RiskEvent,
  GovernanceProposal,
  ProposalStatus,
  GovernanceParams,
  DataSource,
  DataSourceListResponse,
  PriceFeed,
  IBCRelayer,
} from './bandProtocol/types';
import type { OracleClientConfig } from './base';

export * from './bandProtocol/types';
export {
  calculateMovingAverage,
  calculateStandardDeviation,
  calculateTechnicalIndicators,
} from './bandProtocol/utils';

export interface BandProtocolClientConfig extends OracleClientConfig {
  useRealData?: boolean;
  rpcUrl?: string;
  restUrl?: string;
}

export class BandProtocolClient extends BaseOracleClient {
  name = OracleProvider.BAND_PROTOCOL;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.COSMOS,
    Blockchain.OSMOSIS,
    Blockchain.JUNO,
  ];

  defaultUpdateIntervalMinutes = 30;

  private useRealData: boolean;

  constructor(config?: BandProtocolClientConfig) {
    super(config);
    this.useRealData = config?.useRealData ?? true; // Default to real data
  }

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      // For price data, we still use the base prices as Band RPC doesn't provide real-time prices
      // In production, you might want to integrate with CoinGecko or other price API
      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;

      return this.fetchPriceWithDatabase(symbol, chain, () =>
        this.generateMockPrice(symbol, basePrice, chain)
      );
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from Band Protocol',
        'BAND_PROTOCOL_ERROR'
      );
    }
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    try {
      // 使用 CoinGecko 获取真实历史数据
      const { coinGeckoMarketService } = await import('@/lib/services/marketData/coinGeckoMarketService');
      const days = Math.ceil(period / 24);
      const coinGeckoPrices = await coinGeckoMarketService.getHistoricalPrices(symbol, days);

      if (coinGeckoPrices && coinGeckoPrices.length > 0) {
        console.log(`[BandProtocolClient] Using CoinGecko real historical data for ${symbol}, got ${coinGeckoPrices.length} points`);
        return coinGeckoPrices.map((point) => ({
          provider: this.name,
          chain: chain || Blockchain.ETHEREUM,
          symbol,
          price: point.price,
          timestamp: point.timestamp,
          decimals: 8,
          confidence: 0.95,
          source: 'coingecko-api',
        }));
      }

      // 回退到模拟数据
      console.warn(`[BandProtocolClient] Falling back to mock historical data for ${symbol}`);
      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;
      return this.fetchHistoricalPricesWithDatabase(symbol, chain, period, () =>
        this.generateMockHistoricalPrices(symbol, basePrice, chain, period)
      );
    } catch (error) {
      console.error(`[BandProtocolClient] Failed to fetch historical prices for ${symbol}:`, error);
      // 出错时回退到模拟数据
      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;
      return this.fetchHistoricalPricesWithDatabase(symbol, chain, period, () =>
        this.generateMockHistoricalPrices(symbol, basePrice, chain, period)
      );
    }
  }

  async getDataSourceList(page: number = 1, limit: number = 20): Promise<DataSourceListResponse> {
    try {
      if (this.useRealData) {
        const allDataSources = await bandRpcService.getDataSources(page * limit);
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedSources = allDataSources.slice(start, end);

        return {
          dataSources: paginatedSources,
          total: allDataSources.length,
          hasMore: end < allDataSources.length,
        };
      }

      // Fallback to mock data
      const allDataSources = await this.generateAllDataSources();
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedSources = allDataSources.slice(start, end);

      return {
        dataSources: paginatedSources,
        total: allDataSources.length,
        hasMore: end < allDataSources.length,
      };
    } catch (error) {
      // If real data fails, fall back to mock data
      if (this.useRealData && this.config.fallbackToMock) {
        const allDataSources = await this.generateAllDataSources();
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedSources = allDataSources.slice(start, end);

        return {
          dataSources: paginatedSources,
          total: allDataSources.length,
          hasMore: end < allDataSources.length,
        };
      }

      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch data sources',
        'DATA_SOURCES_ERROR'
      );
    }
  }

  async getPriceFeeds(): Promise<PriceFeed[]> {
    try {
      const dataSources = await this.getDataSourceList(1, 100);
      return dataSources.dataSources
        .filter((ds) => ds.price !== undefined)
        .map((ds) => ({
          symbol: ds.symbol,
          price: ds.price!,
          change24h: ds.change24h!,
          change24hPercent:
            ds.change24h !== undefined && ds.price !== undefined
              ? (ds.change24h / ds.price) * 100
              : 0,
          lastUpdated: ds.lastUpdated,
          dataSource: ds.provider,
          confidence: ds.reliability / 100,
          category: ds.category,
        }));
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price feeds',
        'PRICE_FEEDS_ERROR'
      );
    }
  }

  private async generateAllDataSources(): Promise<DataSource[]> {
    return generateAllDataSources(() => this.generateRandomAddress());
  }

  async getBandMarketData(): Promise<BandProtocolMarketData> {
    try {
      if (this.useRealData) {
        return await bandRpcService.getMarketData();
      }
      return generateBandMarketData();
    } catch (error) {
      if (this.useRealData && this.config.fallbackToMock) {
        return generateBandMarketData();
      }
      throw error;
    }
  }

  async getValidators(limit: number = 50): Promise<ValidatorInfo[]> {
    try {
      if (this.useRealData) {
        return await bandRpcService.getValidators(limit);
      }
      return generateValidators(
        limit,
        () => this.generateRandomAddress(),
        (length) => this.generateRandomHex(length)
      );
    } catch (error) {
      if (this.useRealData && this.config.fallbackToMock) {
        return generateValidators(
          limit,
          () => this.generateRandomAddress(),
          (length) => this.generateRandomHex(length)
        );
      }
      throw error;
    }
  }

  async getNetworkStats(): Promise<BandNetworkStats> {
    try {
      if (this.useRealData) {
        return await bandRpcService.getNetworkStats();
      }
      return generateNetworkStats();
    } catch (error) {
      if (this.useRealData && this.config.fallbackToMock) {
        return generateNetworkStats();
      }
      throw error;
    }
  }

  async getCrossChainStats(): Promise<CrossChainStats> {
    // Cross-chain stats are not available via RPC, use mock data
    return generateCrossChainStats();
  }

  async getCrossChainTrend(period: TrendPeriod = '7d'): Promise<CrossChainTrend[]> {
    // Cross-chain trends are not available via RPC, use mock data
    return generateCrossChainTrend(period);
  }

  async getCrossChainComparison(period: TrendPeriod = '7d'): Promise<{
    period: TrendPeriod;
    currentTotal: number;
    previousTotal: number;
    changeAmount: number;
    changePercent: number;
    avgLatencyChange: number;
    successRateChange: number;
  }> {
    try {
      const trends = await this.getCrossChainTrend(period);

      const periodDays: Record<TrendPeriod, number> = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
      };

      const days = periodDays[period];
      const halfDays = Math.floor(days / 2);

      const currentPeriod = trends.slice(halfDays);
      const previousPeriod = trends.slice(0, halfDays);

      const currentTotal = currentPeriod.reduce((sum, t) => sum + t.requestCount, 0);
      const previousTotal = previousPeriod.reduce((sum, t) => sum + t.requestCount, 0);

      const changeAmount = currentTotal - previousTotal;
      const changePercent = previousTotal > 0 ? (changeAmount / previousTotal) * 100 : 0;

      const currentAvgLatency =
        currentPeriod.reduce((sum, t) => sum + t.avgLatency, 0) / currentPeriod.length;
      const previousAvgLatency =
        previousPeriod.reduce((sum, t) => sum + t.avgLatency, 0) / previousPeriod.length;
      const avgLatencyChange = currentAvgLatency - previousAvgLatency;

      const currentSuccessRate =
        currentPeriod.reduce((sum, t) => sum + t.successCount, 0) /
        currentPeriod.reduce((sum, t) => sum + t.requestCount, 0);
      const previousSuccessRate =
        previousPeriod.reduce((sum, t) => sum + t.successCount, 0) /
        previousPeriod.reduce((sum, t) => sum + t.requestCount, 0);
      const successRateChange = (currentSuccessRate - previousSuccessRate) * 100;

      return {
        period,
        currentTotal,
        previousTotal,
        changeAmount,
        changePercent,
        avgLatencyChange,
        successRateChange,
      };
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch cross-chain comparison',
        'CROSS_CHAIN_COMPARISON_DATA_ERROR'
      );
    }
  }

  async getHistoricalBandPrices(
    period: '1d' | '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<HistoricalPricePoint[]> {
    // Historical prices are not available via RPC, use mock data
    return generateHistoricalBandPrices(period, calculateTechnicalIndicators);
  }

  private generateRandomAddress(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 39; i++) {
      result += chars.charAt(Math.floor(seededRandom.next() * chars.length));
    }
    return result;
  }

  private generateRandomHex(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(seededRandom.next() * chars.length));
    }
    return result;
  }

  async getValidatorHistory(
    validatorAddress: string,
    period: HistoryPeriod = 30
  ): Promise<ValidatorHistory[]> {
    // Validator history is not available via RPC, use mock data
    const cacheKey = `validatorHistory_${validatorAddress}_${period}`;
    const cached = dataCache.get(cacheKey);
    if (cached) {
      return cached as ValidatorHistory[];
    }

    seededRandom.reset(globalSeed + 6);
    const history: ValidatorHistory[] = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const baseUptime = 99.5 + seededRandom.next() * 0.48;
    const baseStakedAmount = 1000000 + seededRandom.next() * 5000000;
    const baseCommissionRate = 0.05 + seededRandom.next() * 0.15;

    for (let i = 0; i < period; i++) {
      const timestamp = now - (period - 1 - i) * dayMs;

      const uptimeVariation = (seededRandom.next() - 0.5) * 0.5;
      const uptime = Math.min(100, Math.max(95, baseUptime + uptimeVariation));

      const stakeVariation = (seededRandom.next() - 0.5) * 0.1;
      const stakedAmount = baseStakedAmount * (1 + stakeVariation);

      const commissionVariation = (seededRandom.next() - 0.5) * 0.02;
      const commissionRate = Math.min(
        0.3,
        Math.max(0.01, baseCommissionRate + commissionVariation)
      );

      history.push({
        timestamp,
        uptime: Number(uptime.toFixed(2)),
        stakedAmount: Number(stakedAmount.toFixed(2)),
        commissionRate: Number(commissionRate.toFixed(4)),
      });
    }

    dataCache.set(cacheKey, history);
    return history;
  }

  async getCrossChainSnapshot(timestamp: number): Promise<BandCrossChainSnapshot> {
    // Cross-chain snapshot is not available via RPC, use mock data
    const cacheKey = `crossChainSnapshot_${timestamp}`;
    const cached = dataCache.get(cacheKey);
    if (cached) {
      return cached as BandCrossChainSnapshot;
    }

    seededRandom.reset(globalSeed + 7);
    const prices = new Map<string, number>();
    const deviations = new Map<string, number>();

    const basePrices: Record<string, number> = {
      'BTC/USD': 67842.35,
      'ETH/USD': 3456.78,
      'USDC/USD': 1.0001,
    };

    const chains = ['Cosmos Hub', 'Osmosis', 'Ethereum', 'Polygon', 'Avalanche', 'Fantom'];

    const now = Date.now();
    const hoursAgo = (now - timestamp) / (1000 * 60 * 60);
    const timeFactor = Math.max(0, Math.min(1, hoursAgo / (24 * 30)));

    let totalLatency = 0;
    let maxDeviation = 0;

    chains.forEach((chain, index) => {
      Object.entries(basePrices).forEach(([symbol, basePrice]) => {
        const key = `${chain}:${symbol}`;
        const volatility = 0.02 * timeFactor;
        const randomChange = (seededRandom.next() - 0.5) * 2 * volatility;
        const price = basePrice * (1 + randomChange);
        prices.set(key, Number(price.toFixed(4)));

        if (index > 0) {
          const deviationFactor = (seededRandom.next() - 0.5) * 0.8 * (1 - timeFactor * 0.3);
          deviations.set(key, Number(deviationFactor.toFixed(4)));
          maxDeviation = Math.max(maxDeviation, Math.abs(deviationFactor));
        }
      });

      totalLatency += Math.floor(seededRandom.next() * 100 + 50);
    });

    const avgLatency = Math.round(totalLatency / chains.length);

    let status: 'normal' | 'warning' | 'critical' = 'normal';
    if (maxDeviation >= 0.5) {
      status = 'critical';
    } else if (maxDeviation >= 0.1) {
      status = 'warning';
    }

    const result = {
      timestamp,
      prices,
      deviations,
      avgLatency,
      maxDeviation,
      status,
    };

    dataCache.set(cacheKey, result);
    return result;
  }

  getAvailableSnapshotDates(): Date[] {
    const dates: Date[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dates.push(date);
    }

    return dates;
  }

  async compareWithHistorical(
    currentData: Map<string, { price: number; deviation: number; latency: number }>,
    historicalTimestamp: number
  ): Promise<CrossChainPriceComparison[]> {
    try {
      const snapshot = await this.getCrossChainSnapshot(historicalTimestamp);
      const comparisons: CrossChainPriceComparison[] = [];

      const chains = [
        { name: 'Cosmos Hub', chainId: 'cosmoshub-4' },
        { name: 'Osmosis', chainId: 'osmosis-1' },
        { name: 'Ethereum', chainId: '1' },
        { name: 'Polygon', chainId: '137' },
        { name: 'Avalanche', chainId: '43114' },
        { name: 'Fantom', chainId: '250' },
      ];

      for (const chain of chains) {
        const current = currentData.get(chain.name);
        if (!current) continue;

        const historicalPrice = snapshot.prices.get(`${chain.name}:BTC/USD`) || current.price;
        const historicalDeviation = snapshot.deviations.get(`${chain.name}:BTC/USD`) || 0;
        const historicalLatency = snapshot.avgLatency;

        const priceChange = current.price - historicalPrice;
        const priceChangePercent =
          historicalPrice !== 0 ? (priceChange / historicalPrice) * 100 : 0;

        const deviationChange = current.deviation - historicalDeviation;
        const latencyChange = current.latency - historicalLatency;

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (priceChangePercent > 0.5) {
          trend = 'up';
        } else if (priceChangePercent < -0.5) {
          trend = 'down';
        }

        comparisons.push({
          chain: chain.name,
          chainId: chain.chainId,
          currentPrice: current.price,
          historicalPrice,
          priceChange,
          priceChangePercent,
          currentDeviation: current.deviation,
          historicalDeviation,
          deviationChange,
          currentLatency: current.latency,
          historicalLatency,
          latencyChange,
          trend,
        });
      }

      return comparisons;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to compare with historical data',
        'CROSS_CHAIN_COMPARISON_ERROR'
      );
    }
  }

  async getChainEvents(limit: number = 20, type?: EventType): Promise<ChainEvent[]> {
    // Chain events are not available via RPC, use mock data
    const cacheKey = `chainEvents_${limit}_${type || 'all'}`;
    const cached = dataCache.get(cacheKey);
    if (cached) {
      return cached as ChainEvent[];
    }

    seededRandom.reset(globalSeed + 8);
    const events: ChainEvent[] = [];
    const validatorNames = [
      'Band Foundation',
      'Cosmostation',
      'Stake.fish',
      'Figment',
      'Blockdaemon',
      'Everstake',
      'InfStones',
      'Staked',
      'Chorus One',
      'Dokia Capital',
    ];

    const eventTemplates: Record<
      EventType,
      { description: string; minAmount: number; maxAmount: number }
    > = {
      [EventType.DELEGATION]: {
        description: 'Delegated to validator',
        minAmount: 1000,
        maxAmount: 50000,
      },
      [EventType.UNDELEGATION]: {
        description: 'Undelegated from validator',
        minAmount: 500,
        maxAmount: 30000,
      },
      [EventType.COMMISSION_CHANGE]: {
        description: 'Commission rate updated',
        minAmount: 0,
        maxAmount: 0,
      },
      [EventType.JAILED]: {
        description: 'Validator jailed for downtime',
        minAmount: 0,
        maxAmount: 0,
      },
      [EventType.UNJAILED]: {
        description: 'Validator unjailed',
        minAmount: 0,
        maxAmount: 0,
      },
    };

    const now = Date.now();

    for (let i = 0; i < limit; i++) {
      const eventTypes = type ? [type] : EVENT_TYPE_VALUES;
      const eventType = eventTypes[Math.floor(seededRandom.next() * eventTypes.length)];
      const template = eventTemplates[eventType];
      const validator = validatorNames[Math.floor(seededRandom.next() * validatorNames.length)];

      const timestamp = now - Math.floor(seededRandom.next() * 24 * 60 * 60 * 1000);
      const amount =
        template.minAmount === template.maxAmount
          ? 0
          : template.minAmount + seededRandom.next() * (template.maxAmount - template.minAmount);

      events.push({
        id: `evt-${this.generateRandomHex(12)}`,
        type: eventType,
        validator,
        validatorAddress: `bandvaloper1${this.generateRandomAddress()}`,
        amount: Number(amount.toFixed(2)),
        timestamp,
        description: template.description,
        txHash: `0x${this.generateRandomHex(64)}`,
      });
    }

    const result = events.sort((a, b) => b.timestamp - a.timestamp);
    dataCache.set(cacheKey, result);
    return result;
  }

  async getOracleScripts(): Promise<OracleScript[]> {
    try {
      if (this.useRealData) {
        return await bandRpcService.getOracleScripts();
      }
      return this.generateMockOracleScripts();
    } catch (error) {
      if (this.useRealData && this.config.fallbackToMock) {
        return this.generateMockOracleScripts();
      }
      throw error;
    }
  }

  private generateMockOracleScripts(): OracleScript[] {
    const cacheKey = 'oracleScripts';
    const cached = dataCache.get(cacheKey);
    if (cached) {
      return cached as OracleScript[];
    }

    seededRandom.reset(globalSeed + 9);
    const scripts: OracleScript[] = [];
    const scriptTemplates = [
      {
        name: 'Crypto Price Feed',
        description: 'Retrieves real-time cryptocurrency prices from multiple exchanges',
        category: 'price' as const,
        baseCalls: 150000,
      },
      {
        name: 'Stock Price Oracle',
        description: 'Fetches stock market prices from major exchanges',
        category: 'price' as const,
        baseCalls: 85000,
      },
      {
        name: 'Forex Rates',
        description: 'Provides foreign exchange rates for major currency pairs',
        category: 'price' as const,
        baseCalls: 62000,
      },
      {
        name: 'Commodity Prices',
        description: 'Real-time commodity prices including gold, silver, and oil',
        category: 'price' as const,
        baseCalls: 45000,
      },
      {
        name: 'Sports Scores',
        description: 'Live sports scores and results from major leagues',
        category: 'sports' as const,
        baseCalls: 38000,
      },
      {
        name: 'Match Results',
        description: 'Historical and live match results for betting applications',
        category: 'sports' as const,
        baseCalls: 28000,
      },
      {
        name: 'VRF Random Number',
        description: 'Verifiable random number generation for gaming and lotteries',
        category: 'random' as const,
        baseCalls: 95000,
      },
      {
        name: 'Secure Randomness',
        description: 'Cryptographically secure random number generation',
        category: 'random' as const,
        baseCalls: 72000,
      },
      {
        name: 'Weather Data',
        description: 'Weather information from global meteorological services',
        category: 'custom' as const,
        baseCalls: 22000,
      },
      {
        name: 'NFT Price Oracle',
        description: 'NFT collection valuations and market data',
        category: 'custom' as const,
        baseCalls: 35000,
      },
      {
        name: 'DeFi TVL Feed',
        description: 'Total Value Locked data for DeFi protocols',
        category: 'custom' as const,
        baseCalls: 48000,
      },
      {
        name: 'Gas Price Oracle',
        description: 'Real-time gas price estimates across multiple chains',
        category: 'custom' as const,
        baseCalls: 110000,
      },
    ];

    for (let i = 0; i < scriptTemplates.length; i++) {
      const template = scriptTemplates[i];
      const callCount = template.baseCalls + Math.floor(seededRandom.next() * 20000);
      const successRate = 95 + seededRandom.next() * 4.99;
      const avgResponseTime = 200 + Math.floor(seededRandom.next() * 800);

      scripts.push({
        id: i + 1,
        name: template.name,
        description: template.description,
        owner: `band1${this.generateRandomAddress()}`,
        schema: `{"input": "symbol", "output": "price"}`,
        code: `// Oracle Script: ${template.name}\n// Execute data request...\nreturn fetchPrice(symbol);`,
        callCount,
        successRate: Number(successRate.toFixed(2)),
        avgResponseTime,
        category: template.category,
        lastUpdated: Date.now() - Math.floor(seededRandom.next() * 24 * 60 * 60 * 1000),
      });
    }

    dataCache.set(cacheKey, scripts);
    return scripts;
  }

  async getOracleScriptById(id: number): Promise<OracleScript | null> {
    try {
      const scripts = await this.getOracleScripts();
      return scripts.find((s) => s.id === id) || null;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch oracle script',
        'ORACLE_SCRIPT_ERROR'
      );
    }
  }

  async getIBCConnections(): Promise<IBCConnection[]> {
    // IBC connections are not available via RPC, use mock data
    return this.generateMockIBCConnections();
  }

  private generateMockIBCConnections(): IBCConnection[] {
    const cacheKey = 'ibcConnections';
    const cached = dataCache.get(cacheKey);
    if (cached) {
      return cached as IBCConnection[];
    }

    seededRandom.reset(globalSeed + 10);
    const connections: IBCConnection[] = [];
    const chainConfigs = [
      {
        name: 'Cosmos Hub',
        chainId: 'cosmoshub-4',
        channelId: 'channel-0',
        connectionId: 'connection-0',
      },
      {
        name: 'Osmosis',
        chainId: 'osmosis-1',
        channelId: 'channel-1',
        connectionId: 'connection-1',
      },
      { name: 'Juno', chainId: 'juno-1', channelId: 'channel-2', connectionId: 'connection-2' },
      {
        name: 'Stargaze',
        chainId: 'stargaze-1',
        channelId: 'channel-3',
        connectionId: 'connection-3',
      },
      {
        name: 'Stride',
        chainId: 'stride-1',
        channelId: 'channel-4',
        connectionId: 'connection-4',
      },
      {
        name: 'Axelar',
        chainId: 'axelar-dojo-1',
        channelId: 'channel-5',
        connectionId: 'connection-5',
      },
      {
        name: 'Injective',
        chainId: 'injective-1',
        channelId: 'channel-6',
        connectionId: 'connection-6',
      },
      {
        name: 'Persistence',
        chainId: 'core-1',
        channelId: 'channel-7',
        connectionId: 'connection-7',
      },
      {
        name: 'Crescent',
        chainId: 'crescent-1',
        channelId: 'channel-8',
        connectionId: 'connection-8',
      },
      {
        name: 'Kujira',
        chainId: 'kaiyo-1',
        channelId: 'channel-9',
        connectionId: 'connection-9',
      },
      {
        name: 'Neutron',
        chainId: 'neutron-1',
        channelId: 'channel-10',
        connectionId: 'connection-10',
      },
      {
        name: 'Celestia',
        chainId: 'celestia-1',
        channelId: 'channel-11',
        connectionId: 'connection-11',
      },
    ];

    const relayerNames = ['Stride Rly', 'Cosmos Rly', 'IBC Go', 'Hermes', 'TsRelayer', 'Polymer'];

    const now = Date.now();

    for (const config of chainConfigs) {
      const isActive = seededRandom.next() > 0.15;
      const transfers24h = isActive
        ? Math.floor(seededRandom.next() * 500 + 100)
        : Math.floor(seededRandom.next() * 50);
      const transfers7d = transfers24h * 7 + Math.floor(seededRandom.next() * 500);
      const totalTransfers = transfers7d * 4 + Math.floor(seededRandom.next() * 5000);
      const successRate = isActive ? 98 + seededRandom.next() * 1.9 : 85 + seededRandom.next() * 10;

      const relayerCount = Math.floor(seededRandom.next() * 3) + 1;
      const relayers: IBCRelayer[] = [];

      for (let i = 0; i < relayerCount; i++) {
        const relayerName = relayerNames[Math.floor(seededRandom.next() * relayerNames.length)];
        relayers.push({
          address: `band1${this.generateRandomAddress()}`,
          moniker: relayerName,
          transferCount: Math.floor(seededRandom.next() * transfers24h * 0.6 + transfers24h * 0.2),
          successRate: 95 + seededRandom.next() * 4.9,
        });
      }

      connections.push({
        chainName: config.name,
        chainId: config.chainId,
        channelId: config.channelId,
        connectionId: config.connectionId,
        status: isActive ? 'active' : 'inactive',
        transfers24h,
        transfers7d,
        totalTransfers,
        successRate: Number(successRate.toFixed(2)),
        relayers,
        lastActivity: isActive
          ? now - Math.floor(seededRandom.next() * 3600000)
          : now - Math.floor(seededRandom.next() * 86400000 * 7),
      });
    }

    dataCache.set(cacheKey, connections);
    return connections;
  }

  async getIBCTransferStats(): Promise<IBCTransferStats> {
    try {
      const connections = await this.getIBCConnections();
      const activeConnections = connections.filter((c) => c.status === 'active');

      const totalTransfers24h = connections.reduce((sum, c) => sum + c.transfers24h, 0);
      const totalTransfers7d = connections.reduce((sum, c) => sum + c.transfers7d, 0);
      const totalTransfers30d = totalTransfers7d * 4 + Math.floor(Math.random() * 10000);
      const avgSuccessRate =
        connections.reduce((sum, c) => sum + c.successRate, 0) / connections.length;
      const activeRelayers = connections.reduce((sum, c) => sum + c.relayers.length, 0);

      return {
        totalTransfers24h,
        totalTransfers7d,
        totalTransfers30d,
        successRate: Number(avgSuccessRate.toFixed(2)),
        activeChannels: activeConnections.length,
        activeRelayers,
      };
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch IBC transfer stats',
        'IBC_TRANSFER_STATS_ERROR'
      );
    }
  }

  async getIBCTransferTrends(days: number = 7): Promise<IBCTransferTrend[]> {
    // IBC transfer trends are not available via RPC, use mock data
    const cacheKey = `ibcTransferTrends_${days}`;
    const cached = dataCache.get(cacheKey);
    if (cached) {
      return cached as IBCTransferTrend[];
    }

    seededRandom.reset(globalSeed + 11);
    const trends: IBCTransferTrend[] = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    for (let i = days - 1; i >= 0; i--) {
      const timestamp = now - i * dayMs;
      const baseTransfers = 3000 + Math.floor(seededRandom.next() * 1000);
      const trend = Math.sin(i / 2) * 500;
      const transfers = Math.floor(baseTransfers + trend + (seededRandom.next() - 0.5) * 500);
      const successRate = 97 + seededRandom.next() * 2.5;

      trends.push({
        timestamp,
        transfers,
        successRate: Number(successRate.toFixed(2)),
      });
    }

    dataCache.set(cacheKey, trends);
    return trends;
  }

  async getStakingInfo(): Promise<StakingInfo> {
    try {
      if (this.useRealData) {
        const networkStats = await this.getNetworkStats();
        const marketData = await this.getBandMarketData();

        return {
          totalStaked: networkStats.bondedTokens,
          stakingRatio: networkStats.stakingRatio,
          stakingAPR: marketData.stakingApr,
          unbondingPeriod: 21,
          minStake: 100,
          slashingRate: 0.05,
          communityPool: networkStats.communityPool,
          inflation: networkStats.inflationRate,
        };
      }

      // Fallback to mock data
      const networkStats = await this.getNetworkStats();
      const marketData = await this.getBandMarketData();

      return {
        totalStaked: networkStats.bondedTokens,
        stakingRatio: networkStats.stakingRatio,
        stakingAPR: marketData.stakingApr,
        unbondingPeriod: 21,
        minStake: 100,
        slashingRate: 0.05,
        communityPool: networkStats.communityPool,
        inflation: networkStats.inflationRate,
      };
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch staking info',
        'STAKING_INFO_ERROR'
      );
    }
  }

  async getStakingDistribution(): Promise<StakingDistribution[]> {
    try {
      const validators = await this.getValidators(50);
      const totalStake = validators.reduce((sum, v) => sum + v.tokens, 0);

      const ranges = [
        { range: '0 - 100', min: 0, max: 100 },
        { range: '100 - 1K', min: 100, max: 1000 },
        { range: '1K - 10K', min: 1000, max: 10000 },
        { range: '10K - 100K', min: 10000, max: 100000 },
        { range: '100K - 1M', min: 100000, max: 1000000 },
        { range: '1M+', min: 1000000, max: Infinity },
      ];

      const distribution: StakingDistribution[] = ranges.map((r) => {
        const count = validators.filter((v) => v.tokens >= r.min && v.tokens < r.max).length;
        const totalStakeInRange = validators
          .filter((v) => v.tokens >= r.min && v.tokens < r.max)
          .reduce((sum, v) => sum + v.tokens, 0);
        const percentage = totalStake > 0 ? (totalStakeInRange / totalStake) * 100 : 0;

        return {
          range: r.range,
          count,
          percentage: Number(percentage.toFixed(2)),
          totalStake: Number(totalStakeInRange.toFixed(2)),
        };
      });

      return distribution;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch staking distribution',
        'STAKING_DISTRIBUTION_ERROR'
      );
    }
  }

  calculateStakingReward(amount: number, durationDays: number): StakingReward {
    seededRandom.reset(globalSeed + 12);
    const apr = 10 + seededRandom.next() * 4;
    const dailyRate = apr / 100 / 365;
    const estimatedReward = amount * dailyRate * durationDays;
    const apy = (Math.pow(1 + apr / 100 / 365, 365) - 1) * 100;

    return {
      principal: amount,
      duration: durationDays,
      estimatedReward: Number(estimatedReward.toFixed(4)),
      apy: Number(apy.toFixed(2)),
    };
  }

  async getRiskMetrics(): Promise<RiskMetrics> {
    try {
      if (this.useRealData) {
        const validators = await this.getValidators(50);
        const networkStats = await this.getNetworkStats();

        const totalStake = validators.reduce((sum, v) => sum + v.tokens, 0);
        const sortedValidators = [...validators].sort((a, b) => b.tokens - a.tokens);

        const stakes = sortedValidators.map((v) => v.tokens);
        const giniCoefficient = this.calculateGiniCoefficient(stakes);

        const top10Stake = sortedValidators.slice(0, 10).reduce((sum, v) => sum + v.tokens, 0);
        const top10ValidatorsShare = (top10Stake / totalStake) * 100;

        const nakamotoCoefficient = this.calculateNakamotoCoefficient(sortedValidators, totalStake);

        const avgUptime = validators.reduce((sum, v) => sum + v.uptime, 0) / validators.length;

        const decentralizationScore = Math.max(
          0,
          Math.min(100, 100 - giniCoefficient * 100 - (top10ValidatorsShare - 33) * 0.5)
        );

        const securityScore = Math.max(
          0,
          Math.min(
            100,
            70 + networkStats.activeValidators * 0.3 + (100 - top10ValidatorsShare) * 0.3
          )
        );

        const reliabilityScore = Math.max(0, Math.min(100, avgUptime));

        const transparencyScore = 75 + seededRandom.next() * 10;

        const overallScore =
          decentralizationScore * 0.3 +
          securityScore * 0.3 +
          reliabilityScore * 0.25 +
          transparencyScore * 0.15;

        return {
          decentralizationScore: Number(decentralizationScore.toFixed(1)),
          securityScore: Number(securityScore.toFixed(1)),
          reliabilityScore: Number(reliabilityScore.toFixed(1)),
          transparencyScore: Number(transparencyScore.toFixed(1)),
          overallScore: Number(overallScore.toFixed(1)),
          giniCoefficient: Number(giniCoefficient.toFixed(3)),
          nakamotoCoefficient,
          top10ValidatorsShare: Number(top10ValidatorsShare.toFixed(1)),
        };
      }

      // Fallback to mock calculation
      return this.calculateMockRiskMetrics();
    } catch (error) {
      if (this.useRealData && this.config.fallbackToMock) {
        return this.calculateMockRiskMetrics();
      }
      throw error;
    }
  }

  private calculateMockRiskMetrics(): RiskMetrics {
    seededRandom.reset(globalSeed + 13);

    const giniCoefficient = 0.3 + seededRandom.next() * 0.2;
    const nakamotoCoefficient = 5 + Math.floor(seededRandom.next() * 5);
    const top10ValidatorsShare = 40 + seededRandom.next() * 15;

    return {
      decentralizationScore: Number((70 + seededRandom.next() * 15).toFixed(1)),
      securityScore: Number((75 + seededRandom.next() * 15).toFixed(1)),
      reliabilityScore: Number((90 + seededRandom.next() * 8).toFixed(1)),
      transparencyScore: Number((70 + seededRandom.next() * 15).toFixed(1)),
      overallScore: Number((75 + seededRandom.next() * 12).toFixed(1)),
      giniCoefficient: Number(giniCoefficient.toFixed(3)),
      nakamotoCoefficient,
      top10ValidatorsShare: Number(top10ValidatorsShare.toFixed(1)),
    };
  }

  private calculateGiniCoefficient(values: number[]): number {
    if (values.length === 0) return 0;

    const sortedValues = [...values].sort((a, b) => a - b);
    const n = sortedValues.length;
    const total = sortedValues.reduce((sum, v) => sum + v, 0);

    if (total === 0) return 0;

    let cumulativeSum = 0;
    let giniSum = 0;

    for (let i = 0; i < n; i++) {
      cumulativeSum += sortedValues[i];
      giniSum += cumulativeSum;
    }

    const gini = (2 * giniSum) / (n * total) - (n + 1) / n;
    return Math.max(0, Math.min(1, gini));
  }

  private calculateNakamotoCoefficient(validators: ValidatorInfo[], totalStake: number): number {
    if (validators.length === 0 || totalStake === 0) return 0;

    const sortedValidators = [...validators].sort((a, b) => b.tokens - a.tokens);
    const threshold = totalStake / 3;

    let cumulativeStake = 0;
    let count = 0;

    for (const validator of sortedValidators) {
      cumulativeStake += validator.tokens;
      count++;
      if (cumulativeStake >= threshold) {
        break;
      }
    }

    return count;
  }

  async getRiskTrendData(days: number = 30): Promise<RiskTrendData[]> {
    // Risk trend data is not available via RPC, use mock data
    const cacheKey = `riskTrendData_${days}`;
    const cached = dataCache.get(cacheKey);
    if (cached) {
      return cached as RiskTrendData[];
    }

    seededRandom.reset(globalSeed + 14);
    const trends: RiskTrendData[] = [];
    const now = new Date();

    const baseDecentralization = 72;
    const baseSecurity = 78;
    const baseReliability = 94;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayVariation = Math.sin(i / 5) * 3 + (seededRandom.next() - 0.5) * 4;
      const decentralization = Math.max(60, Math.min(85, baseDecentralization + dayVariation));
      const security = Math.max(70, Math.min(90, baseSecurity + dayVariation * 0.8));
      const reliability = Math.max(90, Math.min(99, baseReliability + dayVariation * 0.3));

      const score = decentralization * 0.3 + security * 0.3 + reliability * 0.25 + 75 * 0.15;

      trends.push({
        date: dateStr,
        score: Number(score.toFixed(1)),
        decentralization: Number(decentralization.toFixed(1)),
        security: Number(security.toFixed(1)),
        reliability: Number(reliability.toFixed(1)),
      });
    }

    dataCache.set(cacheKey, trends);
    return trends;
  }

  async getSecurityAuditEvents(): Promise<RiskEvent[]> {
    // Security audit events are not available via RPC, use mock data
    const events: RiskEvent[] = [
      {
        id: 'audit-2024-q1',
        date: '2024-02-20T10:30:00',
        title: 'Security Audit Completed',
        description:
          'Band Protocol core contracts passed joint security audit by CertiK and PeckShield with no critical vulnerabilities found.',
        type: 'success',
        source: 'https://www.certik.com/projects/bandprotocol',
      },
      {
        id: 'upgrade-2023-v25',
        date: '2023-12-15T14:20:00',
        title: 'Mainnet Upgrade v2.5',
        description:
          'Completed BandChain mainnet upgrade, introducing new oracle script execution environment and optimized gas fee model.',
        type: 'info',
        source: 'https://docs.bandchain.org/',
      },
      {
        id: 'validator-expansion-2023',
        date: '2023-10-08T09:15:00',
        title: 'Validator Node Expansion',
        description:
          'Validator nodes increased to 72, distributed across 25 countries and regions, improving network decentralization.',
        type: 'success',
        source: 'https://docs.bandchain.org/',
      },
      {
        id: 'latency-2023',
        date: '2023-08-22T16:45:00',
        title: 'Price Delay Incident',
        description:
          'Due to network congestion, some price feeds experienced 3-5 minute delays. Team optimized data aggregation algorithm to improve response speed.',
        type: 'warning',
        source: 'https://docs.bandchain.org/',
      },
      {
        id: 'datasource-2023',
        date: '2023-06-10T11:30:00',
        title: 'New Data Source Integration',
        description:
          'Successfully integrated 15 new institutional-grade data sources, improving price data accuracy and manipulation resistance.',
        type: 'success',
        source: 'https://docs.bandchain.org/',
      },
      {
        id: 'staking-2023',
        date: '2023-04-05T08:00:00',
        title: 'Staking Mechanism Optimization',
        description:
          'Updated validator staking requirements, introducing dynamic slashing mechanism to enhance network security.',
        type: 'info',
        source: 'https://docs.bandchain.org/',
      },
      {
        id: 'audit-2023',
        date: '2023-01-15T10:00:00',
        title: 'Annual Security Review',
        description:
          'Completed comprehensive security review covering smart contracts, validator infrastructure, and cross-chain bridges.',
        type: 'success',
        source: 'https://www.certik.com/projects/bandprotocol',
      },
      {
        id: 'ibc-upgrade-2022',
        date: '2022-11-20T14:00:00',
        title: 'IBC Protocol Upgrade',
        description:
          'Upgraded IBC protocol to latest version, improving cross-chain communication reliability and adding new features.',
        type: 'info',
        source: 'https://docs.bandchain.org/',
      },
    ];

    return events;
  }

  async getGovernanceProposals(status?: ProposalStatus): Promise<GovernanceProposal[]> {
    try {
      if (this.useRealData) {
        const proposals = await bandRpcService.getProposals(status);
        return status ? proposals.filter((p) => p.status === status) : proposals;
      }
      return this.generateMockProposals(status);
    } catch (error) {
      if (this.useRealData && this.config.fallbackToMock) {
        return this.generateMockProposals(status);
      }
      throw error;
    }
  }

  private generateMockProposals(status?: ProposalStatus): GovernanceProposal[] {
    const cacheKey = `governanceProposals_${status || 'all'}`;
    const cached = dataCache.get(cacheKey);
    if (cached) {
      return cached as GovernanceProposal[];
    }

    seededRandom.reset(globalSeed + 15);
    const proposals: GovernanceProposal[] = [];
    const now = Date.now();

    const proposalTemplates = [
      {
        title: 'Upgrade BandChain to v3.0',
        description:
          'Proposal to upgrade BandChain mainnet to version 3.0, introducing enhanced oracle script execution environment and improved gas optimization.',
        type: 'Software Upgrade',
        status: 'voting' as ProposalStatus,
      },
      {
        title: 'Increase Validator Set Size',
        description:
          'Proposal to increase the active validator set from 72 to 100 validators to improve network decentralization.',
        type: 'Parameter Change',
        status: 'voting' as ProposalStatus,
      },
      {
        title: 'Community Pool Spending for Marketing',
        description:
          'Proposal to allocate 500,000 BAND from the community pool for marketing and ecosystem development initiatives.',
        type: 'Community Pool Spend',
        status: 'passed' as ProposalStatus,
      },
      {
        title: 'Reduce Minimum Deposit Amount',
        description:
          'Proposal to reduce the minimum deposit for governance proposals from 512 BAND to 256 BAND to lower barriers to participation.',
        type: 'Parameter Change',
        status: 'voting' as ProposalStatus,
      },
      {
        title: 'Add New Oracle Scripts',
        description:
          'Proposal to add 10 new oracle scripts for emerging DeFi protocols and NFT price feeds.',
        type: 'Oracle Script Addition',
        status: 'passed' as ProposalStatus,
      },
      {
        title: 'Adjust Staking Parameters',
        description:
          'Proposal to adjust staking parameters including unbonding period and slashing rates.',
        type: 'Parameter Change',
        status: 'rejected' as ProposalStatus,
      },
      {
        title: 'Fund Developer Grant Program',
        description:
          'Proposal to establish a developer grant program with 1,000,000 BAND allocation for ecosystem growth.',
        type: 'Community Pool Spend',
        status: 'passed' as ProposalStatus,
      },
      {
        title: 'Enable IBC Relayer Incentives',
        description:
          'Proposal to implement incentive mechanisms for IBC relayers to improve cross-chain connectivity.',
        type: 'Parameter Change',
        status: 'deposit' as ProposalStatus,
      },
      {
        title: 'Security Audit Funding',
        description:
          'Proposal to fund comprehensive security audit by leading firms for BandChain core contracts.',
        type: 'Community Pool Spend',
        status: 'passed' as ProposalStatus,
      },
      {
        title: 'Update Oracle Script Standards',
        description:
          'Proposal to update standards and requirements for oracle script development and deployment.',
        type: 'Software Upgrade',
        status: 'failed' as ProposalStatus,
      },
    ];

    for (let i = 0; i < proposalTemplates.length; i++) {
      const template = proposalTemplates[i];
      const submitTime = now - Math.floor(seededRandom.next() * 14 * 24 * 60 * 60 * 1000);
      const depositEndTime = submitTime + 14 * 24 * 60 * 60 * 1000;
      const votingEndTime = depositEndTime + 7 * 24 * 60 * 60 * 1000;

      const totalVotes = 50000000 + Math.floor(seededRandom.next() * 50000000);
      const yesRatio =
        template.status === 'passed'
          ? 0.7 + seededRandom.next() * 0.2
          : template.status === 'rejected'
            ? 0.2 + seededRandom.next() * 0.2
            : 0.4 + seededRandom.next() * 0.2;

      proposals.push({
        id: i + 1,
        title: template.title,
        description: template.description,
        type: template.type,
        status: template.status,
        submitTime,
        depositEndTime,
        votingEndTime,
        proposer: `band1${this.generateRandomAddress()}`,
        totalDeposit: 512 + Math.floor(seededRandom.next() * 1000),
        votes: {
          yes: Math.floor(totalVotes * yesRatio),
          no: Math.floor(totalVotes * (1 - yesRatio) * 0.5),
          abstain: Math.floor(totalVotes * (1 - yesRatio) * 0.3),
          noWithVeto: Math.floor(totalVotes * (1 - yesRatio) * 0.2),
        },
      });
    }

    const result = status ? proposals.filter((p) => p.status === status) : proposals;
    dataCache.set(cacheKey, result);
    return result;
  }

  async getGovernanceParams(): Promise<GovernanceParams> {
    try {
      return {
        minDeposit: 512,
        maxDepositPeriod: 14,
        votingPeriod: 7,
        quorum: 33.4,
        threshold: 50,
        vetoThreshold: 33.4,
      };
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch governance params',
        'GOVERNANCE_PARAMS_ERROR'
      );
    }
  }

  // Method to check if using real data
  isUsingRealData(): boolean {
    return this.useRealData;
  }

  // Method to toggle real data mode
  setUseRealData(useRealData: boolean): void {
    this.useRealData = useRealData;
  }

  getSupportedSymbols(): string[] {
    return [...bandProtocolSymbols];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const isSymbolInList = bandProtocolSymbols.includes(
      symbol.toUpperCase() as (typeof bandProtocolSymbols)[number]
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
