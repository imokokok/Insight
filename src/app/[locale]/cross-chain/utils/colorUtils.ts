import { baseColors, semanticColors } from '@/lib/config/colors';
import {
  getHeatmapColor as getHeatmapColorUtil,
  formatPrice as formatPriceUtil,
} from '@/lib/utils/chartSharedUtils';

export const getDiffColorGradient = (diffPercent: number): string => {
  const absPercent = Math.abs(diffPercent);
  if (absPercent <= 0.5) {
    return 'bg-gray-50';
  }
  if (diffPercent > 0.5) {
    if (diffPercent > 2) return 'bg-danger-100';
    if (diffPercent > 1) return 'bg-danger-50';
    return 'bg-danger-50';
  } else {
    if (diffPercent < -2) return 'bg-success-100';
    if (diffPercent < -1) return 'bg-success-50';
    return 'bg-success-50';
  }
};

export const getDiffTextColor = (diffPercent: number): string => {
  if (Math.abs(diffPercent) <= 0.5) {
    return 'text-gray-600';
  }
  if (diffPercent > 0.5) {
    if (diffPercent > 2) return 'text-danger-800';
    if (diffPercent > 1) return 'text-danger-700';
    return 'text-danger-600';
  } else {
    if (diffPercent < -2) return 'text-green-800';
    if (diffPercent < -1) return 'text-success-700';
    return 'text-success-600';
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
      text: intensity > 0.5 ? semanticColors.danger.dark : semanticColors.danger.DEFAULT,
    };
  } else if (diffPercent < -0.5) {
    const intensity = Math.min((-diffPercent - 0.5) / 2, 1);
    const r = Math.floor(226 + (68 - 226) * intensity);
    const g = Math.floor(254 + (239 - 254) * intensity);
    const b = Math.floor(226 + (68 - 226) * intensity);
    return {
      bg: `rgba(${r}, ${g}, ${b}, 0.15)`,
      text: intensity > 0.5 ? semanticColors.success.dark : semanticColors.success.DEFAULT,
    };
  }
  return { bg: 'transparent', text: baseColors.gray[500] };
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

export const getIntegrityColor = (value: number): string => {
  if (value >= 95) return semanticColors.success.DEFAULT;
  if (value >= 90) return semanticColors.warning.DEFAULT;
  return semanticColors.danger.DEFAULT;
};

export const getJumpColor = (count: number): string => {
  if (count < 3) return semanticColors.success.DEFAULT;
  if (count <= 5) return semanticColors.warning.DEFAULT;
  return semanticColors.danger.DEFAULT;
};

export const getVolatilityColor = (value: number): string => {
  if (value < 0.1) return semanticColors.success.DEFAULT;
  if (value <= 0.3) return semanticColors.warning.DEFAULT;
  return semanticColors.danger.DEFAULT;
};

export const getDataFreshness = (
  delay: { avgDelay: number; maxDelay: number } | undefined
): { status: string; color: string } => {
  if (!delay) return { status: 'unknown', color: 'text-gray-400' };
  if (delay.avgDelay < 5) return { status: 'excellent', color: 'text-success-700' };
  if (delay.avgDelay < 15) return { status: 'good', color: 'text-warning-700' };
  return { status: 'slow', color: 'text-danger-700' };
};

export const formatPrice = (price: number, _decimals?: number): string => {
  return formatPriceUtil(price);
};

export const formatPriceValue = (price: number): string => {
  return formatPriceUtil(price);
};

export const generateFilename = (symbol: string, extension: string): string => {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
  return `cross-chain-${symbol}-${timestamp}.${extension}`;
};
