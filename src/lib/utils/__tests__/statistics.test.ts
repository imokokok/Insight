import {
  calculatePercentile,
  calculatePriceStats,
  calculateMean,
  calculateMedian,
  calculateVariance,
  calculateWeightedAverage,
  calculateZScore,
  extractValidPrices,
  getTCriticalValue,
  safeMax,
  safeMin,
  calculateStandardDeviationFromVariance,
} from '../statistics';

describe('safeMax / safeMin', () => {
  it('returns the provided default for an empty array', () => {
    expect(safeMax([], 42)).toBe(42);
    expect(safeMin([], -1)).toBe(-1);
  });

  it('falls back to +/-Infinity when no default is given', () => {
    expect(safeMax([])).toBe(-Infinity);
    expect(safeMin([])).toBe(Infinity);
  });

  it('computes the correct extreme for non-empty input', () => {
    expect(safeMax([3, 1, 2])).toBe(3);
    expect(safeMin([3, 1, 2])).toBe(1);
  });

  it('throws on non-array / non-finite input', () => {
    // @ts-expect-error intentionally invalid input
    expect(() => safeMax('nope')).toThrow();
    expect(() => safeMax([1, NaN, 2])).toThrow();
  });
});

describe('calculateMean / calculateMedian', () => {
  it('returns 0 for empty input', () => {
    expect(calculateMean([])).toBe(0);
  });

  it('computes the mean', () => {
    expect(calculateMean([2, 4, 6])).toBe(4);
  });

  it('computes the median for odd and even lengths', () => {
    expect(calculateMedian([3, 1, 2])).toBe(2);
    expect(calculateMedian([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('calculateVariance', () => {
  it('returns 0 when fewer than two values', () => {
    expect(calculateVariance([])).toBe(0);
    expect(calculateVariance([5])).toBe(0);
  });

  it('computes sample variance with explicit mean', () => {
    expect(calculateVariance([2, 4], 3)).toBe(2);
  });
});

describe('calculateStandardDeviationFromVariance', () => {
  it('throws on negative or non-finite variance', () => {
    expect(() => calculateStandardDeviationFromVariance(-1)).toThrow();
    expect(() => calculateStandardDeviationFromVariance(NaN)).toThrow();
  });

  it('returns the square root of a valid variance', () => {
    expect(calculateStandardDeviationFromVariance(9)).toBe(3);
  });
});

describe('calculateWeightedAverage', () => {
  it('returns 0 for empty / invalid input', () => {
    expect(calculateWeightedAverage([])).toBe(0);
    // @ts-expect-error intentionally invalid input
    expect(() => calculateWeightedAverage('nope')).toThrow();
  });

  it('falls back to an implicit weight of 1', () => {
    expect(calculateWeightedAverage([{ value: 10 }, { value: 20 }])).toBe(15);
  });

  it('honours explicit positive weights', () => {
    expect(
      calculateWeightedAverage([
        { value: 10, weight: 3 },
        { value: 20, weight: 1 },
      ])
    ).toBe(12.5);
  });

  it('ignores non-positive values and falls back to a unit weight of 1', () => {
    // value 0 and -5 are dropped; value 20 carries weight 0 which is treated as
    // an invalid weight and defaults to 1, so (10*1 + 20*1) / 2 = 15.
    expect(
      calculateWeightedAverage([
        { value: 0, weight: 5 },
        { value: -5, weight: 5 },
        { value: 10, weight: 1 },
        { value: 20, weight: 0 },
      ])
    ).toBe(15);
  });
});

describe('extractValidPrices / calculatePriceStats', () => {
  it('drops non-positive and non-finite prices', () => {
    expect(extractValidPrices([{ price: 5 }, { price: -1 }, { price: 0 }, { price: NaN }])).toEqual(
      [5]
    );
  });

  it('returns all-zero stats for empty input', () => {
    expect(calculatePriceStats([])).toEqual({
      avgPrice: 0,
      maxPrice: 0,
      minPrice: 0,
      priceRange: 0,
      standardDeviationPercent: 0,
    });
  });

  it('computes stats for a valid series', () => {
    const stats = calculatePriceStats([10, 20, 30]);
    expect(stats.avgPrice).toBe(20);
    expect(stats.minPrice).toBe(10);
    expect(stats.maxPrice).toBe(30);
    expect(stats.priceRange).toBe(20);
    expect(stats.standardDeviationPercent).toBeCloseTo((Math.sqrt(100) / 20) * 100);
  });
});

describe('calculatePercentile', () => {
  it('throws on empty input (no longer silently returns NaN)', () => {
    expect(() => calculatePercentile([], 50)).toThrow(/non-empty/);
  });

  it('throws on non-array / non-finite input', () => {
    // @ts-expect-error intentionally invalid input
    expect(() => calculatePercentile('nope', 50)).toThrow();
    expect(() => calculatePercentile([1, NaN, 3], 50)).toThrow();
  });

  it('returns the only element for a single-element array', () => {
    expect(calculatePercentile([5], 50)).toBe(5);
  });

  it('clamps to the bounds at 0 and 100', () => {
    expect(calculatePercentile([10, 20, 30], 0)).toBe(10);
    expect(calculatePercentile([10, 20, 30], 100)).toBe(30);
  });

  it('interpolates between adjacent points', () => {
    expect(calculatePercentile([10, 20, 30, 40], 50)).toBe(25);
  });

  it('handles fractional percentiles', () => {
    expect(calculatePercentile([0, 100], 25)).toBe(25);
  });
});

describe('calculateZScore', () => {
  it('returns null when standard deviation is zero', () => {
    expect(calculateZScore(5, 5, 0)).toBeNull();
  });

  it('returns null on non-finite inputs instead of NaN', () => {
    expect(calculateZScore(NaN, 0, 1)).toBeNull();
    expect(calculateZScore(1, Infinity, 1)).toBeNull();
    expect(calculateZScore(1, 0, NaN)).toBeNull();
  });

  it('computes the standard score', () => {
    expect(calculateZScore(15, 10, 5)).toBe(1);
  });
});

describe('getTCriticalValue', () => {
  it('returns the normal approximation for extreme / unsupported degrees of freedom', () => {
    expect(getTCriticalValue(0)).toBe(1.96);
    expect(getTCriticalValue(35)).toBe(1.96);
    expect(getTCriticalValue(10, 0.99)).toBe(1.96);
  });

  it('returns exact table values', () => {
    expect(getTCriticalValue(1)).toBe(12.706);
    expect(getTCriticalValue(30)).toBe(2.042);
  });

  it('returns the floor key value for a fractional df', () => {
    // The table is contiguous (1..30), so a fractional df resolves to the
    // exact value of its integer floor rather than an interpolation.
    expect(getTCriticalValue(5.5)).toBe(2.571);
    expect(getTCriticalValue(5.5)).toBe(getTCriticalValue(5));
  });
});
