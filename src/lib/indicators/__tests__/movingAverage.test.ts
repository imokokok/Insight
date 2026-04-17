import {
  calculateSMA,
  calculateSMAWithNull,
  calculateEMA,
  calculateEMAWithNull,
} from '../calculations';

// eslint-disable-next-line max-lines-per-function
describe('Moving Averages', () => {
  describe('calculateSMA (Simple Moving Average)', () => {
    describe('Basic SMA calculation', () => {
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

      it('should handle single element array', () => {
        const result = calculateSMA([100], 5);
        expect(result).toEqual([100]);
      });
    });

    describe('Different periods', () => {
      it('should calculate SMA with period 7', () => {
        const data = Array.from({ length: 20 }, (_, i) => 100 + i);
        const result = calculateSMA(data, 7);

        expect(result.length).toBe(20);
        const expectedSMA7 = data.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
        expect(result[6]).toBe(expectedSMA7);
      });

      it('should calculate SMA with period 14', () => {
        const data = Array.from({ length: 30 }, (_, i) => 100 + i);
        const result = calculateSMA(data, 14);

        expect(result.length).toBe(30);
        const expectedSMA14 = data.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
        expect(result[13]).toBe(expectedSMA14);
      });

      it('should calculate SMA with period 30', () => {
        const data = Array.from({ length: 50 }, (_, i) => 100 + i);
        const result = calculateSMA(data, 30);

        expect(result.length).toBe(50);
        const expectedSMA30 = data.slice(0, 30).reduce((a, b) => a + b, 0) / 30;
        expect(result[29]).toBe(expectedSMA30);
      });

      it('should have longer period SMA smoother', () => {
        const data = [100, 105, 95, 110, 90, 115, 85, 120, 80, 125, 75, 130, 70, 135, 65];
        const result5 = calculateSMA(data, 5);
        const result10 = calculateSMA(data, 10);

        const validResult5 = result5.slice(4);
        const validResult10 = result10.slice(9);

        let variance5 = 0;
        let variance10 = 0;
        const mean5 = validResult5.reduce((a, b) => a + b, 0) / validResult5.length;
        const mean10 = validResult10.reduce((a, b) => a + b, 0) / validResult10.length;

        validResult5.forEach((v) => (variance5 += Math.pow(v - mean5, 2)));
        validResult10.forEach((v) => (variance10 += Math.pow(v - mean10, 2)));

        const avgVariance5 = variance5 / validResult5.length;
        const avgVariance10 = variance10 / validResult10.length;

        expect(avgVariance10).toBeLessThan(avgVariance5);
      });
    });

    describe('Edge cases', () => {
      it('should handle negative values', () => {
        const data = [-10, -20, -30, -40, -50];
        const result = calculateSMA(data, 3);

        expect(result[0]).toBe(-10);
        expect(result[1]).toBe(-20);
        expect(result[2]).toBe(-20);
      });

      it('should handle very large numbers', () => {
        const data = [1e10, 2e10, 3e10, 4e10, 5e10];
        const result = calculateSMA(data, 3);

        expect(result[2]).toBe(2e10);
        expect(result[3]).toBe(3e10);
        expect(result[4]).toBe(4e10);
      });

      it('should handle very small numbers', () => {
        const data = [1e-10, 2e-10, 3e-10, 4e-10, 5e-10];
        const result = calculateSMA(data, 3);

        expect(result[2]).toBeCloseTo(2e-10);
        expect(result[3]).toBeCloseTo(3e-10);
      });

      it('should handle zero values', () => {
        const data = [0, 0, 0, 0, 0];
        const result = calculateSMA(data, 3);

        expect(result).toEqual([0, 0, 0, 0, 0]);
      });

      it('should handle mixed zero and non-zero values', () => {
        const data = [0, 10, 0, 20, 0];
        const result = calculateSMA(data, 3);

        expect(result[2]).toBeCloseTo(10 / 3);
        expect(result[3]).toBeCloseTo(10);
      });

      it('should handle constant values', () => {
        const data = Array(10).fill(100);
        const result = calculateSMA(data, 5);

        result.forEach((v) => {
          expect(v).toBe(100);
        });
      });

      it('should handle alternating values', () => {
        const data = [100, 200, 100, 200, 100, 200, 100, 200];
        const result = calculateSMA(data, 4);

        expect(result[3]).toBe(150);
        expect(result[7]).toBe(150);
      });
    });

    describe('Mathematical accuracy', () => {
      it('should correctly calculate average of window', () => {
        const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        const result = calculateSMA(data, 5);

        expect(result[4]).toBe((10 + 20 + 30 + 40 + 50) / 5);
        expect(result[5]).toBe((20 + 30 + 40 + 50 + 60) / 5);
        expect(result[9]).toBe((60 + 70 + 80 + 90 + 100) / 5);
      });

      it('should maintain rolling window correctly', () => {
        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const result = calculateSMA(data, 3);

        expect(result[2]).toBe(2);
        expect(result[3]).toBe(3);
        expect(result[4]).toBe(4);
        expect(result[9]).toBe(9);
      });
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

    it('should calculate correct values after period-1', () => {
      const data = Array.from({ length: 10 }, (_, i) => 100 + i);
      const result = calculateSMAWithNull(data, 5);

      expect(result[4]).toBe(102);
      expect(result[5]).toBe(103);
      expect(result[9]).toBe(107);
    });
  });

  describe('calculateEMA (Exponential Moving Average)', () => {
    describe('Basic EMA calculation', () => {
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
        const result = calculateEMA(data, period);

        expect(result[0]).toBe(10);
        expect(result[1]).toBe(15);
        expect(result[2]).toBe(20);
        expect(result[3]).toBe(25);
        expect(result[4]).toBe(30);
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
    });

    describe('Smoothing factor calculation', () => {
      it('should use correct multiplier formula', () => {
        const period = 10;
        const expectedMultiplier = 2 / (period + 1);
        expect(expectedMultiplier).toBeCloseTo(0.1818, 4);
      });

      it('should give more weight to recent prices', () => {
        const data = [10, 10, 10, 10, 100];
        const result = calculateEMA(data, 3);

        expect(result[4]).toBeGreaterThan(10);
        expect(result[4]).toBeLessThan(100);
      });

      it('should respond faster with shorter period', () => {
        const data = [100, 100, 100, 100, 200];
        const result3 = calculateEMA(data, 3);
        const result10 = calculateEMA(data, 10);

        expect(result3[4]).toBeGreaterThan(result10[4]);
      });

      it('should be smoother with longer period', () => {
        const data = [100, 105, 95, 110, 90, 115, 85, 120, 80, 125];
        const result3 = calculateEMA(data, 3);
        const result7 = calculateEMA(data, 7);

        let variance3 = 0;
        let variance7 = 0;
        const mean3 = result3.reduce((a, b) => a + b, 0) / result3.length;
        const mean7 = result7.reduce((a, b) => a + b, 0) / result7.length;

        result3.forEach((v) => (variance3 += Math.pow(v - mean3, 2)));
        result7.forEach((v) => (variance7 += Math.pow(v - mean7, 2)));

        expect(variance7).toBeLessThan(variance3);
      });
    });

    describe('Different periods', () => {
      it('should calculate EMA with period 7', () => {
        const data = Array.from({ length: 20 }, (_, i) => 100 + i);
        const result = calculateEMA(data, 7);

        expect(result.length).toBe(20);
      });

      it('should calculate EMA with period 14', () => {
        const data = Array.from({ length: 30 }, (_, i) => 100 + i);
        const result = calculateEMA(data, 14);

        expect(result.length).toBe(30);
      });

      it('should calculate EMA with period 30', () => {
        const data = Array.from({ length: 50 }, (_, i) => 100 + i);
        const result = calculateEMA(data, 30);

        expect(result.length).toBe(50);
      });
    });

    describe('Error handling', () => {
      it('should throw error when period is 0', () => {
        const data = [10, 20, 30];
        expect(() => calculateEMA(data, 0)).toThrow('Period must be a positive number');
      });

      it('should throw error when period is negative', () => {
        const data = [10, 20, 30];
        expect(() => calculateEMA(data, -5)).toThrow('Period must be a positive number');
      });
    });

    describe('Edge cases', () => {
      it('should handle single element array', () => {
        const result = calculateEMA([100], 5);
        expect(result).toEqual([100]);
      });

      it('should handle very large period compared to data length', () => {
        const data = [10, 20, 30];
        const result = calculateEMA(data, 100);

        expect(result.length).toBe(3);
        expect(result[0]).toBe(10);
      });

      it('should handle negative values', () => {
        const data = [-10, -20, -30, -40, -50];
        const result = calculateEMA(data, 3);

        expect(result.length).toBe(5);
        expect(result[0]).toBe(-10);
      });

      it('should handle mixed positive and negative values', () => {
        const data = [-10, 10, -10, 10, -10];
        const result = calculateEMA(data, 3);

        expect(result.length).toBe(5);
      });

      it('should handle constant values', () => {
        const data = Array(10).fill(100);
        const result = calculateEMA(data, 5);

        result.forEach((v) => {
          expect(v).toBe(100);
        });
      });

      it('should handle very large numbers', () => {
        const data = [1e10, 2e10, 3e10, 4e10, 5e10];
        const result = calculateEMA(data, 3);

        expect(result.length).toBe(5);
      });

      it('should handle very small numbers', () => {
        const data = [1e-10, 2e-10, 3e-10, 4e-10, 5e-10];
        const result = calculateEMA(data, 3);

        expect(result.length).toBe(5);
      });
    });

    describe('Mathematical accuracy', () => {
      it('should correctly calculate EMA with known values', () => {
        const data = [22.27, 22.19, 22.08, 22.17, 22.18, 22.13, 22.23, 22.43, 22.24, 22.29];
        const result = calculateEMA(data, 10);

        const expectedFirst = data.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        expect(result[9]).toBeCloseTo(expectedFirst, 2);
      });

      it('should maintain exponential weighting', () => {
        const data = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
        const result = calculateEMA(data, 5);

        for (let i = 5; i < data.length; i++) {
          expect(result[i]).toBeGreaterThan(result[i - 1]);
        }
      });
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

    it('should return all nulls when data length is less than period', () => {
      const data = [10, 20];
      const result = calculateEMAWithNull(data, 5);

      expect(result[0]).toBeNull();
      expect(result[1]).toBeNull();
    });

    it('should handle period of 1', () => {
      const data = [10, 20, 30];
      const result = calculateEMAWithNull(data, 1);

      expect(result).toEqual([10, 20, 30]);
    });
  });

  describe('SMA vs EMA comparison', () => {
    it('should have EMA respond faster to price changes', () => {
      const data = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 150];
      const sma = calculateSMA(data, 10);
      const ema = calculateEMA(data, 10);

      expect(ema[15]).toBeGreaterThan(sma[15]);
    });

    it('should have EMA and SMA converge with constant prices', () => {
      const data = Array(50).fill(100);
      const sma = calculateSMA(data, 20);
      const ema = calculateEMA(data, 20);

      expect(sma[49]).toBe(100);
      expect(ema[49]).toBe(100);
    });

    it('should have EMA track price more closely than SMA', () => {
      const data = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 150, 150, 150, 150, 150];
      const sma = calculateSMA(data, 10);
      const ema = calculateEMA(data, 10);

      const lastPrice = data[14];
      const smaDiff = Math.abs(lastPrice - sma[14]);
      const emaDiff = Math.abs(lastPrice - ema[14]);

      expect(emaDiff).toBeLessThan(smaDiff);
    });
  });
});
