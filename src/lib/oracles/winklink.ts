import { BaseOracleClient, OracleClientConfig } from './base';
import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { PriceData, OracleProvider, Blockchain } from '@/types/oracle';

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

export interface GamingData {
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
          name: 'JustSwap',
          category: 'defi',
          users: 420000,
          volume24h: 8500000,
          contractAddress: 'TND...def',
          integrationDate: now - 86400000 * 300,
          status: 'active',
        },
        {
          id: 'dapp-003',
          name: 'APENFT',
          category: 'nft',
          users: 320000,
          volume24h: 3200000,
          contractAddress: 'TND...ghi',
          integrationDate: now - 86400000 * 250,
          status: 'active',
        },
        {
          id: 'dapp-004',
          name: 'SunSwap',
          category: 'defi',
          users: 280000,
          volume24h: 5800000,
          contractAddress: 'TND...jkl',
          integrationDate: now - 86400000 * 200,
          status: 'active',
        },
        {
          id: 'dapp-005',
          name: 'TRONbet',
          category: 'gaming',
          users: 180000,
          volume24h: 2200000,
          contractAddress: 'TND...mno',
          integrationDate: now - 86400000 * 180,
          status: 'active',
        },
      ],
      totalValueLocked: 1200000000,
      dailyTransactions: 4500000,
      integrationCoverage: 85,
    };
  }

  async getNodeStaking(): Promise<NodeStakingData> {
    const now = Date.now();
    const nodes: WINkLinkNode[] = [
      {
        id: 'node-001',
        address: 'TND...1a2b',
        name: 'WINkLink Guardian',
        region: 'Asia',
        stakedAmount: 5000000,
        rewardsEarned: 850000,
        uptime: 99.99,
        responseTime: 85,
        validatedRequests: 12500000,
        joinDate: now - 86400000 * 400,
        status: 'active',
        tier: 'platinum',
      },
      {
        id: 'node-002',
        address: 'TND...2c3d',
        name: 'TRON Oracle Node',
        region: 'Europe',
        stakedAmount: 3200000,
        rewardsEarned: 520000,
        uptime: 99.95,
        responseTime: 95,
        validatedRequests: 9800000,
        joinDate: now - 86400000 * 350,
        status: 'active',
        tier: 'gold',
      },
      {
        id: 'node-003',
        address: 'TND...3e4f',
        name: 'DeFi Data Provider',
        region: 'North America',
        stakedAmount: 2800000,
        rewardsEarned: 410000,
        uptime: 99.87,
        responseTime: 105,
        validatedRequests: 8200000,
        joinDate: now - 86400000 * 300,
        status: 'active',
        tier: 'gold',
      },
      {
        id: 'node-004',
        address: 'TND...4g5h',
        name: 'Gaming Oracle Pro',
        region: 'Asia',
        stakedAmount: 1800000,
        rewardsEarned: 280000,
        uptime: 99.82,
        responseTime: 115,
        validatedRequests: 6800000,
        joinDate: now - 86400000 * 250,
        status: 'active',
        tier: 'silver',
      },
      {
        id: 'node-005',
        address: 'TND...5i6j',
        name: 'CryptoFeed Validator',
        region: 'Europe',
        stakedAmount: 1200000,
        rewardsEarned: 180000,
        uptime: 99.75,
        responseTime: 125,
        validatedRequests: 5200000,
        joinDate: now - 86400000 * 200,
        status: 'active',
        tier: 'silver',
      },
      {
        id: 'node-006',
        address: 'TND...6k7l',
        name: 'PriceGuard TRON',
        region: 'South America',
        stakedAmount: 800000,
        rewardsEarned: 95000,
        uptime: 99.68,
        responseTime: 135,
        validatedRequests: 3800000,
        joinDate: now - 86400000 * 150,
        status: 'active',
        tier: 'bronze',
      },
    ];

    const activeNodes = nodes.filter((n) => n.status === 'active').length;
    const totalStaked = nodes.reduce((sum, n) => sum + n.stakedAmount, 0);

    return {
      totalStaked,
      totalNodes: nodes.length,
      activeNodes,
      averageApr: 12.5,
      rewardPool: 2500000,
      stakingTiers: [
        { tier: 'Bronze', minStake: 500000, maxStake: 1000000, apr: 10.5, nodeCount: 15 },
        { tier: 'Silver', minStake: 1000000, maxStake: 2000000, apr: 11.5, nodeCount: 12 },
        { tier: 'Gold', minStake: 2000000, maxStake: 4000000, apr: 12.5, nodeCount: 8 },
        { tier: 'Platinum', minStake: 4000000, maxStake: 10000000, apr: 14.0, nodeCount: 5 },
      ],
      nodes,
    };
  }

  async getGamingData(): Promise<GamingData> {
    return {
      totalGamingVolume: 850000000,
      activeGames: 45,
      dailyRandomRequests: 2500000,
      dataSources: [
        {
          id: 'game-001',
          name: 'WINk Casino',
          type: 'platform',
          category: 'casino',
          users: 650000,
          volume24h: 8500000,
          dataTypes: ['Random Numbers', 'Price Feeds', 'Event Results'],
          reliability: 99.99,
          lastUpdate: Date.now(),
        },
        {
          id: 'game-002',
          name: 'TRONbet Dice',
          type: 'game',
          category: 'casino',
          users: 280000,
          volume24h: 3200000,
          dataTypes: ['Random Numbers', 'Price Feeds'],
          reliability: 99.97,
          lastUpdate: Date.now() - 30000,
        },
        {
          id: 'game-003',
          name: 'SportX',
          type: 'platform',
          category: 'sports',
          users: 420000,
          volume24h: 5800000,
          dataTypes: ['Sports Results', 'Price Feeds', 'Event Data'],
          reliability: 99.95,
          lastUpdate: Date.now() - 60000,
        },
        {
          id: 'game-004',
          name: 'Esports Arena',
          type: 'tournament',
          category: 'esports',
          users: 180000,
          volume24h: 1200000,
          dataTypes: ['Match Results', 'Player Stats', 'Tournament Data'],
          reliability: 99.92,
          lastUpdate: Date.now() - 120000,
        },
        {
          id: 'game-005',
          name: 'LottoTRON',
          type: 'game',
          category: 'lottery',
          users: 95000,
          volume24h: 650000,
          dataTypes: ['Random Numbers', 'Draw Results'],
          reliability: 99.98,
          lastUpdate: Date.now() - 180000,
        },
      ],
      randomNumberServices: [
        {
          serviceId: 'rng-001',
          name: 'WINkLink VRF',
          requestCount: 15000000,
          averageResponseTime: 85,
          securityLevel: 'high',
          supportedChains: ['TRON', 'BTTC'],
        },
        {
          serviceId: 'rng-002',
          name: 'Gaming Random Oracle',
          requestCount: 8500000,
          averageResponseTime: 95,
          securityLevel: 'high',
          supportedChains: ['TRON'],
        },
        {
          serviceId: 'rng-003',
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

  async getVRFUseCases(): Promise<VRFUseCase[]> {
    return [
      {
        id: 'vrf-001',
        name: 'Random Number Generation',
        description: 'Secure random numbers for gaming',
        category: 'gaming',
        usageCount: 15000000,
        reliability: 99.99,
      },
      {
        id: 'vrf-002',
        name: 'Lottery Draw',
        description: 'Fair lottery drawing mechanism',
        category: 'lottery',
        usageCount: 5200000,
        reliability: 99.98,
      },
      {
        id: 'vrf-003',
        name: 'NFT Minting',
        description: 'Random NFT attribute generation',
        category: 'nft',
        usageCount: 3200000,
        reliability: 99.97,
      },
      {
        id: 'vrf-004',
        name: 'DeFi Randomness',
        description: 'Randomness for DeFi protocols',
        category: 'defi',
        usageCount: 2100000,
        reliability: 99.95,
      },
    ];
  }

  async getGamingCategoryDistribution(): Promise<GamingCategoryDistribution[]> {
    return [
      { category: 'casino', count: 18, percentage: 40, volume24h: 4200000 },
      { category: 'sports', count: 12, percentage: 26.7, volume24h: 3100000 },
      { category: 'esports', count: 8, percentage: 17.8, volume24h: 1800000 },
      { category: 'lottery', count: 7, percentage: 15.5, volume24h: 1400000 },
    ];
  }

  async getTRONNetworkGrowth(): Promise<TRONNetworkGrowth[]> {
    return [
      { month: '2024-06', transactions: 7200000000, accounts: 165000000, tvl: 980000000 },
      { month: '2024-07', transactions: 7500000000, accounts: 168000000, tvl: 1050000000 },
      { month: '2024-08', transactions: 7800000000, accounts: 172000000, tvl: 1120000000 },
      { month: '2024-09', transactions: 8100000000, accounts: 175000000, tvl: 1180000000 },
      { month: '2024-10', transactions: 8300000000, accounts: 178000000, tvl: 1200000000 },
      { month: '2024-11', transactions: 8500000000, accounts: 180000000, tvl: 1200000000 },
    ];
  }

  async getRiskMetrics(): Promise<WINkLinkRiskMetrics> {
    return {
      dataQualityScore: 96.5,
      priceDeviation: 0.12,
      nodeConcentrationRisk: 15.8,
      uptimeRisk: 0.08,
      lastUpdate: Date.now(),
    };
  }
}

export interface VRFUseCase {
  id: string;
  name: string;
  description: string;
  category: 'gaming' | 'defi' | 'nft' | 'lottery';
  usageCount: number;
  reliability: number;
}

export interface GamingCategoryDistribution {
  category: string;
  count: number;
  percentage: number;
  volume24h: number;
}

export interface TRONNetworkGrowth {
  month: string;
  transactions: number;
  accounts: number;
  tvl: number;
}

export interface WINkLinkRiskMetrics {
  dataQualityScore: number;
  priceDeviation: number;
  nodeConcentrationRisk: number;
  uptimeRisk: number;
  lastUpdate: number;
}
