import { chainNames, chainColors } from '@/lib/constants';

export { chainNames, chainColors };
export {
  getHeatmapColor,
  getConsistencyRating,
  getStabilityRating,
  getIntegrityColor,
  formatPrice,
} from './colorUtils';

export {
  calculateZScore,
  calculateChangePercent,
  calculateStandardDeviation,
  calculateVariance,
  calculatePercentile,
  calculateSMA,
  getTCriticalValue,
} from './statisticsUtils';

export { isOutlier, detectOutliersIQR, detectOutliersZScore } from './outlierUtils';

export {
  calculatePearsonCorrelationByTimestamp,
  calculatePearsonCorrelationWithSignificanceByTimestamp,
  type TimestampedPrice,
  type CorrelationResult,
} from './correlationUtils';

export {
  calculateDynamicThreshold,
  detectPriceJumps,
  defaultThresholdConfig,
  type ThresholdConfig,
  type ThresholdType,
} from './volatilityUtils';

export { getTimestampCutoff, getTimeRangeInMs } from './timeUtils';

export {
  validateCurrentPrices,
  validateChainSupport,
  validatePriceConsistency,
} from './validation';

export {
  detectAnomalousPrices,
  detectAnomalies,
  type AnomalousPricePoint,
} from './anomalyDetection';
