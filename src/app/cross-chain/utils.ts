import { Blockchain } from '@/lib/oracles';
import { chainNames, chainColors } from '@/lib/constants';
import {
  getHeatmapColor as getHeatmapColorUtil,
  calculateStandardDeviation as calculateStdDev,
  calculateMovingAverage,
  formatPrice as formatPriceUtil,
} from '@/lib/utils/chartSharedUtils';

export { chainNames, chainColors };
export type { Blockchain };

export const getDiffColorGradient = (diffPercent: number): string => {
  const absPercent = Math.abs(diffPercent);
  if (absPercent <= 0.5) {
    return 'bg-gray-50';
  }
  if (diffPercent > 0.5) {
    if (diffPercent > 2) return 'bg-red-200';
    if (diffPercent > 1) return 'bg-red-100';
    return 'bg-red-50';
  } else {
    if (diffPercent < -2) return 'bg-green-200';
    if (diffPercent < -1) return 'bg-green-100';
    return 'bg-green-50';
  }
};

export const getDiffTextColor = (diffPercent: number): string => {
  if (Math.abs(diffPercent) <= 0.5) {
    return 'text-gray-600';
  }
  if (diffPercent > 0.5) {
    if (diffPercent > 2) return 'text-red-700';
    if (diffPercent > 1) return 'text-red-600';
    return 'text-red-500';
  } else {
    if (diffPercent < -2) return 'text-green-700';
    if (diffPercent < -1) return 'text-green-600';
    return 'text-green-500';
  }
};

export const getDiffColorGradientWithStyle = (
  diffPercent: number
): { bg: string; text: string } => {
  if (diffPercent > 0.5) {
    const intensity = Math.min((diffPercent - 0.5) / 2, 1);
    const r = Math.floor(254 + (239 - 254) * intensity);
    const g = Math.floor(226 + (68 - 226) * intensity);
    const b = Math.floor(226 + (68 - 226) * intensity);
    return {
      bg: `rgba(${r}, ${g}, ${b}, 0.15)`,
      text: intensity > 0.5 ? '#dc2626' : '#ef4444',
    };
  } else if (diffPercent < -0.5) {
    const intensity = Math.min((-diffPercent - 0.5) / 2, 1);
    const r = Math.floor(226 + (68 - 226) * intensity);
    const g = Math.floor(254 + (239 - 254) * intensity);
    const b = Math.floor(226 + (68 - 226) * intensity);
    return {
      bg: `rgba(${r}, ${g}, ${b}, 0.15)`,
      text: intensity > 0.5 ? '#059669' : '#10B981',
    };
  }
  return { bg: 'transparent', text: '#6b7280' };
};

export const getHeatmapColor = (percent: number, maxPercent: number): string => {
  return getHeatmapColorUtil(percent, 0, maxPercent);
};

export const getCorrelationColor = (correlation: number): string => {
  const clampedCorrelation = Math.max(-1, Math.min(1, correlation));

  if (clampedCorrelation >= 0) {
    const t = clampedCorrelation;
    const r = Math.floor(255 - (255 - 30) * t);
    const g = Math.floor(255 - (255 - 64) * t);
    const b = Math.floor(255 - (255 - 175) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const t = Math.abs(clampedCorrelation);
    const r = Math.floor(255 - (255 - 220) * t);
    const g = Math.floor(255 - (255 - 38) * t);
    const b = Math.floor(255 - (255 - 38) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
};

export const getConsistencyRating = (stdDevPercent: number): string => {
  if (stdDevPercent < 0.1) return 'excellent';
  if (stdDevPercent < 0.3) return 'good';
  if (stdDevPercent < 0.5) return 'fair';
  return 'poor';
};

export const getStabilityRating = (volatility: number): string => {
  if (volatility < 0.1) return 'stable';
  if (volatility < 0.3) return 'moderate';
  return 'unstable';
};

export const calculateZScore = (price: number, mean: number, stdDev: number): number | null => {
  if (stdDev === 0) return null;
  return (price - mean) / stdDev;
};

export const isOutlier = (zScore: number | null): boolean => {
  if (zScore === null) return false;
  return Math.abs(zScore) > 2;
};

export const calculateChangePercent = (current: number, previous: number): number | null => {
  if (previous === 0 || current === 0) return null;
  return ((current - previous) / previous) * 100;
};

export const calculateStandardDeviation = (variance: number): number => {
  return Math.sqrt(variance);
};

export const calculateStandardDeviationFromValues = (prices: number[]): number => {
  return calculateStdDev(prices);
};

export const calculateVariance = (prices: number[], mean: number): number => {
  if (prices.length < 2) return 0;
  const sumSquaredDiff = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0);
  return sumSquaredDiff / prices.length;
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

export const calculatePearsonCorrelation = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const xMean = xSlice.reduce((a, b) => a + b, 0) / n;
  const yMean = ySlice.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = xSlice[i] - xMean;
    const yDiff = ySlice[i] - yMean;
    numerator += xDiff * yDiff;
    xDenominator += xDiff * xDiff;
    yDenominator += yDiff * yDiff;
  }

  const denominator = Math.sqrt(xDenominator * yDenominator);
  if (denominator === 0) return 0;

  return numerator / denominator;
};

export interface CorrelationResult {
  correlation: number;
  pValue: number;
  sampleSize: number;
  isSignificant: boolean;
  significanceLevel: '***' | '**' | '*' | '';
}

export const calculatePearsonCorrelationWithSignificance = (
  x: number[],
  y: number[]
): CorrelationResult => {
  const n = Math.min(x.length, y.length);
  if (n < 3) {
    return {
      correlation: 0,
      pValue: 1,
      sampleSize: n,
      isSignificant: false,
      significanceLevel: '',
    };
  }

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const xMean = xSlice.reduce((a, b) => a + b, 0) / n;
  const yMean = ySlice.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = xSlice[i] - xMean;
    const yDiff = ySlice[i] - yMean;
    numerator += xDiff * yDiff;
    xDenominator += xDiff * xDiff;
    yDenominator += yDiff * yDiff;
  }

  const denominator = Math.sqrt(xDenominator * yDenominator);
  if (denominator === 0) {
    return {
      correlation: 0,
      pValue: 1,
      sampleSize: n,
      isSignificant: false,
      significanceLevel: '',
    };
  }

  const correlation = numerator / denominator;

  // Calculate t-statistic: t = r * sqrt((n-2)/(1-r^2))
  const tStatistic = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));

  // Approximate p-value using t-distribution with n-2 degrees of freedom
  // Using a simplified approximation for the t-distribution CDF
  const df = n - 2;
  const pValue = approximatePValue(Math.abs(tStatistic), df);

  // Determine significance level
  let significanceLevel: '***' | '**' | '*' | '' = '';
  if (pValue < 0.001) {
    significanceLevel = '***';
  } else if (pValue < 0.01) {
    significanceLevel = '**';
  } else if (pValue < 0.05) {
    significanceLevel = '*';
  }

  return {
    correlation,
    pValue,
    sampleSize: n,
    isSignificant: pValue < 0.05,
    significanceLevel,
  };
};

// Approximate the p-value from t-statistic using a simplified t-distribution CDF
// This is a reasonable approximation for df > 10
const approximatePValue = (t: number, df: number): number => {
  if (df <= 0) return 1;

  // Use a simplified approximation based on the normal distribution for large df
  // For small df, use a rough approximation
  if (df > 30) {
    // Normal approximation for large degrees of freedom
    // Two-tailed test: p = 2 * (1 - CDF(|t|))
    const z = t;
    const p = 2 * (1 - normalCDF(z));
    return Math.min(p, 1);
  }

  // For smaller df, use a rough approximation
  // This is not exact but provides a reasonable estimate for significance testing
  const adjustedT = t * Math.sqrt(df / (df - 2));
  const p = 2 * (1 - normalCDF(adjustedT));
  return Math.min(Math.max(p, 0), 1);
};

// Standard normal CDF approximation using error function
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

export const getIntegrityColor = (value: number): string => {
  if (value >= 95) return '#10B981';
  if (value >= 90) return '#F59E0B';
  return '#EF4444';
};

export const getJumpColor = (count: number): string => {
  if (count < 3) return '#10B981';
  if (count <= 5) return '#F59E0B';
  return '#EF4444';
};

export const getVolatilityColor = (value: number): string => {
  if (value < 0.1) return '#10B981';
  if (value <= 0.3) return '#F59E0B';
  return '#EF4444';
};

export const getDataFreshness = (
  delay: { avgDelay: number; maxDelay: number } | undefined
): { status: string; color: string } => {
  if (!delay) return { status: 'unknown', color: 'text-gray-400' };
  if (delay.avgDelay < 5) return { status: 'excellent', color: 'text-green-600' };
  if (delay.avgDelay < 15) return { status: 'good', color: 'text-yellow-600' };
  return { status: 'slow', color: 'text-red-600' };
};

export const formatPrice = (price: number, decimals = 4): string => {
  return formatPriceUtil(price, decimals);
};

export const formatPriceValue = (price: number): string => {
  return formatPriceUtil(price, 4);
};

export const generateFilename = (symbol: string, extension: string): string => {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
  return `cross-chain-${symbol}-${timestamp}.${extension}`;
};

// Dynamic Threshold Types
export type ThresholdType = 'fixed' | 'dynamic' | 'atr';

export interface ThresholdConfig {
  type: ThresholdType;
  fixedThreshold: number;
  atrMultiplier: number;
  volatilityWindow: number;
}

// Calculate Average True Range (ATR) for dynamic threshold
export const calculateATR = (prices: number[], period: number = 14): number => {
  if (prices.length < period + 1) {
    // Not enough data, return simple standard deviation as fallback
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance =
      prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    return Math.sqrt(variance);
  }

  const trueRanges: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const currentPrice = prices[i];
    const previousPrice = prices[i - 1];

    // True Range = max(|current - previous|, |current - previous_high|, |current - previous_low|)
    // Simplified version using just price changes
    const priceChange = Math.abs(currentPrice - previousPrice);
    trueRanges.push(priceChange);
  }

  // Calculate Simple Moving Average of True Ranges
  const atrValues: number[] = [];
  for (let i = period - 1; i < trueRanges.length; i++) {
    const slice = trueRanges.slice(i - period + 1, i + 1);
    const atr = slice.reduce((a, b) => a + b, 0) / period;
    atrValues.push(atr);
  }

  // Return the most recent ATR
  return atrValues.length > 0 ? atrValues[atrValues.length - 1] : 0;
};

// Calculate dynamic threshold based on historical volatility
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
      // Convert ATR to percentage
      const atrPercent = (atr / currentPrice) * 100;
      return atrPercent * config.atrMultiplier;
    }

    case 'dynamic': {
      // Calculate rolling standard deviation
      const windowSize = Math.min(config.volatilityWindow, prices.length);
      const recentPrices = prices.slice(-windowSize);
      const mean = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
      const variance =
        recentPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) /
        recentPrices.length;
      const stdDev = Math.sqrt(variance);

      if (mean === 0) return config.fixedThreshold;

      // Use coefficient of variation (CV) as dynamic threshold base
      const cv = (stdDev / mean) * 100;
      return Math.max(cv * config.atrMultiplier, config.fixedThreshold * 0.1);
    }

    default:
      return config.fixedThreshold;
  }
};

// Default threshold configuration
export const defaultThresholdConfig: ThresholdConfig = {
  type: 'fixed',
  fixedThreshold: 0.5, // 0.5%
  atrMultiplier: 2.0,
  volatilityWindow: 14,
};
