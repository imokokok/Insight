/**
 * Statistical utility functions for calculating CDF, quantiles, and other statistical metrics
 */

export interface WeightedData {
  value: number;
  weight?: number | null;
}

export function safeMax(values: number[]): number {
  if (values.length === 0) return -Infinity;
  return values.reduce((max, v) => (v > max ? v : max), -Infinity);
}

export function safeMin(values: number[]): number {
  if (values.length === 0) return Infinity;
  return values.reduce((min, v) => (v < min ? v : min), Infinity);
}

export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function calculateVariance(values: number[], mean?: number): number {
  if (values.length < 2) return 0;
  const actualMean = mean ?? calculateMean(values);
  return values.reduce((sum, v) => sum + Math.pow(v - actualMean, 2), 0) / values.length;
}

export function calculateStdDev(values: number[], mean?: number): number {
  if (values.length < 2) return 0;
  const actualMean = mean ?? calculateMean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - actualMean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export function calculateStandardDeviationFromVariance(variance: number): number {
  return Math.sqrt(variance);
}

export function calculateWeightedAverage(
  data: Array<{ value: number; weight?: number | null }> | WeightedData[]
): number {
  const validData = data.filter((d) => d.value > 0);
  if (validData.length === 0) return 0;

  let weightedSum = 0;
  let weightSum = 0;

  validData.forEach((d) => {
    const weight = d.weight && d.weight > 0 ? d.weight : 1;
    weightedSum += d.value * weight;
    weightSum += weight;
  });

  return weightSum > 0 ? weightedSum / weightSum : 0;
}

export interface CDFPoint {
  value: number;
  probability: number;
  count: number;
}

export interface CDFResult {
  points: CDFPoint[];
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
  stdDev: number;
  totalCount: number;
}

export interface QuantileResult {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  p999: number;
}

/**
 * Calculates the Cumulative Distribution Function (CDF)
 * CDF(x) = P(X <= x) = Number of data points <= x / Total number of data points
 *
 * @param data - Input data array
 * @param steps - Number of sampling points for the CDF curve (default: 100)
 * @returns CDF calculation result
 */
export function calculateCDF(data: number[], steps: number = 100): CDFResult {
  // Filter out invalid data (NaN and Infinity)
  const validData = data.filter(Number.isFinite);

  if (validData.length === 0) {
    return {
      points: [],
      p50: NaN,
      p95: NaN,
      p99: NaN,
      min: NaN,
      max: NaN,
      mean: NaN,
      stdDev: NaN,
      totalCount: 0,
    };
  }

  const sortedData = [...validData].sort((a, b) => a - b);
  const min = sortedData[0];
  const max = sortedData[sortedData.length - 1];
  const totalCount = sortedData.length;

  // Calculate mean
  const mean = sortedData.reduce((sum, val) => sum + val, 0) / totalCount;

  // Calculate standard deviation
  const variance = sortedData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / totalCount;
  const stdDev = Math.sqrt(variance);

  // Calculate quantiles
  const p50 = calculatePercentile(sortedData, 50);
  const p95 = calculatePercentile(sortedData, 95);
  const p99 = calculatePercentile(sortedData, 99);

  // Generate CDF points
  const points: CDFPoint[] = [];
  const range = max - min;

  if (range === 0) {
    // All values are identical
    points.push({
      value: min,
      probability: 1,
      count: totalCount,
    });
  } else {
    // Use two-pointer optimization for the loop
    let dataIndex = 0;
    for (let i = 0; i <= steps; i++) {
      const value = min + (range * i) / steps;

      // Move pointer until finding a position greater than the current value
      while (dataIndex < totalCount && sortedData[dataIndex] <= value) {
        dataIndex++;
      }
      const count = dataIndex;
      const probability = count / totalCount;

      points.push({
        value: Number(value.toFixed(2)),
        probability: Number((probability * 100).toFixed(2)),
        count,
      });
    }
  }

  return {
    points,
    p50,
    p95,
    p99,
    min,
    max,
    mean: Number(mean.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    totalCount,
  };
}

/**
 * Calculates the value at a specified percentile
 *
 * @param sortedData - Sorted data array
 * @param percentile - Percentile value (0-100)
 * @returns Percentile value
 */
export function calculatePercentile(sortedData: number[], percentile: number): number {
  if (sortedData.length === 0) return NaN;
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

/**
 * Calculates common quantiles
 *
 * @param data - Input data array
 * @returns Object containing P50, P90, P95, P99, P99.9 values
 */
export function calculateQuantiles(data: number[]): QuantileResult {
  if (data.length === 0) {
    return { p50: NaN, p90: NaN, p95: NaN, p99: NaN, p999: NaN };
  }

  const sortedData = [...data].sort((a, b) => a - b);

  return {
    p50: calculatePercentile(sortedData, 50),
    p90: calculatePercentile(sortedData, 90),
    p95: calculatePercentile(sortedData, 95),
    p99: calculatePercentile(sortedData, 99),
    p999: calculatePercentile(sortedData, 99.9),
  };
}

/**
 * Calculates histogram data
 *
 * @param data - Input data array
 * @param binCount - Number of bins (default: 20)
 * @returns Array of histogram data points
 */
export function calculateHistogram(
  data: number[],
  binCount: number = 20
): { range: string; min: number; max: number; count: number; percentage: number }[] {
  if (data.length === 0) return [];

  const min = safeMin(data);
  const max = safeMax(data);
  const range = max - min;

  if (range === 0) {
    return [
      {
        range: `${min.toFixed(0)}`,
        min,
        max: min,
        count: data.length,
        percentage: 100,
      },
    ];
  }

  const binSize = range / binCount;
  const bins: { range: string; min: number; max: number; count: number; percentage: number }[] = [];

  for (let i = 0; i < binCount; i++) {
    const binMin = min + i * binSize;
    const binMax = min + (i + 1) * binSize;
    // Use Number.EPSILON to handle boundary value issues
    const count = data.filter(
      (v) =>
        v >= binMin - Number.EPSILON &&
        (i === binCount - 1 ? v <= binMax + Number.EPSILON : v < binMax - Number.EPSILON)
    ).length;

    bins.push({
      range: `${binMin.toFixed(0)}-${binMax.toFixed(0)}`,
      min: binMin,
      max: binMax,
      count,
      percentage: Number(((count / data.length) * 100).toFixed(2)),
    });
  }

  return bins;
}
