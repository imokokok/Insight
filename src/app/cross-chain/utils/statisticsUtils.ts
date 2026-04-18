import {
  calculateStandardDeviation as calculateStdDev,
  calculateMovingAverage,
} from '@/lib/utils/chartSharedUtils';

export const calculateZScore = (price: number, mean: number, stdDev: number): number | null => {
  if (stdDev === 0) return null;
  return (price - mean) / stdDev;
};

export const calculateChangePercent = (current: number, previous: number): number | null => {
  if (previous === 0 || current === 0) return null;
  return ((current - previous) / previous) * 100;
};

export const calculateStandardDeviation = (variance: number): number => {
  return Math.sqrt(variance);
};

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

export const getTCriticalValue = (df: number, confidenceLevel: number = 0.95): number => {
  if (df <= 0) {
    return 1.96;
  }

  if (confidenceLevel !== 0.95) {
    console.warn('getTCriticalValue: 当前仅支持 95% 置信水平，其他置信水平将使用正态近似');
    return 1.96;
  }

  if (df >= 30) {
    return 1.96;
  }

  const exactValue = T_CRITICAL_TABLE_95[Math.floor(df)];
  if (exactValue !== undefined) {
    return exactValue;
  }

  const lowerDf = Math.floor(df);
  const upperDf = lowerDf + 1;
  const lowerValue = T_CRITICAL_TABLE_95[lowerDf] ?? 2.042;
  const upperValue = T_CRITICAL_TABLE_95[upperDf] ?? 1.96;

  const weight = df - lowerDf;
  return lowerValue + (upperValue - lowerValue) * weight;
};

const calculateStandardDeviationFromValues = (prices: number[]): number => {
  return calculateStdDev(prices);
};

export const calculateVariance = (prices: number[], mean: number): number => {
  if (prices.length < 2) return 0;
  const sumSquaredDiff = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0);
  return sumSquaredDiff / (prices.length - 1);
};

export const calculatePercentile = (sortedPrices: number[], percentile: number): number => {
  if (sortedPrices.length === 0) return 0;
  const index = (percentile / 100) * (sortedPrices.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (upper >= sortedPrices.length) return sortedPrices[sortedPrices.length - 1];
  if (lower === upper) return sortedPrices[lower];
  return sortedPrices[lower] * (1 - weight) + sortedPrices[upper] * weight;
};

export const calculateSMA = (data: number[], period: number): (number | null)[] => {
  const result = calculateMovingAverage(data, period);
  return result.map((v) => v);
};

const normalCDF = (x: number): number => {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2);

  const t = 1 / (1 + p * absX);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1 + sign * y);
};

export const approximatePValue = (t: number, df: number): number => {
  if (df <= 0) return 1;

  if (df > 30) {
    const z = t;
    const p = 2 * (1 - normalCDF(z));
    return Math.min(p, 1);
  }

  const adjustedT = t * Math.sqrt(df / (df - 2));
  const p = 2 * (1 - normalCDF(adjustedT));
  return Math.min(Math.max(p, 0), 1);
};
