import {
  dataCache,
  CACHE_EXPIRY_TIMES,
  getCachedOracleData,
  setCachedOracleData,
  getCachedAssets,
  setCachedAssets,
  getCachedTrendData,
  setCachedTrendData,
  getCachedChainBreakdown,
  setCachedChainBreakdown,
  getCachedProtocolDetails,
  setCachedProtocolDetails,
  getCachedAssetCategories,
  setCachedAssetCategories,
  getCachedComparisonData,
  setCachedComparisonData,
  getCachedBenchmarkData,
  setCachedBenchmarkData,
  getCachedCorrelationData,
  setCachedCorrelationData,
  getCachedRiskMetrics,
  setCachedRiskMetrics,
  getCachedAnomalies,
  setCachedAnomalies,
} from '../utils/dataCache';

import type {
  OracleMarketData,
  AssetData,
  TVSTrendData,
  ChainBreakdown,
  ProtocolDetail,
  AssetCategory,
  ComparisonData,
  BenchmarkData,
  CorrelationData,
  RiskMetrics,
  AnomalyData,
} from '../types';

const mockOracleData: OracleMarketData[] = [
  {
    name: 'Chainlink',
    share: 45.5,
    color: '#375BD2',
    tvs: '$45.5B',
    tvsValue: 45.5,
    chains: 50,
    protocols: 1800,
    avgLatency: 12,
    accuracy: 99.98,
    updateFrequency: 1,
    change24h: 2.5,
    change7d: 5.2,
    change30d: 12.3,
  },
  {
    name: 'Pyth',
    share: 25.3,
    color: '#FF6B35',
    tvs: '$25.3B',
    tvsValue: 25.3,
    chains: 40,
    protocols: 450,
    avgLatency: 8,
    accuracy: 99.95,
    updateFrequency: 0.4,
    change24h: 3.1,
    change7d: 8.1,
    change30d: 15.7,
  },
];

const mockAssets: AssetData[] = [
  {
    symbol: 'BTC',
    price: 68000,
    change24h: 2.5,
    change7d: 5.2,
    volume24h: 25000000000,
    marketCap: 1300000000000,
    primaryOracle: 'Chainlink',
    oracleCount: 5,
    priceSources: [],
  },
];

const mockTrendData: TVSTrendData[] = [
  {
    timestamp: Date.now(),
    date: '2024-01-01',
    chainlink: 45.5,
    chainlinkUpper: 46.0,
    chainlinkLower: 45.0,
    pyth: 25.3,
    pythUpper: 25.8,
    pythLower: 24.8,
    band: 10.2,
    bandUpper: 10.5,
    bandLower: 9.9,
    api3: 5.1,
    api3Upper: 5.3,
    api3Lower: 4.9,
    uma: 3.2,
    umaUpper: 3.4,
    umaLower: 3.0,
    redstone: 2.1,
    redstoneUpper: 2.3,
    redstoneLower: 1.9,
    dia: 1.5,
    diaUpper: 1.7,
    diaLower: 1.3,
    tellor: 0.8,
    tellorUpper: 1.0,
    tellorLower: 0.6,
    chronicle: 0.5,
    chronicleUpper: 0.7,
    chronicleLower: 0.3,
    winklink: 0.3,
    winklinkUpper: 0.5,
    winklinkLower: 0.1,
    total: 94.5,
  },
];

const mockChainBreakdown: ChainBreakdown[] = [
  {
    chainId: 'ethereum',
    chainName: 'Ethereum',
    tvs: 50.5,
    tvsFormatted: '$50.5B',
    share: 53.4,
    protocols: 850,
    color: '#627EEA',
    change24h: 2.1,
    change7d: 4.5,
    topOracle: 'Chainlink',
    topOracleShare: 85.5,
  },
];

const mockProtocolDetails: ProtocolDetail[] = [
  {
    id: 'aave',
    name: 'Aave',
    category: 'Lending',
    tvl: 12.5,
    tvlFormatted: '$12.5B',
    chains: ['ethereum', 'arbitrum'],
    primaryOracle: 'Chainlink',
    oracleCount: 3,
    change24h: 1.5,
    change7d: 3.2,
  },
];

const mockAssetCategories: AssetCategory[] = [
  {
    category: 'crypto',
    label: 'Crypto',
    value: 75.5,
    share: 79.8,
    color: '#3B82F6',
    assets: ['BTC', 'ETH'],
    avgVolatility: 0.65,
    avgLiquidity: 0.85,
  },
];

const mockComparisonData: ComparisonData[] = [
  {
    oracle: 'Chainlink',
    color: '#375BD2',
    metrics: {
      tvs: { name: 'TVS', value: 45.5, normalizedValue: 95, unit: 'B', rank: 1 },
      latency: { name: 'Latency', value: 12, normalizedValue: 88, unit: 'ms', rank: 2 },
      accuracy: { name: 'Accuracy', value: 99.98, normalizedValue: 99, unit: '%', rank: 1 },
      marketShare: { name: 'Market Share', value: 45.5, normalizedValue: 95, unit: '%', rank: 1 },
      chains: { name: 'Chains', value: 50, normalizedValue: 90, unit: '', rank: 1 },
      protocols: { name: 'Protocols', value: 1800, normalizedValue: 95, unit: '', rank: 1 },
      updateFrequency: { name: 'Update Frequency', value: 1, normalizedValue: 85, unit: 's', rank: 3 },
    },
    overallScore: 92,
    rank: 1,
  },
];

const mockBenchmarkData: BenchmarkData[] = [
  {
    metric: {
      name: 'Latency',
      industryAverage: 15,
      industryMedian: 12,
      industryBest: 5,
      unit: 'ms',
      description: 'Average price update latency',
    },
    oracleValues: [
      { oracle: 'Chainlink', color: '#375BD2', value: 12, diffFromAverage: -3, diffPercent: -20, percentile: 75 },
    ],
  },
];

const mockCorrelationData: CorrelationData = {
  oracles: ['Chainlink', 'Pyth'],
  matrix: [[1.0, 0.85], [0.85, 1.0]],
  pairs: [
    { oracleA: 'Chainlink', oracleB: 'Pyth', correlation: 0.85, sampleSize: 1000, confidence: 0.95 },
  ],
  timeRange: '30D',
  lastUpdated: new Date().toISOString(),
};

const mockRiskMetrics: RiskMetrics = {
  hhi: {
    value: 2500,
    level: 'medium',
    description: 'Moderate market concentration',
    concentrationRatio: 75.5,
  },
  diversification: {
    score: 65,
    level: 'medium',
    description: 'Moderate diversification',
    factors: { chainDiversity: 70, protocolDiversity: 60, assetDiversity: 65 },
  },
  volatility: {
    index: 25,
    level: 'low',
    description: 'Low volatility',
    annualizedVolatility: 0.25,
    dailyVolatility: 0.015,
  },
  correlationRisk: {
    score: 30,
    level: 'low',
    description: 'Low correlation risk',
    avgCorrelation: 0.3,
    highCorrelationPairs: [],
  },
  overallRisk: {
    score: 35,
    level: 'low',
    timestamp: Date.now(),
  },
};

const mockAnomalies: AnomalyData[] = [
  {
    id: 'anomaly-1',
    type: 'price_spike',
    level: 'medium',
    title: 'BTC Price Spike',
    description: 'Unusual price movement detected',
    timestamp: Date.now(),
    asset: 'BTC',
    oracle: 'Chainlink',
    value: 70000,
    expectedValue: 68000,
    deviation: 2.94,
    duration: 300000,
    acknowledged: false,
  },
];

describe('DataCache', () => {
  beforeEach(() => {
    dataCache.clearAll();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get cache data', () => {
      setCachedOracleData('30D', mockOracleData);
      const cached = getCachedOracleData('30D');
      expect(cached).toEqual(mockOracleData);
    });

    it('should return undefined for non-existent cache', () => {
      const cached = getCachedOracleData('30D');
      expect(cached).toBeUndefined();
    });

    it('should correctly identify cache existence', () => {
      expect(dataCache.has('oracleData', '30D')).toBe(false);
      setCachedOracleData('30D', mockOracleData);
      expect(dataCache.has('oracleData', '30D')).toBe(true);
    });

    it('should remove cache entry', () => {
      setCachedOracleData('30D', mockOracleData);
      expect(dataCache.has('oracleData', '30D')).toBe(true);
      const removed = dataCache.remove('oracleData', '30D');
      expect(removed).toBe(true);
      expect(dataCache.has('oracleData', '30D')).toBe(false);
    });

    it('should clear all cache entries', () => {
      setCachedOracleData('30D', mockOracleData);
      setCachedAssets('30D', mockAssets);
      dataCache.clearAll();
      expect(dataCache.has('oracleData', '30D')).toBe(false);
      expect(dataCache.has('assets', '30D')).toBe(false);
    });
  });

  describe('Cache Expiry', () => {
    it('should respect cache expiry times', () => {
      const now = Date.now();
      jest.setSystemTime(now);

      setCachedOracleData('1H', mockOracleData);
      expect(getCachedOracleData('1H')).toEqual(mockOracleData);

      const expiryTime = CACHE_EXPIRY_TIMES['1H'];
      jest.setSystemTime(now + expiryTime - 1);
      expect(getCachedOracleData('1H')).toEqual(mockOracleData);

      jest.setSystemTime(now + expiryTime + 1);
      expect(getCachedOracleData('1H')).toBeUndefined();
    });

    it('should use default expiry for unknown time range', () => {
      const now = Date.now();
      jest.setSystemTime(now);

      setCachedOracleData('UNKNOWN', mockOracleData);
      expect(getCachedOracleData('UNKNOWN')).toEqual(mockOracleData);

      const defaultExpiry = CACHE_EXPIRY_TIMES['30D'];
      jest.setSystemTime(now + defaultExpiry + 1);
      expect(getCachedOracleData('UNKNOWN')).toBeUndefined();
    });

    it('should return null for getTimeUntilExpiry when cache does not exist', () => {
      const timeUntilExpiry = dataCache.getTimeUntilExpiry('oracleData', '30D');
      expect(timeUntilExpiry).toBeNull();
    });

    it('should return correct time until expiry', () => {
      const now = Date.now();
      jest.setSystemTime(now);

      setCachedOracleData('1H', mockOracleData);
      const timeUntilExpiry = dataCache.getTimeUntilExpiry('oracleData', '1H');
      expect(timeUntilExpiry).toBeGreaterThan(0);
      expect(timeUntilExpiry).toBeLessThanOrEqual(CACHE_EXPIRY_TIMES['1H']);
    });

    it('should clear expired entries', () => {
      const now = Date.now();
      jest.setSystemTime(now);

      setCachedOracleData('1H', mockOracleData);
      setCachedAssets('1H', mockAssets);

      jest.setSystemTime(now + CACHE_EXPIRY_TIMES['1H'] + 1000);

      const clearedCount = dataCache.clearExpired();
      expect(clearedCount).toBe(2);
      expect(dataCache.has('oracleData', '1H')).toBe(false);
      expect(dataCache.has('assets', '1H')).toBe(false);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', () => {
      setCachedOracleData('30D', mockOracleData);

      getCachedOracleData('30D');
      getCachedOracleData('30D');
      getCachedOracleData('7D');

      const stats = dataCache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.666, 2);
    });

    it('should return correct cache size', () => {
      expect(dataCache.getStats().size).toBe(0);

      setCachedOracleData('30D', mockOracleData);
      expect(dataCache.getStats().size).toBe(1);

      setCachedAssets('30D', mockAssets);
      expect(dataCache.getStats().size).toBe(2);
    });

    it('should include entry information in stats', () => {
      const now = Date.now();
      jest.setSystemTime(now);

      setCachedOracleData('30D', mockOracleData);

      const stats = dataCache.getStats();
      expect(stats.entries).toHaveLength(1);
      expect(stats.entries[0].key).toBe('oracleData');
      expect(stats.entries[0].timeRange).toBe('30D');
      expect(stats.entries[0].isExpired).toBe(false);
    });
  });

  describe('Clear by Key', () => {
    it('should clear all entries for a specific key', () => {
      setCachedOracleData('1H', mockOracleData);
      setCachedOracleData('24H', mockOracleData);
      setCachedOracleData('7D', mockOracleData);
      setCachedAssets('30D', mockAssets);

      const clearedCount = dataCache.clearByKey('oracleData');
      expect(clearedCount).toBe(3);
      expect(dataCache.has('oracleData', '1H')).toBe(false);
      expect(dataCache.has('oracleData', '24H')).toBe(false);
      expect(dataCache.has('oracleData', '7D')).toBe(false);
      expect(dataCache.has('assets', '30D')).toBe(true);
    });
  });

  describe('Cache Validation', () => {
    it('should validate cache entry correctly', () => {
      const now = Date.now();
      jest.setSystemTime(now);

      setCachedOracleData('30D', mockOracleData);

      const entry = dataCache.get('oracleData', '30D');
      expect(dataCache.isCacheValid(entry)).toBe(true);

      jest.setSystemTime(now + CACHE_EXPIRY_TIMES['30D'] + 1000);
      expect(dataCache.isCacheValid(entry)).toBe(false);
    });

    it('should return false for undefined entry validation', () => {
      expect(dataCache.isCacheValid(undefined)).toBe(false);
    });
  });

  describe('All Cache Types', () => {
    it('should cache and retrieve OracleMarketData', () => {
      setCachedOracleData('30D', mockOracleData);
      expect(getCachedOracleData('30D')).toEqual(mockOracleData);
    });

    it('should cache and retrieve AssetData', () => {
      setCachedAssets('30D', mockAssets);
      expect(getCachedAssets('30D')).toEqual(mockAssets);
    });

    it('should cache and retrieve TVSTrendData', () => {
      setCachedTrendData('30D', mockTrendData);
      expect(getCachedTrendData('30D')).toEqual(mockTrendData);
    });

    it('should cache and retrieve ChainBreakdown', () => {
      setCachedChainBreakdown('30D', mockChainBreakdown);
      expect(getCachedChainBreakdown('30D')).toEqual(mockChainBreakdown);
    });

    it('should cache and retrieve ProtocolDetail', () => {
      setCachedProtocolDetails('30D', mockProtocolDetails);
      expect(getCachedProtocolDetails('30D')).toEqual(mockProtocolDetails);
    });

    it('should cache and retrieve AssetCategory', () => {
      setCachedAssetCategories('30D', mockAssetCategories);
      expect(getCachedAssetCategories('30D')).toEqual(mockAssetCategories);
    });

    it('should cache and retrieve ComparisonData', () => {
      setCachedComparisonData('30D', mockComparisonData);
      expect(getCachedComparisonData('30D')).toEqual(mockComparisonData);
    });

    it('should cache and retrieve BenchmarkData', () => {
      setCachedBenchmarkData('30D', mockBenchmarkData);
      expect(getCachedBenchmarkData('30D')).toEqual(mockBenchmarkData);
    });

    it('should cache and retrieve CorrelationData', () => {
      setCachedCorrelationData('30D', mockCorrelationData);
      expect(getCachedCorrelationData('30D')).toEqual(mockCorrelationData);
    });

    it('should cache and retrieve RiskMetrics', () => {
      setCachedRiskMetrics('30D', mockRiskMetrics);
      expect(getCachedRiskMetrics('30D')).toEqual(mockRiskMetrics);
    });

    it('should cache and retrieve null RiskMetrics', () => {
      setCachedRiskMetrics('30D', null);
      expect(getCachedRiskMetrics('30D')).toBeNull();
    });

    it('should cache and retrieve AnomalyData', () => {
      setCachedAnomalies('30D', mockAnomalies);
      expect(getCachedAnomalies('30D')).toEqual(mockAnomalies);
    });
  });

  describe('Cache Expiry Times', () => {
    it('should have correct expiry times defined', () => {
      expect(CACHE_EXPIRY_TIMES['1H']).toBe(1 * 60 * 1000);
      expect(CACHE_EXPIRY_TIMES['24H']).toBe(5 * 60 * 1000);
      expect(CACHE_EXPIRY_TIMES['7D']).toBe(15 * 60 * 1000);
      expect(CACHE_EXPIRY_TIMES['30D']).toBe(30 * 60 * 1000);
      expect(CACHE_EXPIRY_TIMES['90D']).toBe(60 * 60 * 1000);
      expect(CACHE_EXPIRY_TIMES['1Y']).toBe(2 * 60 * 60 * 1000);
      expect(CACHE_EXPIRY_TIMES['ALL']).toBe(4 * 60 * 60 * 1000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays', () => {
      setCachedOracleData('30D', []);
      const cached = getCachedOracleData('30D');
      expect(cached).toEqual([]);
    });

    it('should handle large data sets', () => {
      const largeData: OracleMarketData[] = Array.from({ length: 1000 }, (_, i) => ({
        name: `Oracle${i}`,
        share: Math.random() * 100,
        color: '#000000',
        tvs: `$${i}B`,
        tvsValue: i,
        chains: Math.floor(Math.random() * 50),
        protocols: Math.floor(Math.random() * 1000),
        avgLatency: Math.floor(Math.random() * 100),
        accuracy: 95 + Math.random() * 5,
        updateFrequency: Math.random() * 10,
        change24h: (Math.random() - 0.5) * 20,
        change7d: (Math.random() - 0.5) * 40,
        change30d: (Math.random() - 0.5) * 80,
      }));

      setCachedOracleData('30D', largeData);
      const cached = getCachedOracleData('30D');
      expect(cached).toHaveLength(1000);
    });

    it('should handle concurrent access', () => {
      for (let i = 0; i < 100; i++) {
        setCachedOracleData(`range-${i}`, mockOracleData);
      }

      for (let i = 0; i < 100; i++) {
        expect(getCachedOracleData(`range-${i}`)).toEqual(mockOracleData);
      }
    });
  });
});
