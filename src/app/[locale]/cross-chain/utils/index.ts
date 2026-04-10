import { chainNames, chainColors } from '@/lib/constants';
import { type Blockchain } from '@/lib/oracles';

export { chainNames, chainColors };
export type { Blockchain };

export {
  getDiffTextColor,
  getHeatmapColor,
  getCorrelationColor,
  getConsistencyRating,
  getStabilityRating,
  getIntegrityColor,
  getVolatilityColor,
  formatPrice,
} from './colorUtils';

export {
  calculateZScore,
  calculateChangePercent,
  calculateStandardDeviation,
  calculateStandardDeviationFromValues,
  calculateVariance,
  calculatePercentile,
  calculateSMA,
  getTCriticalValue,
  T_CRITICAL_TABLE_95,
  normalCDF,
  approximatePValue,
} from './statisticsUtils';

export { isOutlier, isOutlierIQR, detectOutliersIQR, detectOutliersZScore } from './outlierUtils';

export {
  calculatePearsonCorrelation,
  calculatePearsonCorrelationByTimestamp,
  calculatePearsonCorrelationWithSignificance,
  calculatePearsonCorrelationWithSignificanceByTimestamp,
  calculateRollingCorrelation,
  type TimestampedPrice,
  type CorrelationResult,
  type RollingCorrelationPoint,
} from './correlationUtils';

export {
  calculateRollingVolatility,
  calculateVolatilityCone,
  calculateATR,
  calculateDynamicThreshold,
  calculatePriceJumpStats,
  detectPriceJumps,
  defaultThresholdConfig,
  type ThresholdConfig,
  type ThresholdType,
  type OutlierDetectionMethod,
  type RollingVolatilityPoint,
  type VolatilityConePoint,
} from './volatilityUtils';

export { validatePriceData, type ValidationResult } from './validation';

export { detectAnomalousPrices, type AnomalousPricePoint } from './anomalyDetection';

export {
  formatPercent,
  formatPriceDiff,
  formatHeatmapCell,
  formatLegendValue,
  getPrecisionLevel,
} from './formatUtils';

export {
  heatmapColorSchemes,
  getProfessionalHeatmapColor,
  getSmoothHeatmapColor,
  getContrastColor,
  getHeatmapCellStyle,
  getLegendGradient,
} from './heatmapColors';
