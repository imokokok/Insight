import { calculateMACD, calculateMACDExtended, calculateEMA } from '../calculations';

describe('MACD (Moving Average Convergence Divergence)', () => {
  describe('calculateMACD', () => {
    describe('DIF calculation', () => {
      it('should calculate MACD line (DIF) correctly', () => {
        const prices = [
          10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
        ];
        const result = calculateMACD(prices, 12, 26, 9);

        expect(result.macd.length).toBe(prices.length);
      });

      it('should calculate DIF as difference between fast and slow EMA', () => {
        const prices = Array.from({ length: 35 }, (_, i) => 100 + i);
        const result = calculateMACD(prices, 12, 26, 9);

        const fastEMA = calculateEMA(prices, 12);
        const slowEMA = calculateEMA(prices, 26);

        for (let i = 0; i < prices.length; i++) {
          expect(result.macd[i]).toBeCloseTo(fastEMA[i] - slowEMA[i]);
        }
      });

      it('should produce positive DIF in uptrend', () => {
        const prices = Array.from({ length: 50 }, (_, i) => 100 + i * 2);
        const result = calculateMACD(prices);

        const lastMacd = result.macd[result.macd.length - 1];
        expect(lastMacd).toBeGreaterThan(0);
      });

      it('should produce negative DIF in downtrend', () => {
        const prices = Array.from({ length: 50 }, (_, i) => 200 - i * 2);
        const result = calculateMACD(prices);

        const lastMacd = result.macd[result.macd.length - 1];
        expect(lastMacd).toBeLessThan(0);
      });

      it('should have DIF close to zero in sideways market', () => {
        const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i * 0.1) * 2);
        const result = calculateMACD(prices);

        const lastMacd = Math.abs(result.macd[result.macd.length - 1]);
        expect(lastMacd).toBeLessThan(5);
      });
    });

    describe('DEA calculation (Signal line)', () => {
      it('should calculate signal line (DEA) correctly', () => {
        const prices = Array.from({ length: 35 }, (_, i) => 100 + i);
        const result = calculateMACD(prices, 12, 26, 9);

        expect(result.signal.length).toBe(prices.length);
      });

      it('should calculate DEA as EMA of DIF', () => {
        const prices = Array.from({ length: 35 }, (_, i) => 100 + i);
        const result = calculateMACD(prices, 12, 26, 9);

        const expectedSignal = calculateEMA(result.macd, 9);

        for (let i = 0; i < prices.length; i++) {
          expect(result.signal[i]).toBeCloseTo(expectedSignal[i]);
        }
      });

      it('should have signal line smoother than MACD line', () => {
        const prices = Array.from({ length: 50 }, (_, i) => 100 + i + Math.sin(i) * 10);
        const result = calculateMACD(prices);

        let macdVariance = 0;
        let signalVariance = 0;
        const macdMean = result.macd.reduce((a, b) => a + b, 0) / result.macd.length;
        const signalMean = result.signal.reduce((a, b) => a + b, 0) / result.signal.length;

        for (let i = 0; i < result.macd.length; i++) {
          macdVariance += Math.pow(result.macd[i] - macdMean, 2);
          signalVariance += Math.pow(result.signal[i] - signalMean, 2);
        }

        expect(signalVariance).toBeLessThan(macdVariance * 2);
      });
    });

    describe('MACD histogram', () => {
      it('should calculate histogram correctly', () => {
        const prices = Array.from({ length: 35 }, (_, i) => 100 + i);
        const result = calculateMACD(prices);

        expect(result.histogram.length).toBe(prices.length);
      });

      it('should calculate histogram as difference between MACD and signal', () => {
        const prices = Array.from({ length: 35 }, (_, i) => 100 + i);
        const result = calculateMACD(prices);

        for (let i = 0; i < prices.length; i++) {
          expect(result.histogram[i]).toBeCloseTo(result.macd[i] - result.signal[i]);
        }
      });

      it('should have positive histogram when MACD above signal', () => {
        const prices = Array.from({ length: 50 }, (_, i) => 100 + i * 2);
        const result = calculateMACD(prices);

        const lastHistogram = result.histogram[result.histogram.length - 1];
        expect(lastHistogram).toBeGreaterThan(0);
      });

      it('should have negative histogram when MACD below signal', () => {
        const prices = Array.from({ length: 50 }, (_, i) => 200 - i * 2);
        const result = calculateMACD(prices);

        const lastHistogram = result.histogram[result.histogram.length - 1];
        expect(lastHistogram).toBeLessThan(0);
      });

      it('should have histogram close to zero at crossover points', () => {
        const data: number[] = [];
        for (let i = 0; i < 20; i++) {
          data.push(100 + i);
        }
        for (let i = 0; i < 20; i++) {
          data.push(120 - i);
        }

        const result = calculateMACD(data);

        const nearZeroHistograms = result.histogram.filter((h) => Math.abs(h) < 0.5);
        expect(nearZeroHistograms.length).toBeGreaterThan(0);
      });
    });

    describe('Different parameter combinations', () => {
      it('should use default periods (12, 26, 9)', () => {
        const prices = Array.from({ length: 35 }, (_, i) => 100 + i);
        const result = calculateMACD(prices);

        expect(result).toBeDefined();
        expect(result.macd.length).toBe(prices.length);
      });

      it('should handle custom periods (5, 10, 3)', () => {
        const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
        const result = calculateMACD(prices, 5, 10, 3);

        expect(result.macd.length).toBe(30);
      });

      it('should handle custom periods (8, 17, 9)', () => {
        const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
        const result = calculateMACD(prices, 8, 17, 9);

        expect(result.macd.length).toBe(30);
      });

      it('should handle equal fast and slow periods', () => {
        const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
        const result = calculateMACD(prices, 10, 10, 5);

        expect(result.macd.length).toBe(30);
        result.macd.forEach((m) => {
          expect(m).toBeCloseTo(0);
        });
      });

      it('should handle very short periods', () => {
        const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
        const result = calculateMACD(prices, 2, 3, 2);

        expect(result.macd.length).toBe(20);
      });

      it('should handle signal period of 1', () => {
        const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
        const result = calculateMACD(prices, 12, 26, 1);

        expect(result.macd.length).toBe(30);
      });
    });

    describe('Signal crossover detection', () => {
      it('should detect bullish crossover (MACD crosses above signal)', () => {
        const prices: number[] = [];
        for (let i = 0; i < 20; i++) {
          prices.push(100 + i);
        }
        for (let i = 0; i < 20; i++) {
          prices.push(120 - i);
        }
        for (let i = 0; i < 20; i++) {
          prices.push(100 + i);
        }

        const result = calculateMACD(prices);

        let bullishCrossover = false;
        for (let i = 1; i < result.histogram.length; i++) {
          if (result.histogram[i - 1] < 0 && result.histogram[i] >= 0) {
            bullishCrossover = true;
            break;
          }
        }
        expect(bullishCrossover).toBe(true);
      });

      it('should detect bearish crossover (MACD crosses below signal)', () => {
        const prices: number[] = [];
        for (let i = 0; i < 20; i++) {
          prices.push(100 + i);
        }
        for (let i = 0; i < 30; i++) {
          prices.push(120 - i);
        }

        const result = calculateMACD(prices);

        let bearishCrossover = false;
        for (let i = 1; i < result.histogram.length; i++) {
          if (result.histogram[i - 1] > 0 && result.histogram[i] <= 0) {
            bearishCrossover = true;
            break;
          }
        }
        expect(bearishCrossover).toBe(true);
      });

      it('should identify zero line crossover', () => {
        const prices: number[] = [];
        for (let i = 0; i < 30; i++) {
          prices.push(100 + i);
        }
        for (let i = 0; i < 30; i++) {
          prices.push(130 - i);
        }

        const result = calculateMACD(prices);

        let zeroCrossUp = false;
        let zeroCrossDown = false;
        for (let i = 1; i < result.macd.length; i++) {
          if (result.macd[i - 1] < 0 && result.macd[i] >= 0) {
            zeroCrossUp = true;
          }
          if (result.macd[i - 1] > 0 && result.macd[i] <= 0) {
            zeroCrossDown = true;
          }
        }
        expect(zeroCrossUp || zeroCrossDown).toBe(true);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty prices', () => {
        const result = calculateMACD([]);

        expect(result.macd).toEqual([]);
        expect(result.signal).toEqual([]);
        expect(result.histogram).toEqual([]);
      });

      it('should handle single price', () => {
        const result = calculateMACD([100]);

        expect(result.macd.length).toBe(1);
        expect(result.signal.length).toBe(1);
        expect(result.histogram.length).toBe(1);
      });

      it('should handle prices shorter than slow period', () => {
        const prices = [100, 101, 102, 103, 104];
        const result = calculateMACD(prices, 12, 26, 9);

        expect(result.macd.length).toBe(5);
      });

      it('should handle negative prices', () => {
        const prices = Array.from({ length: 35 }, (_, i) => -100 - i);
        const result = calculateMACD(prices);

        expect(result.macd.length).toBe(35);
      });

      it('should handle constant prices', () => {
        const prices = Array(50).fill(100);
        const result = calculateMACD(prices);

        result.macd.forEach((m) => {
          expect(m).toBeCloseTo(0);
        });
        result.signal.forEach((s) => {
          expect(s).toBeCloseTo(0);
        });
        result.histogram.forEach((h) => {
          expect(h).toBeCloseTo(0);
        });
      });

      it('should handle very large prices', () => {
        const prices = Array.from({ length: 35 }, (_, i) => 1e10 + i * 1e9);
        const result = calculateMACD(prices);

        expect(result.macd.length).toBe(35);
      });

      it('should handle very small prices', () => {
        const prices = Array.from({ length: 35 }, (_, i) => 1e-10 + i * 1e-11);
        const result = calculateMACD(prices);

        expect(result.macd.length).toBe(35);
      });

      it('should handle prices with high volatility', () => {
        const prices = [
          100, 150, 80, 200, 50, 250, 30, 300, 20, 350, 10, 400, 5, 450, 2, 500, 1, 550, 0.5, 600,
          0.25, 650, 0.1, 700, 0.05, 750, 0.01, 800, 0.005, 850, 0.001, 900, 0.0005, 950,
        ];
        const result = calculateMACD(prices);

        expect(result.macd.length).toBe(34);
      });
    });
  });

  describe('calculateMACDExtended', () => {
    describe('DIF, DEA, and MACD calculation', () => {
      it('should calculate DIF, DEA, and MACD correctly', () => {
        const data = Array.from({ length: 35 }, (_, i) => ({ price: 100 + i }));
        const result = calculateMACDExtended(data);

        expect(result.dif.length).toBe(data.length);
        expect(result.dea.length).toBe(data.length);
        expect(result.macd.length).toBe(data.length);
        expect(result.signals.length).toBe(data.length);
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

      it('should handle custom periods', () => {
        const data = Array.from({ length: 30 }, (_, i) => ({ price: 100 + i }));
        const result = calculateMACDExtended(data, 5, 10, 3);

        expect(result.dif.length).toBe(30);
      });
    });

    describe('Signal crossover detection', () => {
      it('should identify golden cross signal (DIF crosses above DEA)', () => {
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

      it('should identify death cross signal (DIF crosses below DEA)', () => {
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

      it('should have null signals when no cross occurs', () => {
        const data = Array.from({ length: 10 }, () => ({ price: 100 }));
        const result = calculateMACDExtended(data);

        const nullSignals = result.signals.filter((s) => s === null);
        expect(nullSignals.length).toBeGreaterThan(0);
      });

      it('should detect multiple golden and death crosses', () => {
        const data: Array<{ price: number }> = [];

        for (let cycle = 0; cycle < 3; cycle++) {
          for (let i = 0; i < 15; i++) {
            data.push({ price: 100 + i + cycle * 30 });
          }
          for (let i = 0; i < 15; i++) {
            data.push({ price: 115 - i + cycle * 30 });
          }
        }

        const result = calculateMACDExtended(data);

        const goldenCrosses = result.signals.filter((s) => s === 'golden');
        const deathCrosses = result.signals.filter((s) => s === 'death');

        expect(goldenCrosses.length).toBeGreaterThan(0);
        expect(deathCrosses.length).toBeGreaterThan(0);
      });

      it('should correctly identify signal positions', () => {
        const data = Array.from({ length: 40 }, (_, i) => ({ price: 100 + i }));
        const result = calculateMACDExtended(data);

        for (let i = 1; i < data.length; i++) {
          if (result.signals[i] === 'golden') {
            expect(result.dif[i - 1]).toBeLessThan(result.dea[i - 1]);
            expect(result.dif[i]).toBeGreaterThanOrEqual(result.dea[i]);
          }
          if (result.signals[i] === 'death') {
            expect(result.dif[i - 1]).toBeGreaterThan(result.dea[i - 1]);
            expect(result.dif[i]).toBeLessThanOrEqual(result.dea[i]);
          }
        }
      });
    });

    describe('Edge cases', () => {
      it('should handle empty data', () => {
        const result = calculateMACDExtended([]);

        expect(result.dif).toEqual([]);
        expect(result.dea).toEqual([]);
        expect(result.macd).toEqual([]);
        expect(result.signals).toEqual([]);
      });

      it('should handle single data point', () => {
        const result = calculateMACDExtended([{ price: 100 }]);

        expect(result.dif.length).toBe(1);
        expect(result.signals[0]).toBeNull();
      });

      it('should handle data shorter than slow period', () => {
        const data = [{ price: 100 }, { price: 101 }, { price: 102 }];
        const result = calculateMACDExtended(data);

        expect(result.dif.length).toBe(3);
      });

      it('should handle constant prices', () => {
        const data = Array.from({ length: 30 }, () => ({ price: 100 }));
        const result = calculateMACDExtended(data);

        result.dif.forEach((d) => {
          expect(d).toBeCloseTo(0);
        });
        result.dea.forEach((d) => {
          expect(d).toBeCloseTo(0);
        });
      });

      it('should handle negative prices', () => {
        const data = Array.from({ length: 30 }, (_, i) => ({ price: -100 - i }));
        const result = calculateMACDExtended(data);

        expect(result.dif.length).toBe(30);
      });
    });
  });
});
