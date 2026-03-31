import type {
  AirnodeNetworkStats,
  DAPICoverage,
  DAPIPriceDeviation,
  DataSourceInfo,
  StakingData,
  FirstPartyOracleData,
  CoveragePoolDetails,
} from './types';

export function getMockAirnodeNetworkStats(): AirnodeNetworkStats {
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

export function getMockDapiCoverage(): DAPICoverage {
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

export async function getMockFirstPartyOracleData(): Promise<FirstPartyOracleData> {
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
    dapiCoverage: getMockDapiCoverage(),
    advantages: {
      noMiddlemen: true,
      sourceTransparency: true,
      responseTime: 180,
    },
  };
}

export function getMockDapiPriceDeviations(): DAPIPriceDeviation[] {
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

export function getMockDataSourceTraceability(): DataSourceInfo[] {
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

export function getMockCoveragePoolDetails(): CoveragePoolDetails {
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
