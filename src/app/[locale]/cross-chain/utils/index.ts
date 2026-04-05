import { chainNames, chainColors } from '@/lib/constants';
import { type Blockchain } from '@/lib/oracles';

export { chainNames, chainColors };
export type { Blockchain };

export {
  getDiffColorGradient,
  getDiffTextColor,
  getDiffColorGradientWithStyle,
  getHeatmapColor,
  getCorrelationColor,
  getConsistencyRating,
  getStabilityRating,
  getIntegrityColor,
  getJumpColor,
  getVolatilityColor,
  getDataFreshness,
  formatPrice,
  formatPriceValue,
  generateFilename,
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
