import {
  getOracleWatchSignal,
  type OracleWatchResult,
} from '@/lib/api/services/oracleWatchService';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('oracle-watch-collector');

/** Symbols (chain-optional → global cross-oracle coverage) the collector tops
 *  up the feed_health_snapshots time-series with on every run. Kept curated
 *  for v1 to bound upstream provider-fetch cost at the 30-min cadence. */
export interface OracleWatchTarget {
  symbol: string;
  chain?: string;
}

export const ORACLE_WATCH_TARGETS: OracleWatchTarget[] = [
  { symbol: 'BTC' },
  { symbol: 'ETH' },
  { symbol: 'SOL' },
  { symbol: 'BNB' },
  { symbol: 'XRP' },
  { symbol: 'ADA' },
  { symbol: 'AVAX' },
  { symbol: 'ARB' },
  { symbol: 'OP' },
  { symbol: 'LINK' },
  { symbol: 'UNI' },
  { symbol: 'AAVE' },
  { symbol: 'MATIC' },
  { symbol: 'USDC' },
  { symbol: 'USDT' },
  { symbol: 'DAI' },
].map((t) => ({ symbol: t.symbol }));

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

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('feed_health_snapshots').insert(rows);
  if (error) {
    throw new Error(`Failed to insert ${rows.length} feed_health_snapshots rows: ${error.message}`);
  }

  logger.info(`Oracle Watch collected ${rows.length} snapshots`);
  return { collected: rows.length };
}
