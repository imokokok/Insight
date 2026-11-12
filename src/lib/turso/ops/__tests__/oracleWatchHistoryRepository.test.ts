import { createClient, type Client } from '@libsql/client';

import {
  readTursoOracleWatchHistory,
  readTursoOracleWatchHistoryMode,
  resolveHistoryGrain,
  type TursoOracleWatchHistoryArgs,
} from '@/lib/turso/ops/oracleWatchHistoryRepository';
import { ensureTursoOpsSchema } from '@/lib/turso/ops/schema';

let client: Client;

interface MirrorInsert {
  symbol: string;
  chain: string | null;
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

async function insertMirror(rows: readonly MirrorInsert[]): Promise<void> {
  for (const row of rows) {
    await client.execute({
      sql: `
        INSERT INTO feed_health_snapshots (
          symbol, chain, evaluated_at, verdict, recommendation, reason,
          max_deviation_pct, agreement, participant_count, outlier_count,
          stale_count, consensus_price, ml_risk_score, ml_risk_level,
          avg_reputation, min_reputation, quorum_satisfied, trust_score,
          trust_level, created_at
        ) VALUES (?, ?, ?, ?, ?, 'test', ?, ?, ?, 0, 0, NULL, ?, ?, NULL, NULL, NULL, ?, ?, ?)
      `,
      args: [
        row.symbol,
        row.chain,
        row.evaluatedAt,
        row.verdict,
        row.recommendation,
        row.maxDeviationPct,
        row.agreement,
        row.participantCount,
        row.mlRiskScore,
        row.mlRiskLevel,
        row.trustScore,
        row.trustLevel,
        new Date().toISOString(),
      ],
    });
  }
}

const baseArgs = (
  overrides: Partial<TursoOracleWatchHistoryArgs> = {}
): TursoOracleWatchHistoryArgs => ({
  symbol: 'BTC',
  chain: null,
  days: 7,
  interval: '30min',
  ...overrides,
});

const NOW = Date.now();

/** Start of the CURRENT hour (UTC). */
function hourStart(): number {
  const d = new Date(NOW);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours());
}

/**
 * Timestamps inside one hourly bucket: anchor to the current hour and place
 * rows at fixed minutes into it, so hour-boundary drift cannot split buckets.
 * Rows land at most 40 minutes into the hour — either the current hour
 * (elapsed >= 41 min) or the previous one (all three in its last 41 minutes).
 */
function atMinute(minuteOffset: number, format: 'z' | 'offset' = 'z'): string {
  const elapsed = NOW - hourStart();
  const anchor = elapsed >= 41 * 60_000 ? hourStart() : hourStart() - 3_600_000;
  const t = anchor + minuteOffset * 60_000;
  const iso = new Date(t).toISOString();
  if (format === 'z') return iso;
  // Backfill-style rendering: swap the '.000Z' suffix for '+00:00'.
  return `${iso.slice(0, 19)}+00:00`;
}

const row = (overrides: Partial<MirrorInsert> & { evaluatedAt: string }): MirrorInsert => ({
  symbol: 'BTC',
  chain: null,
  verdict: 'normal',
  recommendation: 'proceed',
  maxDeviationPct: 0.5,
  agreement: 0.99,
  participantCount: 5,
  mlRiskScore: null,
  mlRiskLevel: null,
  trustScore: 90,
  trustLevel: 'high',
  ...overrides,
});

beforeEach(async () => {
  client = createClient({ url: 'file::memory:' });
  await ensureTursoOpsSchema(client);
});

describe('readTursoOracleWatchHistoryMode', () => {
  it('defaults to supabase and validates the flag', () => {
    expect(readTursoOracleWatchHistoryMode(undefined)).toBe('supabase');
    expect(readTursoOracleWatchHistoryMode('turso')).toBe('turso');
    expect(() => readTursoOracleWatchHistoryMode('shadow')).toThrow(
      'TURSO_ORACLE_WATCH_HISTORY_MODE'
    );
  });
});

describe('resolveHistoryGrain', () => {
  it('matches the RPC grain CASE', () => {
    expect(resolveHistoryGrain(31, '30min')).toBe('daily');
    expect(resolveHistoryGrain(8, '30min')).toBe('hourly');
    expect(resolveHistoryGrain(8, 'hourly')).toBe('hourly');
    expect(resolveHistoryGrain(7, '30min')).toBe('30min');
  });
});

describe('readTursoOracleWatchHistory', () => {
  it('returns raw 30min buckets for a short window, ascending', async () => {
    await insertMirror([
      row({ evaluatedAt: atMinute(35), verdict: 'normal', recommendation: 'proceed' }),
      row({ evaluatedAt: atMinute(5), verdict: 'caution', recommendation: 'slow-down' }),
    ]);
    const rows = await readTursoOracleWatchHistory(client, baseArgs());
    expect(rows).toHaveLength(2);
    expect(rows[0].verdict).toBe('caution');
    expect(rows[0].recommendation).toBe('slow-down');
    expect(rows[1].verdict).toBe('normal');
    expect(rows[1].recommendation).toBe('proceed');
    expect(rows[0].bucket_at).toBe(rows[0].last_observed_at);
  });

  it('matches chain IS NULL for global requests and exact chain otherwise', async () => {
    await insertMirror([
      row({ evaluatedAt: atMinute(20), chain: null }),
      row({ evaluatedAt: atMinute(20), chain: 'base' }),
    ]);
    const global = await readTursoOracleWatchHistory(client, baseArgs());
    expect(global).toHaveLength(1);
    const base = await readTursoOracleWatchHistory(client, baseArgs({ chain: 'BASE' }));
    expect(base).toHaveLength(1);
    const blank = await readTursoOracleWatchHistory(client, baseArgs({ chain: '  ' }));
    expect(blank).toHaveLength(1);
  });

  it('rolls up hourly: worst verdict wins, recommendation from the highest-rank earliest row', async () => {
    // First caution (minute 10) precedes a later caution (minute 30); an
    // earlier normal (minute 5) must NOT win the rank ordering.
    await insertMirror([
      row({ evaluatedAt: atMinute(30), verdict: 'caution', recommendation: 'later-caution' }),
      row({ evaluatedAt: atMinute(5), verdict: 'normal', recommendation: 'earliest-normal' }),
      row({ evaluatedAt: atMinute(10), verdict: 'caution', recommendation: 'first-caution' }),
    ]);
    const rows = await readTursoOracleWatchHistory(client, baseArgs({ interval: 'hourly' }));
    expect(rows).toHaveLength(1);
    expect(rows[0].verdict).toBe('caution');
    expect(rows[0].recommendation).toBe('first-caution');
    expect(rows[0].last_observed_at).toBe(atMinute(30));
  });

  it('mixes backfill (+00:00) and collector (.000Z) renderings into one bucket', async () => {
    const offsetTime = atMinute(10, 'offset');
    const zTime = atMinute(40);
    await insertMirror([
      row({ evaluatedAt: offsetTime, agreement: 0.8, participantCount: 4 }),
      row({ evaluatedAt: zTime, agreement: 1.0, participantCount: 6 }),
    ]);
    const rows = await readTursoOracleWatchHistory(client, baseArgs({ interval: 'hourly' }));
    expect(rows).toHaveLength(1);
    expect(rows[0].agreement).toBe(0.9);
    expect(rows[0].participant_count).toBe(5);
  });

  it('picks ml/trust levels from non-null extremes with latest-evaluated_at ties', async () => {
    await insertMirror([
      row({
        evaluatedAt: atMinute(10),
        mlRiskScore: 0.6,
        mlRiskLevel: 'elevated',
        trustScore: 70,
        trustLevel: 'medium',
      }),
      row({
        evaluatedAt: atMinute(20),
        mlRiskScore: 0.6,
        mlRiskLevel: 'elevated-latest-tie',
        trustScore: 85,
        trustLevel: 'high',
      }),
      row({
        evaluatedAt: atMinute(30),
        mlRiskScore: null,
        mlRiskLevel: 'must-be-ignored',
        trustScore: null,
        trustLevel: null,
      }),
    ]);
    const rows = await readTursoOracleWatchHistory(client, baseArgs({ interval: 'hourly' }));
    expect(rows).toHaveLength(1);
    expect(rows[0].ml_risk_score).toBe(0.6);
    // tie on 0.6 → the LATER row (minute 20) supplies the level
    expect(rows[0].ml_risk_level).toBe('elevated-latest-tie');
    expect(rows[0].trust_score).toBe(70);
    expect(rows[0].trust_level).toBe('medium');
  });

  it('keeps null deviation/score aggregates null when only nulls are present', async () => {
    await insertMirror([
      row({
        evaluatedAt: atMinute(25),
        maxDeviationPct: null,
        mlRiskScore: null,
        trustScore: null,
      }),
    ]);
    const rows = await readTursoOracleWatchHistory(client, baseArgs());
    expect(rows).toHaveLength(1);
    expect(rows[0].max_deviation_pct).toBeNull();
    expect(rows[0].ml_risk_score).toBeNull();
    expect(rows[0].ml_risk_level).toBeNull();
    expect(rows[0].trust_score).toBeNull();
    expect(rows[0].trust_level).toBeNull();
  });

  it('excludes rows older than the days window', async () => {
    const stale = new Date(NOW - 8 * 86_400_000).toISOString();
    await insertMirror([row({ evaluatedAt: stale })]);
    const rows = await readTursoOracleWatchHistory(client, baseArgs({ days: 7 }));
    expect(rows).toHaveLength(0);
  });

  it('clamps days to the RPC bound of 365', async () => {
    const within365 = new Date(NOW - 360 * 86_400_000).toISOString();
    const beyond365 = new Date(NOW - 400 * 86_400_000).toISOString();
    await insertMirror([row({ evaluatedAt: within365 }), row({ evaluatedAt: beyond365 })]);
    const rows = await readTursoOracleWatchHistory(client, baseArgs({ days: 10000 }));
    expect(rows).toHaveLength(1);
    expect(rows[0].last_observed_at).toBe(within365);
  });
});
