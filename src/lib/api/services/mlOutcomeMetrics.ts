/**
 * ML outcome metrics — the realized-accuracy closed loop for the manipulation
 * risk score.
 *
 * The scoring side records WHAT THE MODEL SAID at check time
 * (pre_trade_checks.ml_score); safetyOutcomeService backfills WHAT ACTUALLY
 * HAPPENED next (pre_trade_checks.outcome_label, same 5%/8% abnormal-event
 * definition as training). This service joins the two and computes the model's
 * REALIZED precision/recall/AUC on live traffic — the number that decides (P1)
 * whether the ML score may gate verdicts, instead of the inflated in-sample
 * test metrics the trainer reports.
 *
 * Read-only and fail-soft: every failure mode degrades to `errored: true`
 * rather than throwing, so an Ops/dashboard caller always renders.
 */

import { assetClassFor, getModelStatus } from '@/lib/ml/inference';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { roundTo } from '@/lib/utils/format';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('MlOutcomeMetrics');

/** Legacy fallback only; active models provide their own calibrated thresholds. */
export const ML_METRIC_THRESHOLDS = [0.3, 0.6] as const;

export interface MlBucketMetrics {
  threshold: number;
  /** Labeled rows with ml_score >= threshold. */
  n: number;
  positives: number;
  /** P(abnormal outcome | score >= threshold). Null when the bucket is empty. */
  precision: number | null;
  /** P(score >= threshold | abnormal outcome). Null when there are no positives. */
  recall: number | null;
}

export interface MlClassMetrics {
  labeled: number;
  positives: number;
  auc: number | null;
  buckets: MlBucketMetrics[];
}

export interface MlOutcomeMetrics {
  windowHours: number;
  labeled: number;
  positives: number;
  baseRate: number | null;
  auc: number | null;
  buckets: MlBucketMetrics[];
  byClass: {
    stable: MlClassMetrics | null;
    volatile: MlClassMetrics | null;
  };
  operatingThresholds: { medium: number; high: number };
  errored?: boolean;
}

interface ScoredRow {
  asset: string;
  ml_score: number;
  outcome_label: boolean;
}

/** Rank-based AUC (Mann-Whitney U), O(n log n), with average ranks for ties. */
function computeAuc(scores: number[], labels: boolean[]): number | null {
  const ranked = scores.map((score, i) => ({ score, positive: labels[i] }));
  const positives = ranked.filter((row) => row.positive).length;
  const negatives = ranked.length - positives;
  if (positives === 0 || negatives === 0) return null;
  ranked.sort((a, b) => a.score - b.score);
  let positiveRankSum = 0;
  for (let i = 0; i < ranked.length; ) {
    let end = i + 1;
    while (end < ranked.length && ranked[end].score === ranked[i].score) end++;
    const averageRank = (i + 1 + end) / 2;
    for (let j = i; j < end; j++) {
      if (ranked[j].positive) positiveRankSum += averageRank;
    }
    i = end;
  }
  const u = positiveRankSum - (positives * (positives + 1)) / 2;
  return u / (positives * negatives);
}

function computeBuckets(rows: ScoredRow[], thresholds: readonly number[]): MlBucketMetrics[] {
  const totalPos = rows.filter((r) => r.outcome_label).length;
  return thresholds.map((threshold) => {
    const selected = rows.filter((r) => r.ml_score >= threshold);
    const positives = selected.filter((r) => r.outcome_label).length;
    return {
      threshold,
      n: selected.length,
      positives,
      precision: selected.length > 0 ? roundTo(positives / selected.length, 4) : null,
      recall: totalPos > 0 ? roundTo(positives / totalPos, 4) : null,
    };
  });
}

function computeClassMetrics(
  rows: ScoredRow[],
  thresholds: readonly number[]
): MlClassMetrics | null {
  if (rows.length === 0) return null;
  const positives = rows.filter((r) => r.outcome_label).length;
  return {
    labeled: rows.length,
    positives,
    auc: computeAuc(
      rows.map((r) => r.ml_score),
      rows.map((r) => r.outcome_label)
    ),
    buckets: computeBuckets(rows, thresholds),
  };
}

/**
 * Realized ML-score accuracy over labeled pre-trade checks in the window.
 * Rows without a backfilled outcome or without an ML score are excluded —
 * they are neither positives nor negatives, they are unlabeled.
 */
export async function getMlOutcomeMetrics(windowHours = 24 * 7): Promise<MlOutcomeMetrics> {
  const status = getModelStatus();
  const operatingThresholds = {
    medium: status.mediumThreshold ?? ML_METRIC_THRESHOLDS[0],
    high: status.highThreshold ?? ML_METRIC_THRESHOLDS[1],
  };
  const thresholds = [operatingThresholds.medium, operatingThresholds.high];
  const empty: MlOutcomeMetrics = {
    windowHours,
    labeled: 0,
    positives: 0,
    baseRate: null,
    auc: null,
    buckets: computeBuckets([], thresholds),
    byClass: { stable: null, volatile: null },
    operatingThresholds,
  };
  try {
    const supabase = createServiceRoleClient();
    const since = new Date(Date.now() - windowHours * 3600_000).toISOString();
    let query = supabase
      .from('pre_trade_checks')
      .select('asset, ml_score, ml_score_6h, outcome_label, outcome_label_6h')
      .not('ml_score', 'is', null)
      .not('outcome_label', 'is', null)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50_000);
    if (status.trainedAt) query = query.eq('ml_model_version', status.trainedAt);
    if (status.labelSpecVersion != null) {
      query = query.eq('label_spec_version', status.labelSpecVersion);
    }
    const { data, error } = await query;

    if (error) {
      logger.warn('Failed to fetch labeled ML rows', { error: error.message });
      return { ...empty, errored: true };
    }

    const rows = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      asset: String(row.asset),
      ml_score: Number(row.ml_score_6h ?? row.ml_score),
      outcome_label: Boolean(row.outcome_label_6h ?? row.outcome_label),
    })) as ScoredRow[];
    if (rows.length === 0) return empty;

    const positives = rows.filter((r) => r.outcome_label).length;
    const stableRows = rows.filter((r) => assetClassFor(r.asset) === 'stable');
    const volatileRows = rows.filter((r) => assetClassFor(r.asset) === 'volatile');

    return {
      windowHours,
      labeled: rows.length,
      positives,
      baseRate: roundTo(positives / rows.length, 4),
      auc: computeAuc(
        rows.map((r) => r.ml_score),
        rows.map((r) => r.outcome_label)
      ),
      buckets: computeBuckets(rows, thresholds),
      byClass: {
        stable: computeClassMetrics(stableRows, thresholds),
        volatile: computeClassMetrics(volatileRows, thresholds),
      },
      operatingThresholds,
    };
  } catch (err) {
    logger.warn('ML outcome metrics failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ...empty, errored: true };
  }
}
