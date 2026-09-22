/**
 * Safety outcome backfill — the labeling layer that turns the pre_trade_checks
 * flywheel from a feature store into a labeled training set.
 *
 * The rule engine records WHAT IT SAW at check time (features + verdict). This
 * service records WHAT ACTUALLY HAPPENED afterward (the label). Together a row
 * becomes (features → label), a supervised training example — and the rule
 * engine's precision/recall becomes measurable for the first time.
 *
 * The event thresholds mirror historical mining, while live checks use their
 * recorded check-time price as the baseline and require complete observation
 * coverage before declaring a negative. This keeps the resulting flywheel
 * labels comparable without pretending the two observation schedules are
 * identical.
 *
 * Both horizons inspect hourly observations and between-hour incidents from
 * the 15-minute spine, matching ml/train.py. Check-time features remain
 * real-time and are stored with an explicit schema version.
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
  /** Distinguishes corrected dual-spine/coverage labels from older v2 rows. */
  methodVersion: 2,
  /** Max rows to label per cron run (free-tier friendly). */
  batchSize: 50,
  /** Retry incomplete snapshot windows before finalizing them as unlabeled. */
  retryWindowHours: 24,
} as const;

export interface SafetyOutcome {
  labelSpecVersion: number;
  methodVersion: number;
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
  provider: string | null;
  data_age_seconds: number | null;
  price: number | null;
  deviation_pct: number | null;
}

/** The collection job runs every 15 minutes; a missed slot censors negatives. */
const FINE_COVERAGE_GAP_MS = 20 * 60_000;
const SNAPSHOT_PAGE_SIZE = 1_000;
const SNAPSHOT_MAX_ROWS = 5_000;

interface PendingCheckRow {
  id: string;
  asset: string;
  chain_id: number;
  created_at: string;
  consensus_price: number | null;
}

/**
 * Compute the outcome label for a single check by examining the asset's
 * consensus-price trajectory and cross-oracle deviation over the window after
 * the check. Returns null when no snapshot data is available for the window.
 */
export async function computeOutcome(
  asset: string,
  checkTimestamp: string,
  windowHours: number = OUTCOME_THRESHOLDS.evalWindowHours,
  checkPrice?: number | null
): Promise<SafetyOutcome | null> {
  const supabase = createServiceRoleClient();
  const from = new Date(checkTimestamp);
  const to = new Date(from.getTime() + windowHours * 3600_000);
  // Include a couple of preceding hours so we can establish a baseline price.
  const fromMinus = new Date(from.getTime() - 2 * 3600_000);

  // Training labels use hourly observations plus any between-hour incident
  // found in the 15-minute spine for BOTH horizons. Backfill must use the same
  // sources, or the same event can be positive in training and negative live.
  const fetchRows = async (
    table: 'price_snapshots' | 'hourly_price_snapshots',
    timeColumn: 'snapshot_ts' | 'snapshot_hour'
  ) => {
    const rows: Array<Record<string, unknown>> = [];
    for (let offset = 0; offset < SNAPSHOT_MAX_ROWS; offset += SNAPSHOT_PAGE_SIZE) {
      const { data, error } = await supabase
        .from(table)
        .select(`${timeColumn}, provider, data_age_seconds, price, deviation_pct`)
        .eq('symbol', asset)
        .eq('is_success', true)
        .gt('price', 0)
        .gt(timeColumn, fromMinus.toISOString())
        .lte(timeColumn, to.toISOString())
        .order(timeColumn, { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + SNAPSHOT_PAGE_SIZE - 1);
      if (error) return { data: null, error };
      const page = (data ?? []) as Array<Record<string, unknown>>;
      rows.push(...page);
      if (page.length < SNAPSHOT_PAGE_SIZE) return { data: rows, error: null };
    }
    return {
      data: null,
      error: { message: `${table} exceeded ${SNAPSHOT_MAX_ROWS} rows in outcome window` },
    };
  };
  const [fineResult, hourlyResult] = await Promise.all([
    fetchRows('price_snapshots', 'snapshot_ts'),
    fetchRows('hourly_price_snapshots', 'snapshot_hour'),
  ]);

  if (fineResult.error || hourlyResult.error) {
    logger.warn('Failed to fetch outcome snapshots', {
      asset,
      error: fineResult.error?.message ?? hourlyResult.error?.message,
    });
    return null;
  }
  const mapRows = (data: unknown[] | null, timeColumn: 'snapshot_ts' | 'snapshot_hour') =>
    ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      snapshot_hour: String(row[timeColumn] ?? row.snapshot_hour),
      provider: typeof row.provider === 'string' ? row.provider : null,
      data_age_seconds: row.data_age_seconds == null ? null : Number(row.data_age_seconds),
      price: row.price as number | null,
      deviation_pct: row.deviation_pct as number | null,
    })) as SnapshotRow[];
  const fineRows = mapRows(fineResult.data, 'snapshot_ts');
  const hourlyRows = mapRows(hourlyResult.data, 'snapshot_hour');
  if (fineRows.length === 0 && hourlyRows.length === 0) return null;

  // Aggregate provider rows at each observation time. The trainer excludes
  // observations with fewer than two successful providers, so backfill must
  // not let a single surviving source establish an event or a negative.
  const aggregate = (source: SnapshotRow[]) => {
    const byProvider = new Map<string, Map<string, SnapshotRow>>();
    for (const row of source) {
      if (!row.provider) continue;
      const providers = byProvider.get(row.snapshot_hour) ?? new Map<string, SnapshotRow>();
      const previous = providers.get(row.provider);
      if (!previous || (row.data_age_seconds ?? Infinity) < (previous.data_age_seconds ?? Infinity))
        providers.set(row.provider, row);
      byProvider.set(row.snapshot_hour, providers);
    }
    const observations = new Map<
      string,
      { consensus: number[]; maxDev: number; hasDeviation: boolean; providers: Set<string> }
    >();
    for (const [key, providers] of byProvider) {
      const entry: {
        consensus: number[];
        maxDev: number;
        hasDeviation: boolean;
        providers: Set<string>;
      } = {
        consensus: [],
        maxDev: 0,
        hasDeviation: false,
        providers: new Set<string>(),
      };
      for (const row of providers.values()) {
        if (row.provider) entry.providers.add(row.provider);
        if (row.price != null) entry.consensus.push(Number(row.price));
        if (row.deviation_pct != null) {
          entry.hasDeviation = true;
          entry.maxDev = Math.max(entry.maxDev, Math.abs(Number(row.deviation_pct)));
        }
      }
      observations.set(key, entry);
    }
    return new Map([...observations].filter(([, observation]) => observation.providers.size >= 2));
  };
  const fineObservations = aggregate(fineRows);
  const hourlyObservations = aggregate(hourlyRows);
  // The trainer derives consensus from the median of de-duplicated raw
  // provider prices, not from the collector's stored consensus_price field.
  const median = (prices: number[]) => {
    const sorted = [...prices].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  };
  // Check quorum per source before merging; two single-provider snapshots from
  // different spines must not masquerade as one supported observation.
  const allObservations = new Map([...hourlyObservations, ...fineObservations]);
  // The hourly row is upserted throughout its hour, so its final value may
  // reflect data collected AFTER this check. Only use the price recorded at
  // check time, or a fine snapshot actually timestamped before the check.
  const prior = [...fineObservations]
    .filter(([time, observation]) => new Date(time) <= from && observation.consensus.length > 0)
    .sort(([left], [right]) => new Date(left).getTime() - new Date(right).getTime())
    .at(-1);
  const recordedPrice = checkPrice == null ? null : Number(checkPrice);
  const hasRecordedPrice =
    recordedPrice !== null && Number.isFinite(recordedPrice) && recordedPrice > 0;
  const baselinePrice = hasRecordedPrice
    ? recordedPrice
    : prior
      ? median(prior[1].consensus)
      : null;
  const baselineAt = hasRecordedPrice
    ? from.getTime()
    : prior
      ? new Date(prior[0]).getTime()
      : null;

  // Track A sees both spines; Track B below sees only the hourly spine.
  const byHour = new Map([...allObservations].filter(([time]) => new Date(time) > from));
  if (byHour.size === 0) return null;
  const hourlyByHour = new Map([...hourlyObservations].filter(([time]) => new Date(time) > from));

  let maxPriceMovePct = 0;
  let maxDeviationPct = 0;
  for (const entry of byHour.values()) {
    if (baselinePrice && baselinePrice > 0 && entry.consensus.length > 0) {
      const consensus = median(entry.consensus);
      const movePct = Math.abs((consensus - baselinePrice) / baselinePrice) * 100;
      if (movePct > maxPriceMovePct) maxPriceMovePct = movePct;
    }
    if (entry.maxDev > maxDeviationPct) maxDeviationPct = entry.maxDev;
  }

  // Track-B (label spec v2): oracle-vs-market divergence over the same window,
  // from the CEX market-reference layer. |medianPrice_hour - ref_hour|/ref*100.
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
      // Track B is trained on hourly oracle-vs-market observations. Fine rows
      // add Track-A price/deviation incidents, not new market-reference labels.
      for (const [key, entry] of hourlyByHour.entries()) {
        const eventTime = new Date(key).getTime();
        const refHour = Math.floor(eventTime / 3600_000) * 3600_000;
        const ref = refByHour.get(refHour);
        if (ref === undefined || entry.consensus.length === 0) continue;
        const consensus = median(entry.consensus);
        const div = (Math.abs(consensus - ref) / ref) * 100;
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
  if (!label) {
    // A negative means no event throughout the full horizon. One benign
    // observation in a partial window is not evidence of that; leave it NULL.
    if (
      baselinePrice === null ||
      !Number.isFinite(baselinePrice) ||
      baselinePrice <= 0 ||
      baselineAt === null ||
      from.getTime() - baselineAt > FINE_COVERAGE_GAP_MS
    )
      return null;
    const fineTimes = [...fineObservations]
      .filter(
        ([time, observation]) =>
          new Date(time) > from && observation.consensus.length > 0 && observation.hasDeviation
      )
      .map(([time]) => new Date(time).getTime())
      .sort((a, b) => a - b);
    let coveredUntil = from.getTime();
    for (const observedAt of fineTimes) {
      if (observedAt - coveredUntil > FINE_COVERAGE_GAP_MS) return null;
      coveredUntil = observedAt;
    }
    if (to.getTime() - coveredUntil > FINE_COVERAGE_GAP_MS) return null;
  }

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
    methodVersion: OUTCOME_THRESHOLDS.methodVersion,
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
    .select('id, asset, chain_id, created_at, consensus_price')
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
        computeOutcome(row.asset, row.created_at, 1, row.consensus_price),
        computeOutcome(
          row.asset,
          row.created_at,
          OUTCOME_THRESHOLDS.evalWindowHours,
          row.consensus_price
        ),
      ]);

      // The snapshot collector or market data may be late. Revisit incomplete
      // windows on the next run, but eventually finalize missing evidence as
      // NULL so old rows cannot occupy the bounded batch forever.
      const ageHours = (Date.now() - new Date(row.created_at).getTime()) / 3600_000;
      if ((!outcome1h || !outcome6h) && ageHours < OUTCOME_THRESHOLDS.retryWindowHours) {
        skipped++;
        continue;
      }

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
