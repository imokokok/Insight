import {
  performanceMetricsCalculator,
  calculateMetricsFromPriceData,
  type PriceDataPoint,
  type ReferencePricePoint,
} from '../performanceMetrics';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('performanceMetrics', () => {
  beforeEach(() => {
    performanceMetricsCalculator.clearOldData(0);
    const stats = performanceMetricsCalculator.getStats();
    if (stats.priceDataPoints > 0 || stats.referenceDataPoints > 0) {
      (
        performanceMetricsCalculator as unknown as { priceHistory: Map<string, unknown[]> }
      ).priceHistory.clear();
      (
        performanceMetricsCalculator as unknown as { referencePrices: Map<string, unknown[]> }
      ).referencePrices.clear();
    }
  });

  describe('PerformanceMetricsCalculator', () => {
    describe('addPriceData', () => {
      it('should add price data point', () => {
        const point: PriceDataPoint = {
          oracle: 'chainlink',
          asset: 'BTC',
          price: 50000,
          timestamp: Date.now(),
        };

        performanceMetricsCalculator.addPriceData(point);

        const stats = performanceMetricsCalculator.getStats();
        expect(stats.priceDataPoints).toBe(1);
      });

      it('should add multiple price data points', () => {
        const points: PriceDataPoint[] = [
          { oracle: 'chainlink', asset: 'BTC', price: 50000, timestamp: Date.now() },
          { oracle: 'chainlink', asset: 'ETH', price: 3000, timestamp: Date.now() },
          { oracle: 'pyth', asset: 'BTC', price: 50001, timestamp: Date.now() },
        ];

        points.forEach((p) => performanceMetricsCalculator.addPriceData(p));

        const stats = performanceMetricsCalculator.getStats();
        expect(stats.priceDataPoints).toBe(3);
      });

      it('should limit history size', () => {
        const maxPoints = 10001;
        for (let i = 0; i < maxPoints; i++) {
          performanceMetricsCalculator.addPriceData({
            oracle: 'chainlink',
            asset: 'BTC',
            price: 50000 + i,
            timestamp: Date.now() - i,
          });
        }

        const stats = performanceMetricsCalculator.getStats();
        expect(stats.priceDataPoints).toBeLessThanOrEqual(10000);
      });
    });

    describe('addReferencePrice', () => {
      it('should add reference price point', () => {
        const point: ReferencePricePoint = {
          asset: 'BTC',
          price: 50000,
          timestamp: Date.now(),
          source: 'coingecko',
        };

        performanceMetricsCalculator.addReferencePrice(point);

        const stats = performanceMetricsCalculator.getStats();
        expect(stats.referenceDataPoints).toBe(1);
      });
    });

    describe('calculateLatency', () => {
      it('should return default latency for insufficient data', () => {
        const latency = performanceMetricsCalculator.calculateLatency('chainlink');

        expect(latency).toBeGreaterThan(0);
      });

      it('should calculate latency with sufficient data', () => {
        const now = Date.now();
        const points: PriceDataPoint[] = [];
        for (let i = 0; i < 10; i++) {
          points.push({
            oracle: 'chainlink',
            asset: 'BTC',
            price: 50000,
            timestamp: now - i * 1000,
          });
        }
        points.forEach((p) => performanceMetricsCalculator.addPriceData(p));

        const latency = performanceMetricsCalculator.calculateLatency('chainlink', 'BTC');

        expect(latency).toBeGreaterThanOrEqual(0);
      });

      it('should calculate latency for all assets when asset not specified', () => {
        const now = Date.now();
        for (let i = 0; i < 10; i++) {
          performanceMetricsCalculator.addPriceData({
            oracle: 'chainlink',
            asset: `ASSET-${i}`,
            price: 100,
            timestamp: now - i * 1000,
          });
        }

        const latency = performanceMetricsCalculator.calculateLatency('chainlink');

        expect(latency).toBeGreaterThanOrEqual(0);
      });

      it('should return default latency for unknown oracle', () => {
        const latency = performanceMetricsCalculator.calculateLatency('unknown-oracle');

        expect(latency).toBe(600);
      });
    });

    describe('calculateAccuracy', () => {
      it('should return default accuracy for insufficient data', () => {
        const accuracy = performanceMetricsCalculator.calculateAccuracy('chainlink');

        expect(accuracy).toBeGreaterThan(0);
        expect(accuracy).toBeLessThanOrEqual(100);
      });

      it('should calculate accuracy with reference prices', () => {
        const now = Date.now();

        for (let i = 0; i < 10; i++) {
          performanceMetricsCalculator.addPriceData({
            oracle: 'chainlink',
            asset: 'BTC',
            price: 50000,
            timestamp: now - i * 1000,
          });

          performanceMetricsCalculator.addReferencePrice({
            asset: 'BTC',
            price: 50000,
            timestamp: now - i * 1000,
            source: 'coingecko',
          });
        }

        const accuracy = performanceMetricsCalculator.calculateAccuracy('chainlink', 'BTC');

        expect(accuracy).toBeGreaterThan(0);
        expect(accuracy).toBeLessThanOrEqual(100);
      });

      it('should return default accuracy for unknown oracle', () => {
        const accuracy = performanceMetricsCalculator.calculateAccuracy('unknown-oracle');

        expect(accuracy).toBe(98.0);
      });
    });

    describe('calculateUpdateFrequency', () => {
      it('should return default frequency for insufficient data', () => {
        const frequency = performanceMetricsCalculator.calculateUpdateFrequency('chainlink');

        expect(frequency).toBeGreaterThan(0);
      });

      it('should calculate update frequency with sufficient data', () => {
        const now = Date.now();
        for (let i = 0; i < 10; i++) {
          performanceMetricsCalculator.addPriceData({
            oracle: 'chainlink',
            asset: 'BTC',
            price: 50000,
            timestamp: now - i * 1000,
          });
        }

        const frequency = performanceMetricsCalculator.calculateUpdateFrequency('chainlink', 'BTC');

        expect(frequency).toBeGreaterThanOrEqual(0);
      });

      it('should return default frequency for unknown oracle', () => {
        const frequency = performanceMetricsCalculator.calculateUpdateFrequency('unknown-oracle');

        expect(frequency).toBe(3600);
      });
    });

    describe('calculateAllMetrics', () => {
      it('should return all metrics for an oracle', () => {
        const metrics = performanceMetricsCalculator.calculateAllMetrics('chainlink');

        expect(metrics).toHaveProperty('oracleName');
        expect(metrics).toHaveProperty('avgLatency');
        expect(metrics).toHaveProperty('accuracy');
        expect(metrics).toHaveProperty('updateFrequency');
        expect(metrics).toHaveProperty('lastCalculated');
        expect(metrics).toHaveProperty('sampleSize');
        expect(metrics.oracleName).toBe('chainlink');
      });

      it('should calculate metrics for specific asset', () => {
        const now = Date.now();
        for (let i = 0; i < 10; i++) {
          performanceMetricsCalculator.addPriceData({
            oracle: 'chainlink',
            asset: 'BTC',
            price: 50000,
            timestamp: now - i * 1000,
          });
        }

        const metrics = performanceMetricsCalculator.calculateAllMetrics('chainlink', 'BTC');

        expect(metrics.sampleSize).toBe(10);
      });
    });

    describe('clearOldData', () => {
      it('should clear old data', () => {
        const oldTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000;

        performanceMetricsCalculator.addPriceData({
          oracle: 'chainlink',
          asset: 'BTC',
          price: 50000,
          timestamp: oldTimestamp,
        });

        performanceMetricsCalculator.addPriceData({
          oracle: 'chainlink',
          asset: 'ETH',
          price: 3000,
          timestamp: Date.now(),
        });

        performanceMetricsCalculator.clearOldData(7 * 24 * 60 * 60 * 1000);

        const stats = performanceMetricsCalculator.getStats();
        expect(stats.priceDataPoints).toBe(1);
      });
    });

    describe('getStats', () => {
      it('should return current stats', () => {
        performanceMetricsCalculator.addPriceData({
          oracle: 'chainlink',
          asset: 'BTC',
          price: 50000,
          timestamp: Date.now(),
        });

        performanceMetricsCalculator.addReferencePrice({
          asset: 'BTC',
          price: 50000,
          timestamp: Date.now(),
          source: 'test',
        });

        const stats = performanceMetricsCalculator.getStats();

        expect(stats).toHaveProperty('priceDataPoints');
        expect(stats).toHaveProperty('referenceDataPoints');
        expect(stats.priceDataPoints).toBe(1);
        expect(stats.referenceDataPoints).toBe(1);
      });
    });
  });

  describe('calculateMetricsFromPriceData', () => {
    it('should return zeros for insufficient data', () => {
      const oraclePrices: PriceDataPoint[] = [
        { oracle: 'chainlink', asset: 'BTC', price: 50000, timestamp: Date.now() },
      ];
      const referencePrices: ReferencePricePoint[] = [];

      const result = calculateMetricsFromPriceData(oraclePrices, referencePrices);

      expect(result.latency).toBe(0);
      expect(result.accuracy).toBe(0);
      expect(result.updateFrequency).toBe(0);
    });

    it('should calculate metrics with sufficient data', () => {
      const now = Date.now();
      const oraclePrices: PriceDataPoint[] = [];
      for (let i = 0; i < 10; i++) {
        oraclePrices.push({
          oracle: 'chainlink',
          asset: 'BTC',
          price: 50000 + i * 10,
          timestamp: now - i * 1000,
        });
      }

      const referencePrices: ReferencePricePoint[] = oraclePrices.map((p) => ({
        asset: p.asset,
        price: p.price,
        timestamp: p.timestamp,
        source: 'reference',
      }));

      const result = calculateMetricsFromPriceData(oraclePrices, referencePrices);

      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.accuracy).toBeLessThanOrEqual(100);
      expect(result.updateFrequency).toBeGreaterThanOrEqual(0);
    });

    it('should calculate latency correctly', () => {
      const now = Date.now();
      const oraclePrices: PriceDataPoint[] = [
        { oracle: 'chainlink', asset: 'BTC', price: 50000, timestamp: now - 3000 },
        { oracle: 'chainlink', asset: 'BTC', price: 50001, timestamp: now - 2000 },
        { oracle: 'chainlink', asset: 'BTC', price: 50002, timestamp: now - 1000 },
        { oracle: 'chainlink', asset: 'BTC', price: 50003, timestamp: now },
      ];

      const referencePrices: ReferencePricePoint[] = [
        { asset: 'BTC', price: 50000, timestamp: now, source: 'test' },
      ];

      const result = calculateMetricsFromPriceData(oraclePrices, referencePrices);

      expect(result.latency).toBe(1000);
    });

    it('should calculate accuracy correctly', () => {
      const now = Date.now();
      const oraclePrices: PriceDataPoint[] = [
        { oracle: 'chainlink', asset: 'BTC', price: 50000, timestamp: now },
        { oracle: 'chainlink', asset: 'BTC', price: 50010, timestamp: now + 1000 },
      ];

      const referencePrices: ReferencePricePoint[] = [
        { asset: 'BTC', price: 50000, timestamp: now, source: 'test' },
        { asset: 'BTC', price: 50000, timestamp: now + 1000, source: 'test' },
      ];

      const result = calculateMetricsFromPriceData(oraclePrices, referencePrices);

      expect(result.accuracy).toBeGreaterThan(99);
    });

    it('should cap accuracy at 99.99', () => {
      const now = Date.now();
      const oraclePrices: PriceDataPoint[] = [];
      const referencePrices: ReferencePricePoint[] = [];

      for (let i = 0; i < 10; i++) {
        oraclePrices.push({
          oracle: 'chainlink',
          asset: 'BTC',
          price: 50000,
          timestamp: now + i * 1000,
        });
        referencePrices.push({
          asset: 'BTC',
          price: 50000,
          timestamp: now + i * 1000,
          source: 'test',
        });
      }

      const result = calculateMetricsFromPriceData(oraclePrices, referencePrices);

      expect(result.accuracy).toBeLessThanOrEqual(99.99);
    });

    it('should handle empty reference prices', () => {
      const now = Date.now();
      const oraclePrices: PriceDataPoint[] = [
        { oracle: 'chainlink', asset: 'BTC', price: 50000, timestamp: now },
        { oracle: 'chainlink', asset: 'BTC', price: 50001, timestamp: now + 1000 },
      ];

      const result = calculateMetricsFromPriceData(oraclePrices, []);

      expect(result.accuracy).toBe(0);
    });
  });
});
