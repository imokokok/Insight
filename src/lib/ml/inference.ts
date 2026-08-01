/**
 * Pure-TypeScript ML inference for the oracle-risk model.
 *
 * Loads the XGBoost model exported by ml/train.py (a JSON of flattened trees)
 * and scores a feature vector with NO Python runtime and NO native deps in the
 * app. The model is baked in at build time (static JSON import) and refreshes
 * on each deploy after the training cron commits a new one.
 *
 * Self-verifying: on first load, the scorer reproduces the `verificationSamples`
 * the trainer embedded (XGBoost's own predict_proba). If the TS tree-walker
 * disagrees beyond tolerance — e.g. due to an XGBoost version quirk in leaf
 * conventions — the model disables itself and inference returns null, so the
 * pre-trade check falls back to rules-only rather than emitting wrong scores.
 *
 * Prediction math: base_score = 0.5 (set by the trainer) => logit bias = 0, so
 *   proba = sigmoid(Σ leaf_weight). A sample goes left ("yes") when
 *   feature[split] < threshold, else right ("no") — matching XGBoost's split
 *   direction.
 *
 * float32 fidelity: XGBoost stores split thresholds as float32 internally and
 * compares in float32, but `get_dump` emits those thresholds as float64-looking
 * decimals (e.g. 0.05 -> 0.0500000007). Comparing a float64 feature against the
 * dumped threshold diverges from XGBoost exactly at boundary samples. We emulate
 * XGBoost by rounding BOTH the feature value and the threshold to the nearest
 * float32 via Math.fround before the `<` comparison. Without this, ~1/20
 * verification samples miss by >tolerance and the model disables itself.
 */

import modelJson from '@/../ml/models/oracle_risk_model.json';

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

export interface MlModel {
  version: number;
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

/** Ordered feature vector matching model.featureNames. */
export type FeatureVector = number[];

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
}

let cachedModel: { model: MlModel; verified: boolean } | null = null;

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

function scoreRaw(features: FeatureVector, model: MlModel): number {
  let sum = 0;
  for (const tree of model.trees) sum += scoreTree(tree, features);
  return sum;
}

/**
 * Convert a pre-trade result's metrics into the model's feature vector.
 *
 * Order MUST match FEATURE_NAMES in ml/train.py:
 *   max_deviation_pct, cross_provider_spread_pct, participant_count, stale,
 *   mean_deviation_pct, stale_ratio, deviation_velocity_1h
 */
export function featuresFromPreTrade(f: PreTradeFeatures): FeatureVector {
  return [
    f.maxDeviationPct,
    f.spreadPct,
    f.participantCount,
    f.staleDataRisk ? 1 : 0,
    f.meanDeviationPct,
    f.staleRatio,
    f.deviationVelocity1h,
  ];
}

/**
 * Verify the TS scorer against the trainer's embedded samples. Returns false
 * (and logs) if the math doesn't match XGBoost within tolerance.
 */
function verify(model: MlModel): boolean {
  if (!model.verificationSamples || model.verificationSamples.length === 0) return true;
  const tol = model.verificationTolerance ?? 0.01;
  for (const [features, expected] of model.verificationSamples) {
    const raw = scoreRaw(features, model);
    const proba = sigmoid(raw);
    if (Math.abs(proba - expected) > tol) {
      logger.warn('ML model self-verification failed; disabling shadow scoring', {
        expected,
        got: Number(proba.toFixed(4)),
        tolerance: tol,
      });
      return false;
    }
  }
  return true;
}

function getModel(): { model: MlModel; verified: boolean } | null {
  if (cachedModel) return cachedModel;
  const model = modelJson as unknown as MlModel;
  if (!model.active || !model.trees || model.trees.length === 0) return null;
  const verified = verify(model);
  if (!verified) return null;
  cachedModel = { model, verified };
  return cachedModel;
}

/**
 * Score pre-trade features with the ML model. Returns the predicted probability
 * of an abnormal oracle event in the next 6h, or null if no verified model is
 * available (rules-only fallback).
 */
export function scorePreTrade(features: PreTradeFeatures): number | null {
  const cached = getModel();
  if (!cached) return null;
  const vec = featuresFromPreTrade(features);
  return Number(sigmoid(scoreRaw(vec, cached.model)).toFixed(4));
}

/** Human-readable model status for diagnostics / the /ai page. */
export function getModelStatus(): {
  active: boolean;
  trainedAt: string | null;
  metrics: Record<string, unknown>;
} {
  const model = modelJson as unknown as MlModel;
  const cached = getModel();
  return {
    active: Boolean(cached?.verified),
    trainedAt: model.trainedAt,
    metrics: model.metrics ?? {},
  };
}
