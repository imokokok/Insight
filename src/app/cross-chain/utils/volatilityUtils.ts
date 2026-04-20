import { calculateZScore } from './statisticsUtils';

export type ThresholdType = 'fixed' | 'dynamic' | 'atr';

export type OutlierDetectionMethod = 'zscore' | 'iqr';

export interface ThresholdConfig {
  type: ThresholdType;
  fixedThreshold: number;
  atrMultiplier: number;
  volatilityWindow: number;
  priceJumpMethod: 'std' | 'zscore' | 'simple';
  priceJumpThreshold: number;
  outlierDetectionMethod: OutlierDetectionMethod;
  outlierThreshold: number;
}

const calculateATR = (prices: number[], period: number = 14): number => {
  if (prices.length < period + 1) {
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance =
      prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    return Math.sqrt(variance);
  }

  const trueRanges: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const currentPrice = prices[i];
    const previousPrice = prices[i - 1];
    const priceChange = Math.abs(currentPrice - previousPrice);
    trueRanges.push(priceChange);
  }

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += trueRanges[i];
  }

  const atrValues: number[] = [sum / period];

  for (let i = period; i < trueRanges.length; i++) {
    sum = sum - trueRanges[i - period] + trueRanges[i];
    atrValues.push(sum / period);
  }

  return atrValues.length > 0 ? atrValues[atrValues.length - 1] : 0;
};

const calculatePriceJumpStats = (changes: number[]) => {
  if (changes.length === 0) {
    return { mean: 0, stdDev: 0 };
  }

  const mean = changes.reduce((a, b) => a + b, 0) / changes.length;

  if (changes.length === 1) {
    return { mean, stdDev: 0 };
  }

  const variance =
    changes.reduce((sum, change) => sum + Math.pow(change - mean, 2), 0) / (changes.length - 1);
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev };
};

const detectPriceJumps = (
  changes: number[],
  method: 'std' | 'zscore' | 'simple',
  threshold: number
): number => {
  if (changes.length === 0) {
    return 0;
  }

  const { mean, stdDev } = calculatePriceJumpStats(changes);

  if (method === 'simple') {
    const absMean = Math.abs(mean);
    const simpleThreshold = absMean > 0.001 ? absMean * threshold : stdDev * threshold;
    return changes.filter((change) => Math.abs(change) > simpleThreshold).length;
  }

  if (method === 'std') {
    const stdThreshold = mean + stdDev * threshold;
    const negStdThreshold = mean - stdDev * threshold;
    return changes.filter((change) => change > stdThreshold || change < negStdThreshold).length;
  }

  if (method === 'zscore') {
    if (stdDev === 0) {
      return 0;
    }
    return changes.filter((change) => {
      const zScore = calculateZScore(change, mean, stdDev);
      return zScore !== null && Math.abs(zScore) > threshold;
    }).length;
  }

  return 0;
};

export const defaultThresholdConfig: ThresholdConfig = {
  type: 'fixed',
  fixedThreshold: 0.5,
  atrMultiplier: 2.0,
  volatilityWindow: 14,
  priceJumpMethod: 'zscore',
  priceJumpThreshold: 2.0,
  outlierDetectionMethod: 'zscore',
  outlierThreshold: 2.0,
};
