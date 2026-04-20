import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('statisticsUtils');

export const calculateZScore = (price: number, mean: number, stdDev: number): number | null => {
  if (stdDev === 0) return null;
  return (price - mean) / stdDev;
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
    logger.warn(
      'getTCriticalValue: Currently only 95% confidence level is supported, other confidence levels will use normal approximation'
    );
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
