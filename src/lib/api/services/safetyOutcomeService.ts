/**
 * Safety outcome backfill — the labeling layer that turns the pre_trade_checks
 * flywheel from a feature store into a labeled training set.
 *
 * The rule engine records WHAT IT SAW at check time (features + verdict). This
 * service records WHAT ACTUALLY HAPPENED afterward (the label). Together a row
 * becomes (features → label), a supervised training example — and the rule
 * engine's precision/recall becomes measurable for the first time.
 *
 * The labeling function ("did the consensus price move abnormally / did
 * cross-oracle deviation spike in the N hours after this timestamp?") is the
 * SAME computation whether applied to a flywheel row here or to an arbitrary
 * historical window in hourly_price_snapshots — so building it once unlocks both
 * organic labels (this backfill) and historical mining (future training set
 * generation).
 *
 * Resolution note: hourly_price_snapshots is hourly. That is coarse for
 * sub-hour flash attacks, but those resolve faster than an agent can react
 * anyway — the pre-trade product protects against SUSTAINED mispricing, which
 * hourly resolution captures. The check-time FEATURES themselves are real-time
 * (captured at the moment of the check); only the label is hourly.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('SafetyOutcome');

/** Thresholds for declaring a post-check window "abnormal" (a positive label). */
export const OUTCOME_THRESHOLDS = {
  /** Minimum window that must elapse before a check can be labeled (hours). */
  minWindowHours: 6,
  /** How far after the check to look for an abnormal outcome (hours). */
  evalWindowHours: 6,
  /** Abs % move in consensus price over the window that counts as abnormal. */
  priceMovePct: 5,
  /** Max cross-oracle deviation (%) in the window that counts as abnormal. */
  deviationPct: 8,
  /** Max rows to label per cron run (free-tier friendly). */
  batchSize: 50,
} as const;

export interface SafetyOutcome {
  windowHours: number;
  evaluatedAt: string;
  baselinePrice: number | null;
  maxPriceMovePct: number;
  maxDeviationPct: number;
  label: boolean;
  evidence: string[];
}

export interface BackfillSummary {
  scanned: number;
  labeled: number;
  positive: number;
  skipped: number;
  errors: number;
}

interface SnapshotRow {
  snapshot_hour: string;
  consensus_price: number | null;
  deviation_pct: number | null;
}

interface PendingCheckRow {
  id: string;
  asset: string;
  chain_id: number;
  created_at: string;
}

/**
 * Compute the outcome label for a single check by examining the asset's
 * consensus-price trajectory and cross-oracle deviation over the window after
 * the check. Returns null when no snapshot data is available for the window.
 */
export async function computeOutcome(
  asset: string,
  checkTimestamp: string,
  windowHours: number = OUTCOME_THRESHOLDS.evalWindowHours
): Promise<SafetyOutcome | null> {
  const supabase = createServiceRoleClient();
  const from = new Date(checkTimestamp);
  const to = new Date(from.getTime() + windowHours * 3600_000);
  // Include a couple of preceding hours so we can establish a baseline price.
  const fromMinus = new Date(from.getTime() - 2 * 3600_000);

  const { data, error } = await supabase
    .from('hourly_price_snapshots')
    .select('snapshot_hour, consensus_price, deviation_pct')
    .eq('symbol', asset)
    .gt('snapshot_hour', fromMinus.toISOString())
    .lte('snapshot_hour', to.toISOString())
    .order('snapshot_hour', { ascending: true });

  if (error) {
    logger.warn('Failed to fetch outcome snapshots', { asset, error: error.message });
    return null;
  }
  if (!data || data.length === 0) return null;

  const rows = data as SnapshotRow[];

  // Baseline = the latest consensus price at or before the check (the pre-event
  // "fair value"). Window = everything strictly after the check.
  let baselinePrice: number | null = null;
  const windowRows: SnapshotRow[] = [];
  for (const row of rows) {
    if (new Date(row.snapshot_hour) <= from) {
      if (row.consensus_price != null) baselinePrice = Number(row.consensus_price);
    } else {
      windowRows.push(row);
    }
  }
  if (windowRows.length === 0) return null;

  // Aggregate per hour: average consensus (across providers) and max abs deviation.
  const byHour = new Map<string, { consensus: number[]; maxDev: number }>();
  for (const row of windowRows) {
    const key = row.snapshot_hour;
    const entry = byHour.get(key) ?? { consensus: [], maxDev: 0 };
    if (row.consensus_price != null) entry.consensus.push(Number(row.consensus_price));
    if (row.deviation_pct != null) {
      entry.maxDev = Math.max(entry.maxDev, Math.abs(Number(row.deviation_pct)));
    }
    byHour.set(key, entry);
  }

  let maxPriceMovePct = 0;
  let maxDeviationPct = 0;
  for (const entry of byHour.values()) {
    if (baselinePrice && baselinePrice > 0 && entry.consensus.length > 0) {
      const avgConsensus = entry.consensus.reduce((a, b) => a + b, 0) / entry.consensus.length;
      const movePct = Math.abs((avgConsensus - baselinePrice) / baselinePrice) * 100;
      if (movePct > maxPriceMovePct) maxPriceMovePct = movePct;
    }
    if (entry.maxDev > maxDeviationPct) maxDeviationPct = entry.maxDev;
  }

  const priceAbnormal = maxPriceMovePct >= OUTCOME_THRESHOLDS.priceMovePct;
  const devAbnormal = maxDeviationPct >= OUTCOME_THRESHOLDS.deviationPct;
  const label = priceAbnormal || devAbnormal;

  const evidence: string[] = [];
  if (priceAbnormal) {
    evidence.push(`Consensus price moved ${maxPriceMovePct.toFixed(2)}% within ${windowHours}h.`);
  }
  if (devAbnormal) {
    evidence.push(`Cross-oracle deviation reached ${maxDeviationPct.toFixed(2)}% in window.`);
  }

  return {
    windowHours,
    evaluatedAt: new Date().toISOString(),
    baselinePrice,
    maxPriceMovePct: Number(maxPriceMovePct.toFixed(4)),
    maxDeviationPct: Number(maxDeviationPct.toFixed(4)),
    label,
    evidence,
  };
}

/**
 * Backfill outcomes for checks whose evaluation window has elapsed but which
 * haven't been labeled yet. Bounded batch size keeps it free-tier friendly;
 * runs as a single pass per cron invocation.
 */
export async function backfillOutcomes(
  batchSize: number = OUTCOME_THRESHOLDS.batchSize
): Promise<BackfillSummary> {
  const supabase = createServiceRoleClient();
  const cutoff = new Date(Date.now() - OUTCOME_THRESHOLDS.minWindowHours * 3600_000).toISOString();

  const { data: pending, error } = await supabase
    .from('pre_trade_checks')
    .select('id, asset, chain_id, created_at')
    .is('outcome_evaluated_at', null)
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (error) {
    logger.error('Failed to fetch pending outcome rows', new Error(error.message));
    return { scanned: 0, labeled: 0, positive: 0, skipped: 0, errors: 1 };
  }
  if (!pending || pending.length === 0) {
    return { scanned: 0, labeled: 0, positive: 0, skipped: 0, errors: 0 };
  }

  const rows = pending as PendingCheckRow[];
  let labeled = 0;
  let positive = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const outcome = await computeOutcome(row.asset, row.created_at);

      if (!outcome) {
        // No snapshot data for this asset/window. Mark evaluated so the index
        // stops re-picking it; outcome_label stays NULL (excluded from training
        // and metrics, distinguishable from a true negative).
        const { error: markError } = await supabase
          .from('pre_trade_checks')
          .update({ outcome_evaluated_at: new Date().toISOString() })
          .eq('id', row.id);
        if (markError) errors++;
        else skipped++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('pre_trade_checks')
        .update({
          outcome_label: outcome.label,
          outcome,
          outcome_evaluated_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      if (updateError) {
        errors++;
      } else {
        labeled++;
        if (outcome.label) positive++;
      }
    } catch (err) {
      errors++;
      logger.warn('Outcome backfill row failed', {
        id: row.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info('Outcome backfill complete', {
    scanned: rows.length,
    labeled,
    positive,
    skipped,
    errors,
  });

  return { scanned: rows.length, labeled, positive, skipped, errors };
}
