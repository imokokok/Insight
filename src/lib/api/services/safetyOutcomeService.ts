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
 * Resolution note: the near-term 1h label uses the existing 15-minute spine;
 * the strategic 6h label retains the cheaper hourly spine. Check-time features
 * remain real-time and are stored with an explicit schema version.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { roundTo } from '@/lib/utils/format';
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
  /** Track-B: oracle-vs-market divergence (%) that counts as abnormal —
   *  mirrors ml/train.py MARKET_DIVERGENCE_PCT (label spec v2). */
  marketDivergencePct: 2,
  /** Label spec version — must match ml/train.py LABEL_SPEC_VERSION. */
  labelSpecVersion: 2,
  /** Max rows to label per cron run (free-tier friendly). */
  batchSize: 50,
} as const;

export interface SafetyOutcome {
  labelSpecVersion: number;
  windowHours: number;
  evaluatedAt: string;
  baselinePrice: number | null;
  maxPriceMovePct: number;
  maxDeviationPct: number;
  /** Track-B: max oracle-vs-market divergence (%) in the window (null when
   *  the market-reference layer had no coverage — excluded, not zero). */
  maxMarketDivergencePct: number | null;
  label: boolean;
  evidence: string[];
}

interface RefHourRow {
  ref_hour: string;
  ref_price: number | null;
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

  const useFineSpine = windowHours <= 1;
  const timeColumn = useFineSpine ? 'snapshot_ts' : 'snapshot_hour';
  const { data, error } = await supabase
    .from(useFineSpine ? 'price_snapshots' : 'hourly_price_snapshots')
    .select(`${timeColumn}, consensus_price, deviation_pct`)
    .eq('symbol', asset)
    .gt(timeColumn, fromMinus.toISOString())
    .lte(timeColumn, to.toISOString())
    .order(timeColumn, { ascending: true });

  if (error) {
    logger.warn('Failed to fetch outcome snapshots', { asset, error: error.message });
    return null;
  }
  if (!data || data.length === 0) return null;

  const rows = (data as Array<Record<string, unknown>>).map((row) => ({
    snapshot_hour: String(row[timeColumn]),
    consensus_price: row.consensus_price as number | null,
    deviation_pct: row.deviation_pct as number | null,
  })) as SnapshotRow[];

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

  // Track-B (label spec v2): oracle-vs-market divergence over the same window,
  // from the CEX market-reference layer. |avgConsensus_hour - ref_hour|/ref*100.
  // No reference coverage => null (excluded from the label, never a zero fill).
  let maxMarketDivergencePct: number | null = null;
  let divergenceAbnormal = false;
  try {
    const { data: refData, error: refError } = await supabase
      .from('market_reference_hourly')
      .select('ref_hour, ref_price')
      .eq('symbol', asset)
      .gt('ref_hour', fromMinus.toISOString())
      .lte('ref_hour', to.toISOString())
      .order('ref_hour', { ascending: true });
    if (!refError && refData && refData.length > 0) {
      const refRows = refData as RefHourRow[];
      const refByHour = new Map(
        refRows
          .filter((r) => typeof r.ref_price === 'number' && (r.ref_price as number) > 0)
          .map((r) => [new Date(r.ref_hour).getTime(), r.ref_price as number])
      );
      for (const [key, entry] of byHour.entries()) {
        const eventTime = new Date(key).getTime();
        const refHour = Math.floor(eventTime / 3600_000) * 3600_000;
        const ref = refByHour.get(refHour);
        if (ref === undefined || entry.consensus.length === 0) continue;
        const avgConsensus = entry.consensus.reduce((a, b) => a + b, 0) / entry.consensus.length;
        const div = (Math.abs(avgConsensus - ref) / ref) * 100;
        if (maxMarketDivergencePct === null || div > maxMarketDivergencePct) {
          maxMarketDivergencePct = div;
        }
      }
      divergenceAbnormal =
        maxMarketDivergencePct !== null &&
        maxMarketDivergencePct >= OUTCOME_THRESHOLDS.marketDivergencePct;
    }
  } catch {
    // Reference layer unreachable: divergence stays null (excluded).
  }

  const priceAbnormal = maxPriceMovePct >= OUTCOME_THRESHOLDS.priceMovePct;
  const devAbnormal = maxDeviationPct >= OUTCOME_THRESHOLDS.deviationPct;
  const label = priceAbnormal || devAbnormal || divergenceAbnormal;

  const evidence: string[] = [];
  if (priceAbnormal) {
    evidence.push(`Consensus price moved ${maxPriceMovePct.toFixed(2)}% within ${windowHours}h.`);
  }
  if (devAbnormal) {
    evidence.push(`Cross-oracle deviation reached ${maxDeviationPct.toFixed(2)}% in window.`);
  }
  if (divergenceAbnormal) {
    evidence.push(
      `Oracle-vs-market divergence reached ${(maxMarketDivergencePct ?? 0).toFixed(2)}% in window.`
    );
  }

  return {
    labelSpecVersion: OUTCOME_THRESHOLDS.labelSpecVersion,
    windowHours,
    evaluatedAt: new Date().toISOString(),
    baselinePrice,
    maxPriceMovePct: roundTo(maxPriceMovePct, 4),
    maxDeviationPct: roundTo(maxDeviationPct, 4),
    maxMarketDivergencePct:
      maxMarketDivergencePct !== null ? roundTo(maxMarketDivergencePct, 4) : null,
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
      const [outcome1h, outcome6h] = await Promise.all([
        computeOutcome(row.asset, row.created_at, 1),
        computeOutcome(row.asset, row.created_at, OUTCOME_THRESHOLDS.evalWindowHours),
      ]);

      if (!outcome1h && !outcome6h) {
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
          outcome_label: outcome6h?.label ?? null,
          outcome: outcome6h,
          outcome_label_1h: outcome1h?.label ?? null,
          outcome_1h: outcome1h,
          outcome_label_6h: outcome6h?.label ?? null,
          outcome_6h: outcome6h,
          label_spec_version: OUTCOME_THRESHOLDS.labelSpecVersion,
          outcome_evaluated_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      if (updateError) {
        errors++;
      } else {
        labeled++;
        if (outcome6h?.label) positive++;
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
