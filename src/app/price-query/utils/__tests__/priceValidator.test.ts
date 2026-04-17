/* eslint-disable max-lines-per-function */
import type { PriceData } from '@/lib/oracles';

import {
  validatePrice,
  validateTimestamp,
  validateTimeSeries,
  detectAnomalies,
  calculatePriceStatistics,
  isPriceWithinBounds,
  getPriceDeviation,
} from '../priceValidator';

describe('priceValidator', () => {
  describe('validatePrice', () => {
    describe('基本验证', () => {
      it('should validate a valid positive price', () => {
        const result = validatePrice(100);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });

      it('should validate a very small positive price', () => {
        const result = validatePrice(0.00000001);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate a very large price', () => {
        const result = validatePrice(1000000000);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('无效价格', () => {
      it('should reject NaN price', () => {
        const result = validatePrice(NaN);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('PRICE_INVALID_NUMBER');
      });

      it('should reject negative price', () => {
        const result = validatePrice(-100);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('PRICE_MUST_BE_POSITIVE');
      });

      it('should reject zero price', () => {
        const result = validatePrice(0);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('PRICE_MUST_BE_POSITIVE');
      });

      it('should reject Infinity price', () => {
        const result = validatePrice(Infinity);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('PRICE_MUST_BE_FINITE');
      });

      it('should reject negative Infinity price', () => {
        const result = validatePrice(-Infinity);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('与前一个价格比较', () => {
      it('should detect price spike (>50% increase)', () => {
        const result = validatePrice(200, 100);

        expect(result.isValid).toBe(true);
        expect(result.anomalies).toHaveLength(1);
        expect(result.anomalies[0].type).toBe('price_spike');
        expect(result.warnings).toHaveLength(1);
      });

      it('should detect price drop (>50% decrease)', () => {
        const result = validatePrice(40, 100);

        expect(result.isValid).toBe(true);
        expect(result.anomalies).toHaveLength(1);
        expect(result.anomalies[0].type).toBe('price_drop');
      });

      it('should not flag normal price changes', () => {
        const result = validatePrice(110, 100);

        expect(result.isValid).toBe(true);
        expect(result.anomalies).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });

      it('should not flag exactly 50% change', () => {
        const result = validatePrice(150, 100);

        expect(result.isValid).toBe(true);
        expect(result.anomalies).toHaveLength(0);
      });

      it('should flag slightly over 50% change', () => {
        const result = validatePrice(150.01, 100);

        expect(result.isValid).toBe(true);
        expect(result.anomalies).toHaveLength(1);
      });

      it('should handle previous price of zero', () => {
        const result = validatePrice(100, 0);

        expect(result.isValid).toBe(true);
        expect(result.anomalies).toHaveLength(0);
      });

      it('should handle negative previous price', () => {
        const result = validatePrice(100, -50);

        expect(result.isValid).toBe(true);
        expect(result.anomalies).toHaveLength(0);
      });
    });

    describe('异常严重程度', () => {
      it('should assign low severity for 50-75% change', () => {
        const result = validatePrice(160, 100);

        expect(result.anomalies[0].severity).toBe('low');
      });

      it('should assign medium severity for 75-100% change', () => {
        const result = validatePrice(180, 100);

        expect(result.anomalies[0].severity).toBe('medium');
      });

      it('should assign high severity for >100% change', () => {
        const result = validatePrice(250, 100);

        expect(result.anomalies[0].severity).toBe('high');
      });
    });
  });

  describe('validateTimestamp', () => {
    describe('有效时间戳', () => {
      it('should validate a recent timestamp', () => {
        const recentTimestamp = Date.now() - 1000;
        const result = validateTimestamp(recentTimestamp);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate current timestamp', () => {
        const result = validateTimestamp(Date.now());

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('无效时间戳', () => {
      it('should reject NaN timestamp', () => {
        const result = validateTimestamp(NaN);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('TIMESTAMP_INVALID_NUMBER');
      });

      it('should reject future timestamp', () => {
        const futureTimestamp = Date.now() + 10000;
        const result = validateTimestamp(futureTimestamp);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('TIMESTAMP_IN_FUTURE');
        expect(result.anomalies).toHaveLength(1);
        expect(result.anomalies[0].type).toBe('future_timestamp');
        expect(result.anomalies[0].severity).toBe('high');
      });
    });

    describe('过期数据检测', () => {
      it('should warn about stale data', () => {
        const staleTimestamp = Date.now() - 2 * 60 * 60 * 1000;
        const result = validateTimestamp(staleTimestamp);

        expect(result.isValid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.anomalies).toHaveLength(1);
        expect(result.anomalies[0].type).toBe('stale_data');
      });

      it('should assign correct severity for stale data', () => {
        const maxAge = 30 * 60 * 1000;

        const oneHourAgo = Date.now() - 1 * 60 * 60 * 1000;
        const result1 = validateTimestamp(oneHourAgo, maxAge);
        expect(result1.anomalies[0].severity).toBe('medium');

        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        const result2 = validateTimestamp(twoHoursAgo, maxAge);
        expect(result2.anomalies[0].severity).toBe('high');

        const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
        const result3 = validateTimestamp(fourHoursAgo, maxAge);
        expect(result3.anomalies[0].severity).toBe('high');

        const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
        const result4 = validateTimestamp(sixHoursAgo, maxAge);
        expect(result4.anomalies[0].severity).toBe('high');
      });

      it('should respect custom maxAge parameter', () => {
        const timestamp = Date.now() - 5 * 60 * 1000;
        const result = validateTimestamp(timestamp, 10 * 60 * 1000);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(0);
        expect(result.anomalies).toHaveLength(0);
      });

      it('should use default maxAge when not provided', () => {
        const timestamp = Date.now() - 2 * 60 * 60 * 1000;
        const result = validateTimestamp(timestamp);

        expect(result.isValid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateTimeSeries', () => {
    const createPriceData = (price: number, timestamp: number): PriceData => ({
      provider: 'chainlink',
      symbol: 'BTC',
      price,
      timestamp,
      decimals: 8,
    });

    describe('基本验证', () => {
      it('should validate a valid time series', () => {
        const now = Date.now();
        const data: PriceData[] = [
          createPriceData(100, now - 2000),
          createPriceData(101, now - 1000),
          createPriceData(102, now),
        ];

        const result = validateTimeSeries(data);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject non-array input', () => {
        const result = validateTimeSeries('not an array' as unknown as PriceData[]);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('TIMESERIES_MUST_BE_ARRAY');
      });

      it('should warn about empty array', () => {
        const result = validateTimeSeries([]);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain('TIMESERIES_EMPTY');
      });
    });

    describe('价格验证', () => {
      it('should validate all prices in series', () => {
        const now = Date.now();
        const data: PriceData[] = [
          createPriceData(100, now - 2000),
          createPriceData(-50, now - 1000),
          createPriceData(102, now),
        ];

        const result = validateTimeSeries(data);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('PRICE_MUST_BE_POSITIVE'))).toBe(true);
      });
    });

    describe('时间戳验证', () => {
      it('should validate all timestamps in series', () => {
        const now = Date.now();
        const data: PriceData[] = [
          createPriceData(100, now - 2000),
          createPriceData(101, now + 10000),
          createPriceData(102, now),
        ];

        const result = validateTimeSeries(data);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('TIMESTAMP_IN_FUTURE'))).toBe(true);
      });
    });

    describe('数据间隙检测', () => {
      it('should detect gap in data', () => {
        const now = Date.now();
        const data: PriceData[] = [
          createPriceData(100, now - 30 * 60 * 1000),
          createPriceData(101, now),
        ];

        const result = validateTimeSeries(data);

        expect(result.anomalies.some((a) => a.type === 'gap_in_data')).toBe(true);
        expect(result.warnings.some((w) => w.startsWith('GAP_IN_DATA'))).toBe(true);
      });

      it('should not flag normal intervals', () => {
        const now = Date.now();
        const data: PriceData[] = [createPriceData(100, now - 5000), createPriceData(101, now)];

        const result = validateTimeSeries(data);

        expect(result.anomalies.some((a) => a.type === 'gap_in_data')).toBe(false);
      });

      it('should assign correct severity for gaps', () => {
        const now = Date.now();
        const data1: PriceData[] = [
          createPriceData(100, now - 15 * 60 * 1000),
          createPriceData(101, now),
        ];
        const result1 = validateTimeSeries(data1);
        const gapAnomaly1 = result1.anomalies.find((a) => a.type === 'gap_in_data');
        expect(gapAnomaly1?.severity).toBe('low');

        const data2: PriceData[] = [
          createPriceData(100, now - 40 * 60 * 1000),
          createPriceData(101, now),
        ];
        const result2 = validateTimeSeries(data2);
        const gapAnomaly2 = result2.anomalies.find((a) => a.type === 'gap_in_data');
        expect(gapAnomaly2?.severity).toBe('medium');

        const data3: PriceData[] = [
          createPriceData(100, now - 70 * 60 * 1000),
          createPriceData(101, now),
        ];
        const result3 = validateTimeSeries(data3);
        const gapAnomaly3 = result3.anomalies.find((a) => a.type === 'gap_in_data');
        expect(gapAnomaly3?.severity).toBe('high');
      });
    });

    describe('价格变化检测', () => {
      it('should detect price anomalies in series', () => {
        const now = Date.now();
        const data: PriceData[] = [
          createPriceData(100, now - 2000),
          createPriceData(200, now - 1000),
          createPriceData(102, now),
        ];

        const result = validateTimeSeries(data);

        expect(
          result.anomalies.some((a) => a.type === 'price_spike' || a.type === 'price_drop')
        ).toBe(true);
      });
    });

    describe('数据排序', () => {
      it('should handle unsorted data', () => {
        const now = Date.now();
        const data: PriceData[] = [
          createPriceData(102, now),
          createPriceData(100, now - 2000),
          createPriceData(101, now - 1000),
        ];

        const result = validateTimeSeries(data);

        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('detectAnomalies', () => {
    describe('基本功能', () => {
      it('should detect anomalies in price array', () => {
        const prices = [100, 101, 102, 500, 103, 104];
        const anomalies = detectAnomalies(prices);

        expect(anomalies.length).toBeGreaterThan(0);
        expect(anomalies).toContain(3);
      });

      it('should return empty array for small arrays', () => {
        expect(detectAnomalies([1, 2, 3])).toEqual([]);
        expect(detectAnomalies([1])).toEqual([]);
        expect(detectAnomalies([])).toEqual([]);
      });
    });

    describe('无效数据处理', () => {
      it('should filter out invalid prices', () => {
        const prices = [100, NaN, 102, -50, 104, Infinity, 106];
        const anomalies = detectAnomalies(prices);

        expect(anomalies).toBeDefined();
      });

      it('should return empty for all invalid prices', () => {
        const prices = [NaN, -1, Infinity, -Infinity];
        const anomalies = detectAnomalies(prices);

        expect(anomalies).toEqual([]);
      });
    });

    describe('异常检测算法', () => {
      it('should detect outliers using IQR method', () => {
        const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 100];
        const anomalies = detectAnomalies(prices);

        expect(anomalies).toContain(9);
      });

      it('should detect outliers using Z-Score method', () => {
        const normalPrices = Array.from({ length: 20 }, (_, i) => 100 + i);
        const prices = [...normalPrices, 1000];
        const anomalies = detectAnomalies(prices);

        expect(anomalies.length).toBeGreaterThan(0);
      });

      it('should not flag normal prices as anomalies', () => {
        const prices = Array.from({ length: 50 }, () => 100 + Math.random() * 10);
        const anomalies = detectAnomalies(prices);

        expect(anomalies.length).toBe(0);
      });
    });

    describe('边界情况', () => {
      it('should handle all identical values', () => {
        const prices = [100, 100, 100, 100, 100];
        const anomalies = detectAnomalies(prices);

        expect(anomalies).toEqual([]);
      });

      it('should handle prices with zero standard deviation', () => {
        const prices = [100, 100, 100, 100, 200];
        const anomalies = detectAnomalies(prices);

        expect(anomalies).toBeDefined();
      });
    });
  });

  describe('calculatePriceStatistics', () => {
    it('should calculate statistics correctly', () => {
      const prices = [10, 20, 30, 40, 50];
      const stats = calculatePriceStatistics(prices);

      expect(stats).not.toBeNull();
      expect(stats!.mean).toBe(30);
      expect(stats!.median).toBe(30);
      expect(stats!.stdDev).toBeCloseTo(14.14, 1);
      expect(stats!.q1).toBe(20);
      expect(stats!.q3).toBe(40);
      expect(stats!.iqr).toBe(20);
    });

    it('should handle empty array', () => {
      const stats = calculatePriceStatistics([]);

      expect(stats).toBeNull();
    });

    it('should handle single element', () => {
      const stats = calculatePriceStatistics([42]);

      expect(stats!.mean).toBe(42);
      expect(stats!.median).toBe(42);
      expect(stats!.stdDev).toBe(0);
    });

    it('should filter out invalid prices', () => {
      const prices = [10, NaN, 20, -5, 30, Infinity, 40, 50];
      const stats = calculatePriceStatistics(prices);

      expect(stats).not.toBeNull();
      expect(stats!.mean).toBe(30);
    });

    it('should calculate median for even length correctly', () => {
      const prices = [10, 20, 30, 40];
      const stats = calculatePriceStatistics(prices);

      expect(stats!.median).toBe(25);
    });

    it('should calculate median for odd length correctly', () => {
      const prices = [10, 20, 30, 40, 50];
      const stats = calculatePriceStatistics(prices);

      expect(stats!.median).toBe(30);
    });
  });

  describe('isPriceWithinBounds', () => {
    it('should return true for price within bounds', () => {
      expect(isPriceWithinBounds(50, 0, 100)).toBe(true);
      expect(isPriceWithinBounds(0, 0, 100)).toBe(true);
      expect(isPriceWithinBounds(100, 0, 100)).toBe(true);
    });

    it('should return false for price outside bounds', () => {
      expect(isPriceWithinBounds(-1, 0, 100)).toBe(false);
      expect(isPriceWithinBounds(101, 0, 100)).toBe(false);
    });

    it('should handle equal bounds', () => {
      expect(isPriceWithinBounds(50, 50, 50)).toBe(true);
      expect(isPriceWithinBounds(49, 50, 50)).toBe(false);
    });
  });

  describe('getPriceDeviation', () => {
    it('should calculate deviation correctly', () => {
      const deviation = getPriceDeviation(110, 100);

      expect(deviation.absolute).toBe(10);
      expect(deviation.percent).toBe(10);
    });

    it('should handle zero reference price', () => {
      const deviation = getPriceDeviation(100, 0);

      expect(deviation.absolute).toBe(100);
      expect(deviation.percent).toBe(0);
    });

    it('should always return positive values', () => {
      const deviation = getPriceDeviation(90, 100);

      expect(deviation.absolute).toBe(10);
      expect(deviation.percent).toBe(10);
    });

    it('should handle equal prices', () => {
      const deviation = getPriceDeviation(100, 100);

      expect(deviation.absolute).toBe(0);
      expect(deviation.percent).toBe(0);
    });
  });
});
