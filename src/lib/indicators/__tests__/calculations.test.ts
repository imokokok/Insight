import {
  calculateSMA,
  calculateSMAWithNull,
  calculateEMA,
  calculateEMAWithNull,
  calculateRSI,
  calculateRSIFromData,
  calculateMACD,
  calculateMACDExtended,
  calculateBollingerBands,
  calculateBollingerBandsWithNull,
  calculateBollingerBandsExtended,
  calculateTrueRange,
  calculateATR,
  calculateRollingStdDev,
  calculateVolatility,
  calculateROC,
  calculateCurrentVolatility,
  addTechnicalIndicators,
} from '../calculations';

import type { OHLCVDataPoint } from '../types';

describe('Technical Indicators Calculations', () => {
  describe('calculateSMA', () => {
    it('should calculate simple moving average correctly', () => {
      const data = [10, 20, 30, 40, 50];
      const result = calculateSMA(data, 3);

      expect(result[0]).toBe(10);
      expect(result[1]).toBe(20);
      expect(result[2]).toBe(20);
      expect(result[3]).toBe(30);
      expect(result[4]).toBe(40);
    });

    it('should return original values for first period-1 elements', () => {
      const data = [1, 2, 3, 4, 5];
      const result = calculateSMA(data, 5);

      expect(result[0]).toBe(1);
      expect(result[1]).toBe(2);
      expect(result[2]).toBe(3);
      expect(result[3]).toBe(4);
      expect(result[4]).toBe(3);
    });

    it('should handle period of 1', () => {
      const data = [10, 20, 30];
      const result = calculateSMA(data, 1);

      expect(result).toEqual([10, 20, 30]);
    });

    it('should handle empty array', () => {
      const result = calculateSMA([], 5);
      expect(result).toEqual([]);
    });

    it('should calculate SMA with period equal to data length', () => {
      const data = [10, 20, 30, 40, 50];
      const result = calculateSMA(data, 5);

      expect(result[4]).toBe(30);
    });

    it('should handle decimal values correctly', () => {
      const data = [1.5, 2.5, 3.5, 4.5, 5.5];
      const result = calculateSMA(data, 3);

      expect(result[2]).toBeCloseTo(2.5);
      expect(result[3]).toBeCloseTo(3.5);
      expect(result[4]).toBeCloseTo(4.5);
    });
  });

  describe('calculateSMAWithNull', () => {
    it('should return null for first period-1 elements', () => {
      const data = [10, 20, 30, 40, 50];
      const result = calculateSMAWithNull(data, 3);

      expect(result[0]).toBeNull();
      expect(result[1]).toBeNull();
      expect(result[2]).toBe(20);
      expect(result[3]).toBe(30);
      expect(result[4]).toBe(40);
    });

    it('should return all nulls when data length is less than period', () => {
      const data = [10, 20];
      const result = calculateSMAWithNull(data, 5);

      expect(result[0]).toBeNull();
      expect(result[1]).toBeNull();
    });

    it('should handle period of 1', () => {
      const data = [10, 20, 30];
      const result = calculateSMAWithNull(data, 1);

      expect(result).toEqual([10, 20, 30]);
    });

    it('should handle empty array', () => {
      const result = calculateSMAWithNull([], 5);
      expect(result).toEqual([]);
    });
  });

  describe('calculateEMA', () => {
    it('should calculate exponential moving average correctly', () => {
      const data = [10, 20, 30, 40, 50];
      const result = calculateEMA(data, 3);
      const multiplier = 2 / (3 + 1);

      expect(result[0]).toBe(10);
      expect(result[1]).toBeCloseTo(20 * multiplier + 10 * (1 - multiplier));
    });

    it('should use first data point as initial EMA', () => {
      const data = [100, 200, 300];
      const result = calculateEMA(data, 5);

      expect(result[0]).toBe(100);
    });

    it('should apply smoothing factor correctly', () => {
      const data = [10, 20, 30, 40, 50];
      const period = 5;
      const multiplier = 2 / (period + 1);
      const result = calculateEMA(data, period);

      expect(result[0]).toBe(10);
      expect(result[1]).toBeCloseTo(20 * multiplier + 10 * (1 - multiplier));
      expect(result[2]).toBeCloseTo(30 * multiplier + result[1] * (1 - multiplier));
    });

    it('should handle period of 1', () => {
      const data = [10, 20, 30];
      const result = calculateEMA(data, 1);
      const multiplier = 2 / (1 + 1);

      expect(result[0]).toBe(10);
      expect(result[1]).toBeCloseTo(20 * multiplier + 10 * (1 - multiplier));
    });

    it('should handle empty array', () => {
      const result = calculateEMA([], 5);
      expect(result).toEqual([]);
    });

    it('should give more weight to recent prices', () => {
      const data = [10, 10, 10, 10, 100];
      const result = calculateEMA(data, 3);

      expect(result[4]).toBeGreaterThan(10);
      expect(result[4]).toBeLessThan(100);
    });
  });

  describe('calculateEMAWithNull', () => {
    it('should return null for first period-1 elements', () => {
      const data = [10, 20, 30, 40, 50];
      const result = calculateEMAWithNull(data, 3);

      expect(result[0]).toBeNull();
      expect(result[1]).toBeNull();
      expect(result[2]).not.toBeNull();
    });

    it('should use SMA for first valid EMA value', () => {
      const data = [10, 20, 30];
      const result = calculateEMAWithNull(data, 3);

      expect(result[0]).toBeNull();
      expect(result[1]).toBeNull();
      expect(result[2]).toBe(20);
    });

    it('should calculate subsequent EMA values correctly', () => {
      const data = [10, 20, 30, 40, 50];
      const result = calculateEMAWithNull(data, 3);
      const multiplier = 2 / (3 + 1);

      expect(result[2]).toBe(20);
      expect(result[3]).toBeCloseTo(40 * multiplier + 20 * (1 - multiplier));
    });

    it('should handle empty array', () => {
      const result = calculateEMAWithNull([], 5);
      expect(result).toEqual([]);
    });
  });

  describe('calculateRSI', () => {
    it('should calculate RSI correctly with known data', () => {
      const prices = [44, 44.5, 43.5, 44.5, 44, 45, 46, 45.5, 46, 47, 47.5, 48, 47.5, 47, 46];
      const result = calculateRSI(prices, 14);

      expect(result.length).toBe(prices.length);
      result.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });
    });

    it('should return 50 for first period elements', () => {
      const prices = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
      const result = calculateRSI(prices, 14);

      for (let i = 0; i < 14; i++) {
        expect(result[i]).toBe(50);
      }
    });

    it('should return 100 when there are only gains', () => {
      const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
      const result = calculateRSI(prices, 14);

      expect(result[14]).toBe(100);
    });

    it('should return close to 0 when there are only losses', () => {
      const prices = [100, 99, 98, 97, 96, 95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85];
      const result = calculateRSI(prices, 14);

      expect(result[14]).toBeLessThan(10);
    });

    it('should handle default period of 14', () => {
      const prices = Array(20).fill(100);
      const result = calculateRSI(prices);

      expect(result.length).toBe(20);
    });

    it('should calculate average gains and losses correctly', () => {
      const prices = [100, 101, 100, 102, 101, 103, 102, 104, 103, 105, 104, 106, 105, 107, 106];
      const result = calculateRSI(prices, 14);

      expect(result[14]).toBeGreaterThan(40);
      expect(result[14]).toBeLessThan(70);
    });
  });

  describe('calculateRSIFromData', () => {
    it('should calculate RSI from data objects', () => {
      const data = [
        { price: 44 },
        { price: 44.5 },
        { price: 43.5 },
        { price: 44.5 },
        { price: 44 },
        { price: 45 },
        { price: 46 },
        { price: 45.5 },
        { price: 46 },
        { price: 47 },
        { price: 47.5 },
        { price: 48 },
        { price: 47.5 },
        { price: 47 },
        { price: 46 },
      ];
      const result = calculateRSIFromData(data, 14);

      expect(result.length).toBe(data.length);
    });

    it('should use close price when available', () => {
      const data = [
        { price: 100, close: 110 },
        { price: 100, close: 111 },
        { price: 100, close: 112 },
        { price: 100, close: 113 },
        { price: 100, close: 114 },
        { price: 100, close: 115 },
        { price: 100, close: 116 },
        { price: 100, close: 117 },
        { price: 100, close: 118 },
        { price: 100, close: 119 },
        { price: 100, close: 120 },
        { price: 100, close: 121 },
        { price: 100, close: 122 },
        { price: 100, close: 123 },
        { price: 100, close: 124 },
      ];
      const result = calculateRSIFromData(data, 14);

      expect(result[14]).toBe(100);
    });

    it('should return 50 for insufficient data', () => {
      const data = [{ price: 100 }, { price: 101 }, { price: 102 }];
      const result = calculateRSIFromData(data, 14);

      expect(result).toEqual([50, 50, 50]);
    });

    it('should handle empty data', () => {
      const result = calculateRSIFromData([], 14);
      expect(result).toEqual([]);
    });

    it('should calculate RSI correctly with mixed gains and losses', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        price: 100 + (i % 2 === 0 ? i : -i),
      }));
      const result = calculateRSIFromData(data, 14);

      expect(result.length).toBe(20);
      result.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('calculateMACD', () => {
    it('should calculate MACD line correctly', () => {
      const prices = [
        10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
      ];
      const result = calculateMACD(prices, 12, 26, 9);

      expect(result.macd.length).toBe(prices.length);
      expect(result.signal.length).toBe(prices.length);
      expect(result.histogram.length).toBe(prices.length);
    });

    it('should calculate histogram as difference between MACD and signal', () => {
      const prices = Array.from({ length: 35 }, (_, i) => 100 + i);
      const result = calculateMACD(prices);

      for (let i = 0; i < prices.length; i++) {
        expect(result.histogram[i]).toBeCloseTo(result.macd[i] - result.signal[i]);
      }
    });

    it('should use default periods', () => {
      const prices = Array.from({ length: 35 }, (_, i) => 100 + i);
      const result = calculateMACD(prices);

      expect(result).toBeDefined();
      expect(result.macd.length).toBe(prices.length);
    });

    it('should handle empty prices', () => {
      const result = calculateMACD([]);

      expect(result.macd).toEqual([]);
      expect(result.signal).toEqual([]);
      expect(result.histogram).toEqual([]);
    });

    it('should produce positive MACD in uptrend', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i * 2);
      const result = calculateMACD(prices);

      const lastMacd = result.macd[result.macd.length - 1];
      expect(lastMacd).toBeGreaterThan(0);
    });
  });

  describe('calculateMACDExtended', () => {
    it('should calculate DIF, DEA, and MACD correctly', () => {
      const data = Array.from({ length: 35 }, (_, i) => ({ price: 100 + i }));
      const result = calculateMACDExtended(data);

      expect(result.dif.length).toBe(data.length);
      expect(result.dea.length).toBe(data.length);
      expect(result.macd.length).toBe(data.length);
      expect(result.signals.length).toBe(data.length);
    });

    it('should identify golden cross signal', () => {
      const data: Array<{ price: number }> = [];

      for (let i = 0; i < 20; i++) {
        data.push({ price: 100 + i });
      }
      for (let i = 0; i < 20; i++) {
        data.push({ price: 120 - i * 0.5 });
      }
      for (let i = 0; i < 20; i++) {
        data.push({ price: 110 + i });
      }

      const result = calculateMACDExtended(data);

      const hasGoldenCross = result.signals.some((s) => s === 'golden');
      expect(hasGoldenCross).toBe(true);
    });

    it('should identify death cross signal', () => {
      const data: Array<{ price: number }> = [];

      for (let i = 0; i < 20; i++) {
        data.push({ price: 100 + i });
      }
      for (let i = 0; i < 30; i++) {
        data.push({ price: 120 - i });
      }

      const result = calculateMACDExtended(data);

      const hasDeathCross = result.signals.some((s) => s === 'death');
      expect(hasDeathCross).toBe(true);
    });

    it('should calculate MACD as 2 * (DIF - DEA)', () => {
      const data = Array.from({ length: 35 }, (_, i) => ({ price: 100 + i }));
      const result = calculateMACDExtended(data);

      for (let i = 0; i < data.length; i++) {
        expect(result.macd[i]).toBeCloseTo((result.dif[i] - result.dea[i]) * 2);
      }
    });

    it('should use default periods', () => {
      const data = Array.from({ length: 35 }, (_, i) => ({ price: 100 + i }));
      const result = calculateMACDExtended(data);

      expect(result).toBeDefined();
    });

    it('should handle empty data', () => {
      const result = calculateMACDExtended([]);

      expect(result.dif).toEqual([]);
      expect(result.dea).toEqual([]);
      expect(result.macd).toEqual([]);
      expect(result.signals).toEqual([]);
    });

    it('should have null signals when no cross occurs', () => {
      const data = Array.from({ length: 10 }, (_i) => ({ price: 100 }));
      const result = calculateMACDExtended(data);

      const nullSignals = result.signals.filter((s) => s === null);
      expect(nullSignals.length).toBeGreaterThan(0);
    });
  });

  describe('calculateBollingerBands', () => {
    it('should calculate upper, middle, and lower bands', () => {
      const prices = [
        10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48,
      ];
      const result = calculateBollingerBands(prices, 20, 2);

      expect(result.upper.length).toBe(prices.length);
      expect(result.middle.length).toBe(prices.length);
      expect(result.lower.length).toBe(prices.length);
      expect(result.stdDev.length).toBe(prices.length);
    });

    it('should have upper band above middle band', () => {
      const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
      const result = calculateBollingerBands(prices, 20, 2);

      for (let i = 19; i < prices.length; i++) {
        expect(result.upper[i]).toBeGreaterThan(result.middle[i]);
      }
    });

    it('should have lower band below middle band', () => {
      const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
      const result = calculateBollingerBands(prices, 20, 2);

      for (let i = 19; i < prices.length; i++) {
        expect(result.lower[i]).toBeLessThan(result.middle[i]);
      }
    });

    it('should use SMA for middle band', () => {
      const prices = [
        10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48,
      ];
      const result = calculateBollingerBands(prices, 20, 2);

      const expectedMiddle = prices.reduce((a, b) => a + b, 0) / 20;
      expect(result.middle[19]).toBe(expectedMiddle);
    });

    it('should return original price for first period-1 elements', () => {
      const prices = [10, 20, 30, 40, 50];
      const result = calculateBollingerBands(prices, 5, 2);

      expect(result.upper[0]).toBe(10);
      expect(result.lower[0]).toBe(10);
      expect(result.stdDev[0]).toBe(0);
    });

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
  });

  describe('calculateBollingerBandsExtended', () => {
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

    it('should handle empty prices', () => {
      const result = calculateBollingerBandsExtended([]);
      expect(result.upper).toEqual([]);
      expect(result.middle).toEqual([]);
      expect(result.lower).toEqual([]);
    });
  });

  describe('calculateTrueRange', () => {
    it('should calculate true range for first candle', () => {
      const current: OHLCVDataPoint = { price: 100, high: 105, low: 95 };
      const result = calculateTrueRange(current, null);

      expect(result).toBe(10);
    });

    it('should calculate true range using high-low when previous close is within range', () => {
      const current: OHLCVDataPoint = { price: 100, high: 105, low: 95, close: 100 };
      const previous: OHLCVDataPoint = { price: 98, close: 98 };

      const result = calculateTrueRange(current, previous);
      expect(result).toBe(10);
    });

    it('should consider previous close in true range calculation', () => {
      const current: OHLCVDataPoint = { price: 100, high: 105, low: 95, close: 100 };
      const previous: OHLCVDataPoint = { price: 110, close: 110 };

      const result = calculateTrueRange(current, previous);
      expect(result).toBe(15);
    });

    it('should use price when high/low not available', () => {
      const current: OHLCVDataPoint = { price: 100 };
      const result = calculateTrueRange(current, null);

      expect(result).toBe(0);
    });

    it('should calculate true range as max of three values', () => {
      const current: OHLCVDataPoint = { price: 100, high: 110, low: 90, close: 105 };
      const previous: OHLCVDataPoint = { price: 85, close: 85 };

      const result = calculateTrueRange(current, previous);
      expect(result).toBe(25);
    });
  });

  describe('calculateATR', () => {
    it('should calculate ATR correctly', () => {
      const prices: OHLCVDataPoint[] = [
        { price: 100, high: 105, low: 95, close: 102 },
        { price: 102, high: 108, low: 100, close: 105 },
        { price: 105, high: 110, low: 103, close: 108 },
        { price: 108, high: 112, low: 106, close: 110 },
        { price: 110, high: 115, low: 108, close: 113 },
        { price: 113, high: 118, low: 111, close: 116 },
        { price: 116, high: 120, low: 114, close: 118 },
        { price: 118, high: 122, low: 116, close: 120 },
        { price: 120, high: 125, low: 118, close: 123 },
        { price: 123, high: 128, low: 121, close: 126 },
        { price: 126, high: 130, low: 124, close: 128 },
        { price: 128, high: 132, low: 126, close: 130 },
        { price: 130, high: 135, low: 128, close: 133 },
        { price: 133, high: 138, low: 131, close: 136 },
        { price: 136, high: 140, low: 134, close: 138 },
      ];
      const result = calculateATR(prices, 14);

      expect(result.tr.length).toBe(prices.length);
      expect(result.atr.length).toBe(prices.length);
    });

    it('should return NaN for first period-1 ATR values', () => {
      const prices: OHLCVDataPoint[] = Array.from({ length: 15 }, (_, i) => ({
        price: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 100 + i,
      }));
      const result = calculateATR(prices, 14);

      for (let i = 0; i < 13; i++) {
        expect(result.atr[i]).toBeNaN();
      }
    });

    it('should calculate first ATR as average of first period TRs', () => {
      const prices: OHLCVDataPoint[] = Array.from({ length: 15 }, (_, i) => ({
        price: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 100 + i,
      }));
      const result = calculateATR(prices, 14);

      expect(result.atr[13]).not.toBeNaN();
    });

    it('should use smoothing for subsequent ATR values', () => {
      const prices: OHLCVDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        price: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 100 + i,
      }));
      const result = calculateATR(prices, 14);

      for (let i = 14; i < prices.length; i++) {
        expect(result.atr[i]).not.toBeNaN();
      }
    });

    it('should use default period of 14', () => {
      const prices: OHLCVDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        price: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 100 + i,
      }));
      const result = calculateATR(prices);

      expect(result.tr.length).toBe(prices.length);
    });

    it('should handle empty prices', () => {
      const result = calculateATR([]);

      expect(result.tr).toEqual([]);
      expect(result.atr).toEqual([]);
    });
  });

  describe('calculateRollingStdDev', () => {
    it('should calculate rolling standard deviation', () => {
      const prices = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28];
      const result = calculateRollingStdDev(prices, 5);

      expect(result.length).toBe(prices.length);
    });

    it('should return NaN for first period-1 elements', () => {
      const prices = [10, 20, 30, 40, 50];
      const result = calculateRollingStdDev(prices, 5);

      for (let i = 0; i < 4; i++) {
        expect(result[i]).toBeNaN();
      }
    });

    it('should calculate correct standard deviation', () => {
      const prices = [2, 4, 6, 8, 10];
      const result = calculateRollingStdDev(prices, 5);

      const _mean = 6;
      const variance = (16 + 4 + 0 + 4 + 16) / 5;
      const expectedStdDev = Math.sqrt(variance);

      expect(result[4]).toBeCloseTo(expectedStdDev);
    });

    it('should handle empty array', () => {
      const result = calculateRollingStdDev([], 5);
      expect(result).toEqual([]);
    });

    it('should handle period of 1', () => {
      const prices = [10, 20, 30];
      const result = calculateRollingStdDev(prices, 1);

      expect(result[0]).toBe(0);
      expect(result[1]).toBe(0);
      expect(result[2]).toBe(0);
    });
  });

  describe('calculateVolatility', () => {
    it('should calculate annualized volatility', () => {
      const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
      const result = calculateVolatility(prices, 20);

      expect(result.length).toBe(prices.length);
    });

    it('should return null for first period elements', () => {
      const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
      const result = calculateVolatility(prices, 20);

      for (let i = 0; i < 20; i++) {
        expect(result[i]).toBeNull();
      }
    });

    it('should calculate volatility for valid elements', () => {
      const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
      const result = calculateVolatility(prices, 20);

      expect(result[20]).not.toBeNull();
      expect(result[20]).toBeGreaterThan(0);
    });

    it('should annualize volatility correctly', () => {
      const prices = Array.from({ length: 25 }, (_, i) => 100 * Math.pow(1.01, i));
      const result = calculateVolatility(prices, 20);

      const volatility = result[24];
      expect(volatility).not.toBeNull();
      expect(volatility).toBeGreaterThan(0);
    });

    it('should handle empty array', () => {
      const result = calculateVolatility([], 20);
      expect(result).toEqual([]);
    });

    it('should use default period of 20', () => {
      const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
      const result = calculateVolatility(prices);

      expect(result.length).toBe(prices.length);
    });
  });

  describe('calculateROC', () => {
    it('should calculate rate of change correctly', () => {
      const prices = [100, 110, 120, 130, 140, 150];
      const result = calculateROC(prices, 3);

      expect(result.length).toBe(prices.length);
    });

    it('should return null for first period elements', () => {
      const prices = [100, 110, 120, 130, 140, 150];
      const result = calculateROC(prices, 3);

      expect(result[0]).toBeNull();
      expect(result[1]).toBeNull();
      expect(result[2]).toBeNull();
    });

    it('should calculate ROC as percentage change', () => {
      const prices = [100, 110, 120, 130];
      const result = calculateROC(prices, 2);

      expect(result[2]).toBeCloseTo(20);
      expect(result[3]).toBeCloseTo(18.18);
    });

    it('should handle negative ROC', () => {
      const prices = [100, 90, 80, 70];
      const result = calculateROC(prices, 2);

      expect(result[2]).toBeCloseTo(-20);
      expect(result[3]).toBeCloseTo(-22.22);
    });

    it('should handle empty array', () => {
      const result = calculateROC([], 10);
      expect(result).toEqual([]);
    });

    it('should use default period of 10', () => {
      const prices = Array.from({ length: 15 }, (_, i) => 100 + i);
      const result = calculateROC(prices);

      expect(result.length).toBe(prices.length);
    });

    it('should return 0 when price is unchanged', () => {
      const prices = [100, 100, 100, 100];
      const result = calculateROC(prices, 2);

      expect(result[2]).toBe(0);
      expect(result[3]).toBe(0);
    });
  });

  describe('calculateCurrentVolatility', () => {
    it('should calculate volatility for last 20 prices', () => {
      const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
      const result = calculateCurrentVolatility(prices);

      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(0);
    });

    it('should return null for insufficient data', () => {
      const prices = Array.from({ length: 15 }, (_, i) => 100 + i);
      const result = calculateCurrentVolatility(prices);

      expect(result).toBeNull();
    });

    it('should use exactly 20 most recent prices', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
      const result = calculateCurrentVolatility(prices);

      expect(result).not.toBeNull();
    });

    it('should handle empty array', () => {
      const result = calculateCurrentVolatility([]);
      expect(result).toBeNull();
    });

    it('should return positive volatility for varying prices', () => {
      const prices = [
        100, 102, 98, 105, 95, 110, 90, 115, 85, 120, 80, 125, 75, 130, 70, 135, 65, 140, 60, 145,
      ];
      const result = calculateCurrentVolatility(prices);

      expect(result).toBeGreaterThan(0);
    });
  });

  describe('addTechnicalIndicators', () => {
    it('should add MA7, MA30, and Volatility to data', () => {
      const chartData = Array.from({ length: 35 }, (_, i) => ({
        value: 100 + i,
      }));
      const result = addTechnicalIndicators(chartData, 'value');

      expect(result[0]).toHaveProperty('value_MA7');
      expect(result[0]).toHaveProperty('value_MA30');
      expect(result[0]).toHaveProperty('value_Volatility');
    });

    it('should preserve original data properties', () => {
      const chartData = [
        { value: 100, name: 'test1' },
        { value: 110, name: 'test2' },
        { value: 120, name: 'test3' },
      ];
      const result = addTechnicalIndicators(chartData, 'value');

      expect(result[0].name).toBe('test1');
      expect(result[1].name).toBe('test2');
      expect(result[2].name).toBe('test3');
    });

    it('should return original data if no valid prices', () => {
      const chartData = [{ value: 'invalid' }, { value: null }] as Array<Record<string, unknown>>;
      const result = addTechnicalIndicators(chartData, 'value');

      expect(result).toEqual(chartData);
    });

    it('should handle empty array', () => {
      const result = addTechnicalIndicators([], 'value');
      expect(result).toEqual([]);
    });

    it('should calculate MA7 correctly', () => {
      const chartData = Array.from({ length: 10 }, (_, i) => ({
        value: 100 + i * 10,
      }));
      const result = addTechnicalIndicators(chartData, 'value');

      expect(result[6].value_MA7).toBeCloseTo(130);
    });

    it('should return null for MA30 when insufficient data', () => {
      const chartData = Array.from({ length: 20 }, (_, i) => ({
        value: 100 + i,
      }));
      const result = addTechnicalIndicators(chartData, 'value');

      expect(result[19].value_MA30).toBeNull();
    });
  });
});
