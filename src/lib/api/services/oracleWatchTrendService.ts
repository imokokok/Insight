import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

import type { OracleWatchMlRiskLevel, OracleWatchTrustLevel } from './oracleWatchService';

const logger = createLogger('oracle-watch-trend');

/**
 * Retrospective credibility query over the feed_health_snapshots time-series.
 *
 * This is what turns Oracle Watch from a one-shot "point" check into an
 * always-on credibility layer: a dependent agent can ask "how did this feed's
 * trust evolve over the last N hours?" without having to poll and store the
 * history itself. Rows are produced by scripts/collect-oracle-watch.ts (every
 * 30 min) into the table created by migration 0034.
 */

export interface OracleWatchHistoryPoint {
  evaluatedAt: string;
  verdict: string;
  recommendation: string;
  maxDeviationPct: number | null;
  agreement: number;
  participantCount: number;
  mlRiskScore: number | null;
  mlRiskLevel: OracleWatchMlRiskLevel | null;
  /** Composite 0-100 credibility rating (higher = better). */
  trustScore: number | null;
  trustLevel: OracleWatchTrustLevel | null;
}

export interface OracleWatchHistorySummary {
  pointCount: number;
  /** Verdict of the most recent snapshot, or null when empty. */
  currentVerdict: string | null;
  /** Counts per verdict bucket. */
  normal: number;
  caution: number;
  danger: number;
  /** Fraction of time spent in caution or danger (0-1). Low is good. */
  degradedRatio: number;
  /** Stability: 0-100 share of snapshots rated NORMAL in the window. */
  stabilityScore: number;
  /** Mean cross-provider agreement over the window (0-1). */
  avgAgreement: number;
  /** Worst deviation seen in the window (%). */
  maxDeviationPct: number | null;
  /** Mean of the most recent trust scores (0-100), or null when unknown. */
  trustScore: number | null;
  /** Discrete trust gate derived from the mean trust score. */
  trustLevel: OracleWatchTrustLevel | null;
  /** Timestamp of the newest snapshot in the window, or null when empty. */
  lastCollectedAt: string | null;
  /** True when collection has gone quiet (newest snapshot older than the
   *  staleness window) so agents do not gate on a cold spine. */
  spineStale: boolean;
}

/** Bucketing granularity for /history. '30min' returns the raw spine as-is. */
export type OracleWatchInterval = '30min' | 'hourly' | 'daily';

export interface OracleWatchHistoryResult {
  symbol: string;
  chain: string | null;
  days: number;
  /** Requested aggregation grain ('30min' = raw). */
  grain: OracleWatchInterval;
  series: OracleWatchHistoryPoint[];
  summary: OracleWatchHistorySummary;
}

/** Severity rank used when collapsing a bucket to its worst verdict. */
const VERDICT_RANK: Record<string, number> = { normal: 0, caution: 1, danger: 2 };

/** Round an ISO timestamp down to the requested grain boundary. */
function bucketKey(evaluatedAt: string, interval: OracleWatchInterval): string {
  const d = new Date(evaluatedAt);
  if (Number.isNaN(d.getTime())) return evaluatedAt;
  if (interval === '30min') return d.toISOString();
  if (interval === 'hourly') {
    d.setUTCMinutes(0, 0, 0);
    return d.toISOString();
  }
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Aggregate a raw series to a coarser grain. Each bucket keeps the worst
 * verdict, the max deviation, the mean agreement/participant count, and the
 * latest mlRisk/level. Pure so it is trivially unit-testable.
 */
export function aggregateOracleWatchSeries(
  points: OracleWatchHistoryPoint[],
  interval: OracleWatchInterval
): OracleWatchHistoryPoint[] {
  if (interval === '30min' || points.length === 0) return points;

  const buckets = new Map<string, OracleWatchHistoryPoint[]>();
  for (const p of points) {
    const key = bucketKey(p.evaluatedAt, interval);
    const arr = buckets.get(key) ?? [];
    arr.push(p);
    buckets.set(key, arr);
  }

  const keys = Array.from(buckets.keys()).sort();
  return keys.map((key) => {
    const group = buckets.get(key)!;
    let verdict = 'normal';
    for (const p of group) {
      if ((VERDICT_RANK[p.verdict] ?? 0) > (VERDICT_RANK[verdict] ?? 0)) verdict = p.verdict;
    }
    const devs = group
      .map((p) => p.maxDeviationPct)
      .filter((v): v is number => v !== null && Number.isFinite(v));
    const agreement = group.reduce((s, p) => s + p.agreement, 0) / group.length;
    const participantCount = Math.round(
      group.reduce((s, p) => s + p.participantCount, 0) / group.length
    );
    // Worst/best by severity, recommendation from the worst-verdict point.
    const worstPoint = group.reduce((a, b) =>
      (VERDICT_RANK[b.verdict] ?? 0) > (VERDICT_RANK[a.verdict] ?? 0) ? b : a
    );
    const mlScores = group
      .map((p) => p.mlRiskScore)
      .filter((v): v is number => v !== null && Number.isFinite(v));
    const trustScores = group
      .map((p) => p.trustScore)
      .filter((v): v is number => v !== null && Number.isFinite(v));

    return {
      evaluatedAt: key,
      verdict,
      recommendation: worstPoint.recommendation,
      maxDeviationPct: devs.length > 0 ? Math.max(...devs) : null,
      agreement: Number(agreement.toFixed(4)),
      participantCount,
      mlRiskScore: mlScores.length > 0 ? Math.max(...mlScores) : null,
      // Take the mlRiskLevel of the point that produced the worst ml score.
      mlRiskLevel:
        mlScores.length > 0
          ? (group[group.findIndex((p) => p.mlRiskScore === Math.max(...mlScores))]?.mlRiskLevel ??
            null)
          : null,
      // Worst (lowest) trust within the bucket — consistent with keeping the
      // worst verdict for the window.
      trustScore: trustScores.length > 0 ? Math.min(...trustScores) : null,
      trustLevel:
        trustScores.length > 0
          ? (group[group.findIndex((p) => p.trustScore === Math.min(...trustScores))]?.trustLevel ??
            null)
          : null,
    };
  });
}

/** Pure aggregation over a series — kept separate so it is trivial to unit-test. */
export function summarizeOracleWatchSeries(
  points: OracleWatchHistoryPoint[]
): OracleWatchHistorySummary {
  if (points.length === 0) {
    return {
      pointCount: 0,
      currentVerdict: null,
      normal: 0,
      caution: 0,
      danger: 0,
      degradedRatio: 0,
      stabilityScore: 0,
      avgAgreement: 0,
      maxDeviationPct: null,
      trustScore: null,
      trustLevel: null,
      lastCollectedAt: null,
      spineStale: false,
    };
  }

  let normal = 0;
  let caution = 0;
  let danger = 0;
  let agreementSum = 0;
  let maxDeviationPct: number | null = null;
  const trustScores: number[] = [];

  for (const p of points) {
    if (p.verdict === 'normal') normal += 1;
    else if (p.verdict === 'caution') caution += 1;
    else if (p.verdict === 'danger') danger += 1;
    agreementSum += p.agreement;
    if (p.maxDeviationPct !== null) {
      maxDeviationPct = Math.max(maxDeviationPct ?? 0, p.maxDeviationPct);
    }
    if (p.trustScore !== null && Number.isFinite(p.trustScore)) {
      trustScores.push(p.trustScore);
    }
  }

  const currentVerdict = points[points.length - 1].verdict;
  const degradedRatio = points.length > 0 ? (caution + danger) / points.length : 0;
  const trustScore =
    trustScores.length > 0
      ? Math.round(trustScores.reduce((s, v) => s + v, 0) / trustScores.length)
      : null;

  return {
    pointCount: points.length,
    currentVerdict,
    normal,
    caution,
    danger,
    degradedRatio,
    stabilityScore: Math.round((normal / points.length) * 100 * 100) / 100,
    avgAgreement: points.length > 0 ? agreementSum / points.length : 0,
    maxDeviationPct,
    trustScore,
    trustLevel:
      trustScore === null ? null : trustScore >= 75 ? 'high' : trustScore >= 50 ? 'medium' : 'low',
    // Aggregation is pure; staleness is resolved relative to `now` by the
    // caller (getOracleWatchHistory). Default to the newest point here.
    lastCollectedAt: points[points.length - 1].evaluatedAt,
    spineStale: false,
  };
}

export async function getOracleWatchHistory(args: {
  symbol: string;
  chain?: string;
  days: number;
  interval?: OracleWatchInterval;
}): Promise<OracleWatchHistoryResult> {
  const { symbol, chain, days } = args;
  const interval: OracleWatchInterval = args.interval ?? '30min';
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const supabase = createServiceRoleClient();
  let query = supabase
    .from('feed_health_snapshots')
    .select('*')
    .eq('symbol', symbol)
    .gte('evaluated_at', cutoff)
    .order('evaluated_at', { ascending: true });
  if (chain) {
    query = query.eq('chain', chain);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch Oracle Watch history: ${error.message}`);
  }

  const raw: OracleWatchHistoryPoint[] = (data ?? []).map((row) => ({
    evaluatedAt: row.evaluated_at,
    verdict: row.verdict,
    recommendation: row.recommendation,
    maxDeviationPct: row.max_deviation_pct,
    agreement: row.agreement,
    participantCount: row.participant_count,
    mlRiskScore: row.ml_risk_score,
    mlRiskLevel: row.ml_risk_level,
    trustScore: row.trust_score,
    trustLevel: row.trust_level,
  }));
  const series = aggregateOracleWatchSeries(raw, interval);
  const summary = summarizeOracleWatchSeries(series);

  // Spine staleness guard: the 30-min collector writes every ~30 min. If the
  // newest snapshot is older than the staleness window, surface `spineStale`
  // so a dependent agent does not treat a cold trend as trustworthy.
  const now = Date.now();
  let spineStale = false;
  let lastCollectedAt: string | null = summary.lastCollectedAt;
  if (raw.length > 0) {
    const newest = Date.parse(raw[raw.length - 1].evaluatedAt);
    lastCollectedAt = raw[raw.length - 1].evaluatedAt;
    if (Number.isNaN(newest) || now - newest > SPINE_STALE_WINDOW_MS) spineStale = true;
  }

  return {
    symbol,
    chain: chain ?? null,
    days,
    grain: interval,
    series,
    summary: { ...summary, lastCollectedAt, spineStale },
  };
}

/**
 * Staleness window for the spine: 1.5x the 30-min collection cadence. Past
 * this the most recent row is treated as cold and `spineStale` is set.
 */
const SPINE_STALE_WINDOW_MS = 45 * 60 * 1000;

// Keep logger referenced for future diagnostics while avoiding a no-shadow lint
// on the unused import in non-node runtimes.
void logger;
