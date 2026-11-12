// Oracle Watch history read path on the Turso ops data plane (egress
// retirement). TS port of the Supabase RPC get_oracle_watch_history
// (migration 0048) over the feed_health_snapshots mirror, gated by
// TURSO_ORACLE_WATCH_HISTORY_MODE=turso in
// src/lib/api/services/oracleWatchTrendService.ts.
//
// Parity contract with the RPC (Postgres semantics, session TimeZone UTC —
// PostgREST sessions run UTC, so date_trunc buckets are UTC-aligned):
// - symbol normalized via upper(trim()); chain null when blank, else
//   lower(trim()); global requests match chain IS NULL rows only.
// - days clamped 1..365; grain CASE: >30d → daily, >7d && '30min' → hourly,
//   otherwise the requested interval (validated).
// - window: evaluated_at >= now() - days.
// - bucket verdict = max rank (danger 2 > caution 1 > normal 0);
//   recommendation from the highest-rank row, ties broken by EARLIEST
//   evaluated_at; max deviation; agreement rounded to 4 decimals;
//   participant_count rounded to integer; max ml risk score with the level
//   taken from the highest-scoring non-null row (ties: latest evaluated_at);
//   min trust score with the level from the lowest-scoring non-null row
//   (ties: latest evaluated_at); buckets sorted ascending.
//
// Mixed timestamp renderings in the mirror (backfill '+00:00' vs collector
// '.000Z') are handled by parsing before grouping, matching the
// market-reference port's approach in marketReferenceRepository.ts.
import type { Client, InValue } from '@libsql/client';

export type TursoOracleWatchHistoryMode = 'supabase' | 'turso';

export function readTursoOracleWatchHistoryMode(
  value: string | undefined = process.env.TURSO_ORACLE_WATCH_HISTORY_MODE
): TursoOracleWatchHistoryMode {
  if (value === undefined || value === '' || value === 'supabase') return 'supabase';
  if (value === 'turso') return value;
  throw new Error('TURSO_ORACLE_WATCH_HISTORY_MODE must be supabase or turso');
}

export type TursoOracleWatchInterval = '30min' | 'hourly' | 'daily';

export interface TursoOracleWatchHistoryArgs {
  symbol: string;
  chain: string | null;
  days: number;
  interval: TursoOracleWatchInterval;
}

/** Mirrors the RPC's RETURNS TABLE shape consumed by oracleWatchTrendService. */
export interface TursoOracleWatchHistoryRow {
  bucket_at: string;
  last_observed_at: string;
  verdict: string;
  recommendation: string;
  max_deviation_pct: number | null;
  agreement: number;
  participant_count: number;
  ml_risk_score: number | null;
  ml_risk_level: string | null;
  trust_score: number | null;
  trust_level: string | null;
}

interface MirrorRow {
  evaluatedAtMs: number;
  evaluatedAt: string;
  verdict: string;
  recommendation: string;
  maxDeviationPct: number | null;
  agreement: number;
  participantCount: number;
  mlRiskScore: number | null;
  mlRiskLevel: string | null;
  trustScore: number | null;
  trustLevel: string | null;
}

const VERDICT_RANK: Record<string, number> = { danger: 2, caution: 1 };

function verdictRank(verdict: string): number {
  return VERDICT_RANK[verdict] ?? 0;
}

/**
 * The RPC's grain CASE (migration 0048). Idempotent over the service's
 * resolveOracleWatchHistoryInterval output, so both call orders agree.
 */
export function resolveHistoryGrain(
  days: number,
  interval: TursoOracleWatchInterval
): TursoOracleWatchInterval {
  if (days > 30) return 'daily';
  if (days > 7 && interval === '30min') return 'hourly';
  return interval;
}

/** PG round(numeric, 4): half away from zero at 4 decimals. */
function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** PG round(double)::int: half away from zero at 0 decimals. */
function roundToInt(value: number): number {
  return Math.round(value);
}

function bucketStartMs(evaluatedAtMs: number, grain: TursoOracleWatchInterval): number {
  if (grain === '30min') return evaluatedAtMs;
  const d = new Date(evaluatedAtMs);
  if (grain === 'daily') {
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours());
}

export async function readTursoOracleWatchHistory(
  client: Client,
  args: TursoOracleWatchHistoryArgs
): Promise<TursoOracleWatchHistoryRow[]> {
  const symbol = args.symbol.trim().toUpperCase();
  const chain =
    args.chain === null || args.chain.trim() === '' ? null : args.chain.trim().toLowerCase();
  const days = Math.max(1, Math.min(args.days ?? 7, 365));
  const grain = resolveHistoryGrain(days, args.interval);
  const cutoffMs = Date.now() - days * 86_400_000;
  // SQL-side prefilter on the shared minute-prefix (both mirror renderings —
  // '+00:00' and '.000Z' — order identically up to seconds), then an exact
  // parsed-time filter below. 5 minutes of slack covers render drift.
  const prefixFloor = new Date(cutoffMs - 5 * 60_000).toISOString().slice(0, 19);

  const result = await client.execute({
    sql: `
      SELECT symbol, chain, evaluated_at, verdict, recommendation,
             max_deviation_pct, agreement, participant_count,
             ml_risk_score, ml_risk_level, trust_score, trust_level
      FROM feed_health_snapshots
      WHERE symbol = ? AND evaluated_at >= ?
        AND ${chain === null ? 'chain IS NULL' : 'chain = ?'}
    `,
    args: (chain === null ? [symbol, prefixFloor] : [symbol, prefixFloor, chain]) as InValue[],
  });

  const rows: MirrorRow[] = [];
  for (const row of result.rows) {
    const evaluatedAt = String(row.evaluated_at);
    const evaluatedAtMs = Date.parse(evaluatedAt);
    if (!Number.isFinite(evaluatedAtMs) || evaluatedAtMs < cutoffMs) continue;
    rows.push({
      evaluatedAtMs,
      evaluatedAt,
      verdict: String(row.verdict),
      recommendation: String(row.recommendation),
      maxDeviationPct: row.max_deviation_pct === null ? null : Number(row.max_deviation_pct),
      agreement: Number(row.agreement),
      participantCount: Number(row.participant_count),
      mlRiskScore: row.ml_risk_score === null ? null : Number(row.ml_risk_score),
      mlRiskLevel: row.ml_risk_level === null ? null : String(row.ml_risk_level),
      trustScore: row.trust_score === null ? null : Number(row.trust_score),
      trustLevel: row.trust_level === null ? null : String(row.trust_level),
    });
  }

  const byRankThenEarliest = (a: MirrorRow, b: MirrorRow): number => {
    const rank = verdictRank(b.verdict) - verdictRank(a.verdict);
    if (rank !== 0) return rank;
    return a.evaluatedAtMs - b.evaluatedAtMs;
  };

  const groups = new Map<number, MirrorRow[]>();
  for (const row of rows) {
    const key = bucketStartMs(row.evaluatedAtMs, grain);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([bucketMs, group]) => {
      const lastObserved = Math.max(...group.map((r) => r.evaluatedAtMs));
      const topVerdict = [...group].sort(byRankThenEarliest)[0];

      const mlCandidates = group
        .filter((r) => r.mlRiskScore !== null)
        .sort(
          (a, b) =>
            (b.mlRiskScore as number) - (a.mlRiskScore as number) ||
            b.evaluatedAtMs - a.evaluatedAtMs
        );
      const mlTop = mlCandidates[0] ?? null;

      const trustCandidates = group
        .filter((r) => r.trustScore !== null)
        .sort(
          (a, b) =>
            (a.trustScore as number) - (b.trustScore as number) || b.evaluatedAtMs - a.evaluatedAtMs
        );
      const trustTop = trustCandidates[0] ?? null;

      const maxOf = (key: 'maxDeviationPct' | 'mlRiskScore'): number | null => {
        const values = group
          .map((r) => r[key])
          .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
        if (values.length === 0) return null;
        return Math.max(...values);
      };
      const minOf = (key: 'trustScore'): number | null => {
        const values = group
          .map((r) => r[key])
          .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
        if (values.length === 0) return null;
        return Math.min(...values);
      };

      return {
        bucket_at: new Date(bucketMs).toISOString(),
        last_observed_at: new Date(lastObserved).toISOString(),
        verdict:
          verdictRank(topVerdict.verdict) === 2
            ? 'danger'
            : verdictRank(topVerdict.verdict) === 1
              ? 'caution'
              : 'normal',
        recommendation: topVerdict.recommendation,
        max_deviation_pct: maxOf('maxDeviationPct'),
        agreement: round4(group.reduce((sum, r) => sum + r.agreement, 0) / group.length),
        participant_count: roundToInt(
          group.reduce((sum, r) => sum + r.participantCount, 0) / group.length
        ),
        ml_risk_score: maxOf('mlRiskScore'),
        ml_risk_level: mlTop === null ? null : mlTop.mlRiskLevel,
        trust_score: minOf('trustScore'),
        trust_level: trustTop === null ? null : trustTop.trustLevel,
      };
    });
}
