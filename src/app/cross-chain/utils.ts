import { Blockchain } from '@/lib/oracles';
import { chainNames, chainColors } from './constants';

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
  const normalized = Math.min(percent / Math.max(maxPercent, 0.1), 1);

  if (normalized < 0.33) {
    const t = normalized / 0.33;
    const r = Math.floor(76 + (251 - 76) * t);
    const g = Math.floor(191 + (191 - 191) * t);
    const b = Math.floor(109 + (45 - 109) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else if (normalized < 0.66) {
    const t = (normalized - 0.33) / 0.33;
    const r = Math.floor(251 + (245 - 251) * t);
    const g = Math.floor(191 + (158 - 191) * t);
    const b = Math.floor(45 + (11 - 45) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const t = (normalized - 0.66) / 0.34;
    const r = Math.floor(245 + (239 - 245) * t);
    const g = Math.floor(158 + (68 - 158) * t);
    const b = Math.floor(11 + (68 - 11) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
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
  if (data.length < period) return data.map(() => null);
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
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
  return price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
};

export const formatPriceValue = (price: number): string => {
  return price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
};

export const generateFilename = (symbol: string, extension: string): string => {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
  return `cross-chain-${symbol}-${timestamp}.${extension}`;
};

export { chainNames, chainColors };
export type { Blockchain };
