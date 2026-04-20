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

export function safeMax(values: number[]): number {
  validateNumberArray(values, 'safeMax');
  if (values.length === 0) return -Infinity;

  let max = -Infinity;
  for (const v of values) {
    if (v > max) max = v;
  }
  return max;
}

export function safeMin(values: number[]): number {
  validateNumberArray(values, 'safeMin');
  if (values.length === 0) return Infinity;

  let min = Infinity;
  for (const v of values) {
    if (v < min) min = v;
  }
  return min;
}

function calculateMean(values: number[]): number {
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

interface CDFPoint {
  value: number;
  probability: number;
  count: number;
}

interface CDFResult {
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

interface QuantileResult {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  p999: number;
}

export function calculateCDF(data: number[], steps: number = 100): CDFResult {
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

  const mean = sortedData.reduce((sum, val) => sum + val, 0) / totalCount;

  const variance =
    totalCount > 1
      ? sortedData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (totalCount - 1)
      : 0;
  const stdDev = Math.sqrt(variance);

  const p50 = calculatePercentile(sortedData, 50);
  const p95 = calculatePercentile(sortedData, 95);
  const p99 = calculatePercentile(sortedData, 99);

  const points: CDFPoint[] = [];
  const range = max - min;

  if (range === 0) {
    points.push({
      value: min,
      probability: 1,
      count: totalCount,
    });
  } else {
    let dataIndex = 0;
    for (let i = 0; i <= steps; i++) {
      const value = min + (range * i) / steps;

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
    bins.push({
      range: `${binMin.toFixed(0)}-${binMax.toFixed(0)}`,
      min: binMin,
      max: binMax,
      count: 0,
      percentage: 0,
    });
  }

  for (const value of data) {
    let binIndex = Math.floor((value - min) / binSize);
    if (binIndex >= binCount) binIndex = binCount - 1;
    if (binIndex < 0) binIndex = 0;
    bins[binIndex].count++;
  }

  for (const bin of bins) {
    bin.percentage = Number(((bin.count / data.length) * 100).toFixed(2));
  }

  return bins;
}
