import { semanticColors } from '@/lib/config/colors';
import { getHeatmapColor as getHeatmapColorUtil } from '@/lib/utils/chartSharedUtils';
import { formatPrice as formatPriceUtil } from '@/lib/utils/format';

const getDiffTextColor = (diffPercent: number): string => {
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

export const getHeatmapColor = (percent: number, maxPercent: number): string => {
  return getHeatmapColorUtil(percent, 0, maxPercent);
};

const getCorrelationColor = (correlation: number): string => {
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
  if (volatility < 1) return 'stable';
  if (volatility < 3) return 'moderate';
  return 'unstable';
};

export const getIntegrityColor = (value: number): string => {
  if (value >= 95) return semanticColors.success.DEFAULT;
  if (value >= 90) return semanticColors.warning.DEFAULT;
  return semanticColors.danger.DEFAULT;
};

const getVolatilityColor = (value: number): string => {
  if (value < 1) return semanticColors.success.DEFAULT;
  if (value <= 3) return semanticColors.warning.DEFAULT;
  return semanticColors.danger.DEFAULT;
};

export const formatPrice = (price: number, _decimals?: number): string => {
  return formatPriceUtil(price);
};
