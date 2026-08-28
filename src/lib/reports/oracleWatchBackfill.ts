/**
 * One-time historical backfill for feed_health_snapshots.
 *
 * The 30-min Oracle Watch recorder only started with migration 0034, so the
 * trust spine has no look-back. This module rebuilds the roughly-reconstructible
 * portion from `hourly_price_snapshots` (which has months of history) so:
 *   - /oracle-watch/history has an immediate, warm credibility curve, and
 *   - the ML trainer has historical rows to learn the 30-min governance
 *     features from instead of waiting for the recorder to slowly accumulate.
 *
 * FIDELITY: live Oracle Watch rows are produced by the full signal engine
 * (consensus history-keyed outliers, per-provider confidence, etc.), which
 * cannot be reproduced from hourly snapshots. Backfilled rows use EXACTLY the
 * same shared primitives where available — `calculateAgreement` (the live
 * coefficient-of-variation agreement) and the same verdict thresholds — with a
 * documented per-hour price z-score (2.5) standing in for the live history-keyed
 * outlier gate. Reputation and ML fields are left null (not reconstructible).
 * Consume backfilled rows as a coarser precursor; after a few days of live
 * collection they are superseded by real 30-min rows.
 */

/* eslint-disable no-console */
import { calculateAgreement } from '@/lib/analytics/consensusPrice';
import { median } from '@/lib/api/services/oracleWatchHistory';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { roundTo } from '@/lib/utils/format';

import { type FeedHealthSnapshotRow } from './oracleWatchCollector';

// Mirrors the verdict thresholds in src/lib/api/services/oracleWatchService.ts
// so backfilled severity language matches live rows.
const DEV_CAUTION_PCT = 1.0;
const DEV_DANGER_PCT = 3.0;
const AGREEMENT_CAUTION = 0.95;
const AGREEMENT_DANGER = 0.85;
/** Same price z-score gate the live outlier detector uses. */
const OUTLIER_Z = 2.5;
/** Approximates the live stale threshold (data_age >= 60s). */
const STALE_SECONDS = 60;

/** A raw historical snapshot row as read from hourly_price_snapshots. */
export interface BackfillSourceRow {
  symbol: string;
  snapshot_hour: string;
  price: number;
  deviation_pct: number | null;
  data_age_seconds: number | null;
  is_success: boolean;
}

export function buildBackfillRowForHour(
  symbol: string,
  hour: string,
  rows: BackfillSourceRow[]
): FeedHealthSnapshotRow {
  const prices: number[] = [];
  const devs: number[] = [];
  let staleCount = 0;

  for (const r of rows) {
    prices.push(r.price);
    const dev = Math.abs(Number(r.deviation_pct));
    if (Number.isFinite(dev)) devs.push(dev);
    const age = r.data_age_seconds;
    if (age !== null && age >= STALE_SECONDS) staleCount += 1;
  }

  const maxDeviationPct = devs.length > 0 ? Math.max(...devs) : null;
  const consensusPrice = prices.length > 0 ? median(prices) : null;
  const participantCount = prices.length;
  const agreement = roundTo(calculateAgreement(prices), 4);

  // Per-hour price z-score outlier gate (documented approximation of the live
  // history-keyed outlier detector).
  let outlierCount = 0;
  if (prices.length >= 3) {
    const mean = prices.reduce((s, v) => s + v, 0) / prices.length;
    const variance = prices.reduce((s, v) => s + (v - mean) ** 2, 0) / prices.length;
    const std = Math.sqrt(variance);
    if (std > 1e-12) {
      outlierCount = prices.filter((p) => Math.abs(p - mean) / std > OUTLIER_Z).length;
    }
  }

  // Verdict/recommendation/reason using the SAME thresholds as the live signal.
  let verdict: string;
  let recommendation: string;
  let reason: string;
  if (
    (maxDeviationPct !== null && maxDeviationPct >= DEV_DANGER_PCT) ||
    agreement < AGREEMENT_DANGER
  ) {
    verdict = 'danger';
    recommendation = 'halt';
    reason = 'deviation_or_agreement_breached_danger';
  } else if (
    (maxDeviationPct !== null && maxDeviationPct >= DEV_CAUTION_PCT) ||
    agreement < AGREEMENT_CAUTION ||
    outlierCount > 0 ||
    staleCount > 0
  ) {
    verdict = 'caution';
    recommendation = 'proceed_with_caution';
    reason = 'deviation_agreement_outlier_or_stale';
  } else {
    verdict = 'normal';
    recommendation = 'proceed';
    reason = 'within_tolerance';
  }

  return {
    symbol,
    chain: null,
    evaluated_at: new Date(hour).toISOString(),
    verdict,
    recommendation,
    reason,
    max_deviation_pct: maxDeviationPct === null ? null : roundTo(maxDeviationPct, 4),
    agreement,
    participant_count: participantCount,
    outlier_count: outlierCount,
    stale_count: staleCount,
    consensus_price: consensusPrice ?? null,
    ml_risk_score: null,
    ml_risk_level: null,
    avg_reputation: null,
    min_reputation: null,
  };
}

export interface BackfillOptions {
  /** Look-back window in days. Defaults to 30. */
  days?: number;
  /** Symbols to backfill. Defaults to every symbol present in the window. */
  symbols?: string[];
  /** Batch size for inserts. */
  batchSize?: number;
}

export interface BackfillResult {
  built: number;
  inserted: number;
  skippedExisting: number;
}

/** Group raw source rows by (symbol, hour) and build backfilled spine rows. */
export function buildBackfillRows(rows: BackfillSourceRow[]): FeedHealthSnapshotRow[] {
  const byKey = new Map<string, { symbol: string; hour: string; rows: BackfillSourceRow[] }>();
  for (const r of rows) {
    const key = `${r.symbol}|${r.snapshot_hour}`;
    const entry = byKey.get(key) ?? { symbol: r.symbol, hour: r.snapshot_hour, rows: [] };
    entry.rows.push(r);
    byKey.set(key, entry);
  }
  return Array.from(byKey.values()).map((e) => buildBackfillRowForHour(e.symbol, e.hour, e.rows));
}

/**
 * Backfill feed_health_snapshots from hourly_price_snapshots. Idempotent: rows
 * whose (symbol, evaluated_at) already exist are skipped, so re-runs are safe.
 */
export async function backfillOracleWatchHistory(
  options: BackfillOptions = {}
): Promise<BackfillResult> {
  const { days = 30, batchSize = 500 } = options;
  const symbols = options.symbols;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const supabase = createServiceRoleClient();

  let sourceQuery = supabase
    .from('hourly_price_snapshots')
    .select('symbol,snapshot_hour,price,deviation_pct,data_age_seconds,is_success')
    .eq('is_success', true)
    .gt('price', 0)
    .gte('snapshot_hour', cutoff);
  if (symbols && symbols.length > 0) {
    sourceQuery = sourceQuery.in('symbol', symbols);
  }
  const { data: source, error: sourceError } = await sourceQuery;
  if (sourceError) {
    throw new Error(`Failed to read hourly_price_snapshots for backfill: ${sourceError.message}`);
  }

  const rows = (source ?? []) as unknown as BackfillSourceRow[];
  if (rows.length === 0) return { built: 0, inserted: 0, skippedExisting: 0 };

  const built = buildBackfillRows(rows);

  // Skip existing (symbol, evaluated_at) so re-runs are idempotent.
  const existingQuery = supabase
    .from('feed_health_snapshots')
    .select('symbol,evaluated_at')
    .in('symbol', Array.from(new Set(built.map((r) => r.symbol))))
    .gte('evaluated_at', cutoff);
  const { data: existingRaw, error: existingError } = await existingQuery;
  if (existingError) {
    throw new Error(
      `Failed to read existing feed_health_snapshots for dedupe: ${existingError.message}`
    );
  }
  const existingKeys = new Set(
    (existingRaw ?? []).map(
      (r) => `${(r as { symbol: string }).symbol}|${(r as { evaluated_at: string }).evaluated_at}`
    )
  );

  const toInsert = built.filter((r) => !existingKeys.has(`${r.symbol}|${r.evaluated_at}`));

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const chunk = toInsert.slice(i, i + batchSize);
    const { error } = await supabase.from('feed_health_snapshots').insert(chunk);
    if (error) {
      throw new Error(`Failed to insert backfill chunk: ${error.message}`);
    }
    inserted += chunk.length;
  }

  console.log(
    `[oracle-watch-backfill] built ${built.length} rows, inserted ${inserted}, skipped ${built.length - inserted}`
  );
  return { built: built.length, inserted, skippedExisting: built.length - inserted };
}
