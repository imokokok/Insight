import { detectAnomalies } from '../anomalyCalculations';

import type { AssetData } from '../types';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('@/lib/analytics/anomalyDetection', () => ({
  detectPriceAnomalies: jest.fn().mockReturnValue([
    {
      id: 'anomaly-1',
      type: 'price_spike',
      level: 'high',
      title: 'Price Spike',
      description: 'Unusual price movement',
      timestamp: Date.now(),
      asset: 'BTC',
      oracle: 'chainlink',
      value: 55000,
      expectedValue: 50000,
      deviation: 10,
      duration: 300,
      acknowledged: false,
    },
  ]),
  detectTrendBreak: jest.fn().mockReturnValue({
    anomalies: [
      {
        id: 'anomaly-2',
        type: 'trend_break',
        level: 'medium',
        title: 'Trend Break',
        description: 'Trend direction changed',
        timestamp: Date.now(),
        asset: 'ETH',
        oracle: 'pyth',
        value: 3200,
        expectedValue: 3000,
        deviation: 6.67,
        duration: 600,
        acknowledged: false,
      },
    ],
  }),
  detectVolatilityAnomalies: jest.fn().mockReturnValue([
    {
      id: 'anomaly-3',
      type: 'volatility_spike',
      level: 'high',
      title: 'Volatility Spike',
      description: 'High volatility detected',
      timestamp: Date.now(),
      asset: 'BTC',
      oracle: 'chainlink',
      value: 0.05,
      expectedValue: 0.02,
      deviation: 150,
      duration: 180,
      acknowledged: false,
    },
  ]),
}));

const createMockOracleData = () => [
  {
    name: 'Chainlink',
    share: 45,
    color: '#375BD2',
    tvs: '$20B',
    tvsValue: 20000000000,
    chains: 15,
    protocols: 500,
    avgLatency: 100,
    accuracy: 99.9,
    updateFrequency: 1000,
    change24h: 2.5,
    change7d: 5.0,
    change30d: 10.0,
  },
];

const createMockAssetData = () => [
  {
    symbol: 'BTC',
    price: 50000,
    change24h: 2.5,
    change7d: 5.0,
    volume24h: 1000000000,
    marketCap: 1000000000000,
    primaryOracle: 'chainlink',
    oracleCount: 5,
  },
  {
    symbol: 'ETH',
    price: 3000,
    change24h: 3.0,
    change7d: 6.0,
    volume24h: 500000000,
    marketCap: 400000000000,
    primaryOracle: 'chainlink',
    oracleCount: 4,
  },
];

const createMockPricesMap = () => {
  const now = Date.now();
  const btcPrices = Array.from({ length: 101 }, (_, i) => 50000 + Math.sin(i / 10) * 500);
  const btcTimestamps = Array.from({ length: 101 }, (_, i) => now - (100 - i) * 3600000);
  const ethPrices = Array.from({ length: 101 }, (_, i) => 3000 + Math.sin(i / 10) * 30);
  const ethTimestamps = Array.from({ length: 101 }, (_, i) => now - (100 - i) * 3600000);

  return new Map<string, { prices: number[]; timestamps: number[] }>([
    ['BTC', { prices: btcPrices, timestamps: btcTimestamps }],
    ['ETH', { prices: ethPrices, timestamps: ethTimestamps }],
  ]);
};

describe('anomalyCalculations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectAnomalies', () => {
    it('should detect anomalies from oracle and asset data with prices map', async () => {
      const oracleData = createMockOracleData();
      const assetData = createMockAssetData();
      const pricesMap = createMockPricesMap();

      const result = await detectAnomalies(oracleData, assetData, pricesMap);

      expect(result).toBeInstanceOf(Array);
      expect(result!.length).toBeGreaterThan(0);
    });

    it('should return null when no prices map is provided', async () => {
      const oracleData = createMockOracleData();
      const assetData = createMockAssetData();

      const result = await detectAnomalies(oracleData, assetData);

      expect(result).toBeNull();
    });

    it('should return null when prices map is empty', async () => {
      const oracleData = createMockOracleData();
      const assetData = createMockAssetData();

      const result = await detectAnomalies(oracleData, assetData, new Map());

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      const result = await detectAnomalies(
        null as unknown as PriceData[],
        null as unknown as PriceData[]
      );

      expect(result).toBeNull();
    });

    it('should limit anomalies to 20', async () => {
      const { detectPriceAnomalies } = jest.requireMock('@/lib/analytics/anomalyDetection');
      detectPriceAnomalies.mockReturnValueOnce(
        Array(25)
          .fill(null)
          .map((_, i) => ({
            id: `anomaly-${i}`,
            type: 'price_spike',
            level: 'high',
            title: 'Price Spike',
            description: 'Test',
            timestamp: Date.now() + i,
            asset: 'BTC',
            oracle: 'chainlink',
            value: 50000,
            expectedValue: 50000,
            deviation: 0,
            duration: 0,
            acknowledged: false,
          }))
      );

      const oracleData = createMockOracleData();
      const assetData = createMockAssetData();
      const pricesMap = createMockPricesMap();

      const result = await detectAnomalies(oracleData, assetData, pricesMap);

      expect(result!.length).toBeLessThanOrEqual(20);
    });

    it('should sort anomalies by timestamp descending', async () => {
      const now = Date.now();
      const { detectPriceAnomalies } = jest.requireMock('@/lib/analytics/anomalyDetection');
      detectPriceAnomalies.mockReturnValueOnce([
        {
          id: 'anomaly-1',
          type: 'price_spike',
          level: 'high',
          title: 'Older',
          description: 'Test',
          timestamp: now - 1000,
          asset: 'BTC',
          oracle: 'chainlink',
          value: 50000,
          expectedValue: 50000,
          deviation: 0,
          duration: 0,
          acknowledged: false,
        },
        {
          id: 'anomaly-2',
          type: 'price_spike',
          level: 'high',
          title: 'Newer',
          description: 'Test',
          timestamp: now,
          asset: 'BTC',
          oracle: 'chainlink',
          value: 50000,
          expectedValue: 50000,
          deviation: 0,
          duration: 0,
          acknowledged: false,
        },
      ]);

      const oracleData = createMockOracleData();
      const assetData = createMockAssetData();
      const pricesMap = createMockPricesMap();

      const result = await detectAnomalies(oracleData, assetData, pricesMap);

      if (result && result.length >= 2) {
        expect(result[0].timestamp).toBeGreaterThanOrEqual(result[1].timestamp);
      }
    });

    it('should call all detection methods for each asset with price data', async () => {
      const { detectPriceAnomalies, detectTrendBreak, detectVolatilityAnomalies } =
        jest.requireMock('@/lib/analytics/anomalyDetection');

      const oracleData = createMockOracleData();
      const assetData = createMockAssetData();
      const pricesMap = createMockPricesMap();

      await detectAnomalies(oracleData, assetData, pricesMap);

      expect(detectPriceAnomalies).toHaveBeenCalled();
      expect(detectTrendBreak).toHaveBeenCalled();
      expect(detectVolatilityAnomalies).toHaveBeenCalled();
    });

    it('should skip assets without price data in the map', async () => {
      const oracleData = createMockOracleData();
      const assetData = createMockAssetData();
      const pricesMap = new Map<string, { prices: number[]; timestamps: number[] }>([
        ['BTC', { prices: [50000, 50100, 50200], timestamps: [1, 2, 3] }],
      ]);

      const result = await detectAnomalies(oracleData, assetData, pricesMap);

      expect(result).toBeInstanceOf(Array);
    });

    it('should handle empty asset data', async () => {
      const oracleData = createMockOracleData();
      const assetData: AssetData[] = [];
      const pricesMap = createMockPricesMap();

      const result = await detectAnomalies(oracleData, assetData, pricesMap);

      expect(result).toBeInstanceOf(Array);
    });
  });
});
