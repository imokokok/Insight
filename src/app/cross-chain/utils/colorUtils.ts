import { semanticColors } from '@/lib/config/colors';
import { getHeatmapColor as getHeatmapColorUtil } from '@/lib/utils/chartSharedUtils';
import { formatPrice as formatPriceUtil } from '@/lib/utils/format';

export const getHeatmapColor = (percent: number, maxPercent: number): string => {
  return getHeatmapColorUtil(percent, 0, maxPercent);
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

// Re-export formatPrice from core utils
export const formatPrice = formatPriceUtil;
