/**
 * ML outcome metrics — the realized-accuracy closed loop for the manipulation
 * risk score.
 *
 * The scoring side records each horizon's prediction at check time;
 * safetyOutcomeService backfills the corresponding 1h and 6h outcomes.
 * Compare scores only with labels and operating thresholds for the SAME
 * horizon. The legacy top-level result remains the 6h view.
 *
 * Read-only and fail-soft: every failure mode degrades to `errored: true`
 * rather than throwing, so an Ops/dashboard caller always renders.
 */

import { assetClassFor, getModelStatus } from '@/lib/ml/inference';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { roundTo } from '@/lib/utils/format';
import { createLogger } from '@/lib/utils/logger';

import { OUTCOME_THRESHOLDS } from './safetyOutcomeService';

const logger = createLogger('MlOutcomeMetrics');
const METRICS_PAGE_SIZE = 1_000;
const METRICS_MAX_ROWS = 50_000;

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

export interface MlHorizonOutcomeMetrics {
  labeled: number;
  positives: number;
  baseRate: number | null;
  auc: number | null;
  buckets: MlBucketMetrics[];
  byClass: { stable: MlClassMetrics | null; volatile: MlClassMetrics | null };
  operatingThresholds: { medium: number; high: number };
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
  byHorizon: { '1h': MlHorizonOutcomeMetrics | null; '6h': MlHorizonOutcomeMetrics | null };
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

function computeHorizonMetrics(
  rows: ScoredRow[],
  operatingThresholds: { medium: number; high: number }
): MlHorizonOutcomeMetrics {
  const thresholds = [operatingThresholds.medium, operatingThresholds.high];
  const positives = rows.filter((row) => row.outcome_label).length;
  const stableRows = rows.filter((row) => assetClassFor(row.asset) === 'stable');
  const volatileRows = rows.filter((row) => assetClassFor(row.asset) === 'volatile');
  return {
    labeled: rows.length,
    positives,
    baseRate: rows.length > 0 ? roundTo(positives / rows.length, 4) : null,
    auc: computeAuc(
      rows.map((row) => row.ml_score),
      rows.map((row) => row.outcome_label)
    ),
    buckets: computeBuckets(rows, thresholds),
    byClass: {
      stable: computeClassMetrics(stableRows, thresholds),
      volatile: computeClassMetrics(volatileRows, thresholds),
    },
    operatingThresholds,
  };
}

function labeledRows(
  data: Array<Record<string, unknown>>,
  scoreKey: string,
  labelKey: string,
  outcomeKey: string,
  fallbackScore?: string,
  fallbackLabel?: string,
  fallbackOutcome?: string
): ScoredRow[] {
  return data.flatMap((row) => {
    const score = row[scoreKey] ?? (fallbackScore ? row[fallbackScore] : null);
    const label = row[labelKey] ?? (fallbackLabel ? row[fallbackLabel] : null);
    const outcome = row[outcomeKey] ?? (fallbackOutcome ? row[fallbackOutcome] : null);
    if (
      !outcome ||
      typeof outcome !== 'object' ||
      (outcome as Record<string, unknown>).methodVersion !== OUTCOME_THRESHOLDS.methodVersion
    )
      return [];
    if (typeof score !== 'number' || !Number.isFinite(score) || typeof label !== 'boolean') {
      return [];
    }
    return [{ asset: String(row.asset), ml_score: score, outcome_label: label }];
  });
}

/**
 * Realized per-horizon accuracy over labeled pre-trade checks in the window.
 * Rows without a backfilled outcome or without an ML score are excluded —
 * they are neither positives nor negatives, they are unlabeled.
 */
export async function getMlOutcomeMetrics(windowHours = 24 * 7): Promise<MlOutcomeMetrics> {
  const status = getModelStatus();
  const thresholdsFor = (name: '1h' | '6h') => {
    const horizon = status.horizonDetails?.find((entry) => entry.name === name && entry.verified);
    return {
      medium: horizon?.mediumThreshold ?? status.mediumThreshold ?? ML_METRIC_THRESHOLDS[0],
      high: horizon?.highThreshold ?? status.highThreshold ?? ML_METRIC_THRESHOLDS[1],
    };
  };
  const operatingThresholds = thresholdsFor('6h');
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
    byHorizon: { '1h': null, '6h': null },
  };
  try {
    const supabase = createServiceRoleClient();
    const since = new Date(Date.now() - windowHours * 3600_000).toISOString();
    const until = new Date().toISOString();
    const records: Array<Record<string, unknown>> = [];
    // PostgREST caps one response at 1,000 rows. Page deterministically, or
    // realized metrics silently undercount as soon as a window exceeds that.
    for (let offset = 0; offset < METRICS_MAX_ROWS; offset += METRICS_PAGE_SIZE) {
      let query = supabase
        .from('pre_trade_checks')
        .select(
          'asset, ml_score, ml_score_1h, ml_score_6h, outcome_label, outcome_label_1h, outcome_label_6h, outcome, outcome_1h, outcome_6h'
        )
        .lte('outcome_evaluated_at', until)
        .gte('created_at', since)
        .lte('created_at', until)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
      if (status.trainedAt) query = query.eq('ml_model_version', status.trainedAt);
      if (status.labelSpecVersion != null) {
        query = query.eq('label_spec_version', status.labelSpecVersion);
      }
      const { data, error } = await query.range(offset, offset + METRICS_PAGE_SIZE - 1);
      if (error) {
        logger.warn('Failed to fetch labeled ML rows', { error: error.message });
        return { ...empty, errored: true };
      }
      const page = (data ?? []) as Array<Record<string, unknown>>;
      records.push(...page);
      if (page.length < METRICS_PAGE_SIZE) break;
    }
    if (records.length === METRICS_MAX_ROWS) {
      logger.warn('ML outcome metrics exceeded row cap', { cap: METRICS_MAX_ROWS });
      return { ...empty, errored: true };
    }
    const rows1h = labeledRows(records, 'ml_score_1h', 'outcome_label_1h', 'outcome_1h');
    const rows6h = labeledRows(
      records,
      'ml_score_6h',
      'outcome_label_6h',
      'outcome_6h',
      'ml_score',
      'outcome_label',
      'outcome'
    );
    if (rows1h.length === 0 && rows6h.length === 0) return empty;

    const metrics1h = rows1h.length > 0 ? computeHorizonMetrics(rows1h, thresholdsFor('1h')) : null;
    const metrics6h = rows6h.length > 0 ? computeHorizonMetrics(rows6h, operatingThresholds) : null;

    return {
      windowHours,
      labeled: metrics6h?.labeled ?? 0,
      positives: metrics6h?.positives ?? 0,
      baseRate: metrics6h?.baseRate ?? null,
      auc: metrics6h?.auc ?? null,
      buckets: metrics6h?.buckets ?? computeBuckets([], thresholds),
      byClass: metrics6h?.byClass ?? { stable: null, volatile: null },
      operatingThresholds,
      byHorizon: { '1h': metrics1h, '6h': metrics6h },
    };
  } catch (err) {
    logger.warn('ML outcome metrics failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ...empty, errored: true };
  }
}
