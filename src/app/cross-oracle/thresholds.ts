/**
 * @fileoverview Multi-oracle comparison - unified threshold configuration
 * @description Centralized management of all anomaly detection threshold configurations
 */

// ============================================================================
// Price anomaly detection thresholds
// ============================================================================

/** Price anomaly deviation threshold (1%) - values above this are considered anomalous */
export const ANOMALY_DEVIATION_THRESHOLD = 1.0;

/** Anomaly severity thresholds (percentage) */
export const SEVERITY_THRESHOLDS = {
  HIGH: 3.0,
  MEDIUM: 1.0,
} as const;

export const DEVIATION_THRESHOLDS = {
  critical: 5,
  warning: 2,
  info: 1,
} as const;

// ============================================================================
// Data freshness thresholds (seconds)
// ============================================================================

/** Data freshness thresholds (seconds) */
export const FRESHNESS_THRESHOLDS = {
  FRESH: 30,
  NORMAL: 60,
  DELAYED: 120,
  SEVERELY_DELAYED: 300,
} as const;

// ============================================================================
// Confidence thresholds
// ============================================================================

/** Confidence thresholds */
export const CONFIDENCE_THRESHOLDS = {
  /** Low confidence: < 0.5 */
  LOW: 0.5,
  /** Medium confidence: 0.5 <= confidence < 0.8 */
  MEDIUM: 0.8,
} as const;
