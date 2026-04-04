import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { FEATURE_FLAGS } from '@/lib/config/serverEnv';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

import { BaseOracleClient } from './base';
import { winklinkSymbols } from './supportedSymbols';
import { getWINkLinkRealDataService } from './winklinkRealDataService';

import type { OracleClientConfig } from './base';

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

      // 回退到模拟数据
      const baseSymbol = this.getBaseSymbol(symbol);
      const basePrice = UNIFIED_BASE_PRICES[baseSymbol] || 100;
      return this.fetchPriceWithDatabase(symbol, chain, () =>
        this.generateMockPrice(symbol, basePrice, chain)
      );
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
      // WINkLink 不支持历史价格查询，使用模拟数据
      const baseSymbol = this.getBaseSymbol(symbol);
      const basePrice = UNIFIED_BASE_PRICES[baseSymbol] || 100;
      return this.fetchHistoricalPricesWithDatabase(symbol, chain, period, () =>
        this.generateMockHistoricalPrices(symbol, basePrice, chain, period)
      );
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
              dailyActiveUsers: 2500000, // 估算值
              energyConsumption: 4500000000, // 估算值
              bandwidthConsumption: 2800000000, // 估算值
            },
            integratedDApps: [
              {
                id: 'dapp-001',
                name: 'WINk',
                category: 'gaming',
                users: 850000,
                volume24h: 15000000,
                contractAddress: 'TND...abc',
                integrationDate: now - 86400000 * 365,
                status: 'active',
              },
              {
                id: 'dapp-002',
                name: 'SunSwap',
                category: 'defi',
                users: 420000,
                volume24h: 8500000,
                contractAddress: 'TND...def',
                integrationDate: now - 86400000 * 180,
                status: 'active',
              },
            ],
            totalValueLocked: 450000000,
            dailyTransactions: 2500000,
            integrationCoverage: 0.85,
          };
        }
      } catch {
        // 获取失败时使用模拟数据
      }
    }

    // 模拟数据
    const now = Date.now();
    return {
      networkStats: {
        totalTransactions: 8500000000,
        tps: 65,
        blockHeight: 65000000,
        blockTime: 3,
        totalAccounts: 180000000,
        dailyActiveUsers: 2500000,
        energyConsumption: 4500000000,
        bandwidthConsumption: 2800000000,
      },
      integratedDApps: [
        {
          id: 'dapp-001',
          name: 'WINk',
          category: 'gaming',
          users: 850000,
          volume24h: 15000000,
          contractAddress: 'TND...abc',
          integrationDate: now - 86400000 * 365,
          status: 'active',
        },
        {
          id: 'dapp-002',
          name: 'SunSwap',
          category: 'defi',
          users: 420000,
          volume24h: 8500000,
          contractAddress: 'TND...def',
          integrationDate: now - 86400000 * 180,
          status: 'active',
        },
      ],
      totalValueLocked: 450000000,
      dailyTransactions: 2500000,
      integrationCoverage: 0.85,
    };
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
      } catch {
        // 获取失败时使用模拟数据
      }
    }

    // 模拟数据
    return {
      totalStaked: 45000000,
      totalNodes: 85,
      activeNodes: 82,
      averageApr: 12.5,
      rewardPool: 2500000,
      stakingTiers: [
        { tier: 'bronze', minStake: 10000, maxStake: 50000, apr: 10, nodeCount: 35 },
        { tier: 'silver', minStake: 50000, maxStake: 200000, apr: 12, nodeCount: 28 },
        { tier: 'gold', minStake: 200000, maxStake: 500000, apr: 14, nodeCount: 15 },
        { tier: 'platinum', minStake: 500000, maxStake: 10000000, apr: 16, nodeCount: 7 },
      ],
      nodes: [
        {
          id: 'node-001',
          address: 'TV6MuMXfmLbBqPZvBHdwFsDnQAaY4zQ4Qc',
          name: 'WINkLink Node Asia',
          region: 'Asia',
          stakedAmount: 750000,
          rewardsEarned: 45000,
          uptime: 99.95,
          responseTime: 85,
          validatedRequests: 1250000,
          joinDate: Date.now() - 86400000 * 400,
          status: 'active',
          tier: 'gold',
        },
        {
          id: 'node-002',
          address: 'TV6MuMXfmLbBqPZvBHdwFsDnQAaY4zQ4Qd',
          name: 'WINkLink Node Europe',
          region: 'Europe',
          stakedAmount: 1200000,
          rewardsEarned: 78000,
          uptime: 99.92,
          responseTime: 95,
          validatedRequests: 1890000,
          joinDate: Date.now() - 86400000 * 350,
          status: 'active',
          tier: 'platinum',
        },
      ],
    };
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
      } catch {
        // 获取失败时使用模拟数据
      }
    }

    // 模拟数据
    return {
      totalGamingVolume: 850000000,
      activeGames: 125,
      dailyRandomRequests: 125000,
      dataSources: [
        {
          id: 'game-001',
          name: 'Dice',
          type: 'game',
          category: 'casino',
          users: 450000,
          volume24h: 8500000,
          dataTypes: ['random_number', 'outcome_verification'],
          reliability: 99.9,
          lastUpdate: Date.now(),
        },
        {
          id: 'game-002',
          name: 'Moon',
          type: 'game',
          category: 'casino',
          users: 320000,
          volume24h: 6200000,
          dataTypes: ['random_number', 'outcome_verification'],
          reliability: 99.8,
          lastUpdate: Date.now(),
        },
      ],
      randomNumberServices: [
        {
          serviceId: 'vrf-001',
          name: 'WINkLink VRF',
          requestCount: 5200000,
          averageResponseTime: 105,
          securityLevel: 'high',
          supportedChains: ['TRON', 'BNB'],
        },
        {
          serviceId: 'rng-001',
          name: 'Casino RNG Service',
          requestCount: 5200000,
          averageResponseTime: 105,
          securityLevel: 'medium',
          supportedChains: ['TRON', 'BTTC'],
        },
      ],
    };
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
      } catch {
        // 获取失败时使用模拟数据
      }
    }

    // 模拟数据
    return {
      activeNodes: 85,
      nodeUptime: 99.92,
      avgResponseTime: 110,
      updateFrequency: 30,
      totalStaked: 45000000,
      dataFeeds: 180,
      hourlyActivity: [
        2800, 2600, 2400, 2200, 2000, 2200, 2600, 3800, 5200, 6800, 8200, 9200, 8800, 8400, 8000,
        8200, 8600, 9000, 8400, 6800, 5400, 4200, 3400, 3000,
      ],
      status: 'online',
      latency: 110,
      stakingTokenSymbol: 'WIN',
    };
  }

  async getStakingData(): Promise<{
    totalStaked: number;
    stakingApr: number;
    stakerCount: number;
    rewardPool: number;
  }> {
    return {
      totalStaked: 45000000,
      stakingApr: 12.5,
      stakerCount: 5200,
      rewardPool: 2500000,
    };
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
      } catch {
        // 获取失败时使用模拟数据
      }
    }

    // 模拟数据
    return {
      overallRisk: 2.5,
      decentralization: 85,
      dataQuality: 92,
      uptime: 99.92,
      staleness: 0.5,
      deviation: 0.1,
      lastUpdate: Date.now(),
    };
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
      provider: OracleProvider.WINKLINK,
      symbol: symbol.toUpperCase(),
      price: basePrice,
      timestamp: timestamp || Date.now(),
      decimals: 8,
      confidence: 0.95,
      change24h: 0,
      change24hPercent: 0,
      chain: chain || Blockchain.TRON,
      source: 'winklink-mock',
    };
  }

  /**
   * 生成模拟历史价格数据
   */
  protected generateMockHistoricalPrices(
    symbol: string,
    basePrice: number,
    _chain?: Blockchain,
    period: number = 24
  ): PriceData[] {
    const prices: PriceData[] = [];
    const now = Date.now();
    const interval = (period * 60 * 60 * 1000) / 100; // 将时间段分成100个点

    for (let i = 99; i >= 0; i--) {
      const timestamp = now - i * interval;
      // 添加一些随机波动
      const volatility = 0.02; // 2% 波动
      const randomChange = (Math.random() - 0.5) * 2 * volatility;
      const price = basePrice * (1 + randomChange);

      prices.push({
        provider: OracleProvider.WINKLINK,
        symbol: symbol.toUpperCase(),
        price: price,
        timestamp: timestamp,
        decimals: 8,
        confidence: 0.95,
        change24h: 0,
        change24hPercent: 0,
        chain: Blockchain.TRON,
        source: 'winklink-mock',
      });
    }

    return prices;
  }
}
