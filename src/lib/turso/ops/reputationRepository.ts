// Turso repository for the reputation domain (egress retirement v7, 2026-11).
// Mirrors the write shape of ReputationService.calculateAndStore:
// reputation_history rows are per-run snapshot samples (no natural unique key
// in Postgres, plain `.insert()` semantics), and oracle_reputation is the
// aggregate target of the Postgres RPC aggregate_oracle_reputation_v4
// (migration 0013), ported here as a pure-TypeScript aggregation over the
// same 7-day lookback window.
//
// Mode contract (house pattern, cf. TURSO_MANIP_COST_MODE):
//   'supabase' — write Supabase only (pre-migration behaviour)
//   'turso'    — write Turso only (egress-retired end state)
// No shadow mode: reputation_history rows are non-idempotent samples, so
// dual-writing would duplicate rows AND burn egress during the restricted
// window this migration exists to escape.
import type { Client, InStatement, InValue } from '@libsql/client/web';

export type TursoReputationMode = 'supabase' | 'turso';

export function readTursoReputationMode(
  value: string | undefined = process.env.TURSO_REPUTATION_MODE
): TursoReputationMode {
  if (value === undefined || value === '' || value === 'supabase') return 'supabase';
  if (value === 'turso') return value;
  throw new Error('TURSO_REPUTATION_MODE must be supabase or turso');
}

/** Write-model row mirroring ReputationHistoryInsertRow in reputationService. */
export interface TursoReputationHistoryRow {
  provider: string;
  symbol: string;
  price: number | null;
  consensus_price: number | null;
  deviation_pct: number | null;
  latency_ms: number | null;
  confidence: number | null;
  data_age_seconds: number | null;
  is_success: boolean;
  error_message: string | null;
  failure_mode: string;
  signal_vector: Record<string, number> | null;
  consensus_context: Record<string, unknown> | null;
  snapshot_time: string;
}

const INSERT_SQL = `
  INSERT INTO reputation_history (
    provider, symbol, price, consensus_price, deviation_pct, latency_ms,
    confidence, is_success, error_message, snapshot_time, created_at,
    data_age_seconds, failure_mode, signal_vector, consensus_context
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

function toJson(value: Record<string, unknown> | null): string | null {
  return value === null ? null : JSON.stringify(value);
}

function bindRow(row: TursoReputationHistoryRow): InValue[] {
  return [
    row.provider,
    row.symbol,
    row.price,
    row.consensus_price,
    row.deviation_pct,
    row.latency_ms,
    row.confidence,
    row.is_success ? 1 : 0,
    row.error_message,
    row.snapshot_time,
    row.snapshot_time,
    row.data_age_seconds,
    row.failure_mode,
    toJson(row.signal_vector),
    toJson(row.consensus_context),
  ];
}

/**
 * Batch insert of per-run snapshot samples. Unlike the ops upsert paths there
 * is no conflict target — Postgres reputation_history has none either, so a
 * retryed run appends a second sample exactly like the legacy writer would.
 */
export async function insertTursoReputationHistory(
  client: Client,
  rows: readonly TursoReputationHistoryRow[]
): Promise<number> {
  if (rows.length === 0) return 0;
  const statements: InStatement[] = rows.map((row) => ({
    sql: INSERT_SQL,
    args: bindRow(row),
  }));
  const results = await client.batch(statements, 'write');
  return results.reduce((sum, r) => sum + Number(r.rowsAffected ?? 0), 0);
}

export interface ReputationAggregateResult {
  provider: string;
  overall_score: number;
  accuracy_score: number;
  uptime_percentage: number;
  avg_latency_ms: number;
  avg_deviation_pct: number;
  reliability_score: number;
  freshness_score: number;
  total_queries: number;
  failed_queries: number;
}

function pgRound2(value: number): number {
  // PG ROUND(x, 2) rounds half away from zero; JS toFixed wobbles on binary
  // representation, so scale-and-round with an epsilon guard instead.
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Type-safe port of aggregate_oracle_reputation_v4 (migration 0013). Reads
 * the same 7-day reputation_history window, recomputes the weighted overall
 * score (accuracy 30 / uptime 20 / reliability 20 / freshness 15 / latency 10
 * / deviation 5, sample-factor blended toward 75, coverage bonus) and upserts
 * oracle_reputation on the provider key — same defaults, same NULL filtering
 * (AVG ignores NULL rows), PG sample-STDDEV for the consistency signal.
 */
export async function aggregateTursoOracleReputation(
  client: Client,
  provider: string,
  options: {
    lookbackDays?: number;
    latencyBaseline?: number;
    now?: Date;
  } = {}
): Promise<ReputationAggregateResult> {
  const lookbackDays = options.lookbackDays ?? 7;
  const latencyBaseline = options.latencyBaseline ?? 1000;
  const now = options.now ?? new Date();
  const cutoff = new Date(now.getTime() - lookbackDays * 86_400_000).toISOString();

  const result = await client.execute({
    sql: `SELECT is_success, deviation_pct, consensus_price, latency_ms,
                 data_age_seconds, snapshot_time, symbol
          FROM reputation_history
          WHERE provider = ? AND snapshot_time >= ?`,
    args: [provider, cutoff],
  });

  const rows = result.rows.map((row) => ({
    isSuccess: Number(row.is_success) === 1,
    deviationPct: row.deviation_pct === null ? null : Number(row.deviation_pct),
    consensusPrice: row.consensus_price === null ? null : Number(row.consensus_price),
    latencyMs: row.latency_ms === null ? null : Number(row.latency_ms),
    dataAgeSeconds: row.data_age_seconds === null ? null : Number(row.data_age_seconds),
    snapshotTime: String(row.snapshot_time),
    symbol: String(row.symbol),
  }));

  const total = rows.length;
  const failed = rows.filter((row) => !row.isSuccess).length;
  const successRows = rows.filter((row) => row.isSuccess);
  const consensusRows = successRows.filter(
    (row) => row.consensusPrice !== null && row.consensusPrice > 0
  );
  // PG's GREATEST/LEAST propagate NULL, so a consensus row with a NULL
  // deviation contributes NULL to the CASE and is ignored by AVG/STDDEV
  // (it still counts toward v_consensus_count, which has no NULL filter).
  const consensusDeviationRows = consensusRows.filter(
    (row) => row.deviationPct !== null
  );

  // Accuracy: 100 - min(|dev|*15, 85) per consensus row, floored at 0; the
  // v4 default (85) applies when no row qualifies.
  const accuracy = (() => {
    if (consensusDeviationRows.length === 0) return 85;
    const values = consensusDeviationRows.map(
      (row) => Math.max(0, 100 - Math.min(Math.abs(row.deviationPct ?? 0) * 15, 85))
    );
    return values.reduce((a, b) => a + b, 0) / values.length;
  })();

  const uptime = total > 0 ? (successRows.length / total) * 100 : 95;

  // Reliability: same shape as accuracy but with the 20/80 slope (v4 uses a
  // separate curve so reliability penalizes deviation harder), default 85.
  const reliability = (() => {
    if (consensusDeviationRows.length === 0) return 85;
    const values = consensusDeviationRows.map(
      (row) => Math.max(0, 100 - Math.min(Math.abs(row.deviationPct ?? 0) * 20, 80))
    );
    return values.reduce((a, b) => a + b, 0) / values.length;
  })();

  const avgLatency = (() => {
    const values = successRows
      .map((row) => row.latencyMs)
      .filter((value): value is number => value !== null);
    if (values.length === 0) return 0;
    return Math.trunc(values.reduce((a, b) => a + b, 0) / values.length);
  })();

  const avgDeviation = (() => {
    if (consensusDeviationRows.length === 0) return 0;
    return (
      consensusDeviationRows.reduce((a, row) => a + Math.abs(row.deviationPct ?? 0), 0) /
      consensusDeviationRows.length
    );
  })();

  const freshness = (() => {
    const values: number[] = [];
    for (const row of successRows) {
      if (row.dataAgeSeconds !== null) {
        values.push(Math.max(0, 100 - Math.min((row.dataAgeSeconds / 60) * 4, 90)));
      } else {
        const ageMinutes = (now.getTime() - Date.parse(row.snapshotTime)) / 60_000;
        values.push(Math.max(0, 100 - Math.min(ageMinutes * 2.5, 90)));
      }
    }
    if (values.length === 0) return 80;
    return values.reduce((a, b) => a + b, 0) / values.length;
  })();

  // PG STDDEV is the sample standard deviation (n-1 denominator); a single
  // sample yields NULL which COALESCEs to 0.
  const consistency = (() => {
    const values = consensusDeviationRows.map((row) => Math.abs(row.deviationPct ?? 0));
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (values.length - 1);
    return Math.sqrt(variance);
  })();

  const testedSymbols = new Set(rows.map((row) => row.symbol)).size;
  const consensusCount = consensusRows.length;

  const sampleFactor = total < 20 ? 0.85 : total < 50 ? 0.92 : total < 100 ? 0.97 : 1.0;

  const latencyScore = (() => {
    if (avgLatency <= 0) return 85;
    if (avgLatency <= latencyBaseline) {
      return 85 + 15 * (1 - avgLatency / latencyBaseline);
    }
    const excessRatio = (avgLatency - latencyBaseline) / latencyBaseline;
    const penalty = Math.min(excessRatio * 28, 55);
    return Math.max(25, 85 - penalty);
  })();

  const deviationScore = (() => {
    if (avgDeviation <= 0.1) return 100;
    if (avgDeviation <= 0.5) return 95 - ((avgDeviation - 0.1) / 0.4) * 15;
    if (avgDeviation <= 1.0) return 80 - ((avgDeviation - 0.5) / 0.5) * 25;
    if (avgDeviation <= 2.0) return 55 - ((avgDeviation - 1.0) / 1.0) * 30;
    return Math.max(10, 25 - (avgDeviation - 2.0) * 5);
  })();

  // Consistency bonus only fires with at least 5 consensus samples.
  const consistencyBonus = (() => {
    if (consensusCount < 5) return 0;
    if (consistency < 0.05) return 4;
    if (consistency < 0.1) return 3;
    if (consistency < 0.2) return 2;
    if (consistency < 0.3) return 1;
    return 0;
  })();

  // Consistency bonus only fires with at least 5 consensus samples, and is
  // added to accuracy AND reliability separately (v4 semantics).
  const accuracyFinal = Math.min(100, accuracy + consistencyBonus);
  const reliabilityFinal = Math.min(100, reliability + consistencyBonus);

  const overallRaw = pgRound2(
    accuracyFinal * 0.3 +
      uptime * 0.2 +
      reliabilityFinal * 0.2 +
      freshness * 0.15 +
      latencyScore * 0.1 +
      deviationScore * 0.05
  );
  const overallSampled = pgRound2(
    overallRaw * sampleFactor + 75 * (1 - sampleFactor)
  );
  const coverageBonus = testedSymbols >= 9 ? 3 : testedSymbols >= 7 ? 2 : testedSymbols >= 5 ? 1 : 0;
  const overall = clamp(overallSampled + coverageBonus, 0, 100);

  const aggregate: ReputationAggregateResult = {
    provider,
    overall_score: overall,
    accuracy_score: Math.round(accuracyFinal * 100) / 100,
    uptime_percentage: Math.round(uptime * 100) / 100,
    avg_latency_ms: avgLatency,
    avg_deviation_pct: Math.round(avgDeviation * 10_000) / 10_000,
    reliability_score: Math.round(reliabilityFinal * 100) / 100,
    freshness_score: Math.round(freshness * 100) / 100,
    total_queries: total,
    failed_queries: failed,
  };

  await client.execute({
    sql: `INSERT INTO oracle_reputation (
            provider, overall_score, accuracy_score, uptime_percentage,
            avg_latency_ms, avg_deviation_pct, reliability_score,
            freshness_score, total_queries, failed_queries, last_calculated_at,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (provider) DO UPDATE SET
            overall_score = excluded.overall_score,
            accuracy_score = excluded.accuracy_score,
            uptime_percentage = excluded.uptime_percentage,
            avg_latency_ms = excluded.avg_latency_ms,
            avg_deviation_pct = excluded.avg_deviation_pct,
            reliability_score = excluded.reliability_score,
            freshness_score = excluded.freshness_score,
            total_queries = excluded.total_queries,
            failed_queries = excluded.failed_queries,
            last_calculated_at = excluded.last_calculated_at,
            updated_at = excluded.updated_at`,
    args: [
      aggregate.provider,
      aggregate.overall_score,
      aggregate.accuracy_score,
      aggregate.uptime_percentage,
      aggregate.avg_latency_ms,
      aggregate.avg_deviation_pct,
      aggregate.reliability_score,
      aggregate.freshness_score,
      aggregate.total_queries,
      aggregate.failed_queries,
      now.toISOString(),
      now.toISOString(),
      now.toISOString(),
    ] satisfies InValue[],
  });

  return aggregate;
}

/**
 * Retention trim (7-day window per migration 0138 / ops retention matrix).
 * The cron calls this after each aggregate so no nightly cron is required.
 * A failure here must not fail the run (the window only drifts).
 */
export async function trimTursoReputationHistory(
  client: Client,
  retentionDays: number,
  now: Date = new Date()
): Promise<number> {
  if (!Number.isSafeInteger(retentionDays) || retentionDays < 1) {
    throw new Error('retentionDays must be a positive integer');
  }
  const cutoff = new Date(now.getTime() - retentionDays * 86_400_000).toISOString();
  const result = await client.execute({
    sql: 'DELETE FROM reputation_history WHERE snapshot_time < ?',
    args: [cutoff],
  });
  return Number(result.rowsAffected ?? 0);
}
