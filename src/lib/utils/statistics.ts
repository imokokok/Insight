import type { PriceStats } from '@/types/analytics';

interface WeightedData {
  value: number;
  weight?: number | null;
}

function validateNumberArray(values: number[], functionName: string): void {
  if (!values) {
    throw new Error(`${functionName}: Input array is undefined or null`);
  }
  if (!Array.isArray(values)) {
    throw new Error(`${functionName}: Input must be an array`);
  }
  if (values.some((v) => !Number.isFinite(v))) {
    throw new Error(`${functionName}: Array contains invalid values (NaN, Infinity, or -Infinity)`);
  }
}

export function extractValidPrices(priceData: { price: number }[]): number[] {
  return priceData.map((d) => d.price).filter((p) => p > 0 && !isNaN(p) && isFinite(p));
}

export function calculatePriceStats(prices: number[]): PriceStats {
  const validPrices = prices.filter((p) => p > 0 && !isNaN(p) && isFinite(p));
  if (validPrices.length === 0) {
    return { avgPrice: 0, maxPrice: 0, minPrice: 0, priceRange: 0, standardDeviationPercent: 0 };
  }
  const avgPrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
  const maxPrice = safeMax(validPrices);
  const minPrice = safeMin(validPrices);
  const priceRange = maxPrice - minPrice;
  const variance =
    validPrices.length > 1
      ? validPrices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) /
        (validPrices.length - 1)
      : 0;
  const stdDev = Math.sqrt(variance);
  const standardDeviationPercent = avgPrice > 0 ? (stdDev / avgPrice) * 100 : 0;
  return { avgPrice, maxPrice, minPrice, priceRange, standardDeviationPercent };
}

export function safeMax(values: number[], defaultValue?: number): number {
  validateNumberArray(values, 'safeMax');
  if (values.length === 0) return defaultValue ?? -Infinity;

  let max = -Infinity;
  for (const v of values) {
    if (v > max) max = v;
  }
  return max;
}

export function safeMin(values: number[], defaultValue?: number): number {
  validateNumberArray(values, 'safeMin');
  if (values.length === 0) return defaultValue ?? Infinity;

  let min = Infinity;
  for (const v of values) {
    if (v < min) min = v;
  }
  return min;
}

export function calculateMean(values: number[]): number {
  validateNumberArray(values, 'calculateMean');
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function calculateMedian(values: number[]): number {
  validateNumberArray(values, 'calculateMedian');
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function calculateVariance(values: number[], mean?: number): number {
  validateNumberArray(values, 'calculateVariance');
  if (values.length < 2) return 0;
  const actualMean = mean ?? calculateMean(values);
  return values.reduce((sum, v) => sum + Math.pow(v - actualMean, 2), 0) / (values.length - 1);
}

export function calculateStandardDeviationFromVariance(variance: number): number {
  if (!Number.isFinite(variance)) {
    throw new Error('calculateStandardDeviationFromVariance: Variance must be a finite number');
  }
  if (variance < 0) {
    throw new Error('calculateStandardDeviationFromVariance: Variance cannot be negative');
  }
  return Math.sqrt(variance);
}

export function calculateWeightedAverage(
  data: Array<{ value: number; weight?: number | null }> | WeightedData[]
): number {
  if (!data || !Array.isArray(data)) {
    throw new Error('calculateWeightedAverage: Input must be an array');
  }

  const validData = data.filter((d) => d && Number.isFinite(d.value) && d.value > 0);
  if (validData.length === 0) return 0;

  let weightedSum = 0;
  let weightSum = 0;

  validData.forEach((d) => {
    const weight = d.weight && Number.isFinite(d.weight) && d.weight > 0 ? d.weight : 1;
    weightedSum += d.value * weight;
    weightSum += weight;
  });

  return weightSum > 0 ? weightedSum / weightSum : 0;
}

export function calculatePercentile(sortedData: number[], percentile: number): number {
  // Fail loud on invalid input instead of silently propagating NaN. The only
  // production caller (useStatistics.ts) already guards length < 2, so this
  // only changes behaviour for genuinely empty / non-array / non-finite input.
  validateNumberArray(sortedData, 'calculatePercentile');
  if (sortedData.length === 0) {
    throw new Error('calculatePercentile: input array must be non-empty');
  }
  if (percentile <= 0) return sortedData[0];
  if (percentile >= 100) return sortedData[sortedData.length - 1];

  const index = (percentile / 100) * (sortedData.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const weight = index - lowerIndex;

  if (lowerIndex === upperIndex) {
    return sortedData[lowerIndex];
  }

  return sortedData[lowerIndex] * (1 - weight) + sortedData[upperIndex] * weight;
}

export function calculateZScore(value: number, mean: number, stdDev: number): number | null {
  // Guard against non-finite inputs: previously a NaN/Infinity stdDev or mean
  // would yield NaN rather than signalling "undefined" via null.
  if (!Number.isFinite(value) || !Number.isFinite(mean) || !Number.isFinite(stdDev)) {
    return null;
  }
  if (stdDev === 0) return null;
  return (value - mean) / stdDev;
}

const T_CRITICAL_TABLE_95: Record<number, number> = {
  1: 12.706,
  2: 4.303,
  3: 3.182,
  4: 2.776,
  5: 2.571,
  6: 2.447,
  7: 2.365,
  8: 2.306,
  9: 2.262,
  10: 2.228,
  11: 2.201,
  12: 2.179,
  13: 2.16,
  14: 2.145,
  15: 2.131,
  16: 2.12,
  17: 2.11,
  18: 2.101,
  19: 2.093,
  20: 2.086,
  21: 2.08,
  22: 2.074,
  23: 2.069,
  24: 2.064,
  25: 2.06,
  26: 2.056,
  27: 2.052,
  28: 2.048,
  29: 2.045,
  30: 2.042,
};

export function getTCriticalValue(df: number, confidenceLevel: number = 0.95): number {
  if (df <= 0) return 1.96;
  if (confidenceLevel !== 0.95) return 1.96;
  // Use the table's exact entry for df === 30; only fall back to the normal
  // approximation for strictly larger samples. The previous `>= 30` guard
  // shadowed the table value and created a discontinuity at df = 30.1.
  if (df > 30) return 1.96;

  const exactValue = T_CRITICAL_TABLE_95[Math.floor(df)];
  if (exactValue !== undefined) return exactValue;

  const lowerDf = Math.floor(df);
  const upperDf = lowerDf + 1;
  const lowerValue = T_CRITICAL_TABLE_95[lowerDf] ?? 2.042;
  const upperValue = T_CRITICAL_TABLE_95[upperDf] ?? 1.96;
  const weight = df - lowerDf;
  return lowerValue + (upperValue - lowerValue) * weight;
}
