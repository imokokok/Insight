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

import { assetClassFor } from '@/lib/ml/inference';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { roundTo } from '@/lib/utils/format';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('MlOutcomeMetrics');

/** Score thresholds at which realized precision is reported. */
export const ML_METRIC_THRESHOLDS = [0.25, 0.5, 0.75] as const;

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
  errored?: boolean;
}

interface ScoredRow {
  asset: string;
  ml_score: number;
  outcome_label: boolean;
}

/** Rank-based AUC (Mann-Whitney U) — no dependencies, handles ties. */
function computeAuc(scores: number[], labels: boolean[]): number | null {
  const pos = scores.filter((_, i) => labels[i]);
  const neg = scores.filter((_, i) => !labels[i]);
  if (pos.length === 0 || neg.length === 0) return null;
  let wins = 0;
  for (const p of pos) {
    for (const n of neg) {
      wins += p > n ? 1 : p === n ? 0.5 : 0;
    }
  }
  return wins / (pos.length * neg.length);
}

function computeBuckets(rows: ScoredRow[]): MlBucketMetrics[] {
  const totalPos = rows.filter((r) => r.outcome_label).length;
  return ML_METRIC_THRESHOLDS.map((threshold) => {
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

function computeClassMetrics(rows: ScoredRow[]): MlClassMetrics | null {
  if (rows.length === 0) return null;
  const positives = rows.filter((r) => r.outcome_label).length;
  return {
    labeled: rows.length,
    positives,
    auc: computeAuc(
      rows.map((r) => r.ml_score),
      rows.map((r) => r.outcome_label)
    ),
    buckets: computeBuckets(rows),
  };
}

/**
 * Realized ML-score accuracy over labeled pre-trade checks in the window.
 * Rows without a backfilled outcome or without an ML score are excluded —
 * they are neither positives nor negatives, they are unlabeled.
 */
export async function getMlOutcomeMetrics(windowHours = 24 * 7): Promise<MlOutcomeMetrics> {
  const empty: MlOutcomeMetrics = {
    windowHours,
    labeled: 0,
    positives: 0,
    baseRate: null,
    auc: null,
    buckets: computeBuckets([]),
    byClass: { stable: null, volatile: null },
  };
  try {
    const supabase = createServiceRoleClient();
    const since = new Date(Date.now() - windowHours * 3600_000).toISOString();
    const { data, error } = await supabase
      .from('pre_trade_checks')
      .select('asset, ml_score, outcome_label')
      .not('ml_score', 'is', null)
      .not('outcome_label', 'is', null)
      .gte('created_at', since)
      .limit(50_000);

    if (error) {
      logger.warn('Failed to fetch labeled ML rows', { error: error.message });
      return { ...empty, errored: true };
    }

    const rows = (data ?? []) as unknown as ScoredRow[];
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
      buckets: computeBuckets(rows),
      byClass: {
        stable: computeClassMetrics(stableRows),
        volatile: computeClassMetrics(volatileRows),
      },
    };
  } catch (err) {
    logger.warn('ML outcome metrics failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ...empty, errored: true };
  }
}
