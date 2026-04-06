import { calculateZScore } from './statisticsUtils';

export interface RollingVolatilityPoint {
  timestamp: number;
  volatility: number;
}

export interface VolatilityConePoint {
  windowSize: number;
  minVolatility: number;
  maxVolatility: number;
  meanVolatility: number;
  medianVolatility: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
}

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

export const calculateRollingVolatility = (
  prices: number[],
  windowSize: number,
  timestamps?: number[],
  dataIntervalMinutes: number = 60
): RollingVolatilityPoint[] => {
  if (prices.length < windowSize || windowSize < 2) {
    return [];
  }

  if (!timestamps && process.env.NODE_ENV === 'development') {
    console.warn(
      'calculateRollingVolatility: timestamps parameter is recommended for accurate chart X-axis values'
    );
  }

  const result: RollingVolatilityPoint[] = [];

  for (let i = windowSize; i < prices.length; i++) {
    const windowPrices = prices.slice(i - windowSize, i);
    const returns: number[] = [];

    for (let j = 1; j < windowPrices.length; j++) {
      if (windowPrices[j - 1] > 0 && windowPrices[j] > 0) {
        const logReturn = Math.log(windowPrices[j] / windowPrices[j - 1]);
        returns.push(logReturn);
      }
    }

    if (returns.length < 2) {
      result.push({
        timestamp: timestamps ? timestamps[i] : i,
        volatility: 0,
      });
      continue;
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    const annualizedVolatility =
      volatility * Math.sqrt((365 * 24 * 60) / dataIntervalMinutes) * 100;

    result.push({
      timestamp: timestamps ? timestamps[i] : i,
      volatility: isNaN(annualizedVolatility) ? 0 : annualizedVolatility,
    });
  }

  return result;
};

export const calculateVolatilityCone = (
  prices: number[],
  windowSizes: number[] = [10, 20, 30, 50, 100]
): VolatilityConePoint[] => {
  const result: VolatilityConePoint[] = [];

  windowSizes.forEach((windowSize) => {
    const rollingVols = calculateRollingVolatility(prices, windowSize);
    const volatilities = rollingVols.map((v) => v.volatility).filter((v) => v > 0);

    if (volatilities.length === 0) {
      result.push({
        windowSize,
        minVolatility: 0,
        maxVolatility: 0,
        meanVolatility: 0,
        medianVolatility: 0,
        p10: 0,
        p25: 0,
        p75: 0,
        p90: 0,
      });
      return;
    }

    const sorted = [...volatilities].sort((a, b) => a - b);
    const n = sorted.length;

    const minVolatility = sorted[0];
    const maxVolatility = sorted[n - 1];
    const meanVolatility = volatilities.reduce((a, b) => a + b, 0) / n;
    const medianVolatility =
      n % 2 === 1 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;

    const p10Index = Math.floor(n * 0.1);
    const p25Index = Math.floor(n * 0.25);
    const p75Index = Math.floor(n * 0.75);
    const p90Index = Math.floor(n * 0.9);

    result.push({
      windowSize,
      minVolatility,
      maxVolatility,
      meanVolatility,
      medianVolatility,
      p10: sorted[p10Index] || minVolatility,
      p25: sorted[p25Index] || minVolatility,
      p75: sorted[p75Index] || maxVolatility,
      p90: sorted[p90Index] || maxVolatility,
    });
  });

  return result;
};

export const calculateATR = (prices: number[], period: number = 14): number => {
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

  const atrValues: number[] = [];
  for (let i = period - 1; i < trueRanges.length; i++) {
    const slice = trueRanges.slice(i - period + 1, i + 1);
    const atr = slice.reduce((a, b) => a + b, 0) / period;
    atrValues.push(atr);
  }

  return atrValues.length > 0 ? atrValues[atrValues.length - 1] : 0;
};

export const calculateDynamicThreshold = (prices: number[], config: ThresholdConfig): number => {
  if (prices.length < 2) {
    return config.fixedThreshold;
  }

  switch (config.type) {
    case 'fixed':
      return config.fixedThreshold;

    case 'atr': {
      const atr = calculateATR(prices, config.volatilityWindow);
      const currentPrice = prices[prices.length - 1];
      if (currentPrice === 0) return config.fixedThreshold;
      const atrPercent = (atr / currentPrice) * 100;
      return atrPercent * config.atrMultiplier;
    }

    case 'dynamic': {
      const windowSize = Math.min(config.volatilityWindow, prices.length);
      const recentPrices = prices.slice(-windowSize);
      const mean = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
      const variance =
        recentPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) /
        recentPrices.length;
      const stdDev = Math.sqrt(variance);

      if (mean === 0) return config.fixedThreshold;

      const cv = (stdDev / mean) * 100;
      return Math.max(cv * config.atrMultiplier, config.fixedThreshold * 0.1);
    }

    default:
      return config.fixedThreshold;
  }
};

export const calculatePriceJumpStats = (changes: number[]) => {
  if (changes.length === 0) {
    return { mean: 0, stdDev: 0 };
  }

  const mean = changes.reduce((a, b) => a + b, 0) / changes.length;

  if (changes.length === 1) {
    return { mean, stdDev: 0 };
  }

  const variance =
    changes.reduce((sum, change) => sum + Math.pow(change - mean, 2), 0) / changes.length;
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev };
};

export const detectPriceJumps = (
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
    return changes.filter((change) => change > stdThreshold).length;
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
