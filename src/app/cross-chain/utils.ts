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

export interface RollingCorrelationPoint {
  timestamp: number;
  correlation: number;
}

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

export const calculateRollingCorrelation = (
  pricesX: number[],
  pricesY: number[],
  windowSize: number
): RollingCorrelationPoint[] => {
  const n = Math.min(pricesX.length, pricesY.length);
  if (n < windowSize || windowSize < 2) {
    return [];
  }

  const result: RollingCorrelationPoint[] = [];

  for (let i = windowSize - 1; i < n; i++) {
    const xSlice = pricesX.slice(i - windowSize + 1, i + 1);
    const ySlice = pricesY.slice(i - windowSize + 1, i + 1);

    const xMean = xSlice.reduce((a, b) => a + b, 0) / windowSize;
    const yMean = ySlice.reduce((a, b) => a + b, 0) / windowSize;

    let numerator = 0;
    let xDenominator = 0;
    let yDenominator = 0;

    for (let j = 0; j < windowSize; j++) {
      const xDiff = xSlice[j] - xMean;
      const yDiff = ySlice[j] - yMean;
      numerator += xDiff * yDiff;
      xDenominator += xDiff * xDiff;
      yDenominator += yDiff * yDiff;
    }

    const denominator = Math.sqrt(xDenominator * yDenominator);
    const correlation = denominator === 0 ? 0 : numerator / denominator;

    result.push({
      timestamp: i,
      correlation: isNaN(correlation) ? 0 : correlation,
    });
  }

  return result;
};

/**
 * 计算滚动波动率
 * @param prices 价格数组
 * @param windowSize 窗口大小
 * @returns 滚动波动率时序数据
 */
export const calculateRollingVolatility = (
  prices: number[],
  windowSize: number
): RollingVolatilityPoint[] => {
  if (prices.length < windowSize || windowSize < 2) {
    return [];
  }

  const result: RollingVolatilityPoint[] = [];

  for (let i = windowSize; i < prices.length; i++) {
    const windowPrices = prices.slice(i - windowSize, i);
    const returns: number[] = [];

    // 计算对数收益率
    for (let j = 1; j < windowPrices.length; j++) {
      if (windowPrices[j - 1] > 0 && windowPrices[j] > 0) {
        const logReturn = Math.log(windowPrices[j] / windowPrices[j - 1]);
        returns.push(logReturn);
      }
    }

    if (returns.length < 2) {
      result.push({
        timestamp: i,
        volatility: 0,
      });
      continue;
    }

    // 计算收益率的标准差（波动率）
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    // 年化波动率 (假设数据是小时级的，年化因子为 sqrt(365 * 24))
    const annualizedVolatility = volatility * Math.sqrt(365 * 24) * 100;

    result.push({
      timestamp: i,
      volatility: isNaN(annualizedVolatility) ? 0 : annualizedVolatility,
    });
  }

  return result;
};

/**
 * 计算波动率锥
 * @param prices 价格数组
 * @param windowSizes 不同的时间窗口大小数组
 * @returns 波动率锥数据
 */
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

    // 计算百分位数
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
