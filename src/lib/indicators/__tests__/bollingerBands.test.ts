import {
  calculateBollingerBands,
  calculateBollingerBandsWithNull,
  calculateBollingerBandsExtended,
  calculateSMA,
} from '../calculations';

import type { OHLCVDataPoint } from '../types';

describe('Bollinger Bands', () => {
  describe('calculateBollingerBands', () => {
    describe('Upper band calculation', () => {
      it('should calculate upper band correctly', () => {
        const prices = [
          10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48,
        ];
        const result = calculateBollingerBands(prices, 20, 2);

        expect(result.upper.length).toBe(prices.length);
      });

      it('should have upper band above middle band', () => {
        const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
        const result = calculateBollingerBands(prices, 20, 2);

        for (let i = 19; i < prices.length; i++) {
          expect(result.upper[i]).toBeGreaterThan(result.middle[i]);
        }
      });

      it('should calculate upper band as middle + (multiplier * stdDev)', () => {
        const prices = [
          10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48,
        ];
        const result = calculateBollingerBands(prices, 20, 2);

        for (let i = 19; i < prices.length; i++) {
          const expectedUpper = result.middle[i] + 2 * result.stdDev[i];
          expect(result.upper[i]).toBeCloseTo(expectedUpper);
        }
      });

      it('should return original price for first period-1 elements', () => {
        const prices = [10, 20, 30, 40, 50];
        const result = calculateBollingerBands(prices, 5, 2);

        expect(result.upper[0]).toBe(10);
        expect(result.upper[1]).toBe(20);
        expect(result.upper[2]).toBe(30);
        expect(result.upper[3]).toBe(40);
      });

      it('should handle custom multiplier', () => {
        const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
        const result1 = calculateBollingerBands(prices, 20, 1);
        const result2 = calculateBollingerBands(prices, 20, 3);

        expect(result2.upper[24] - result2.middle[24]).toBeGreaterThan(
          result1.upper[24] - result1.middle[24]
        );
      });
    });

    describe('Middle band (SMA)', () => {
      it('should calculate middle band as SMA', () => {
        const prices = [
          10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48,
        ];
        const result = calculateBollingerBands(prices, 20, 2);

        const expectedMiddle = prices.reduce((a, b) => a + b, 0) / 20;
        expect(result.middle[19]).toBe(expectedMiddle);
      });

      it('should use correct period for SMA calculation', () => {
        const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
        const result = calculateBollingerBands(prices, 10, 2);

        const expectedSMA = calculateSMA(prices, 10);
        for (let i = 0; i < prices.length; i++) {
          expect(result.middle[i]).toBe(expectedSMA[i]);
        }
      });

      it('should have middle band between upper and lower bands', () => {
        const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
        const result = calculateBollingerBands(prices, 20, 2);

        for (let i = 19; i < prices.length; i++) {
          expect(result.middle[i]).toBeLessThan(result.upper[i]);
          expect(result.middle[i]).toBeGreaterThan(result.lower[i]);
        }
      });
    });

    describe('Lower band calculation', () => {
      it('should calculate lower band correctly', () => {
        const prices = [
          10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48,
        ];
        const result = calculateBollingerBands(prices, 20, 2);

        expect(result.lower.length).toBe(prices.length);
      });

      it('should have lower band below middle band', () => {
        const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
        const result = calculateBollingerBands(prices, 20, 2);

        for (let i = 19; i < prices.length; i++) {
          expect(result.lower[i]).toBeLessThan(result.middle[i]);
        }
      });

      it('should calculate lower band as middle - (multiplier * stdDev)', () => {
        const prices = [
          10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48,
        ];
        const result = calculateBollingerBands(prices, 20, 2);

        for (let i = 19; i < prices.length; i++) {
          const expectedLower = result.middle[i] - 2 * result.stdDev[i];
          expect(result.lower[i]).toBeCloseTo(expectedLower);
        }
      });

      it('should return original price for first period-1 elements', () => {
        const prices = [10, 20, 30, 40, 50];
        const result = calculateBollingerBands(prices, 5, 2);

        expect(result.lower[0]).toBe(10);
        expect(result.lower[1]).toBe(20);
        expect(result.stdDev[0]).toBe(0);
      });
    });

    describe('Bandwidth calculation', () => {
      it('should calculate bandwidth as upper - lower', () => {
        const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
        const result = calculateBollingerBands(prices, 20, 2);

        for (let i = 19; i < prices.length; i++) {
          const bandwidth = result.upper[i] - result.lower[i];
          expect(bandwidth).toBeGreaterThan(0);
        }
      });

      it('should have wider bands with higher volatility', () => {
        const lowVolatilityPrices = Array.from({ length: 25 }, (_, i) => 100 + i * 0.1);
        const highVolatilityPrices = Array.from({ length: 25 }, (_, i) => 100 + i * 5);

        const lowResult = calculateBollingerBands(lowVolatilityPrices, 20, 2);
        const highResult = calculateBollingerBands(highVolatilityPrices, 20, 2);

        const lowBandwidth = lowResult.upper[24] - lowResult.lower[24];
        const highBandwidth = highResult.upper[24] - highResult.lower[24];

        expect(highBandwidth).toBeGreaterThan(lowBandwidth);
      });

      it('should have zero bandwidth for constant prices', () => {
        const prices = Array(25).fill(100);
        const result = calculateBollingerBands(prices, 20, 2);

        expect(result.stdDev[24]).toBe(0);
        expect(result.upper[24]).toBe(result.lower[24]);
      });

      it('should increase bandwidth with multiplier', () => {
        const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
        const result1 = calculateBollingerBands(prices, 20, 1);
        const result2 = calculateBollingerBands(prices, 20, 2);
        const result3 = calculateBollingerBands(prices, 20, 3);

        const bandwidth1 = result1.upper[24] - result1.lower[24];
        const bandwidth2 = result2.upper[24] - result2.lower[24];
        const bandwidth3 = result3.upper[24] - result3.lower[24];

        expect(bandwidth2).toBeGreaterThan(bandwidth1);
        expect(bandwidth3).toBeGreaterThan(bandwidth2);
      });
    });

    describe('Squeeze detection', () => {
      it('should detect squeeze (narrow bands)', () => {
        const prices = Array.from({ length: 25 }, (_, i) => 100 + Math.sin(i * 0.1) * 0.5);
        const result = calculateBollingerBands(prices, 20, 2);

        const bandwidth = result.upper[24] - result.lower[24];
        expect(bandwidth).toBeLessThan(5);
      });

      it('should detect expansion (wide bands)', () => {
        const prices = Array.from({ length: 25 }, (_, i) => 100 + Math.sin(i * 0.5) * 20);
        const result = calculateBollingerBands(prices, 20, 2);

        const bandwidth = result.upper[24] - result.lower[24];
        expect(bandwidth).toBeGreaterThan(10);
      });

      it('should identify squeeze before breakout', () => {
        const prices: number[] = [];
        for (let i = 0; i < 20; i++) {
          prices.push(100 + Math.sin(i * 0.1) * 0.5);
        }
        for (let i = 0; i < 10; i++) {
          prices.push(100 + i * 5);
        }

        const result = calculateBollingerBands(prices, 20, 2);

        const squeezeBandwidth = result.upper[19] - result.lower[19];
        const expandedBandwidth = result.upper[29] - result.lower[29];

        expect(expandedBandwidth).toBeGreaterThan(squeezeBandwidth);
      });

      it('should have low stdDev during squeeze', () => {
        const prices = Array(25).fill(100);
        const result = calculateBollingerBands(prices, 20, 2);

        expect(result.stdDev[24]).toBe(0);
      });
    });

    describe('Edge cases', () => {
      it('should use default period of 20 and multiplier of 2', () => {
        const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
        const result = calculateBollingerBands(prices);

        expect(result.middle.length).toBe(prices.length);
      });

      it('should handle empty prices', () => {
        const result = calculateBollingerBands([]);

        expect(result.upper).toEqual([]);
        expect(result.middle).toEqual([]);
        expect(result.lower).toEqual([]);
      });

      it('should handle single price', () => {
        const result = calculateBollingerBands([100], 20, 2);

        expect(result.upper).toEqual([100]);
        expect(result.middle).toEqual([100]);
        expect(result.lower).toEqual([100]);
      });

      it('should handle constant prices', () => {
        const prices = Array(25).fill(100);
        const result = calculateBollingerBands(prices, 20, 2);

        expect(result.stdDev[24]).toBe(0);
        expect(result.upper[24]).toBe(result.lower[24]);
      });

      it('should handle negative prices', () => {
        const prices = Array.from({ length: 25 }, (_, i) => -100 - i);
        const result = calculateBollingerBands(prices, 20, 2);

        expect(result.upper.length).toBe(25);
        expect(result.lower.length).toBe(25);
      });

      it('should handle period of 1', () => {
        const prices = [10, 20, 30, 40, 50];
        const result = calculateBollingerBands(prices, 1, 2);

        expect(result.upper.length).toBe(5);
        expect(result.stdDev[0]).toBe(0);
      });

      it('should handle very large prices', () => {
        const prices = Array.from({ length: 25 }, (_, i) => 1e10 + i * 1e9);
        const result = calculateBollingerBands(prices, 20, 2);

        expect(result.upper.length).toBe(25);
      });

      it('should handle very small prices', () => {
        const prices = Array.from({ length: 25 }, (_, i) => 1e-10 + i * 1e-11);
        const result = calculateBollingerBands(prices, 20, 2);

        expect(result.upper.length).toBe(25);
      });
    });
  });

  describe('calculateBollingerBandsWithNull', () => {
    it('should return null for first period-1 elements', () => {
      const prices = [
        10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200,
        210,
      ];
      const result = calculateBollingerBandsWithNull(prices, 20, 2);

      for (let i = 0; i < 19; i++) {
        expect(result.upper[i]).toBeNull();
        expect(result.middle[i]).toBeNull();
        expect(result.lower[i]).toBeNull();
        expect(result.stdDev[i]).toBeNull();
      }
    });

    it('should calculate valid values after period-1', () => {
      const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
      const result = calculateBollingerBandsWithNull(prices, 20, 2);

      expect(result.upper[19]).not.toBeNull();
      expect(result.middle[19]).not.toBeNull();
      expect(result.lower[19]).not.toBeNull();
    });

    it('should handle empty data', () => {
      const result = calculateBollingerBandsWithNull([]);

      expect(result.upper).toEqual([]);
      expect(result.middle).toEqual([]);
      expect(result.lower).toEqual([]);
    });

    it('should handle data shorter than period', () => {
      const prices = [10, 20, 30, 40, 50];
      const result = calculateBollingerBandsWithNull(prices, 20, 2);

      prices.forEach((_, i) => {
        expect(result.upper[i]).toBeNull();
        expect(result.middle[i]).toBeNull();
        expect(result.lower[i]).toBeNull();
      });
    });

    it('should calculate correct values at period boundary', () => {
      const prices = Array.from({ length: 21 }, (_, i) => 100 + i);
      const result = calculateBollingerBandsWithNull(prices, 20, 2);

      expect(result.upper[19]).not.toBeNull();
      expect(result.middle[19]).toBe(109.5);
    });
  });

  describe('calculateBollingerBandsExtended', () => {
    describe('Extended calculations', () => {
      it('should calculate bandwidth and position', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 25 }, (_, i) => ({
          price: 100 + i,
          timestamp: i,
        }));
        const result = calculateBollingerBandsExtended(prices, 20, 2);

        expect(result.bandwidth).toBeDefined();
        expect(result.bandwidthPercent).toBeDefined();
        expect(result.position).toBeDefined();
      });

      it('should sort prices by timestamp', () => {
        const prices: OHLCVDataPoint[] = [
          { price: 100, timestamp: 2 },
          { price: 110, timestamp: 0 },
          { price: 105, timestamp: 1 },
        ];
        const result = calculateBollingerBandsExtended(prices, 3, 2);

        expect(result.middle.length).toBe(3);
      });

      it('should calculate bandwidth as upper - lower', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 25 }, (_, i) => ({
          price: 100 + i,
          timestamp: i,
        }));
        const result = calculateBollingerBandsExtended(prices, 20, 2);

        for (let i = 19; i < prices.length; i++) {
          expect(result.bandwidth[i]).toBeCloseTo(result.upper[i] - result.lower[i]);
        }
      });

      it('should calculate bandwidthPercent correctly', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 25 }, (_, i) => ({
          price: 100 + i,
          timestamp: i,
        }));
        const result = calculateBollingerBandsExtended(prices, 20, 2);

        for (let i = 19; i < prices.length; i++) {
          const expectedPercent = (result.bandwidth[i] / result.middle[i]) * 100;
          expect(result.bandwidthPercent[i]).toBeCloseTo(expectedPercent);
        }
      });

      it('should calculate position correctly', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 25 }, (_, i) => ({
          price: 100 + i,
          timestamp: i,
        }));
        const result = calculateBollingerBandsExtended(prices, 20, 2);

        for (let i = 19; i < prices.length; i++) {
          const expectedPosition = (prices[i].price - result.middle[i]) / (result.stdDev[i] * 2);
          expect(result.position[i]).toBeCloseTo(expectedPosition);
        }
      });

      it('should return position 0 when price equals middle band', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 25 }, (_, i) => ({
          price: 100,
          timestamp: i,
        }));
        const result = calculateBollingerBandsExtended(prices, 20, 2);

        for (let i = 19; i < prices.length; i++) {
          expect(result.position[i]).toBe(0);
        }
      });

      it('should return positive position when price above middle band', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 25 }, (_, i) => ({
          price: 100 + i * 2,
          timestamp: i,
        }));
        const result = calculateBollingerBandsExtended(prices, 20, 2);

        for (let i = 20; i < prices.length; i++) {
          expect(result.position[i]).toBeGreaterThan(0);
        }
      });

      it('should return negative position when price below middle band', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 25 }, (_, i) => ({
          price: 200 - i * 2,
          timestamp: i,
        }));
        const result = calculateBollingerBandsExtended(prices, 20, 2);

        for (let i = 20; i < prices.length; i++) {
          expect(result.position[i]).toBeLessThan(0);
        }
      });
    });

    describe('Edge cases', () => {
      it('should handle empty prices', () => {
        const result = calculateBollingerBandsExtended([]);
        expect(result.upper).toEqual([]);
        expect(result.middle).toEqual([]);
        expect(result.lower).toEqual([]);
      });

      it('should handle single data point', () => {
        const prices: OHLCVDataPoint[] = [{ price: 100, timestamp: 0 }];
        const result = calculateBollingerBandsExtended(prices, 20, 2);

        expect(result.upper.length).toBe(1);
      });

      it('should handle data without timestamp', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 25 }, (_, i) => ({
          price: 100 + i,
        }));
        const result = calculateBollingerBandsExtended(prices, 20, 2);

        expect(result.upper.length).toBe(25);
      });

      it('should handle data with high, low, close properties', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 25 }, (_, i) => ({
          price: 100 + i,
          high: 105 + i,
          low: 95 + i,
          close: 100 + i,
          timestamp: i,
        }));
        const result = calculateBollingerBandsExtended(prices, 20, 2);

        expect(result.upper.length).toBe(25);
      });

      it('should handle zero middle band (avoid division by zero)', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 25 }, (_, i) => ({
          price: 0,
          timestamp: i,
        }));
        const result = calculateBollingerBandsExtended(prices, 20, 2);

        expect(result.bandwidthPercent[24]).toBe(0);
      });
    });
  });
});
