import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

import type { OracleWatchMlRiskLevel } from './oracleWatchService';

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
  /** Mean cross-provider agreement over the window (0-1). */
  avgAgreement: number;
  /** Worst deviation seen in the window (%). */
  maxDeviationPct: number | null;
}

export interface OracleWatchHistoryResult {
  symbol: string;
  chain: string | null;
  days: number;
  series: OracleWatchHistoryPoint[];
  summary: OracleWatchHistorySummary;
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
      avgAgreement: 0,
      maxDeviationPct: null,
    };
  }

  let normal = 0;
  let caution = 0;
  let danger = 0;
  let agreementSum = 0;
  let maxDeviationPct: number | null = null;

  for (const p of points) {
    if (p.verdict === 'normal') normal += 1;
    else if (p.verdict === 'caution') caution += 1;
    else if (p.verdict === 'danger') danger += 1;
    agreementSum += p.agreement;
    if (p.maxDeviationPct !== null) {
      maxDeviationPct = Math.max(maxDeviationPct ?? 0, p.maxDeviationPct);
    }
  }

  const currentVerdict = points[points.length - 1].verdict;
  const degradedRatio = points.length > 0 ? (caution + danger) / points.length : 0;

  return {
    pointCount: points.length,
    currentVerdict,
    normal,
    caution,
    danger,
    degradedRatio,
    avgAgreement: points.length > 0 ? agreementSum / points.length : 0,
    maxDeviationPct,
  };
}

export async function getOracleWatchHistory(args: {
  symbol: string;
  chain?: string;
  days: number;
}): Promise<OracleWatchHistoryResult> {
  const { symbol, chain, days } = args;
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

  const series: OracleWatchHistoryPoint[] = (data ?? []).map((row) => ({
    evaluatedAt: row.evaluated_at,
    verdict: row.verdict,
    recommendation: row.recommendation,
    maxDeviationPct: row.max_deviation_pct,
    agreement: row.agreement,
    participantCount: row.participant_count,
    mlRiskScore: row.ml_risk_score,
    mlRiskLevel: row.ml_risk_level,
  }));

  return {
    symbol,
    chain: chain ?? null,
    days,
    series,
    summary: summarizeOracleWatchSeries(series),
  };
}

// Keep logger referenced for future diagnostics while avoiding a no-shadow lint
// on the unused import in non-node runtimes.
void logger;
