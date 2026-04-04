import { FEATURE_FLAGS } from '@/lib/config/serverEnv';
import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { winklinkSymbols } from '@/lib/oracles/supportedSymbols';
import { getWINkLinkRealDataService } from '@/lib/oracles/winklinkRealDataService';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

// 是否使用真实数据
const USE_REAL_DATA = FEATURE_FLAGS.useRealWinklinkData;

export interface TRONNetworkStats {
  totalTransactions: number;
  tps: number;
  blockHeight: number;
  blockTime: number;
  totalAccounts: number;
  dailyActiveUsers: number;
  energyConsumption: number;
  bandwidthConsumption: number;
}

export interface TRONDApp {
  id: string;
  name: string;
  category: 'gaming' | 'defi' | 'nft' | 'social' | 'other';
  users: number;
  volume24h: number;
  contractAddress: string;
  integrationDate: number;
  status: 'active' | 'inactive';
}

export interface TRONEcosystem {
  networkStats: TRONNetworkStats;
  integratedDApps: TRONDApp[];
  totalValueLocked: number;
  dailyTransactions: number;
  integrationCoverage: number;
  networkGrowth?: TRONNetworkGrowth[];
  marketShare?: {
    oracleUsage: number;
    totalDapps: number;
    integratedDapps: number;
  };
}

export interface WINkLinkNode {
  id: string;
  address: string;
  name: string;
  region: string;
  stakedAmount: number;
  rewardsEarned: number;
  uptime: number;
  responseTime: number;
  validatedRequests: number;
  joinDate: number;
  status: 'active' | 'inactive' | 'penalized';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface NodeStakingData {
  totalStaked: number;
  totalNodes: number;
  activeNodes: number;
  averageApr: number;
  rewardPool: number;
  stakingTiers: {
    tier: string;
    minStake: number;
    maxStake: number;
    apr: number;
    nodeCount: number;
  }[];
  nodes: WINkLinkNode[];
}

export interface GamingDataSource {
  id: string;
  name: string;
  type: 'game' | 'platform' | 'tournament' | 'marketplace';
  category: 'casino' | 'sports' | 'esports' | 'lottery' | 'other';
  users: number;
  volume24h: number;
  dataTypes: string[];
  reliability: number;
  lastUpdate: number;
}

export interface RandomNumberService {
  serviceId: string;
  name: string;
  requestCount: number;
  averageResponseTime: number;
  securityLevel: 'high' | 'medium' | 'low';
  supportedChains: string[];
}

export interface WINkLinkGamingData {
  totalGamingVolume: number;
  activeGames: number;
  dailyRandomRequests: number;
  dataSources: GamingDataSource[];
  randomNumberServices: RandomNumberService[];
}

export interface WINkLinkNetworkStats {
  activeNodes: number;
  nodeUptime: number;
  avgResponseTime: number;
  updateFrequency: number;
  totalStaked: number;
  dataFeeds: number;
  hourlyActivity: number[];
  status: 'online' | 'warning' | 'offline';
  latency: number;
  stakingTokenSymbol: string;
}

export interface WINkLinkRiskMetrics {
  overallRisk: number;
  decentralization: number;
  dataQuality: number;
  dataQualityScore?: number;
  uptime: number;
  staleness: number;
  deviation: number;
  priceDeviation?: number;
  nodeConcentrationRisk?: number;
  uptimeRisk?: number;
  lastUpdate: number;
}

export interface VRFUseCase {
  id: string;
  name: string;
  category: string;
  description: string;
  requestVolume?: number;
  usageCount?: number;
  averageResponseTime?: number;
  reliability: number;
}

export interface GamingCategoryDistribution {
  category: string;
  count: number;
  percentage: number;
  volume24h?: number;
}

export interface TRONNetworkGrowth {
  date?: string;
  month?: string;
  transactions: number;
  accounts: number;
  dapps?: number;
  tvl?: number;
}

export class WINkLinkClient extends BaseOracleClient {
  name = OracleProvider.WINKLINK;
  supportedChains = [Blockchain.TRON, Blockchain.BNB_CHAIN];

  defaultUpdateIntervalMinutes = 60;

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  private getBaseSymbol(symbol: string): string {
    // 提取基础 symbol，例如 "WIN/USD" -> "WIN"
    return symbol.toUpperCase().split('/')[0];
  }

  /**
   * 获取代币价格
   * 当查询 WIN 代币价格时，直接使用 Binance API，不尝试调用 WINkLink 合约
   * 其他代币按照现有逻辑执行
   */
  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      const upperSymbol = symbol.toUpperCase();

      // 当查询自己预言机的代币 (WIN) 时，直接使用 Binance API
      if (upperSymbol === 'WIN') {
        const marketData = await binanceMarketService.getTokenMarketData(symbol);
        if (marketData) {
          return {
            provider: OracleProvider.WINKLINK,
            symbol: upperSymbol,
            price: marketData.currentPrice,
            timestamp: new Date(marketData.lastUpdated).getTime(),
            decimals: 8,
            confidence: 0.95,
            change24h: marketData.priceChange24h,
            change24hPercent: marketData.priceChangePercentage24h,
            chain: chain || Blockchain.TRON,
            source: 'binance-api',
          };
        }
      }

      // 如果启用真实数据，尝试从 WINkLink 合约获取
      if (USE_REAL_DATA) {
        const realDataService = getWINkLinkRealDataService();
        const realPrice = await realDataService.getPriceFromContract(symbol);

        if (realPrice) {
          return realPrice;
        }
      }

      return this.fetchPriceWithDatabase(symbol, chain);
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from WINkLink',
        'WINKLINK_ERROR'
      );
    }
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    try {
      return this.fetchHistoricalPricesWithDatabase(symbol, chain, period);
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch historical prices from WINkLink',
        'WINKLINK_HISTORICAL_ERROR'
      );
    }
  }

  async getTRONEcosystem(): Promise<TRONEcosystem> {
    // 如果启用真实数据，尝试获取真实网络统计
    if (USE_REAL_DATA) {
      try {
        const realDataService = getWINkLinkRealDataService();
        const networkStats = await realDataService.getTRONNetworkStats();

        if (networkStats) {
          const now = Date.now();
          return {
            networkStats: {
              totalTransactions: networkStats.totalTransactions,
              tps: networkStats.tps,
              blockHeight: networkStats.blockHeight,
              blockTime: networkStats.blockTime,
              totalAccounts: networkStats.totalAccounts,
              dailyActiveUsers: networkStats.dailyActiveUsers || 0,
              energyConsumption: networkStats.energyConsumption || 0,
              bandwidthConsumption: networkStats.bandwidthConsumption || 0,
            },
            integratedDApps: [],
            totalValueLocked: 0,
            dailyTransactions: networkStats.totalTransactions,
            integrationCoverage: 0,
          };
        }
      } catch (error) {
        throw this.createError(
          `Failed to fetch TRON ecosystem data: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'TRON_ECOSYSTEM_ERROR'
        );
      }
    }

    throw this.createError(
      'Real data is not available. Please enable USE_REAL_DATA to fetch TRON ecosystem data.',
      'REAL_DATA_NOT_AVAILABLE'
    );
  }

  async getNodeStaking(): Promise<NodeStakingData> {
    // 如果启用真实数据，尝试获取真实质押数据
    if (USE_REAL_DATA) {
      try {
        const realDataService = getWINkLinkRealDataService();
        const stakingInfo = await realDataService.getStakingInfo();

        if (stakingInfo) {
          return {
            totalStaked: stakingInfo.totalStaked,
            totalNodes: stakingInfo.totalNodes,
            activeNodes: stakingInfo.activeNodes,
            averageApr: stakingInfo.averageApr,
            rewardPool: stakingInfo.rewardPool,
            stakingTiers: realDataService.getStakingTiers(),
            nodes: stakingInfo.nodes,
          };
        }
      } catch (error) {
        throw this.createError(
          `Failed to fetch staking data: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'STAKING_ERROR'
        );
      }
    }

    throw this.createError(
      'Real data is not available. Please enable USE_REAL_DATA to fetch staking data.',
      'REAL_DATA_NOT_AVAILABLE'
    );
  }

  async getGamingData(): Promise<WINkLinkGamingData> {
    // 如果启用真实数据，尝试获取真实游戏数据
    if (USE_REAL_DATA) {
      try {
        const realDataService = getWINkLinkRealDataService();
        const gamingInfo = await realDataService.getGamingInfo();

        if (gamingInfo) {
          return {
            totalGamingVolume: gamingInfo.totalGamingVolume,
            activeGames: gamingInfo.activeGames,
            dailyRandomRequests: gamingInfo.dailyRandomRequests,
            dataSources: gamingInfo.dataSources,
            randomNumberServices: gamingInfo.randomNumberServices,
          };
        }
      } catch (error) {
        throw this.createError(
          `Failed to fetch gaming data: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'GAMING_ERROR'
        );
      }
    }

    throw this.createError(
      'Real data is not available. Please enable USE_REAL_DATA to fetch gaming data.',
      'REAL_DATA_NOT_AVAILABLE'
    );
  }

  async getNetworkStats(): Promise<WINkLinkNetworkStats> {
    // 如果启用真实数据，尝试获取真实网络统计
    if (USE_REAL_DATA) {
      try {
        const realDataService = getWINkLinkRealDataService();
        const networkStats = await realDataService.getWINkLinkNetworkStats();

        if (networkStats) {
          return networkStats;
        }
      } catch (error) {
        throw this.createError(
          `Failed to fetch network stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'NETWORK_STATS_ERROR'
        );
      }
    }

    throw this.createError(
      'Real data is not available. Please enable USE_REAL_DATA to fetch network stats.',
      'REAL_DATA_NOT_AVAILABLE'
    );
  }

  async getStakingData(): Promise<{
    totalStaked: number;
    stakingApr: number;
    stakerCount: number;
    rewardPool: number;
  }> {
    if (USE_REAL_DATA) {
      try {
        const realDataService = getWINkLinkRealDataService();
        const stakingInfo = await realDataService.getStakingInfo();
        if (stakingInfo) {
          return {
            totalStaked: stakingInfo.totalStaked,
            stakingApr: stakingInfo.averageApr || 0,
            stakerCount: stakingInfo.activeNodes || 0,
            rewardPool: stakingInfo.rewardPool || 0,
          };
        }
      } catch (error) {
        throw this.createError(
          `Failed to fetch staking data: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'STAKING_ERROR'
        );
      }
    }

    throw this.createError(
      'Real data is not available. Please enable USE_REAL_DATA to fetch staking data.',
      'REAL_DATA_NOT_AVAILABLE'
    );
  }

  async getRiskMetrics(): Promise<WINkLinkRiskMetrics> {
    // 如果启用真实数据，尝试获取真实风险指标
    if (USE_REAL_DATA) {
      try {
        const realDataService = getWINkLinkRealDataService();
        const riskMetrics = await realDataService.getRiskMetrics();

        if (riskMetrics) {
          return riskMetrics;
        }
      } catch (error) {
        throw this.createError(
          `Failed to fetch risk metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'RISK_METRICS_ERROR'
        );
      }
    }

    throw this.createError(
      'Real data is not available. Please enable USE_REAL_DATA to fetch risk metrics.',
      'REAL_DATA_NOT_AVAILABLE'
    );
  }

  /**
   * 获取支持的 Price Feed 列表
   */
  getSupportedPriceFeeds(): Array<{ symbol: string; address: string }> {
    const realDataService = getWINkLinkRealDataService();
    return realDataService.getSupportedPriceFeeds();
  }

  /**
   * 检查是否支持某个交易对
   */
  isSupported(symbol: string): boolean {
    const realDataService = getWINkLinkRealDataService();
    return realDataService.isSupported(symbol);
  }

  getSupportedSymbols(): string[] {
    return [...winklinkSymbols];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const isSymbolInList = winklinkSymbols.includes(
      symbol.toUpperCase() as (typeof winklinkSymbols)[number]
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
