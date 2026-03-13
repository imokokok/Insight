// Cointegration Analysis Module
// Implements Engle-Granger two-step cointegration test

import { Blockchain } from '@/lib/oracles';

export interface CointegrationResult {
  isCointegrated: boolean;
  hedgeRatio: number;
  spread: number[];
  spreadMean: number;
  spreadStd: number;
  halfLife: number;
  adfStatistic: number;
  criticalValue: number;
  pValue: number;
  correlation: number;
}

// Calculate Ordinary Least Squares (OLS) regression
// y = alpha + beta * x
const calculateOLS = (
  y: number[],
  x: number[]
): { alpha: number; beta: number; residuals: number[] } => {
  const n = Math.min(y.length, x.length);
  if (n < 2) {
    return { alpha: 0, beta: 0, residuals: [] };
  }

  const ySlice = y.slice(0, n);
  const xSlice = x.slice(0, n);

  const yMean = ySlice.reduce((a, b) => a + b, 0) / n;
  const xMean = xSlice.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = xSlice[i] - xMean;
    numerator += xDiff * (ySlice[i] - yMean);
    denominator += xDiff * xDiff;
  }

  const beta = denominator !== 0 ? numerator / denominator : 0;
  const alpha = yMean - beta * xMean;

  const residuals = ySlice.map((yi, i) => yi - (alpha + beta * xSlice[i]));

  return { alpha, beta, residuals };
};

// Augmented Dickey-Fuller (ADF) test for stationarity
// Simplified implementation - returns approximate test statistic
const adfTest = (series: number[], lag: number = 1): { statistic: number; pValue: number } => {
  const n = series.length;
  if (n < lag + 2) {
    return { statistic: 0, pValue: 1 };
  }

  // Calculate first differences
  const dy: number[] = [];
  const yLagged: number[] = [];

  for (let i = lag; i < n; i++) {
    dy.push(series[i] - series[i - 1]);
    yLagged.push(series[i - 1]);
  }

  // OLS regression: dy = alpha + beta * y_lagged + error
  const { beta, residuals } = calculateOLS(dy, yLagged);

  // Calculate standard error of beta
  const mse = residuals.reduce((sum, r) => sum + r * r, 0) / (residuals.length - 2);
  const xVariance = yLagged.reduce((sum, y) => sum + y * y, 0) / yLagged.length;
  const seBeta = Math.sqrt(mse / (xVariance * yLagged.length));

  // ADF statistic = beta / SE(beta)
  const statistic = seBeta !== 0 ? beta / seBeta : 0;

  // Approximate p-value (simplified)
  // Critical values for ADF test at 5% level is approximately -2.86
  const criticalValue = -2.86;
  const pValue = statistic < criticalValue ? 0.05 : 0.5;

  return { statistic, pValue };
};

// Calculate half-life of mean reversion
// Based on Ornstein-Uhlenbeck process
const calculateHalfLife = (spread: number[]): number => {
  if (spread.length < 2) return Infinity;

  // Calculate spread differences
  const spreadDiff: number[] = [];
  const spreadLagged: number[] = [];

  for (let i = 1; i < spread.length; i++) {
    spreadDiff.push(spread[i] - spread[i - 1]);
    spreadLagged.push(spread[i - 1]);
  }

  // Regression: dS = alpha + beta * S_lagged
  const { beta } = calculateOLS(spreadDiff, spreadLagged);

  // Half-life = -ln(2) / beta
  if (beta >= 0 || beta === 0) return Infinity;

  return -Math.log(2) / beta;
};

// Engle-Granger two-step cointegration test
export const engleGrangerTest = (pricesX: number[], pricesY: number[]): CointegrationResult => {
  const n = Math.min(pricesX.length, pricesY.length);

  if (n < 30) {
    return {
      isCointegrated: false,
      hedgeRatio: 0,
      spread: [],
      spreadMean: 0,
      spreadStd: 0,
      halfLife: Infinity,
      adfStatistic: 0,
      criticalValue: -2.86,
      pValue: 1,
      correlation: 0,
    };
  }

  const x = pricesX.slice(0, n);
  const y = pricesY.slice(0, n);

  // Step 1: OLS regression to find hedge ratio
  const { beta: hedgeRatio, residuals: spread } = calculateOLS(y, x);

  // Calculate spread statistics
  const spreadMean = spread.reduce((a, b) => a + b, 0) / spread.length;
  const spreadVariance =
    spread.reduce((sum, s) => sum + Math.pow(s - spreadMean, 2), 0) / spread.length;
  const spreadStd = Math.sqrt(spreadVariance);

  // Step 2: ADF test on residuals (spread)
  const { statistic: adfStatistic, pValue } = adfTest(spread);

  // Calculate half-life
  const halfLife = calculateHalfLife(spread);

  // Calculate correlation
  const xMean = x.reduce((a, b) => a + b, 0) / n;
  const yMean = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    numerator += xDiff * yDiff;
    xDenominator += xDiff * xDiff;
    yDenominator += yDiff * yDiff;
  }

  const correlation =
    xDenominator !== 0 && yDenominator !== 0
      ? numerator / Math.sqrt(xDenominator * yDenominator)
      : 0;

  // Determine cointegration
  // Using 5% critical value of -2.86
  const criticalValue = -2.86;
  const isCointegrated = adfStatistic < criticalValue && halfLife > 0 && halfLife < 100;

  return {
    isCointegrated,
    hedgeRatio,
    spread,
    spreadMean,
    spreadStd,
    halfLife,
    adfStatistic,
    criticalValue,
    pValue,
    correlation,
  };
};

// Calculate z-score of current spread
export const calculateSpreadZScore = (
  currentSpread: number,
  spreadMean: number,
  spreadStd: number
): number => {
  if (spreadStd === 0) return 0;
  return (currentSpread - spreadMean) / spreadStd;
};

// Generate trading signal based on z-score
export const generateTradingSignal = (zScore: number): 'long' | 'short' | 'neutral' => {
  if (zScore < -2) return 'long'; // Spread is too low, expect mean reversion
  if (zScore > 2) return 'short'; // Spread is too high, expect mean reversion
  return 'neutral';
};

// Calculate residuals from OLS regression
// residuals = y - hedgeRatio * x (assuming alpha = 0 for spread)
export const calculateResiduals = (
  pricesX: number[],
  pricesY: number[],
  hedgeRatio: number
): number[] => {
  const n = Math.min(pricesX.length, pricesY.length);
  if (n === 0) return [];

  const residuals: number[] = [];
  for (let i = 0; i < n; i++) {
    // Residual = Y - beta * X (spread calculation)
    residuals.push(pricesY[i] - hedgeRatio * pricesX[i]);
  }
  return residuals;
};

// Calculate Autocorrelation Function (ACF)
export const calculateACF = (
  residuals: number[],
  maxLag: number
): Array<{ lag: number; autocorrelation: number }> => {
  const n = residuals.length;
  if (n === 0 || maxLag <= 0) return [];

  const mean = residuals.reduce((a, b) => a + b, 0) / n;
  const centered = residuals.map((r) => r - mean);

  // Calculate variance (lag 0 autocorrelation)
  const variance = centered.reduce((sum, r) => sum + r * r, 0) / n;

  if (variance === 0) {
    return Array.from({ length: Math.min(maxLag, n - 1) }, (_, i) => ({
      lag: i + 1,
      autocorrelation: 0,
    }));
  }

  const acf: Array<{ lag: number; autocorrelation: number }> = [];

  for (let lag = 1; lag <= maxLag && lag < n; lag++) {
    let numerator = 0;
    for (let t = lag; t < n; t++) {
      numerator += centered[t] * centered[t - lag];
    }
    const autocorrelation = numerator / (n * variance);
    acf.push({ lag, autocorrelation });
  }

  return acf;
};

// Calculate Ljung-Box test statistic
// H0: residuals are independently distributed (no autocorrelation)
export const calculateLjungBox = (
  residuals: number[],
  maxLag: number
): { statistic: number; pValue: number; criticalValue: number } => {
  const n = residuals.length;
  if (n === 0 || maxLag <= 0) {
    return { statistic: 0, pValue: 1, criticalValue: 0 };
  }

  const acf = calculateACF(residuals, maxLag);
  let statistic = 0;

  for (let k = 0; k < acf.length; k++) {
    const rho = acf[k].autocorrelation;
    statistic += (rho * rho) / (n - k - 1);
  }

  statistic = n * (n + 2) * statistic;

  // Critical value for chi-square distribution with maxLag degrees of freedom at 5% level
  // Approximation: critical value ≈ maxLag + 1.645 * sqrt(2 * maxLag)
  const criticalValue = maxLag + 1.645 * Math.sqrt(2 * maxLag);

  // Approximate p-value
  const pValue = statistic > criticalValue ? 0.05 : 0.5;

  return { statistic, pValue, criticalValue };
};

// Calculate histogram data for residuals
export const calculateResidualHistogram = (
  residuals: number[],
  binCount: number = 20
): Array<{ bin: string; count: number; density: number; normalDensity: number }> => {
  const n = residuals.length;
  if (n === 0 || binCount <= 0) return [];

  const min = Math.min(...residuals);
  const max = Math.max(...residuals);
  const binWidth = (max - min) / binCount || 1;

  const mean = residuals.reduce((a, b) => a + b, 0) / n;
  const variance = residuals.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / n;
  const std = Math.sqrt(variance);

  // Normal distribution PDF
  const normalPDF = (x: number): number => {
    if (std === 0) return 0;
    const z = (x - mean) / std;
    return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
  };

  const bins: Array<{ bin: string; count: number; density: number; normalDensity: number }> = [];

  for (let i = 0; i < binCount; i++) {
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    const binCenter = (binStart + binEnd) / 2;

    const count = residuals.filter(
      (r) => r >= binStart && (i === binCount - 1 ? r <= binEnd : r < binEnd)
    ).length;

    // Empirical density (normalized to form a PDF)
    const density = count / (n * binWidth);

    // Theoretical normal density at bin center
    const normalDensity = normalPDF(binCenter);

    bins.push({
      bin: `${binCenter.toFixed(2)}`,
      count,
      density,
      normalDensity,
    });
  }

  return bins;
};

// Interface for cointegration pair analysis
export interface CointegrationPair {
  chainX: Blockchain;
  chainY: Blockchain;
  result: CointegrationResult;
  currentZScore: number;
  signal: 'long' | 'short' | 'neutral';
}

// Analyze all pairs for cointegration
export const analyzeCointegrationPairs = (
  historicalPrices: Partial<Record<Blockchain, number[]>>,
  filteredChains: Blockchain[]
): CointegrationPair[] => {
  const pairs: CointegrationPair[] = [];

  for (let i = 0; i < filteredChains.length; i++) {
    for (let j = i + 1; j < filteredChains.length; j++) {
      const chainX = filteredChains[i];
      const chainY = filteredChains[j];

      const pricesX = historicalPrices[chainX] || [];
      const pricesY = historicalPrices[chainY] || [];

      if (pricesX.length < 30 || pricesY.length < 30) continue;

      const result = engleGrangerTest(pricesX, pricesY);

      if (result.isCointegrated) {
        const currentSpread = result.spread[result.spread.length - 1];
        const zScore = calculateSpreadZScore(currentSpread, result.spreadMean, result.spreadStd);

        pairs.push({
          chainX,
          chainY,
          result,
          currentZScore: zScore,
          signal: generateTradingSignal(zScore),
        });
      }
    }
  }

  // Sort by half-life (prefer faster mean reversion)
  return pairs.sort((a, b) => a.result.halfLife - b.result.halfLife);
};
