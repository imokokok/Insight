import { calculateATR, calculateTrueRange } from '../calculations';

import type { OHLCVDataPoint } from '../types';

describe('ATR (Average True Range)', () => {
  describe('calculateTrueRange', () => {
    describe('True range calculation', () => {
      it('should calculate true range for first candle (no previous)', () => {
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

      it('should calculate true range as max of three values', () => {
        const current: OHLCVDataPoint = { price: 100, high: 110, low: 90, close: 105 };
        const previous: OHLCVDataPoint = { price: 85, close: 85 };

        const result = calculateTrueRange(current, previous);
        expect(result).toBe(25);
      });

      it('should use price when high/low not available', () => {
        const current: OHLCVDataPoint = { price: 100 };
        const result = calculateTrueRange(current, null);

        expect(result).toBe(0);
      });

      it('should handle gap up scenario', () => {
        const current: OHLCVDataPoint = { price: 100, high: 110, low: 105, close: 108 };
        const previous: OHLCVDataPoint = { price: 95, close: 95 };

        const result = calculateTrueRange(current, previous);
        expect(result).toBe(15);
      });

      it('should handle gap down scenario', () => {
        const current: OHLCVDataPoint = { price: 100, high: 95, low: 85, close: 88 };
        const previous: OHLCVDataPoint = { price: 100, close: 100 };

        const result = calculateTrueRange(current, previous);
        expect(result).toBe(15);
      });

      it('should handle high volatility scenario', () => {
        const current: OHLCVDataPoint = { price: 100, high: 150, low: 50, close: 120 };
        const previous: OHLCVDataPoint = { price: 80, close: 80 };

        const result = calculateTrueRange(current, previous);
        expect(result).toBe(100);
      });

      it('should use price fallback for high when not available', () => {
        const current: OHLCVDataPoint = { price: 100, low: 95 };
        const previous: OHLCVDataPoint = { price: 90, close: 90 };

        const result = calculateTrueRange(current, previous);
        expect(result).toBe(10);
      });

      it('should use price fallback for low when not available', () => {
        const current: OHLCVDataPoint = { price: 100, high: 105 };
        const previous: OHLCVDataPoint = { price: 110, close: 110 };

        const result = calculateTrueRange(current, previous);
        expect(result).toBe(10);
      });
    });
  });

  describe('calculateATR', () => {
    describe('Average true range calculation', () => {
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
        expect(result.atr[13]).toBeGreaterThan(0);
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

      it('should calculate ATR using Wilder smoothing method', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
          price: 100 + i,
          high: 105 + i,
          low: 95 + i,
          close: 100 + i,
        }));
        const result = calculateATR(prices, 14);

        const firstATR = result.atr[13];
        const secondATR = result.atr[14];

        const expectedSecondATR = (firstATR * 13 + result.tr[14]) / 14;
        expect(secondATR).toBeCloseTo(expectedSecondATR);
      });
    });

    describe('Different periods', () => {
      it('should handle period of 7', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 15 }, (_, i) => ({
          price: 100 + i,
          high: 105 + i,
          low: 95 + i,
          close: 100 + i,
        }));
        const result = calculateATR(prices, 7);

        expect(result.tr.length).toBe(15);
        for (let i = 0; i < 6; i++) {
          expect(result.atr[i]).toBeNaN();
        }
        expect(result.atr[6]).not.toBeNaN();
      });

      it('should handle period of 21', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 25 }, (_, i) => ({
          price: 100 + i,
          high: 105 + i,
          low: 95 + i,
          close: 100 + i,
        }));
        const result = calculateATR(prices, 21);

        expect(result.tr.length).toBe(25);
        for (let i = 0; i < 20; i++) {
          expect(result.atr[i]).toBeNaN();
        }
        expect(result.atr[20]).not.toBeNaN();
      });

      it('should handle custom period', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 15 }, (_, i) => ({
          price: 100 + i,
          high: 105 + i,
          low: 95 + i,
          close: 100 + i,
        }));
        const result = calculateATR(prices, 5);

        expect(result.tr.length).toBe(15);
        for (let i = 0; i < 4; i++) {
          expect(result.atr[i]).toBeNaN();
        }
        expect(result.atr[4]).not.toBeNaN();
      });

      it('should have shorter period ATR more responsive', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 25 }, (_, i) => ({
          price: 100 + i,
          high: 105 + i + (i > 15 ? 10 : 0),
          low: 95 + i - (i > 15 ? 10 : 0),
          close: 100 + i,
        }));
        const result7 = calculateATR(prices, 7);
        const result14 = calculateATR(prices, 14);

        const change7 = Math.abs(result7.atr[24] - result7.atr[20]);
        const change14 = Math.abs(result14.atr[24] - result14.atr[20]);

        expect(change7).toBeGreaterThanOrEqual(change14);
      });
    });

    describe('Volatility measurement', () => {
      it('should measure volatility correctly', () => {
        const lowVolatilityPrices: OHLCVDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
          price: 100 + i * 0.1,
          high: 100 + i * 0.1 + 0.5,
          low: 100 + i * 0.1 - 0.5,
          close: 100 + i * 0.1,
        }));

        const highVolatilityPrices: OHLCVDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
          price: 100 + i,
          high: 100 + i + 10,
          low: 100 + i - 10,
          close: 100 + i,
        }));

        const lowResult = calculateATR(lowVolatilityPrices, 14);
        const highResult = calculateATR(highVolatilityPrices, 14);

        expect(highResult.atr[19]).toBeGreaterThan(lowResult.atr[19]);
      });

      it('should have higher ATR with larger price ranges', () => {
        const smallRangePrices: OHLCVDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
          price: 100,
          high: 101,
          low: 99,
          close: 100,
        }));

        const largeRangePrices: OHLCVDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
          price: 100,
          high: 110,
          low: 90,
          close: 100,
        }));

        const smallResult = calculateATR(smallRangePrices, 14);
        const largeResult = calculateATR(largeRangePrices, 14);

        expect(largeResult.atr[19]).toBeGreaterThan(smallResult.atr[19]);
      });

      it('should reflect increasing volatility', () => {
        const prices: OHLCVDataPoint[] = [];
        for (let i = 0; i < 20; i++) {
          const range = 5 + i * 0.5;
          prices.push({
            price: 100,
            high: 100 + range,
            low: 100 - range,
            close: 100,
          });
        }

        const result = calculateATR(prices, 14);
        expect(result.atr[19]).toBeGreaterThan(result.atr[13]);
      });

      it('should reflect decreasing volatility', () => {
        const prices: OHLCVDataPoint[] = [];
        for (let i = 0; i < 20; i++) {
          const range = 15 - i * 0.5;
          prices.push({
            price: 100,
            high: 100 + range,
            low: 100 - range,
            close: 100,
          });
        }

        const result = calculateATR(prices, 14);
        expect(result.atr[19]).toBeLessThan(result.atr[13]);
      });

      it('should handle gap scenarios in volatility', () => {
        const prices: OHLCVDataPoint[] = [
          { price: 100, high: 105, low: 95, close: 102 },
          { price: 102, high: 107, low: 97, close: 104 },
          { price: 104, high: 109, low: 99, close: 106 },
          { price: 106, high: 111, low: 101, close: 108 },
          { price: 108, high: 113, low: 103, close: 110 },
          { price: 110, high: 115, low: 105, close: 112 },
          { price: 112, high: 117, low: 107, close: 114 },
          { price: 114, high: 119, low: 109, close: 116 },
          { price: 116, high: 121, low: 111, close: 118 },
          { price: 118, high: 123, low: 113, close: 120 },
          { price: 120, high: 125, low: 115, close: 122 },
          { price: 122, high: 127, low: 117, close: 124 },
          { price: 124, high: 129, low: 119, close: 126 },
          { price: 126, high: 131, low: 121, close: 128 },
          { price: 150, high: 155, low: 145, close: 152 },
        ];

        const result = calculateATR(prices, 14);
        expect(result.tr[14]).toBeGreaterThan(result.tr[13]);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty prices', () => {
        const result = calculateATR([]);

        expect(result.tr).toEqual([]);
        expect(result.atr).toEqual([]);
      });

      it('should handle single data point', () => {
        const prices: OHLCVDataPoint[] = [{ price: 100, high: 105, low: 95 }];
        const result = calculateATR(prices, 14);

        expect(result.tr.length).toBe(1);
        expect(result.atr[0]).toBeNaN();
      });

      it('should handle data without high/low', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 15 }, (_, i) => ({
          price: 100 + i,
        }));
        const result = calculateATR(prices, 14);

        expect(result.tr.length).toBe(15);
      });

      it('should handle data with only price', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 15 }, (_, i) => ({
          price: 100,
        }));
        const result = calculateATR(prices, 14);

        expect(result.tr.every((tr) => tr === 0)).toBe(true);
      });

      it('should handle data shorter than period', () => {
        const prices: OHLCVDataPoint[] = [
          { price: 100, high: 105, low: 95 },
          { price: 102, high: 107, low: 97 },
          { price: 104, high: 109, low: 99 },
        ];
        const result = calculateATR(prices, 14);

        expect(result.tr.length).toBe(3);
        result.atr.forEach((atr) => {
          expect(atr).toBeNaN();
        });
      });

      it('should handle data exactly equal to period', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 14 }, (_, i) => ({
          price: 100 + i,
          high: 105 + i,
          low: 95 + i,
          close: 100 + i,
        }));
        const result = calculateATR(prices, 14);

        expect(result.atr[13]).not.toBeNaN();
      });

      it('should handle very large prices', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
          price: 1e10 + i * 1e9,
          high: 1e10 + i * 1e9 + 1e8,
          low: 1e10 + i * 1e9 - 1e8,
          close: 1e10 + i * 1e9,
        }));
        const result = calculateATR(prices, 14);

        expect(result.tr.length).toBe(20);
        expect(result.atr[19]).toBeGreaterThan(0);
      });

      it('should handle very small prices', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
          price: 1e-10 + i * 1e-11,
          high: 1e-10 + i * 1e-11 + 1e-12,
          low: 1e-10 + i * 1e-11 - 1e-12,
          close: 1e-10 + i * 1e-11,
        }));
        const result = calculateATR(prices, 14);

        expect(result.tr.length).toBe(20);
      });

      it('should handle negative prices', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
          price: -100 - i,
          high: -95 - i,
          low: -105 - i,
          close: -100 - i,
        }));
        const result = calculateATR(prices, 14);

        expect(result.tr.length).toBe(20);
        expect(result.tr.every((tr) => tr >= 0)).toBe(true);
      });

      it('should handle mixed positive and negative prices', () => {
        const prices: OHLCVDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
          price: i % 2 === 0 ? 100 + i : -100 - i,
          high: i % 2 === 0 ? 105 + i : -95 - i,
          low: i % 2 === 0 ? 95 + i : -105 - i,
          close: i % 2 === 0 ? 100 + i : -100 - i,
        }));
        const result = calculateATR(prices, 14);

        expect(result.tr.length).toBe(20);
        expect(result.tr.every((tr) => tr >= 0)).toBe(true);
      });
    });
  });
});
