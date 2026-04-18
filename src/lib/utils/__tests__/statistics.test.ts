import {
  calculateCDF,
  calculatePercentile,
  calculateQuantiles,
  calculateHistogram,
} from '../statistics';

describe('calculateCDF', () => {
  describe('Basic functionality', () => {
    it('should calculate CDF for normal data', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = calculateCDF(data);

      expect(result.totalCount).toBe(10);
      expect(result.min).toBe(1);
      expect(result.max).toBe(10);
      expect(result.points.length).toBe(101);
    });

    it('should calculate correct probability values', () => {
      const data = [1, 2, 3, 4, 5];
      const result = calculateCDF(data);

      expect(result.points[0].probability).toBe(20);
      expect(result.points[100].probability).toBe(100);
    });

    it('should calculate probability range between 0 and 100', () => {
      const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const result = calculateCDF(data);

      result.points.forEach((point) => {
        expect(point.probability).toBeGreaterThanOrEqual(0);
        expect(point.probability).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Quantile calculation', () => {
    it('should calculate P50 (median) correctly', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = calculateCDF(data);

      expect(result.p50).toBe(5.5);
    });

    it('should calculate P95 correctly', () => {
      const data = Array.from({ length: 100 }, (_, i) => i + 1);
      const result = calculateCDF(data);

      expect(result.p95).toBe(95.05);
    });

    it('should calculate P99 correctly', () => {
      const data = Array.from({ length: 100 }, (_, i) => i + 1);
      const result = calculateCDF(data);

      expect(result.p99).toBe(99.01);
    });
  });

  describe('Mean and standard deviation calculation', () => {
    it('should calculate mean correctly', () => {
      const data = [1, 2, 3, 4, 5];
      const result = calculateCDF(data);

      expect(result.mean).toBe(3);
    });

    it('should calculate standard deviation correctly', () => {
      const data = [2, 4, 4, 4, 5, 5, 7, 9];
      const result = calculateCDF(data);

      expect(result.stdDev).toBeCloseTo(2, 0);
    });

    it('should return zero stdDev for identical values', () => {
      const data = [5, 5, 5, 5, 5];
      const result = calculateCDF(data);

      expect(result.stdDev).toBe(0);
    });
  });

  describe('Boundary conditions', () => {
    it('should handle empty array', () => {
      const result = calculateCDF([]);

      expect(result.points).toEqual([]);
      expect(result.p50).toBeNaN();
      expect(result.p95).toBeNaN();
      expect(result.p99).toBeNaN();
      expect(result.min).toBeNaN();
      expect(result.max).toBeNaN();
      expect(result.mean).toBeNaN();
      expect(result.stdDev).toBeNaN();
      expect(result.totalCount).toBe(0);
    });

    it('should handle single element', () => {
      const result = calculateCDF([42]);

      expect(result.totalCount).toBe(1);
      expect(result.min).toBe(42);
      expect(result.max).toBe(42);
      expect(result.mean).toBe(42);
      expect(result.stdDev).toBe(0);
      expect(result.p50).toBe(42);
      expect(result.p95).toBe(42);
      expect(result.p99).toBe(42);
      expect(result.points).toHaveLength(1);
      expect(result.points[0].probability).toBe(1);
    });

    it('should handle all identical values', () => {
      const data = [10, 10, 10, 10, 10];
      const result = calculateCDF(data);

      expect(result.min).toBe(10);
      expect(result.max).toBe(10);
      expect(result.mean).toBe(10);
      expect(result.stdDev).toBe(0);
      expect(result.points).toHaveLength(1);
      expect(result.points[0].value).toBe(10);
      expect(result.points[0].probability).toBe(1);
      expect(result.points[0].count).toBe(5);
    });
  });

  describe('Custom steps', () => {
    it('should respect custom steps parameter', () => {
      const data = [1, 2, 3, 4, 5];
      const result = calculateCDF(data, 50);

      expect(result.points.length).toBe(51);
    });

    it('should work with steps = 1', () => {
      const data = [1, 2, 3, 4, 5];
      const result = calculateCDF(data, 1);

      expect(result.points.length).toBe(2);
    });
  });
});

describe('calculatePercentile', () => {
  describe('Basic functionality', () => {
    it('should calculate median (P50) correctly for odd length', () => {
      const sortedData = [1, 2, 3, 4, 5];
      const result = calculatePercentile(sortedData, 50);

      expect(result).toBe(3);
    });

    it('should calculate median (P50) correctly for even length', () => {
      const sortedData = [1, 2, 3, 4, 5, 6];
      const result = calculatePercentile(sortedData, 50);

      expect(result).toBe(3.5);
    });

    it('should calculate P25 correctly', () => {
      const sortedData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = calculatePercentile(sortedData, 25);

      expect(result).toBe(3.25);
    });

    it('should calculate P75 correctly', () => {
      const sortedData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = calculatePercentile(sortedData, 75);

      expect(result).toBe(7.75);
    });
  });

  describe('Interpolation method', () => {
    it('should interpolate between values correctly', () => {
      const sortedData = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const result = calculatePercentile(sortedData, 50);

      expect(result).toBe(50);
    });

    it('should handle non-integer index interpolation', () => {
      const sortedData = [0, 100];
      const result = calculatePercentile(sortedData, 25);

      expect(result).toBe(25);
    });

    it('should return exact value when index is integer', () => {
      const sortedData = [10, 20, 30, 40, 50];
      const result = calculatePercentile(sortedData, 50);

      expect(result).toBe(30);
    });
  });

  describe('Boundary conditions', () => {
    it('should return NaN for empty array', () => {
      const result = calculatePercentile([], 50);

      expect(result).toBeNaN();
    });

    it('should return first element for percentile <= 0', () => {
      const sortedData = [1, 2, 3, 4, 5];

      expect(calculatePercentile(sortedData, 0)).toBe(1);
      expect(calculatePercentile(sortedData, -10)).toBe(1);
      expect(calculatePercentile(sortedData, -0.5)).toBe(1);
    });

    it('should return last element for percentile >= 100', () => {
      const sortedData = [1, 2, 3, 4, 5];

      expect(calculatePercentile(sortedData, 100)).toBe(5);
      expect(calculatePercentile(sortedData, 150)).toBe(5);
    });

    it('should handle single element array', () => {
      const sortedData = [42];

      expect(calculatePercentile(sortedData, 0)).toBe(42);
      expect(calculatePercentile(sortedData, 50)).toBe(42);
      expect(calculatePercentile(sortedData, 100)).toBe(42);
    });
  });
});

describe('calculateQuantiles', () => {
  describe('Basic functionality', () => {
    it('should calculate all quantiles correctly', () => {
      const data = Array.from({ length: 1000 }, (_, i) => i + 1);
      const result = calculateQuantiles(data);

      expect(result.p50).toBeCloseTo(500.5, 0);
      expect(result.p90).toBeCloseTo(900.1, 0);
      expect(result.p95).toBeCloseTo(950.05, 0);
      expect(result.p99).toBeCloseTo(990.01, 0);
      expect(result.p999).toBeCloseTo(999.001, 0);
    });

    it('should return correct structure', () => {
      const data = [1, 2, 3, 4, 5];
      const result = calculateQuantiles(data);

      expect(result).toHaveProperty('p50');
      expect(result).toHaveProperty('p90');
      expect(result).toHaveProperty('p95');
      expect(result).toHaveProperty('p99');
      expect(result).toHaveProperty('p999');
    });

    it('should calculate P50 (median) correctly', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = calculateQuantiles(data);

      expect(result.p50).toBe(5.5);
    });

    it('should calculate P90 correctly', () => {
      const data = Array.from({ length: 100 }, (_, i) => i + 1);
      const result = calculateQuantiles(data);

      expect(result.p90).toBeCloseTo(90.1, 1);
    });

    it('should calculate P95 correctly', () => {
      const data = Array.from({ length: 100 }, (_, i) => i + 1);
      const result = calculateQuantiles(data);

      expect(result.p95).toBe(95.05);
    });

    it('should calculate P99 correctly', () => {
      const data = Array.from({ length: 100 }, (_, i) => i + 1);
      const result = calculateQuantiles(data);

      expect(result.p99).toBe(99.01);
    });

    it('should calculate P99.9 correctly', () => {
      const data = Array.from({ length: 1000 }, (_, i) => i + 1);
      const result = calculateQuantiles(data);

      expect(result.p999).toBeCloseTo(999.001, 0);
    });
  });

  describe('Boundary conditions', () => {
    it('should handle empty array', () => {
      const result = calculateQuantiles([]);

      expect(result.p50).toBeNaN();
      expect(result.p90).toBeNaN();
      expect(result.p95).toBeNaN();
      expect(result.p99).toBeNaN();
      expect(result.p999).toBeNaN();
    });

    it('should handle single element', () => {
      const result = calculateQuantiles([42]);

      expect(result.p50).toBe(42);
      expect(result.p90).toBe(42);
      expect(result.p95).toBe(42);
      expect(result.p99).toBe(42);
      expect(result.p999).toBe(42);
    });

    it('should handle small array', () => {
      const data = [1, 2, 3];
      const result = calculateQuantiles(data);

      expect(result.p50).toBe(2);
      expect(result.p90).toBeCloseTo(2.8, 1);
      expect(result.p95).toBeCloseTo(2.9, 1);
      expect(result.p99).toBeCloseTo(2.98, 1);
      expect(result.p999).toBeCloseTo(2.998, 2);
    });
  });

  describe('sort', () => {
    it('should handle unsorted data', () => {
      const data = [5, 1, 3, 2, 4];
      const result = calculateQuantiles(data);

      expect(result.p50).toBe(3);
    });

    it('should not modify original array', () => {
      const data = [5, 1, 3, 2, 4];
      const originalData = [...data];
      calculateQuantiles(data);

      expect(data).toEqual(originalData);
    });
  });
});

describe('calculateHistogram', () => {
  describe('Basic functionality', () => {
    it('should calculate histogram with default bin count', () => {
      const data = Array.from({ length: 100 }, (_, i) => i + 1);
      const result = calculateHistogram(data);

      expect(result.length).toBe(20);
    });

    it('should calculate histogram with custom bin count', () => {
      const data = Array.from({ length: 100 }, (_, i) => i + 1);
      const result = calculateHistogram(data, 10);

      expect(result.length).toBe(10);
    });

    it('should return correct bin structure', () => {
      const data = [1, 2, 3, 4, 5];
      const result = calculateHistogram(data);

      result.forEach((bin) => {
        expect(bin).toHaveProperty('range');
        expect(bin).toHaveProperty('min');
        expect(bin).toHaveProperty('max');
        expect(bin).toHaveProperty('count');
        expect(bin).toHaveProperty('percentage');
      });
    });
  });

  describe('calculate', () => {
    it('should distribute values across bins correctly', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = calculateHistogram(data, 5);

      const totalCount = result.reduce((sum, bin) => sum + bin.count, 0);
      expect(totalCount).toBe(10);
    });

    it('should calculate correct min and max for each bin', () => {
      const data = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const result = calculateHistogram(data, 10);

      expect(result[0].min).toBe(0);
      expect(result[0].max).toBe(10);
      expect(result[9].min).toBe(90);
      expect(result[9].max).toBe(100);
    });

    it('should include max value in last bin', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = calculateHistogram(data, 2);

      const totalCount = result.reduce((sum, bin) => sum + bin.count, 0);
      expect(totalCount).toBe(10);
    });
  });

  describe('calculate', () => {
    it('should calculate percentage correctly', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = calculateHistogram(data, 2);

      const totalPercentage = result.reduce((sum, bin) => sum + bin.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0);
    });

    it('should return percentage between 0 and 100', () => {
      const data = Array.from({ length: 100 }, (_, i) => i + 1);
      const result = calculateHistogram(data);

      result.forEach((bin) => {
        expect(bin.percentage).toBeGreaterThanOrEqual(0);
        expect(bin.percentage).toBeLessThanOrEqual(100);
      });
    });

    it('should calculate percentage with precision', () => {
      const data = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2];
      const result = calculateHistogram(data, 2);

      expect(result[0].percentage).toBe(50);
      expect(result[1].percentage).toBe(50);
    });
  });

  describe('allvaluesame', () => {
    it('should handle all identical values', () => {
      const data = [5, 5, 5, 5, 5];
      const result = calculateHistogram(data);

      expect(result.length).toBe(1);
      expect(result[0].count).toBe(5);
      expect(result[0].percentage).toBe(100);
      expect(result[0].min).toBe(5);
      expect(result[0].max).toBe(5);
      expect(result[0].range).toBe('5');
    });
  });

  describe('Boundary conditions', () => {
    it('should return empty array for empty input', () => {
      const result = calculateHistogram([]);

      expect(result).toEqual([]);
    });

    it('should handle single element', () => {
      const result = calculateHistogram([42]);

      expect(result.length).toBe(1);
      expect(result[0].count).toBe(1);
      expect(result[0].percentage).toBe(100);
    });

    it('should handle negative values', () => {
      const data = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
      const result = calculateHistogram(data);

      const totalCount = result.reduce((sum, bin) => sum + bin.count, 0);
      expect(totalCount).toBe(11);
    });

    it('should handle decimal values', () => {
      const data = [0.1, 0.2, 0.3, 0.4, 0.5];
      const result = calculateHistogram(data);

      const totalCount = result.reduce((sum, bin) => sum + bin.count, 0);
      expect(totalCount).toBe(5);
    });
  });

  describe('range stringformat', () => {
    it('should generate correct range string', () => {
      const data = [0, 10, 20, 30, 40, 50];
      const result = calculateHistogram(data, 3);

      expect(result[0].range).toBe('0-17');
      expect(result[1].range).toBe('17-33');
      expect(result[2].range).toBe('33-50');
    });
  });
});

describe('functiontest', () => {
  it('should produce consistent results between calculateCDF and calculateQuantiles', () => {
    const data = Array.from({ length: 100 }, (_, i) => i + 1);
    const cdfResult = calculateCDF(data);
    const quantileResult = calculateQuantiles(data);

    expect(cdfResult.p50).toBe(quantileResult.p50);
    expect(cdfResult.p95).toBe(quantileResult.p95);
    expect(cdfResult.p99).toBe(quantileResult.p99);
  });

  it('should handle large dataset efficiently', () => {
    const data = Array.from({ length: 10000 }, () => Math.random() * 1000);

    const start = performance.now();
    calculateCDF(data);
    calculateQuantiles(data);
    calculateHistogram(data);
    const end = performance.now();

    expect(end - start).toBeLessThan(1000);
  });
});
