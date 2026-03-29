import type { QualityDataPoint } from '@/components/oracle/charts/DataQualityTrend';
import type { GasFeeData } from '@/types/comparison';
import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import type { OHLCVDataPoint } from '@/lib/indicators';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

import { BaseOracleClient } from './base';

import type { OracleClientConfig } from './base';
import { isMockDataEnabled } from './api3DataSources';
import { api3DataAggregator } from './api3DataAggregator';
import { api3OnChainService } from './api3OnChainService';

export interface API3Alert {
  id: string;
  type: 'price_deviation' | 'node_offline' | 'coverage_pool_risk' | 'security_event';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  isResolved: boolean;
  metadata?: {
    symbol?: string;
    nodeId?: string;
    threshold?: number;
    currentValue?: number;
    chain?: string;
  };
}

export interface AlertThreshold {
  type: string;
  enabled: boolean;
  threshold: number;
  lastTriggered?: Date;
}

export interface DAPIPriceDeviation {
  symbol: string;
  dapiPrice: number;
  marketPrice: number;
  deviation: number;
  trend: 'expanding' | 'shrinking' | 'stable';
  status: 'normal' | 'warning' | 'critical';
}

export interface DataSourceInfo {
  id: string;
  name: string;
  type: 'exchange' | 'traditional_finance' | 'other';
  credibilityScore: number;
  accuracy: number;
  responseSpeed: number;
  availability: number;
  airnodeAddress: string;
  dapiContract: string;
  chain: string;
}

export interface CoveragePoolEvent {
  id: string;
  type: 'claim' | 'parameter_change' | 'reward_distribution';
  timestamp: Date;
  amount?: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  txHash: string;
  description: string;
}

export interface CoveragePoolDetails {
  totalValueLocked: number;
  collateralizationRatio: number;
  targetCollateralization: number;
  stakerCount: number;
  avgStakeAmount: number;
  pendingClaims: number;
  processedClaims: number;
  totalPayouts: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  lastUpdateTime: Date;
}

export interface CoveragePoolClaim {
  id: string;
  type: 'pending' | 'approved' | 'rejected' | 'processing';
  amount: number;
  requester: string;
  reason: string;
  submittedAt: Date;
  processedAt?: Date;
  transactionHash?: string;
  votingDeadline?: Date;
  votesFor: number;
  votesAgainst: number;
}

export interface StakerReward {
  stakerAddress: string;
  stakedAmount: number;
  pendingRewards: number;
  claimedRewards: number;
  apr: number;
  stakeDate: Date;
  lockEndDate?: Date;
}

export interface AirnodeNetworkStats {
  activeAirnodes: number;
  nodeUptime: number;
  avgResponseTime: number;
  dapiUpdateFrequency: number;
  totalStaked: number;
  dataFeeds: number;
  hourlyActivity: number[];
  status: 'online' | 'warning' | 'offline';
  lastUpdated: Date;
  latency: number;
}

export interface DAPICoverage {
  totalDapis: number;
  byAssetType: {
    crypto: number;
    forex: number;
    commodities: number;
    stocks: number;
  };
  byChain: {
    ethereum: number;
    arbitrum: number;
    polygon: number;
  };
  updateFrequency: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface StakingData {
  totalStaked: number;
  stakingApr: number;
  stakerCount: number;
  coveragePool: {
    totalValue: number;
    coverageRatio: number;
    historicalPayouts: number;
  };
}

export interface OEVAuction {
  id: string;
  dappName: string;
  dapiName: string;
  auctionAmount: number;
  winner: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'cancelled';
  transactionHash?: string;
}

export interface OEVParticipant {
  id: string;
  name: string;
  type: 'searcher' | 'dapp';
  totalVolume: number;
  auctionsWon: number;
  lastActive: Date;
}

export interface OEVNetworkStats {
  totalOevCaptured: number;
  activeAuctions: number;
  totalParticipants: number;
  totalDapps: number;
  avgAuctionValue: number;
  last24hVolume: number;
  participantList: OEVParticipant[];
  recentAuctions: OEVAuction[];
}

export interface FirstPartyOracleData {
  airnodeDeployments: {
    total: number;
    byRegion: {
      northAmerica: number;
      europe: number;
      asia: number;
      others: number;
    };
    byChain: {
      ethereum: number;
      arbitrum: number;
      polygon: number;
    };
    byProviderType: {
      exchanges: number;
      traditionalFinance: number;
      others: number;
    };
  };
  dapiCoverage: DAPICoverage;
  advantages: {
    noMiddlemen: boolean;
    sourceTransparency: boolean;
    responseTime: number;
  };
}

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
        const networkData = await api3DataAggregator.aggregateNetworkData();
        return networkData.airnodeStats;
      },
      () => this.getMockAirnodeNetworkStats(),
      'airnode-stats'
    );
  }

  private getMockAirnodeNetworkStats(): AirnodeNetworkStats {
    return {
      activeAirnodes: 156,
      nodeUptime: 99.7,
      avgResponseTime: 180,
      dapiUpdateFrequency: 60,
      totalStaked: 25000000,
      dataFeeds: 168,
      hourlyActivity: [
        1200, 1100, 950, 800, 750, 900, 1400, 2100, 2800, 3200, 3500, 3800, 3600, 3400, 3100, 3300,
        3500, 3700, 3400, 2900, 2400, 1900, 1500, 1300,
      ],
      status: 'online',
      lastUpdated: new Date(),
      latency: 85,
    };
  }

  async getDapiCoverage(): Promise<DAPICoverage> {
    return this.withFallback(
      async () => {
        const networkData = await api3DataAggregator.aggregateNetworkData();
        return networkData.dapiCoverage;
      },
      () => this.getMockDapiCoverage(),
      'dapi-coverage'
    );
  }

  private getMockDapiCoverage(): DAPICoverage {
    return {
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
  }

  async getStakingData(): Promise<StakingData> {
    return this.withFallback(
      async () => api3DataAggregator.aggregateStakingData(),
      () => this.getMockStakingData(),
      'staking-data'
    );
  }

  private getMockStakingData(): StakingData {
    return {
      totalStaked: 25000000,
      stakingApr: 12.5,
      stakerCount: 3240,
      coveragePool: {
        totalValue: 8500000,
        coverageRatio: 0.34,
        historicalPayouts: 125000,
      },
    };
  }

  async getFirstPartyOracleData(): Promise<FirstPartyOracleData> {
    return this.withFallback(
      async () => {
        const networkData = await api3DataAggregator.aggregateNetworkData();
        return networkData.firstPartyData;
      },
      () => this.getMockFirstPartyOracleData(),
      'first-party-data'
    );
  }

  private async getMockFirstPartyOracleData(): Promise<FirstPartyOracleData> {
    return {
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
      dapiCoverage: this.getMockDapiCoverage(),
      advantages: {
        noMiddlemen: true,
        sourceTransparency: true,
        responseTime: 180,
      },
    };
  }

  async getLatencyDistribution(): Promise<number[]> {
    const samples: number[] = [];
    const baseLatency = 180;
    for (let i = 0; i < 100; i++) {
      const variance = (Math.random() - 0.5) * 200;
      const spike = Math.random() > 0.95 ? Math.random() * 150 : 0;
      samples.push(Math.max(50, Math.round(baseLatency + variance + spike)));
    }
    return samples;
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
      async () => api3DataAggregator.aggregatePriceDeviations(),
      () => this.getMockDapiPriceDeviations(),
      'price-deviations'
    );
  }

  private getMockDapiPriceDeviations(): DAPIPriceDeviation[] {
    return [
      {
        symbol: 'BTC/USD',
        dapiPrice: 68050.25,
        marketPrice: 68120.5,
        deviation: 0.1,
        trend: 'shrinking',
        status: 'normal',
      },
      {
        symbol: 'ETH/USD',
        dapiPrice: 3505.8,
        marketPrice: 3498.2,
        deviation: 0.22,
        trend: 'stable',
        status: 'normal',
      },
      {
        symbol: 'SOL/USD',
        dapiPrice: 180.45,
        marketPrice: 182.3,
        deviation: 1.02,
        trend: 'expanding',
        status: 'warning',
      },
      {
        symbol: 'API3/USD',
        dapiPrice: 2.82,
        marketPrice: 2.78,
        deviation: 1.44,
        trend: 'shrinking',
        status: 'normal',
      },
      {
        symbol: 'AVAX/USD',
        dapiPrice: 42.15,
        marketPrice: 42.8,
        deviation: 1.52,
        trend: 'expanding',
        status: 'warning',
      },
      {
        symbol: 'MATIC/USD',
        dapiPrice: 0.582,
        marketPrice: 0.5795,
        deviation: 0.43,
        trend: 'stable',
        status: 'normal',
      },
      {
        symbol: 'LINK/USD',
        dapiPrice: 18.45,
        marketPrice: 18.72,
        deviation: 1.44,
        trend: 'expanding',
        status: 'warning',
      },
      {
        symbol: 'DOT/USD',
        dapiPrice: 8.25,
        marketPrice: 8.18,
        deviation: 0.86,
        trend: 'shrinking',
        status: 'normal',
      },
      {
        symbol: 'ATOM/USD',
        dapiPrice: 11.82,
        marketPrice: 11.95,
        deviation: 1.09,
        trend: 'stable',
        status: 'normal',
      },
      {
        symbol: 'UNI/USD',
        dapiPrice: 9.45,
        marketPrice: 9.12,
        deviation: 3.62,
        trend: 'expanding',
        status: 'critical',
      },
    ];
  }

  async getDataSourceTraceability(): Promise<DataSourceInfo[]> {
    return this.withFallback(
      async () => api3DataAggregator.aggregateDataSources(),
      () => this.getMockDataSourceTraceability(),
      'data-sources'
    );
  }

  private getMockDataSourceTraceability(): DataSourceInfo[] {
    return [
      {
        id: 'src-001',
        name: 'Binance Oracle',
        type: 'exchange',
        credibilityScore: 95,
        accuracy: 99.8,
        responseSpeed: 120,
        availability: 99.9,
        airnodeAddress: '0x1a2B3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T',
        dapiContract: '0xa1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0',
        chain: 'Ethereum',
      },
      {
        id: 'src-002',
        name: 'Coinbase Prime',
        type: 'exchange',
        credibilityScore: 98,
        accuracy: 99.9,
        responseSpeed: 95,
        availability: 99.95,
        airnodeAddress: '0x2b3C4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t1U',
        dapiContract: '0xb2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1',
        chain: 'Arbitrum',
      },
      {
        id: 'src-003',
        name: 'Bloomberg Terminal',
        type: 'traditional_finance',
        credibilityScore: 99,
        accuracy: 99.95,
        responseSpeed: 50,
        availability: 99.99,
        airnodeAddress: '0x3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V',
        dapiContract: '0xc3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2',
        chain: 'Ethereum',
      },
      {
        id: 'src-004',
        name: 'Reuters FX',
        type: 'traditional_finance',
        credibilityScore: 98,
        accuracy: 99.92,
        responseSpeed: 65,
        availability: 99.98,
        airnodeAddress: '0x4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t1U2v3W',
        dapiContract: '0xd4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3',
        chain: 'Polygon',
      },
      {
        id: 'src-005',
        name: 'Kraken Exchange',
        type: 'exchange',
        credibilityScore: 94,
        accuracy: 99.7,
        responseSpeed: 140,
        availability: 99.85,
        airnodeAddress: '0x5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V3w4X',
        dapiContract: '0xe5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4',
        chain: 'Ethereum',
      },
      {
        id: 'src-006',
        name: 'Goldman Sachs API',
        type: 'traditional_finance',
        credibilityScore: 97,
        accuracy: 99.88,
        responseSpeed: 80,
        availability: 99.92,
        airnodeAddress: '0x6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t1U2v3W4x5Y',
        dapiContract: '0xf6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3x4Y5',
        chain: 'Arbitrum',
      },
    ];
  }

  async getCoveragePoolEvents(): Promise<CoveragePoolEvent[]> {
    const events: CoveragePoolEvent[] = [];
    const baseTime = Date.now();

    events.push({
      id: 'evt-001',
      type: 'reward_distribution',
      timestamp: new Date(baseTime - 3600000),
      amount: 12500,
      status: 'completed',
      txHash: '0xabc123def456789012345678901234567890abcdef1234567890abcdef123456',
      description: 'Weekly staking rewards distributed to coverage pool stakers',
    });

    events.push({
      id: 'evt-002',
      type: 'claim',
      timestamp: new Date(baseTime - 86400000),
      amount: 50000,
      status: 'approved',
      txHash: '0xdef456abc789012345678901234567890abcdef1234567890abcdef123456789',
      description: 'Price deviation claim for BTC/USD feed on Arbitrum',
    });

    events.push({
      id: 'evt-003',
      type: 'parameter_change',
      timestamp: new Date(baseTime - 172800000),
      status: 'completed',
      txHash: '0x123abc456def78901234567890123456789abcdef1234567890abcdef123456',
      description: 'Coverage ratio threshold updated from 0.30 to 0.34',
    });

    events.push({
      id: 'evt-004',
      type: 'reward_distribution',
      timestamp: new Date(baseTime - 259200000),
      amount: 11800,
      status: 'completed',
      txHash: '0x456def789abc012345678901234567890abcdef1234567890abcdef123456789',
      description: 'Weekly staking rewards distributed to coverage pool stakers',
    });

    events.push({
      id: 'evt-005',
      type: 'claim',
      timestamp: new Date(baseTime - 345600000),
      amount: 25000,
      status: 'rejected',
      txHash: '0x789abc012def345678901234567890abcdef1234567890abcdef123456789012',
      description: 'Invalid claim for ETH/USD feed - deviation within acceptable range',
    });

    events.push({
      id: 'evt-006',
      type: 'parameter_change',
      timestamp: new Date(baseTime - 432000000),
      status: 'completed',
      txHash: '0xabc012345def678901234567890abcdef1234567890abcdef123456789012345',
      description: 'Staking APR adjusted from 11.8% to 12.5%',
    });

    events.push({
      id: 'evt-007',
      type: 'claim',
      timestamp: new Date(baseTime - 518400000),
      amount: 75000,
      status: 'completed',
      txHash: '0xdef789012abc345678901234567890abcdef1234567890abcdef123456789012',
      description: 'Major claim for SOL/USD feed manipulation incident',
    });

    events.push({
      id: 'evt-008',
      type: 'reward_distribution',
      timestamp: new Date(baseTime - 604800000),
      amount: 11200,
      status: 'completed',
      txHash: '0x012345def789abc678901234567890abcdef1234567890abcdef123456789012',
      description: 'Weekly staking rewards distributed to coverage pool stakers',
    });

    events.push({
      id: 'evt-009',
      type: 'parameter_change',
      timestamp: new Date(baseTime - 691200000),
      status: 'completed',
      txHash: '0x345678def012abc901234567890abcdef1234567890abcdef123456789012345',
      description: 'Claim review period extended from 24h to 48h',
    });

    events.push({
      id: 'evt-010',
      type: 'claim',
      timestamp: new Date(baseTime - 777600000),
      amount: 15000,
      status: 'pending',
      txHash: '0x678901def234abc5678901234567890abcdef1234567890abcdef123456789012',
      description: 'Pending claim for LINK/USD feed latency issue',
    });

    events.push({
      id: 'evt-011',
      type: 'reward_distribution',
      timestamp: new Date(baseTime - 864000000),
      amount: 10500,
      status: 'completed',
      txHash: '0x901234def567abc8901234567890abcdef1234567890abcdef123456789012345',
      description: 'Weekly staking rewards distributed to coverage pool stakers',
    });

    events.push({
      id: 'evt-012',
      type: 'parameter_change',
      timestamp: new Date(baseTime - 950400000),
      status: 'completed',
      txHash: '0x234567def890abc1234567890abcdef1234567890abcdef123456789012345678',
      description: 'Minimum stake amount reduced from 1000 to 500 API3',
    });

    events.push({
      id: 'evt-013',
      type: 'claim',
      timestamp: new Date(baseTime - 1036800000),
      amount: 35000,
      status: 'approved',
      txHash: '0x567890def123abc45678901234567890abcdef1234567890abcdef123456789012',
      description: 'Approved claim for MATIC/USD feed during network congestion',
    });

    events.push({
      id: 'evt-014',
      type: 'reward_distribution',
      timestamp: new Date(baseTime - 1123200000),
      amount: 9800,
      status: 'completed',
      txHash: '0x890123def456abc78901234567890abcdef1234567890abcdef123456789012345',
      description: 'Weekly staking rewards distributed to coverage pool stakers',
    });

    events.push({
      id: 'evt-015',
      type: 'parameter_change',
      timestamp: new Date(baseTime - 1209600000),
      status: 'completed',
      txHash: '0x123456def789abc01234567890abcdef1234567890abcdef123456789012345678',
      description: 'Coverage pool collateralization target increased to 150%',
    });

    return events;
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
    chain?: Blockchain,
    period: number = 30
  ): Promise<OHLCVDataPoint[]> {
    if (!symbol) {
      throw this.createError('Symbol is required', 'INVALID_SYMBOL');
    }
    const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;
    const prices: OHLCVDataPoint[] = [];
    const now = Date.now();
    const interval = 24 * 60 * 60 * 1000; // 1 day

    for (let i = period; i >= 0; i--) {
      const timestamp = now - i * interval;
      const randomChange = (Math.random() - 0.5) * 0.05;
      const price = basePrice * (1 + randomChange);
      const volatility = basePrice * 0.02;

      // 确保 high >= low
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

    return prices;
  }

  async getQualityHistory(): Promise<QualityDataPoint[]> {
    const history: QualityDataPoint[] = [];
    const now = Date.now();
    const interval = 60 * 60 * 1000; // 1 hour

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

    return history;
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

  async getOEVNetworkStats(): Promise<OEVNetworkStats> {
    const participants: OEVParticipant[] = [
      {
        id: 'p1',
        name: 'FlashBots',
        type: 'searcher',
        totalVolume: 2850000,
        auctionsWon: 156,
        lastActive: new Date(Date.now() - 3600000),
      },
      {
        id: 'p2',
        name: 'Aave Protocol',
        type: 'dapp',
        totalVolume: 1920000,
        auctionsWon: 89,
        lastActive: new Date(Date.now() - 7200000),
      },
      {
        id: 'p3',
        name: 'MEV Protect',
        type: 'searcher',
        totalVolume: 1540000,
        auctionsWon: 72,
        lastActive: new Date(Date.now() - 1800000),
      },
      {
        id: 'p4',
        name: 'Compound Finance',
        type: 'dapp',
        totalVolume: 1280000,
        auctionsWon: 65,
        lastActive: new Date(Date.now() - 5400000),
      },
      {
        id: 'p5',
        name: 'Builder0x69',
        type: 'searcher',
        totalVolume: 980000,
        auctionsWon: 48,
        lastActive: new Date(Date.now() - 900000),
      },
      {
        id: 'p6',
        name: 'Uniswap V3',
        type: 'dapp',
        totalVolume: 875000,
        auctionsWon: 42,
        lastActive: new Date(Date.now() - 10800000),
      },
    ];

    const recentAuctions: OEVAuction[] = [];
    const dapps = ['Aave', 'Compound', 'Uniswap', 'SushiSwap', 'Curve'];
    const dapis = ['ETH/USD', 'BTC/USD', 'USDC/USD', 'DAI/USD', 'WBTC/USD'];
    const statuses: Array<'pending' | 'completed' | 'cancelled'> = ['completed', 'completed', 'completed', 'pending', 'cancelled'];

    for (let i = 0; i < 10; i++) {
      recentAuctions.push({
        id: `auction-${i + 1}`,
        dappName: dapps[i % dapps.length],
        dapiName: dapis[i % dapis.length],
        auctionAmount: Math.floor(Math.random() * 50000) + 5000,
        winner: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
        timestamp: new Date(Date.now() - i * 3600000 * 2),
        status: statuses[i % statuses.length],
        transactionHash: i % 3 !== 2 ? `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}` : undefined,
      });
    }

    return {
      totalOevCaptured: 12450000,
      activeAuctions: 12,
      totalParticipants: 89,
      totalDapps: 34,
      avgAuctionValue: 18500,
      last24hVolume: 892000,
      participantList: participants,
      recentAuctions,
    };
  }

  async getOEVAuctions(limit: number = 20): Promise<OEVAuction[]> {
    const auctions: OEVAuction[] = [];
    const dapps = ['Aave', 'Compound', 'Uniswap', 'SushiSwap', 'Curve', 'Balancer', 'Yearn'];
    const dapis = ['ETH/USD', 'BTC/USD', 'USDC/USD', 'DAI/USD', 'WBTC/USD', 'LINK/USD', 'MATIC/USD'];
    const statuses: Array<'pending' | 'completed' | 'cancelled'> = ['completed', 'completed', 'completed', 'pending', 'cancelled'];

    for (let i = 0; i < limit; i++) {
      const status = statuses[i % statuses.length];
      auctions.push({
        id: `auction-${Date.now()}-${i}`,
        dappName: dapps[i % dapps.length],
        dapiName: dapis[i % dapis.length],
        auctionAmount: Math.floor(Math.random() * 80000) + 2000,
        winner: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
        timestamp: new Date(Date.now() - i * 1800000),
        status,
        transactionHash: status !== 'pending' ? `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}` : undefined,
      });
    }

    return auctions;
  }

  async getActiveAlerts(): Promise<API3Alert[]> {
    const now = Date.now();
    return [
      {
        id: 'alert-001',
        type: 'price_deviation',
        severity: 'critical',
        title: 'UNI/USD 价格偏差过高',
        message: 'UNI/USD dAPI 价格与市场价格偏差达到 3.62%，超过临界阈值 3%',
        timestamp: new Date(now - 300000),
        isRead: false,
        isResolved: false,
        metadata: {
          symbol: 'UNI/USD',
          threshold: 3,
          currentValue: 3.62,
          chain: 'Ethereum',
        },
      },
      {
        id: 'alert-002',
        type: 'price_deviation',
        severity: 'warning',
        title: 'AVAX/USD 价格偏差警告',
        message: 'AVAX/USD dAPI 价格与市场价格偏差达到 1.52%，建议关注',
        timestamp: new Date(now - 600000),
        isRead: false,
        isResolved: false,
        metadata: {
          symbol: 'AVAX/USD',
          threshold: 1.5,
          currentValue: 1.52,
          chain: 'Avalanche',
        },
      },
      {
        id: 'alert-003',
        type: 'price_deviation',
        severity: 'warning',
        title: 'LINK/USD 价格偏差警告',
        message: 'LINK/USD dAPI 价格与市场价格偏差达到 1.44%，呈扩大趋势',
        timestamp: new Date(now - 900000),
        isRead: true,
        isResolved: false,
        metadata: {
          symbol: 'LINK/USD',
          threshold: 1.5,
          currentValue: 1.44,
          chain: 'Ethereum',
        },
      },
      {
        id: 'alert-004',
        type: 'node_offline',
        severity: 'warning',
        title: 'Airnode 节点响应延迟',
        message: '亚太地区部分 Airnode 节点响应时间超过 500ms',
        timestamp: new Date(now - 1800000),
        isRead: true,
        isResolved: false,
        metadata: {
          nodeId: 'airnode-ap-003',
          threshold: 300,
          currentValue: 520,
        },
      },
      {
        id: 'alert-005',
        type: 'coverage_pool_risk',
        severity: 'info',
        title: '覆盖池抵押率下降',
        message: '覆盖池抵押率从 38% 下降至 34%，建议增加质押',
        timestamp: new Date(now - 3600000),
        isRead: true,
        isResolved: true,
        metadata: {
          threshold: 40,
          currentValue: 34,
        },
      },
    ];
  }

  async getAlertHistory(limit: number = 20): Promise<API3Alert[]> {
    const now = Date.now();
    const alerts: API3Alert[] = [];
    const types: API3Alert['type'][] = ['price_deviation', 'node_offline', 'coverage_pool_risk', 'security_event'];
    const severities: API3Alert['severity'][] = ['info', 'warning', 'critical'];
    const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'LINK/USD', 'UNI/USD'];

    for (let i = 0; i < limit; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const isResolved = Math.random() > 0.3;
      const isRead = isResolved || Math.random() > 0.5;

      alerts.push({
        id: `alert-history-${i}`,
        type,
        severity,
        title: this.generateAlertTitle(type, symbol),
        message: this.generateAlertMessage(type, symbol, severity),
        timestamp: new Date(now - (i + 1) * 3600000 * Math.random() * 24),
        isRead,
        isResolved,
        metadata: {
          symbol,
          threshold: 1.5 + Math.random() * 2,
          currentValue: 2 + Math.random() * 3,
          chain: 'Ethereum',
        },
      });
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getAlertThresholds(): Promise<AlertThreshold[]> {
    return [
      {
        type: 'price_deviation_warning',
        enabled: true,
        threshold: 1.5,
        lastTriggered: new Date(Date.now() - 3600000),
      },
      {
        type: 'price_deviation_critical',
        enabled: true,
        threshold: 3.0,
        lastTriggered: new Date(Date.now() - 7200000),
      },
      {
        type: 'node_response_time',
        enabled: true,
        threshold: 500,
        lastTriggered: new Date(Date.now() - 1800000),
      },
      {
        type: 'coverage_pool_ratio',
        enabled: true,
        threshold: 30,
        lastTriggered: new Date(Date.now() - 86400000),
      },
      {
        type: 'node_offline',
        enabled: true,
        threshold: 5,
      },
    ];
  }

  async getCoveragePoolDetails(): Promise<CoveragePoolDetails> {
    return this.withFallback(
      async () => api3DataAggregator.aggregateCoveragePoolDetails(),
      () => this.getMockCoveragePoolDetails(),
      'coverage-pool-details'
    );
  }

  private getMockCoveragePoolDetails(): CoveragePoolDetails {
    const collateralizationRatio = 156.8;
    const targetCollateralization = 150;
    
    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (collateralizationRatio < targetCollateralization * 0.8) {
      healthStatus = 'critical';
    } else if (collateralizationRatio < targetCollateralization) {
      healthStatus = 'warning';
    }

    return {
      totalValueLocked: 8500000,
      collateralizationRatio,
      targetCollateralization,
      stakerCount: 3240,
      avgStakeAmount: 2623,
      pendingClaims: 3,
      processedClaims: 47,
      totalPayouts: 285000,
      healthStatus,
      lastUpdateTime: new Date(),
    };
  }

  private generateAlertTitle(type: API3Alert['type'], symbol: string): string {
    const titles: Record<API3Alert['type'], string> = {
      price_deviation: `${symbol} 价格偏差警告`,
      node_offline: 'Airnode 节点异常',
      coverage_pool_risk: '覆盖池风险警告',
      security_event: '安全事件通知',
    };
    return titles[type];
  }

  private generateAlertMessage(type: API3Alert['type'], symbol: string, severity: API3Alert['severity']): string {
    const messages: Record<API3Alert['type'], Record<API3Alert['severity'], string>> = {
      price_deviation: {
        info: `${symbol} 价格偏差轻微，持续监控中`,
        warning: `${symbol} dAPI 价格与市场价格偏差超过阈值，建议关注`,
        critical: `${symbol} 价格偏差严重，需要立即处理`,
      },
      node_offline: {
        info: '部分节点响应时间增加',
        warning: '多个 Airnode 节点响应延迟',
        critical: '关键 Airnode 节点离线',
      },
      coverage_pool_risk: {
        info: '覆盖池抵押率接近阈值',
        warning: '覆盖池抵押率低于推荐值',
        critical: '覆盖池抵押率严重不足',
      },
      security_event: {
        info: '检测到潜在安全风险',
        warning: '发现异常交易活动',
        critical: '安全事件需要立即处理',
      },
    };
    return messages[type][severity];
  }

  async getCoveragePoolClaims(status?: string): Promise<CoveragePoolClaim[]> {
    const allClaims: CoveragePoolClaim[] = [
      {
        id: 'claim-001',
        type: 'pending',
        amount: 50000,
        requester: '0x1a2B3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T',
        reason: 'Price deviation claim for BTC/USD feed on Arbitrum - deviation exceeded 2% threshold',
        submittedAt: new Date(Date.now() - 86400000 * 2),
        votingDeadline: new Date(Date.now() + 86400000),
        votesFor: 1250000,
        votesAgainst: 320000,
      },
      {
        id: 'claim-002',
        type: 'processing',
        amount: 25000,
        requester: '0x2b3C4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t1U',
        reason: 'ETH/USD feed manipulation incident during high volatility period',
        submittedAt: new Date(Date.now() - 86400000 * 5),
        processedAt: new Date(Date.now() - 86400000),
        transactionHash: '0xabc123def456789012345678901234567890abcdef1234567890abcdef123456',
        votesFor: 2100000,
        votesAgainst: 180000,
      },
      {
        id: 'claim-003',
        type: 'approved',
        amount: 75000,
        requester: '0x3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V',
        reason: 'SOL/USD feed manipulation incident - confirmed malicious activity',
        submittedAt: new Date(Date.now() - 86400000 * 15),
        processedAt: new Date(Date.now() - 86400000 * 10),
        transactionHash: '0xdef456abc789012345678901234567890abcdef1234567890abcdef123456789',
        votesFor: 3500000,
        votesAgainst: 45000,
      },
      {
        id: 'claim-004',
        type: 'rejected',
        amount: 15000,
        requester: '0x4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t1U2v3W',
        reason: 'Invalid claim for LINK/USD feed - deviation within acceptable range',
        submittedAt: new Date(Date.now() - 86400000 * 20),
        processedAt: new Date(Date.now() - 86400000 * 18),
        votesFor: 280000,
        votesAgainst: 2850000,
      },
      {
        id: 'claim-005',
        type: 'approved',
        amount: 35000,
        requester: '0x5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V3w4X',
        reason: 'MATIC/USD feed during network congestion - delayed price updates',
        submittedAt: new Date(Date.now() - 86400000 * 30),
        processedAt: new Date(Date.now() - 86400000 * 25),
        transactionHash: '0x123abc456def78901234567890123456789abcdef1234567890abcdef123456',
        votesFor: 1890000,
        votesAgainst: 95000,
      },
      {
        id: 'claim-006',
        type: 'pending',
        amount: 18000,
        requester: '0x6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t1U2v3W4x5Y',
        reason: 'AVAX/USD feed latency issue causing user losses',
        submittedAt: new Date(Date.now() - 86400000),
        votingDeadline: new Date(Date.now() + 86400000 * 2),
        votesFor: 890000,
        votesAgainst: 156000,
      },
    ];

    if (status && status !== 'all') {
      return allClaims.filter(claim => claim.type === status);
    }
    return allClaims;
  }

  async getStakerRewards(address?: string): Promise<StakerReward[]> {
    const allStakers: StakerReward[] = [
      {
        stakerAddress: '0x1a2B3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T',
        stakedAmount: 15000,
        pendingRewards: 156.25,
        claimedRewards: 2340.50,
        apr: 12.5,
        stakeDate: new Date(Date.now() - 86400000 * 180),
        lockEndDate: new Date(Date.now() + 86400000 * 30),
      },
      {
        stakerAddress: '0x2b3C4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t1U',
        stakedAmount: 8500,
        pendingRewards: 88.54,
        claimedRewards: 1325.80,
        apr: 12.5,
        stakeDate: new Date(Date.now() - 86400000 * 150),
      },
      {
        stakerAddress: '0x3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V',
        stakedAmount: 25000,
        pendingRewards: 260.42,
        claimedRewards: 3900.75,
        apr: 12.5,
        stakeDate: new Date(Date.now() - 86400000 * 200),
        lockEndDate: new Date(Date.now() + 86400000 * 60),
      },
      {
        stakerAddress: '0x4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t1U2v3W',
        stakedAmount: 5200,
        pendingRewards: 54.17,
        claimedRewards: 811.25,
        apr: 12.5,
        stakeDate: new Date(Date.now() - 86400000 * 120),
      },
      {
        stakerAddress: '0x5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V3w4X',
        stakedAmount: 12000,
        pendingRewards: 125.00,
        claimedRewards: 1872.40,
        apr: 12.5,
        stakeDate: new Date(Date.now() - 86400000 * 160),
      },
      {
        stakerAddress: '0x6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t1U2v3W4x5Y',
        stakedAmount: 3200,
        pendingRewards: 33.33,
        claimedRewards: 499.50,
        apr: 12.5,
        stakeDate: new Date(Date.now() - 86400000 * 90),
      },
      {
        stakerAddress: '0x7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V3w4X5y6Z',
        stakedAmount: 45000,
        pendingRewards: 468.75,
        claimedRewards: 7021.50,
        apr: 12.5,
        stakeDate: new Date(Date.now() - 86400000 * 220),
        lockEndDate: new Date(Date.now() + 86400000 * 45),
      },
      {
        stakerAddress: '0x8h9I0j1K2l3M4n5O6p7Q8r9S0t1U2v3W4x5Y6z7A',
        stakedAmount: 6800,
        pendingRewards: 70.83,
        claimedRewards: 1061.25,
        apr: 12.5,
        stakeDate: new Date(Date.now() - 86400000 * 100),
      },
    ];

    if (address) {
      return allStakers.filter(staker => 
        staker.stakerAddress.toLowerCase() === address.toLowerCase()
      );
    }
    return allStakers;
  }
}
