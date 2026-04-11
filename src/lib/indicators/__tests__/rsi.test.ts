import { calculateRSI, calculateRSIFromData } from '../calculations';

describe('RSI (Relative Strength Index)', () => {
  describe('calculateRSI', () => {
    describe('RSI calculation accuracy (0-100 range)', () => {
      it('should return values within 0-100 range', () => {
        const prices = [
          44, 44.5, 43.5, 44.5, 44, 45, 46, 45.5, 46, 47, 47.5, 48, 47.5, 47, 46, 45, 44, 43, 44,
          45,
        ];
        const result = calculateRSI(prices, 14);

        result.forEach((value) => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        });
      });

      it('should calculate RSI correctly with known data', () => {
        const prices = [44, 44.5, 43.5, 44.5, 44, 45, 46, 45.5, 46, 47, 47.5, 48, 47.5, 47, 46];
        const result = calculateRSI(prices, 14);

        expect(result.length).toBe(prices.length);
        expect(result[14]).toBeGreaterThan(40);
        expect(result[14]).toBeLessThan(70);
      });

      it('should calculate RSI with mixed gains and losses', () => {
        const prices = [100, 101, 100, 102, 101, 103, 102, 104, 103, 105, 104, 106, 105, 107, 106];
        const result = calculateRSI(prices, 14);

        expect(result[14]).toBeGreaterThan(40);
        expect(result[14]).toBeLessThan(70);
      });
    });

    describe('Boundary values (0 and 100)', () => {
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

      it('should return 100 for constant prices (no losses)', () => {
        const prices = Array(20).fill(100);
        const result = calculateRSI(prices, 14);

        expect(result[14]).toBe(100);
      });

      it('should approach 100 with strong uptrend', () => {
        const prices = Array.from({ length: 20 }, (_, i) => 100 + i * 5);
        const result = calculateRSI(prices, 14);

        expect(result[19]).toBeGreaterThan(90);
      });

      it('should approach 0 with strong downtrend', () => {
        const prices = Array.from({ length: 20 }, (_, i) => 200 - i * 5);
        const result = calculateRSI(prices, 14);

        expect(result[19]).toBeLessThan(20);
      });
    });

    describe('Different periods (14, 7, 21)', () => {
      it('should handle default period of 14', () => {
        const prices = Array(20).fill(100);
        const result = calculateRSI(prices);

        expect(result.length).toBe(20);
      });

      it('should calculate RSI with period 7', () => {
        const prices = Array(20)
          .fill(0)
          .map((_, i) => 100 + i);
        const result = calculateRSI(prices, 7);

        expect(result.length).toBe(20);
        for (let i = 0; i < 7; i++) {
          expect(result[i]).toBe(50);
        }
        expect(result[7]).toBe(100);
      });

      it('should calculate RSI with period 21', () => {
        const prices = Array(30)
          .fill(0)
          .map((_, i) => 100 + i);
        const result = calculateRSI(prices, 21);

        expect(result.length).toBe(30);
        for (let i = 0; i < 21; i++) {
          expect(result[i]).toBe(50);
        }
        expect(result[21]).toBe(100);
      });

      it('should return 50 for first period elements regardless of period', () => {
        const prices = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
        const result14 = calculateRSI(prices, 14);
        const result7 = calculateRSI(prices, 7);

        for (let i = 0; i < 14; i++) {
          expect(result14[i]).toBe(50);
        }
        for (let i = 0; i < 7; i++) {
          expect(result7[i]).toBe(50);
        }
      });

      it('should handle custom period', () => {
        const prices = Array(20)
          .fill(0)
          .map((_, i) => 100 + i);
        const result = calculateRSI(prices, 5);

        expect(result.length).toBe(20);
        for (let i = 0; i < 5; i++) {
          expect(result[i]).toBe(50);
        }
      });
    });

    describe('Insufficient data handling', () => {
      it('should handle empty array', () => {
        const result = calculateRSI([]);
        expect(result).toEqual([]);
      });

      it('should handle single element array', () => {
        const result = calculateRSI([100], 14);
        expect(result).toEqual([50]);
      });

      it('should handle array shorter than period', () => {
        const prices = [100, 101, 102, 103, 104];
        const result = calculateRSI(prices, 14);

        expect(result.length).toBe(5);
        result.forEach((value) => {
          expect(value).toBe(50);
        });
      });

      it('should handle array exactly equal to period', () => {
        const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];
        const result = calculateRSI(prices, 14);

        expect(result.length).toBe(15);
        for (let i = 0; i < 14; i++) {
          expect(result[i]).toBe(50);
        }
        expect(result[14]).toBe(100);
      });

      it('should handle array with period + 1 elements', () => {
        const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115];
        const result = calculateRSI(prices, 14);

        expect(result.length).toBe(16);
        expect(result[14]).toBe(100);
        expect(result[15]).toBe(100);
      });
    });

    describe('Overbought/oversold detection', () => {
      it('should detect overbought condition (RSI > 70)', () => {
        const prices = Array.from({ length: 20 }, (_, i) => 100 + i * 3);
        const result = calculateRSI(prices, 14);

        const overboughtSignals = result.filter((r) => r > 70);
        expect(overboughtSignals.length).toBeGreaterThan(0);
      });

      it('should detect oversold condition (RSI < 30)', () => {
        const prices = Array.from({ length: 20 }, (_, i) => 200 - i * 3);
        const result = calculateRSI(prices, 14);

        const oversoldSignals = result.filter((r) => r < 30);
        expect(oversoldSignals.length).toBeGreaterThan(0);
      });

      it('should identify neutral zone (30 <= RSI <= 70)', () => {
        const prices = [
          100, 101, 100, 102, 101, 103, 102, 104, 103, 105, 104, 106, 105, 107, 106, 105, 104, 105,
          106, 105,
        ];
        const result = calculateRSI(prices, 14);

        const neutralSignals = result.filter((r) => r >= 30 && r <= 70);
        expect(neutralSignals.length).toBeGreaterThan(0);
      });

      it('should correctly identify overbought with strong momentum', () => {
        const prices = [
          100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180,
        ];
        const result = calculateRSI(prices, 14);

        expect(result[16]).toBeGreaterThan(70);
      });

      it('should correctly identify oversold with strong selling', () => {
        const prices = [
          200, 195, 190, 185, 180, 175, 170, 165, 160, 155, 150, 145, 140, 135, 130, 125, 120,
        ];
        const result = calculateRSI(prices, 14);

        expect(result[16]).toBeLessThan(30);
      });
    });

    describe('Edge cases', () => {
      it('should handle alternating gains and losses', () => {
        const prices = [100];
        for (let i = 0; i < 20; i++) {
          prices.push(prices[prices.length - 1] + (i % 2 === 0 ? 10 : -10));
        }
        const result = calculateRSI(prices, 14);

        expect(result.length).toBe(prices.length);
        result.forEach((value) => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        });
      });

      it('should handle very large numbers', () => {
        const prices = Array.from({ length: 20 }, (_, i) => 1e10 + i * 1e9);
        const result = calculateRSI(prices, 14);

        expect(result.length).toBe(20);
        expect(result[19]).toBeGreaterThan(90);
      });

      it('should handle very small numbers', () => {
        const prices = Array.from({ length: 20 }, (_, i) => 1e-10 + i * 1e-11);
        const result = calculateRSI(prices, 14);

        expect(result.length).toBe(20);
        expect(result[19]).toBeGreaterThan(90);
      });

      it('should handle negative prices', () => {
        const prices = Array.from({ length: 20 }, (_, i) => -100 + i);
        const result = calculateRSI(prices, 14);

        expect(result.length).toBe(20);
        result.forEach((value) => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        });
      });

      it('should handle zero values in prices', () => {
        const prices = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3];
        const result = calculateRSI(prices, 14);

        expect(result.length).toBe(18);
        expect(result[14]).toBe(100);
      });

      it('should handle prices with high volatility', () => {
        const prices = [
          100, 150, 80, 200, 50, 250, 30, 300, 20, 350, 10, 400, 5, 450, 2, 500, 1, 550, 0.5, 600,
        ];
        const result = calculateRSI(prices, 14);

        expect(result.length).toBe(20);
        result.forEach((value) => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        });
      });
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

    it('should handle data with high and low properties', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        price: 100 + i,
        high: 105 + i,
        low: 95 + i,
      }));
      const result = calculateRSIFromData(data, 14);

      expect(result.length).toBe(20);
      expect(result[19]).toBeGreaterThan(90);
    });

    it('should handle data with close property', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        price: 100,
        close: 100 + i,
      }));
      const result = calculateRSIFromData(data, 14);

      expect(result.length).toBe(20);
      expect(result[19]).toBeGreaterThan(90);
    });
  });
});
