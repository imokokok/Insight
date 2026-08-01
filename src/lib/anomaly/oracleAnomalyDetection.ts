/**
 * Unsupervised oracle anomaly detection — the model-free layer that catches
 * manipulation patterns the supervised ML model has NEVER seen.
 *
 * WHY THIS EXISTS: the XGBoost risk model (src/lib/ml) only learns from LABELED
 * history — it recognizes recurrence of *known* abnormal patterns. A novel
 * attack vector (new oracle bug, fresh manipulation mechanic) has no labels, so
 * the supervised model can't flag it. This layer is the complement: pure
 * statistical outlier detection on the recent oracle-deviation baseline, no
 * training data required. Supervised catches the known; this catches the
 * unknown-unknowns.
 *
 * Two signals, both compared against the last 24h of hourly snapshots, blended
 * by max (either firing raises the score):
 *  1. Z-SCORE: how many std-devs is the current cross-oracle max deviation above
 *     its 24h mean? A statistical outlier.
 *  2. EWMA RESIDUAL: how far above the exponentially-weighted moving average is
 *     the current value? A sudden spike even when the 24h mean is elevated.
 *
 * Output `anomalyScore` ∈ [0,1] is surfaced alongside `manipulationRiskScore`
 * (the ML score). The pre-trade verdict is driven by rules + ML; this layer is
 * informational + feeds the displayed risk level, so a novel spike is visible to
 * agents even when the supervised model is calm.
 *
 * Pure TypeScript, no deps, no training — runs in the app hot path cheaply.
 */

/** A completed hourly snapshot of cross-oracle state for one asset. */
export interface HourlyDeviationPoint {
  /** Max |deviation_pct| across providers at this hour. */
  maxDeviationPct: number;
  /** Median price across providers at this hour (the consensus). */
  consensusPrice: number;
  /** Number of successful providers at this hour. */
  participantCount: number;
}

export interface AnomalyScoreResult {
  /** Final anomaly score ∈ [0,1]. max of the z-score & EWMA components. */
  anomalyScore: number;
  /** Z-score of current deviation vs the 24h distribution (can be negative). */
  zScore: number;
  /** EWMA of max deviation over the history (the smoothed recent baseline). */
  ewma: number;
  /** Which signal drove the score. */
  driver: 'zscore' | 'ewma' | 'insufficient-data' | 'flat';
  /** Whether the score crossed the "elevated" display threshold (0.5). */
  elevated: boolean;
}

/** EWMA smoothing factor — lower = more weight on history, higher = reactive. */
const EWMA_ALPHA = 0.3;
/** A deviation must be this many std-devs above baseline to start registering. */
const SIGNAL_FLOOR = 1.5;

/**
 * Compute the unsupervised anomaly score from recent hourly history + the live
 * max deviation. Returns a low score (~0) when there is too little history or
 * the series is flat — matching the ML feature's fillna(0) semantics so a
 * cold-start asset doesn't false-alarm.
 *
 * @param history  Hourly points, OLDEST first. Only the last 24 are used.
 * @param currentMaxDeviationPct  Live max |deviation_pct| across providers now.
 */
export function computeAnomalyScore(
  history: HourlyDeviationPoint[],
  currentMaxDeviationPct: number
): AnomalyScoreResult {
  const series = history
    .slice(-24)
    .map((h) => Math.abs(h.maxDeviationPct))
    .filter((v) => Number.isFinite(v));

  // Cold start or flat history -> not anomalous (mirrors training's fillna(0)).
  if (series.length < 3) {
    return {
      anomalyScore: 0,
      zScore: 0,
      ewma: currentMaxDeviationPct,
      driver: 'insufficient-data',
      elevated: false,
    };
  }

  const current = Math.abs(currentMaxDeviationPct);
  const n = series.length;
  const mean = series.reduce((s, v) => s + v, 0) / n;
  const variance = series.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);

  // EWMA over the history (oldest -> newest), seed with the first point.
  let ewma = series[0];
  for (let i = 1; i < n; i++) ewma = EWMA_ALPHA * series[i] + (1 - EWMA_ALPHA) * ewma;

  // Flat baseline (std ~ 0): can't form a z-score, so fall back to the EWMA
  // gap ratio — a several-fold jump over the flat baseline is anomalous.
  if (std < 1e-9) {
    const gapRatio = ewma > 1e-9 ? current / ewma : 0;
    const score = sigmoid(gapRatio - 2); // anomalous when current >= 2x the flat baseline
    return {
      anomalyScore: round4(score),
      zScore: 0,
      ewma: round4(ewma),
      driver: 'flat',
      elevated: score >= 0.5,
    };
  }

  const zScore = (current - mean) / std;
  // EWMA residual normalized by std: a spike relative to the smoothed baseline.
  const ewmaResidualStd = (current - ewma) / std;

  // Each component -> [0,1] via sigmoid with a floor so small deviations stay ~0.
  const zComponent = sigmoid(zScore - SIGNAL_FLOOR);
  const ewmaComponent = sigmoid(ewmaResidualStd - SIGNAL_FLOOR);
  const anomalyScore = Math.max(zComponent, ewmaComponent);

  return {
    anomalyScore: round4(anomalyScore),
    zScore: round4(zScore),
    ewma: round4(ewma),
    driver: zComponent >= ewmaComponent ? 'zscore' : 'ewma',
    elevated: anomalyScore >= 0.5,
  };
}

function sigmoid(x: number): number {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

function round4(x: number): number {
  return Number(x.toFixed(4));
}
