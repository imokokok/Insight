export interface MockDataAnnotation {
  isMock: boolean;
  source: 'mock' | 'api' | 'chain' | 'cache';
  reason?: string;
  lastRealUpdate?: Date;
  confidence?: number;
}

export interface MockDataStatus {
  coveragePoolEvents: MockDataAnnotation;
  latencyDistribution: MockDataAnnotation;
  ohlcPrices: MockDataAnnotation;
  qualityHistory: MockDataAnnotation;
  oevNetworkStats: MockDataAnnotation;
  priceDeviations: MockDataAnnotation;
  dataSources: MockDataAnnotation;
  alerts: MockDataAnnotation;
  stakerRewards: MockDataAnnotation;
  coveragePoolClaims: MockDataAnnotation;
}

export const MOCK_DATA_STATUS: MockDataStatus = {
  coveragePoolEvents: {
    isMock: true,
    source: 'mock',
    reason: 'Coverage pool events API not yet integrated',
    confidence: 0,
  },
  latencyDistribution: {
    isMock: true,
    source: 'mock',
    reason: 'Latency metrics require real-time monitoring infrastructure',
    confidence: 0,
  },
  ohlcPrices: {
    isMock: true,
    source: 'mock',
    reason: 'OHLC data requires historical price feed integration',
    confidence: 0,
  },
  qualityHistory: {
    isMock: true,
    source: 'mock',
    reason: 'Quality metrics history requires monitoring database',
    confidence: 0,
  },
  oevNetworkStats: {
    isMock: true,
    source: 'mock',
    reason: 'OEV Network API endpoints not publicly available',
    confidence: 0,
  },
  priceDeviations: {
    isMock: false,
    source: 'api',
    reason: 'Price deviations calculated from aggregated sources',
    confidence: 0.85,
  },
  dataSources: {
    isMock: false,
    source: 'api',
    reason: 'Data source information from API3 documentation',
    confidence: 0.9,
  },
  alerts: {
    isMock: false,
    source: 'api',
    reason: 'Alerts generated from real-time monitoring',
    confidence: 0.95,
  },
  stakerRewards: {
    isMock: true,
    source: 'mock',
    reason: 'Individual staker data requires authentication',
    confidence: 0,
  },
  coveragePoolClaims: {
    isMock: true,
    source: 'mock',
    reason: 'Claims data requires governance API integration',
    confidence: 0,
  },
};

export function getMockDataAnnotation(dataType: keyof MockDataStatus): MockDataAnnotation {
  return MOCK_DATA_STATUS[dataType];
}

export function isMockData(dataType: keyof MockDataStatus): boolean {
  return MOCK_DATA_STATUS[dataType].isMock;
}

export function getMockDataTypes(): string[] {
  return Object.entries(MOCK_DATA_STATUS)
    .filter(([_, status]) => status.isMock)
    .map(([key]) => key);
}

export function getRealDataTypes(): string[] {
  return Object.entries(MOCK_DATA_STATUS)
    .filter(([_, status]) => !status.isMock)
    .map(([key]) => key);
}

export function getDataConfidence(dataType: keyof MockDataStatus): number {
  const status = MOCK_DATA_STATUS[dataType];
  return status.confidence ?? (status.isMock ? 0 : 1);
}

export function formatMockDataWarning(dataType: keyof MockDataStatus): string | null {
  const status = MOCK_DATA_STATUS[dataType];
  if (!status.isMock) return null;

  return `⚠️ ${dataType} data is simulated (${status.reason})`;
}

export function getOverallMockDataStatus(): {
  total: number;
  mock: number;
  real: number;
  mockPercentage: number;
} {
  const total = Object.keys(MOCK_DATA_STATUS).length;
  const mock = Object.values(MOCK_DATA_STATUS).filter((s) => s.isMock).length;
  const real = total - mock;

  return {
    total,
    mock,
    real,
    mockPercentage: Math.round((mock / total) * 100),
  };
}
