/**
 * Pure-TypeScript ML inference for the oracle-risk model.
 *
 * Loads the XGBoost model(s) exported by ml/train.py (JSON of flattened trees)
 * and scores a feature vector with NO Python runtime and NO native deps in the
 * app. The model is baked in at build time (static JSON import) and refreshes
 * on each deploy after the training cron commits a new one.
 *
 * MODEL VERSIONS:
 *  - v1 (legacy): a single 6h model — { trees, featureNames, baseScore, ... } at
 *    the top level. Read as one "6h" horizon.
 *  - v2 (current): dual-horizon — { horizons: { "1h": Horizon|null, "6h":
 *    Horizon } }. The 1h model is a near-term alarm; the 6h model is the
 *    strategic horizon. If 1h is null (too few positives to train), only 6h is
 *    scored. The combined score is max(1h, 6h) so EITHER horizon flagging risk
 *    raises manipulationRiskScore (errs toward caution — correct for a safety
 *    system).
 *
 * NAME-BASED FEATURE MAPPING: a horizon's `featureNames` tells the scorer which
 * feature goes in which slot. A v1 model (7 features) and a v2 model (11) both
 * score correctly from the same PreTradeFeatures map — missing names default to
 * 0. This is what lets train.py add features without breaking deployed models.
 *
 * Self-verifying: on first load, the scorer reproduces each horizon's
 * `verificationSamples` (XGBoost's own predict_proba). If the TS tree-walker
 * disagrees beyond tolerance — e.g. due to an XGBoost version quirk — that
 * horizon is disabled; if ALL horizons fail, inference returns null so the
 * pre-trade check falls back to rules-only rather than emitting wrong scores.
 *
 * Prediction math: base_score = 0.5 (set by the trainer) => logit bias = 0, so
 *   proba = sigmoid(Σ leaf_weight). A sample goes left ("yes") when
 *   feature[split] < threshold, else right ("no") — matching XGBoost's split
 *   direction.
 *
 * float32 fidelity: XGBoost stores split thresholds as float32 internally and
 * compares in float32, but `get_dump` emits those thresholds as float64-looking
 * decimals. Comparing a float64 feature against the dumped threshold diverges
 * from XGBoost exactly at boundary samples. We emulate XGBoost by rounding BOTH
 * the feature value and the threshold to the nearest float32 via Math.fround
 * before the `<` comparison. Without this, ~1/20 verification samples miss by
 * >tolerance and the model disables itself.
 */

import modelJson from '@/../ml/models/oracle_risk_model.json';

import { roundTo } from '@/lib/utils/format';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('MlInference');

export interface MlModelNode {
  nodeid: number;
  // Internal node:
  split?: number;
  threshold?: number;
  yes?: number;
  no?: number;
  // Leaf:
  leaf?: number;
}

/** One trained horizon (1h or 6h). */
export interface MlHorizon {
  evalWindowHours: number;
  featureNames: string[];
  baseScore: number;
  trees: MlModelNode[][];
  metrics: Record<string, unknown>;
  verificationSamples?: Array<[FeatureVector, number]>;
  verificationTolerance?: number;
}

/** v2 model: dual-horizon. */
export interface MlModelV2 {
  version: 2;
  active: boolean;
  inactiveReason?: string;
  trainedAt: string | null;
  labelDefinition?: string;
  featureNames: string[];
  horizons: Record<string, MlHorizon | null>;
  metrics: Record<string, unknown>;
}

/** v1 model (legacy): single 6h model at top level. */
export interface MlModelV1 {
  version?: 1;
  active: boolean;
  inactiveReason?: string;
  trainedAt: string | null;
  featureNames: string[];
  baseScore: number;
  trees: MlModelNode[][];
  metrics: Record<string, unknown>;
  verificationSamples?: Array<[FeatureVector, number]>;
  verificationTolerance?: number;
}

/** Ordered feature vector matching a horizon's featureNames. */
export type FeatureVector = number[];
/** Name → value feature map (order-agnostic; scorer builds the vector). */
export type FeatureMap = Record<string, number>;

export interface PreTradeFeatures {
  maxDeviationPct: number;
  spreadPct: number;
  participantCount: number;
  staleDataRisk: boolean;
  /** Mean |deviation_pct| across providers — robust overall disagreement. */
  meanDeviationPct: number;
  /** Fraction of providers that are stale (data_age_seconds >= 60). */
  staleRatio: number;
  /** 1h change in max deviation (live now minus most-recent hourly snapshot). */
  deviationVelocity1h: number;
  // --- v2 enriched features (0 when history unavailable, matches training's
  // fillna(0) for early rows) ---
  /** Rolling std of 1h consensus returns over 6h, as %. Volatility regime. */
  rollingVolatility6h: number;
  /** max_dev(T) - max_dev(T-3h). Longer-term deviation trend slope. */
  deviationVelocity3h: number;
  /** participant_count(T) - participant_count(T-1). Drops = provider outage. */
  participantCountDelta1h: number;
  /** (current max_dev - mean24) / std24. How anomalous is NOW vs baseline. */
  maxDeviationZscore24h: number;
}

/** Map a feature map onto a horizon's featureNames order (0-fill missing). */
function buildFeatureVector(features: FeatureMap, featureNames: string[]): FeatureVector {
  return featureNames.map((name) => {
    const v = features[name];
    return Number.isFinite(v) ? (v as number) : 0;
  });
}

let cachedModel: {
  horizons: Record<string, { model: MlHorizon; verified: boolean }>;
  trainedAt: string | null;
  metrics: Record<string, unknown>;
} | null = null;

function sigmoid(x: number): number {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

/** Walk one tree to its leaf and return the leaf weight. */
function scoreTree(nodes: MlModelNode[], features: FeatureVector): number {
  const byId = new Map<number, MlModelNode>();
  for (const n of nodes) byId.set(n.nodeid, n);

  let node = byId.get(0);
  while (node && node.leaf === undefined) {
    const idx = node.split!;
    // Emulate XGBoost's float32 comparison (see float32 fidelity note above).
    const value = Math.fround(features[idx] ?? 0);
    const threshold = Math.fround(node.threshold!);
    const next = value < threshold ? node.yes! : node.no!;
    node = byId.get(next);
  }
  return node?.leaf ?? 0;
}

function scoreRaw(features: FeatureVector, trees: MlModelNode[][]): number {
  let sum = 0;
  for (const tree of trees) sum += scoreTree(tree, features);
  return sum;
}

/**
 * Convert a pre-trade result's metrics into the feature MAP (order-agnostic).
 *
 * Keys mirror FEATURE_NAMES in ml/train.py. The scorer maps by name per-horizon,
 * so adding features in train.py doesn't break a deployed model with fewer.
 */
export function featuresFromPreTrade(f: PreTradeFeatures): FeatureMap {
  return {
    max_deviation_pct: f.maxDeviationPct,
    cross_provider_spread_pct: f.spreadPct,
    participant_count: f.participantCount,
    stale: f.staleDataRisk ? 1 : 0,
    mean_deviation_pct: f.meanDeviationPct,
    stale_ratio: f.staleRatio,
    deviation_velocity_1h: f.deviationVelocity1h,
    rolling_volatility_6h: f.rollingVolatility6h,
    deviation_velocity_3h: f.deviationVelocity3h,
    participant_count_delta_1h: f.participantCountDelta1h,
    max_deviation_zscore_24h: f.maxDeviationZscore24h,
  };
}

/**
 * Verify the TS scorer against a horizon's embedded samples. Returns false (and
 * logs) if the math doesn't match XGBoost within tolerance.
 */
function verifyHorizon(horizon: MlHorizon): boolean {
  if (!horizon.verificationSamples || horizon.verificationSamples.length === 0) return true;
  const tol = horizon.verificationTolerance ?? 0.01;
  for (const [features, expected] of horizon.verificationSamples) {
    const raw = scoreRaw(features, horizon.trees);
    const proba = sigmoid(raw + Math.log(horizon.baseScore / (1 - horizon.baseScore)));
    if (Math.abs(proba - expected) > tol) {
      logger.warn('ML horizon self-verification failed; disabling this horizon', {
        evalWindowHours: horizon.evalWindowHours,
        expected,
        got: roundTo(proba, 4),
        tolerance: tol,
      });
      return false;
    }
  }
  return true;
}

/**
 * Load + verify the model. Returns a map of horizon-name → {model, verified}.
 * Handles both v2 (horizons) and v1 (single model read as "6h") transparently.
 */
function getModel(): {
  horizons: Record<string, { model: MlHorizon; verified: boolean }>;
  trainedAt: string | null;
  metrics: Record<string, unknown>;
} | null {
  if (cachedModel) return cachedModel;

  const raw = modelJson as unknown as MlModelV2 | MlModelV1;
  const horizons: Record<string, { model: MlHorizon; verified: boolean }> = {};

  if (raw.version === 2) {
    const m = raw;
    if (!m.active) return null;
    for (const [name, h] of Object.entries(m.horizons ?? {})) {
      if (!h || !h.trees || h.trees.length === 0) continue;
      horizons[name] = { model: h, verified: verifyHorizon(h) };
    }
  } else {
    // v1 legacy: single model at top level, treated as the 6h horizon.
    const m = raw;
    if (!m.active || !m.trees || m.trees.length === 0) return null;
    const h: MlHorizon = {
      evalWindowHours: 6,
      featureNames: m.featureNames,
      baseScore: m.baseScore ?? 0.5,
      trees: m.trees,
      metrics: m.metrics ?? {},
      verificationSamples: m.verificationSamples,
      verificationTolerance: m.verificationTolerance,
    };
    horizons['6h'] = { model: h, verified: verifyHorizon(h) };
  }

  const verifiedAny = Object.values(horizons).some((h) => h.verified);
  if (!verifiedAny) return null;

  cachedModel = {
    horizons,
    trainedAt: raw.trainedAt ?? null,
    metrics: raw.metrics ?? {},
  };
  return cachedModel;
}

/** Per-horizon scores + the combined (max) score. */
export interface MultiHorizonScore {
  /** Worst-case (max) of all verified horizons — drives manipulationRiskScore. */
  combined: number;
  score1h: number | null;
  score6h: number | null;
}

/**
 * Score pre-trade features across all horizons. Returns per-horizon scores plus
 * a combined (max) score, or null if no verified model is available (rules-only
 * fallback). The combined score is what feeds manipulationRiskScore.
 */
export function scorePreTradeMultiHorizon(features: PreTradeFeatures): MultiHorizonScore | null {
  const cached = getModel();
  if (!cached) return null;
  const map = featuresFromPreTrade(features);

  let combined = 0;
  let score1h: number | null = null;
  let score6h: number | null = null;
  let anyScored = false;

  for (const [name, { model, verified }] of Object.entries(cached.horizons)) {
    if (!verified) continue;
    const vec = buildFeatureVector(map, model.featureNames);
    const bias = Math.log(model.baseScore / (1 - model.baseScore));
    const proba = roundTo(sigmoid(scoreRaw(vec, model.trees) + bias), 4);
    anyScored = true;
    if (proba > combined) combined = proba;
    if (name === '1h') score1h = proba;
    if (name === '6h') score6h = proba;
  }

  if (!anyScored) return null;
  return { combined: roundTo(combined, 4), score1h, score6h };
}

/**
 * Backward-compatible single-score API. Returns the combined (max) horizon
 * score, or null if no verified model is available. Existing callers that don't
 * need the per-horizon breakdown keep working unchanged.
 */
export function scorePreTrade(features: PreTradeFeatures): number | null {
  const result = scorePreTradeMultiHorizon(features);
  return result?.combined ?? null;
}

/** Human-readable model status for diagnostics / the /ai page. */
export function getModelStatus(): {
  active: boolean;
  trainedAt: string | null;
  metrics: Record<string, unknown>;
  horizons: string[];
} {
  const raw = modelJson as unknown as MlModelV2 | MlModelV1;
  const cached = getModel();
  const activeHorizons = cached
    ? Object.keys(cached.horizons).filter((k) => cached.horizons[k].verified)
    : [];
  return {
    active: activeHorizons.length > 0,
    trainedAt: raw.trainedAt ?? null,
    metrics: raw.metrics ?? {},
    horizons: activeHorizons,
  };
}
