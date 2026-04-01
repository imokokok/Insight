import type { TechnicalIndicators } from './types';

export class SeededRandom {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  reset(seed: number): void {
    this.seed = seed;
  }
}

export const globalSeed = 12345;
export const seededRandom = new SeededRandom(globalSeed);
export const dataCache = new Map<string, unknown>();

export function calculateMovingAverage(prices: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(prices[i]);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((acc, p) => acc + p, 0);
      result.push(sum / period);
    }
  }
  return result;
}

export function calculateStandardDeviation(prices: number[]): {
  mean: number;
  stdDev: number;
  upper1: number;
  lower1: number;
  upper2: number;
  lower2: number;
} {
  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const squaredDiffs = prices.map((p) => Math.pow(p - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean,
    stdDev,
    upper1: mean + stdDev,
    lower1: mean - stdDev,
    upper2: mean + 2 * stdDev,
    lower2: mean - 2 * stdDev,
  };
}

export function calculateTechnicalIndicators(prices: number[]): TechnicalIndicators {
  const ma7 = calculateMovingAverage(prices, 7);
  const ma20 = calculateMovingAverage(prices, 20);

  const stdDevResult = calculateStandardDeviation(prices);

  return {
    ma7,
    ma20,
    stdDev1Upper: prices.map(() => stdDevResult.upper1),
    stdDev1Lower: prices.map(() => stdDevResult.lower1),
    stdDev2Upper: prices.map(() => stdDevResult.upper2),
    stdDev2Lower: prices.map(() => stdDevResult.lower2),
  };
}
