import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

import { BaseOracleClient } from './base';

import type { OracleClientConfig } from './base';

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

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;

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
      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;

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
}
