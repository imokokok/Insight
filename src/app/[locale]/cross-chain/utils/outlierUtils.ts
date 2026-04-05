import { calculatePercentile, calculateZScore } from './statisticsUtils';

export const isOutlier = (zScore: number | null, threshold: number = 2): boolean => {
  if (zScore === null) return false;
  return Math.abs(zScore) > threshold;
};

export const isOutlierIQR = (
  value: number,
  q1: number,
  q3: number,
  multiplier: number = 1.5
): boolean => {
  const iqr = q3 - q1;
  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;
  return value < lowerBound || value > upperBound;
};

export const detectOutliersIQR = (
  prices: number[],
  multiplier: number = 1.5
): {
  outliers: number[];
  q1: number;
  q3: number;
  iqr: number;
  lowerBound: number;
  upperBound: number;
} => {
  if (prices.length < 4) {
    return {
      outliers: [],
      q1: 0,
      q3: 0,
      iqr: 0,
      lowerBound: 0,
      upperBound: 0,
    };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const q1 = calculatePercentile(sorted, 25);
  const q3 = calculatePercentile(sorted, 75);
  const iqr = q3 - q1;
  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;

  const outliers = prices.filter((price) => price < lowerBound || price > upperBound);

  return {
    outliers,
    q1,
    q3,
    iqr,
    lowerBound,
    upperBound,
  };
};

export const detectOutliersZScore = (
  prices: number[],
  threshold: number = 2
): {
  outliers: number[];
  mean: number;
  stdDev: number;
  lowerBound: number;
  upperBound: number;
} => {
  if (prices.length < 2) {
    return {
      outliers: [],
      mean: 0,
      stdDev: 0,
      lowerBound: 0,
      upperBound: 0,
    };
  }

  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance =
    prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return {
      outliers: [],
      mean,
      stdDev: 0,
      lowerBound: mean,
      upperBound: mean,
    };
  }

  const lowerBound = mean - threshold * stdDev;
  const upperBound = mean + threshold * stdDev;

  const outliers = prices.filter((price) => {
    const zScore = calculateZScore(price, mean, stdDev);
    return zScore !== null && Math.abs(zScore) > threshold;
  });

  return {
    outliers,
    mean,
    stdDev,
    lowerBound,
    upperBound,
  };
};
