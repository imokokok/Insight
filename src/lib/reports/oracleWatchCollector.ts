import {
  getOracleWatchSignal,
  type OracleWatchResult,
} from '@/lib/api/services/oracleWatchService';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  appendFeedHealthSnapshotsOnTurso,
  readTursoFeedHealthMode,
} from '@/lib/turso/ops/feedHealthRepository';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';

import { ORACLE_WATCH_HISTORY_UNIVERSE, type OracleWatchTarget } from './oracleWatchUniverse';

const logger = createLogger('oracle-watch-collector');

export type { OracleWatchTarget } from './oracleWatchUniverse';

/** Chain-agnostic symbols: one global cross-oracle view each. Kept curated to
 *  bound upstream provider-fetch cost at the 30-min cadence. */
const GLOBAL_TARGET_SYMBOLS = [
  'BTC',
  'ETH',
  'SOL',
  'BNB',
  'XRP',
  'ADA',
  'AVAX',
  'ARB',
  'OP',
  'LINK',
  'UNI',
  'AAVE',
  'MATIC',
  'USDC',
  'USDT',
  'DAI',
] as const;

/**
 * Every target the collector evaluates on each pass: the global spine PLUS the
 * per-chain pairs `/history` promises a curve for.
 *
 * The global rows answer "is this asset healthy across every feed we see"; the
 * per-chain rows answer "is it healthy on the chain my strategy runs on" —
 * which is a different question when one chain's feed is the broken one.
 */
export const ORACLE_WATCH_TARGETS: OracleWatchTarget[] = [
  ...GLOBAL_TARGET_SYMBOLS.map((symbol) => ({ symbol })),
  ...ORACLE_WATCH_HISTORY_UNIVERSE.map((t) => ({ symbol: t.symbol, chain: t.chain })),
];

/** Serialization bound for the fan-out across targets (mirrors reputation cron
 *  to avoid tripping upstream rate limits). */
const COLLECT_CONCURRENCY = 6;

export interface FeedHealthSnapshotRow {
  symbol: string;
  chain: string | null;
  evaluated_at: string;
  verdict: string;
  recommendation: string;
  reason: string;
  max_deviation_pct: number | null;
  agreement: number;
  participant_count: number;
  outlier_count: number;
  stale_count: number;
  consensus_price: number | null;
  ml_risk_score: number | null;
  ml_risk_level: string | null;
  avg_reputation: number | null;
  min_reputation: number | null;
  quorum_satisfied: boolean | null;
  trust_score: number | null;
  trust_level: string | null;
}

/** Map an Oracle Watch signal onto the feed_health_snapshots row shape. */
export function buildFeedHealthSnapshotRow(
  signal: OracleWatchResult,
  evaluatedAt = signal.evaluatedAt
): FeedHealthSnapshotRow {
  return {
    symbol: signal.symbol,
    chain: signal.chain,
    evaluated_at: evaluatedAt,
    verdict: signal.verdict,
    recommendation: signal.recommendation,
    reason: signal.reason,
    max_deviation_pct: signal.maxDeviationPct,
    agreement: signal.agreement,
    participant_count: signal.participantCount,
    outlier_count: signal.outlierCount,
    stale_count: signal.staleCount,
    consensus_price: signal.consensusPrice,
    ml_risk_score: signal.mlRiskScore,
    ml_risk_level: signal.mlRiskLevel,
    avg_reputation: signal.avgReputation,
    min_reputation: signal.minReputation,
    quorum_satisfied: signal.quorumSatisfied ?? null,
    trust_score: typeof signal.trustScore === 'number' ? signal.trustScore : null,
    trust_level: signal.trustLevel ?? null,
  };
}

/** Collect signals for all targets and append them to feed_health_snapshots. */
export async function collectOracleWatchSnapshots(
  targets: OracleWatchTarget[] = ORACLE_WATCH_TARGETS
): Promise<{ collected: number }> {
  const signals = await mapWithConcurrency(targets, COLLECT_CONCURRENCY, async (target) => {
    try {
      return await getOracleWatchSignal(target.symbol, target.chain);
    } catch (error) {
      logger.warn('Oracle Watch collect failed for target', {
        symbol: target.symbol,
        chain: target.chain ?? null,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  });

  const rows = signals
    .filter((s): s is OracleWatchResult => s !== null)
    .map((s) => buildFeedHealthSnapshotRow(s));
  if (rows.length === 0) return { collected: 0 };

  if (readTursoFeedHealthMode() === 'turso') {
    // Egress-retired end state: the Oracle Watch spine appends to the Turso
    // ops data plane, so Supabase egress never gates the 30-min cadence.
    const written = await appendFeedHealthSnapshotsOnTurso(
      rows.map((row) => ({
        symbol: row.symbol,
        chain: row.chain,
        evaluatedAt: row.evaluated_at,
        verdict: row.verdict,
        recommendation: row.recommendation,
        reason: row.reason,
        maxDeviationPct: row.max_deviation_pct,
        agreement: row.agreement,
        participantCount: row.participant_count,
        outlierCount: row.outlier_count,
        staleCount: row.stale_count,
        consensusPrice: row.consensus_price,
        mlRiskScore: row.ml_risk_score,
        mlRiskLevel: row.ml_risk_level,
        avgReputation: row.avg_reputation,
        minReputation: row.min_reputation,
        quorumSatisfied: row.quorum_satisfied,
        trustScore: row.trust_score,
        trustLevel: row.trust_level,
      }))
    );
    logger.info(`Oracle Watch collected ${written} snapshots (turso)`);
    return { collected: written };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('feed_health_snapshots').insert(rows);
  if (error) {
    throw new Error(`Failed to insert ${rows.length} feed_health_snapshots rows: ${error.message}`);
  }

  logger.info(`Oracle Watch collected ${rows.length} snapshots`);
  return { collected: rows.length };
}
