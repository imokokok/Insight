import type {
  StakingData,
  CoveragePoolDetails,
  AirnodeNetworkStats,
  DAPICoverage,
  OEVNetworkStats,
  FirstPartyOracleData,
  DAPIPriceDeviation,
  DataSourceInfo,
} from './api3';

export interface AggregatedMarketData {
  dapis: DAPIMarketData[];
  chains: ChainData[];
  lastUpdated: Date;
}

export interface DAPIMarketData {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  change24hPercent: number;
  chain: string;
  updateFrequency: number;
  lastUpdated: Date;
  status: 'active' | 'inactive' | 'degraded';
}

export interface ChainData {
  id: string;
  name: string;
  dapiCount: number;
  status: 'active' | 'inactive';
}

export interface AggregatedNetworkData {
  airnodeStats: AirnodeNetworkStats;
  dapiCoverage: DAPICoverage;
  firstPartyData: FirstPartyOracleData;
  lastUpdated: Date;
}

export interface AggregatedOEVData {
  stats: OEVNetworkStats;
  recentAuctions: OEVAuctionData[];
  lastUpdated: Date;
}

export interface OEVAuctionData {
  id: string;
  dappName: string;
  dapiName: string;
  amount: number;
  winner: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'cancelled';
}

export function generateHourlyActivity(): number[] {
  return [
    1200, 1100, 950, 800, 750, 900, 1400, 2100, 2800, 3200, 3500, 3800, 3600, 3400, 3100, 3300,
    3500, 3700, 3400, 2900, 2400, 1900, 1500, 1300,
  ];
}

export function getMockDAPIData(): DAPIMarketData[] {
  return [
    {
      id: 'btc-usd',
      name: 'BTC/USD',
      symbol: 'BTC',
      price: 68050.25,
      change24h: 1250.5,
      change24hPercent: 1.87,
      chain: 'ethereum',
      updateFrequency: 60,
      lastUpdated: new Date(),
      status: 'active',
    },
    {
      id: 'eth-usd',
      name: 'ETH/USD',
      symbol: 'ETH',
      price: 3505.8,
      change24h: 85.2,
      change24hPercent: 2.49,
      chain: 'ethereum',
      updateFrequency: 60,
      lastUpdated: new Date(),
      status: 'active',
    },
  ];
}

export function getMockMarketData(): AggregatedMarketData {
  return {
    dapis: getMockDAPIData(),
    chains: [
      { id: '1', name: 'Ethereum', dapiCount: 89, status: 'active' },
      { id: '42161', name: 'Arbitrum', dapiCount: 45, status: 'active' },
      { id: '137', name: 'Polygon', dapiCount: 34, status: 'active' },
    ],
    lastUpdated: new Date(),
  };
}

export function getMockNetworkData(): AggregatedNetworkData {
  return {
    airnodeStats: {
      activeAirnodes: 156,
      nodeUptime: 99.7,
      avgResponseTime: 180,
      dapiUpdateFrequency: 60,
      totalStaked: 25000000,
      dataFeeds: 168,
      hourlyActivity: generateHourlyActivity(),
      status: 'online',
      lastUpdated: new Date(),
      latency: 85,
    },
    dapiCoverage: {
      totalDapis: 168,
      byAssetType: { crypto: 120, forex: 28, commodities: 12, stocks: 8 },
      byChain: { ethereum: 89, arbitrum: 45, polygon: 34 },
      updateFrequency: { high: 45, medium: 78, low: 45 },
    },
    firstPartyData: {
      airnodeDeployments: {
        total: 156,
        byRegion: { northAmerica: 58, europe: 47, asia: 38, others: 13 },
        byChain: { ethereum: 89, arbitrum: 45, polygon: 22 },
        byProviderType: { exchanges: 68, traditionalFinance: 52, others: 36 },
      },
      dapiCoverage: {
        totalDapis: 168,
        byAssetType: { crypto: 120, forex: 28, commodities: 12, stocks: 8 },
        byChain: { ethereum: 89, arbitrum: 45, polygon: 34 },
        updateFrequency: { high: 45, medium: 78, low: 45 },
      },
      advantages: { noMiddlemen: true, sourceTransparency: true, responseTime: 180 },
    },
    lastUpdated: new Date(),
  };
}

export function getMockOEVData(): AggregatedOEVData {
  return {
    stats: {
      totalOevCaptured: 12450000,
      activeAuctions: 12,
      totalParticipants: 89,
      totalDapps: 34,
      avgAuctionValue: 18500,
      last24hVolume: 892000,
      participantList: [],
      recentAuctions: [],
    },
    recentAuctions: [],
    lastUpdated: new Date(),
  };
}

export function getMockStakingData(): StakingData {
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

export function getMockCoveragePoolDetails(): CoveragePoolDetails {
  return {
    totalValueLocked: 8500000,
    collateralizationRatio: 156.8,
    targetCollateralization: 150,
    stakerCount: 3240,
    avgStakeAmount: 2623,
    pendingClaims: 3,
    processedClaims: 47,
    totalPayouts: 285000,
    healthStatus: 'healthy',
    lastUpdateTime: new Date(),
  };
}

export function getMockPriceDeviations(): DAPIPriceDeviation[] {
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
      symbol: 'UNI/USD',
      dapiPrice: 9.45,
      marketPrice: 9.12,
      deviation: 3.62,
      trend: 'expanding',
      status: 'critical',
    },
  ];
}

export function getMockDataSources(): DataSourceInfo[] {
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
  ];
}
