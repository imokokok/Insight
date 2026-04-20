/**
 * @fileoverview Multi-oracle comparison - unified threshold configuration
 * @description Centralized management of all anomaly detection threshold configurations
 */

// ============================================================================
// Price deviation thresholds (percentage)
// ============================================================================

/** Price deviation thresholds for visualization and alerts */
export const DEVIATION_THRESHOLDS = {
  /** Normal threshold - below this is considered normal */
  NORMAL: 0.5,
  /** Warning threshold - between normal and danger */
  WARNING: 1.0,
  /** Danger threshold - above this is considered dangerous */
  DANGER: 3.0,
  /** Critical threshold - requires immediate attention */
  CRITICAL: 5.0,
} as const;

// ============================================================================
// Price anomaly detection thresholds
// ============================================================================

/** Price anomaly deviation threshold (1%) - values above this are considered anomalous */
export const ANOMALY_DEVIATION_THRESHOLD = DEVIATION_THRESHOLDS.WARNING;

/** Anomaly severity thresholds (percentage) */
export const SEVERITY_THRESHOLDS = {
  HIGH: DEVIATION_THRESHOLDS.DANGER,
  MEDIUM: DEVIATION_THRESHOLDS.WARNING,
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
