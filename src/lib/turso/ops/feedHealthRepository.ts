// Feed-health write path on the Turso ops data plane (egress retirement v6).
// The Oracle Watch collector appends to feed_health_snapshots; under
// TURSO_FEED_HEALTH_MODE=turso the insert lands here instead of Supabase.
import { getTursoOpsClient } from './client';

import type { Client, InValue } from '@libsql/client';

export type TursoFeedHealthMode = 'supabase' | 'turso';

export function readTursoFeedHealthMode(
  value: string | undefined = process.env.TURSO_FEED_HEALTH_MODE
): TursoFeedHealthMode {
  if (value === undefined || value === '' || value === 'supabase') return 'supabase';
  if (value === 'turso') return value;
  throw new Error('TURSO_FEED_HEALTH_MODE must be supabase or turso');
}

export interface TursoFeedHealthSample {
  symbol: string;
  chain: string | null;
  evaluatedAt: string;
  verdict: string;
  recommendation: string;
  reason: string;
  maxDeviationPct: number | null;
  agreement: number;
  participantCount: number;
  outlierCount: number;
  staleCount: number;
  consensusPrice: number | null;
  mlRiskScore: number | null;
  mlRiskLevel: string | null;
  avgReputation: number | null;
  minReputation: number | null;
  quorumSatisfied: boolean | null;
  trustScore: number | null;
  trustLevel: string | null;
}

/**
 * Append one batch of feed-health snapshots. The Supabase path is a plain
 * insert (no unique constraint on the Postgres table), so duplicates are
 * tolerated here the same way — every run appends fresh rows.
 */
export async function insertTursoFeedHealthSnapshots(
  client: Client,
  samples: readonly TursoFeedHealthSample[]
): Promise<number> {
  if (samples.length === 0) return 0;
  const statements = samples.map((sample) => ({
    sql: `
      INSERT INTO feed_health_snapshots (
        symbol, chain, evaluated_at, verdict, recommendation, reason,
        max_deviation_pct, agreement, participant_count, outlier_count,
        stale_count, consensus_price, ml_risk_score, ml_risk_level,
        avg_reputation, min_reputation, quorum_satisfied, trust_score,
        trust_level, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      sample.symbol,
      sample.chain,
      sample.evaluatedAt,
      sample.verdict,
      sample.recommendation,
      sample.reason,
      sample.maxDeviationPct,
      sample.agreement,
      sample.participantCount,
      sample.outlierCount,
      sample.staleCount,
      sample.consensusPrice,
      sample.mlRiskScore,
      sample.mlRiskLevel,
      sample.avgReputation,
      sample.minReputation,
      sample.quorumSatisfied === null ? null : sample.quorumSatisfied ? 1 : 0,
      sample.trustScore,
      sample.trustLevel,
      new Date().toISOString(),
    ] satisfies InValue[],
  }));
  const results = await client.batch(statements, 'write');
  return results.reduce((sum, result) => sum + Number(result.rowsAffected ?? 0), 0);
}

/**
 * Entry-point helper that resolves the shared ops client (it owns env parsing
 * and connection caching) and applies the schema before the first write.
 */
export async function appendFeedHealthSnapshotsOnTurso(
  samples: readonly TursoFeedHealthSample[]
): Promise<number> {
  const { ensureTursoOpsSchema } = await import('./schema');
  const client = getTursoOpsClient();
  await ensureTursoOpsSchema(client);
  return insertTursoFeedHealthSnapshots(client, samples);
}

/** Retention trim (60-day window, migration 0137). Best-effort per run. */
export async function trimTursoFeedHealthSnapshots(
  client: Client,
  retentionDays: number,
  now: Date = new Date()
): Promise<number> {
  if (!Number.isSafeInteger(retentionDays) || retentionDays < 1) {
    throw new Error('retentionDays must be a positive integer');
  }
  const cutoff = new Date(now.getTime() - retentionDays * 86_400_000).toISOString();
  const result = await client.execute({
    sql: 'DELETE FROM feed_health_snapshots WHERE evaluated_at < ?',
    args: [cutoff],
  });
  return Number(result.rowsAffected ?? 0);
}
