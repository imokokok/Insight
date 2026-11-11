import { createClient, type Client } from '@libsql/client';

import {
  aggregateTursoOracleReputation,
  insertTursoReputationHistory,
  readTursoReputationMode,
  trimTursoReputationHistory,
  type TursoReputationHistoryRow,
} from '@/lib/turso/ops/reputationRepository';
import { ensureTursoOpsSchema } from '@/lib/turso/ops/schema';

let client: Client;

function historyRow(overrides: Partial<TursoReputationHistoryRow> = {}): TursoReputationHistoryRow {
  return {
    provider: 'chainlink',
    symbol: 'BTC',
    price: 65_000,
    consensus_price: 65_100,
    deviation_pct: 0.15,
    latency_ms: 420,
    confidence: 0.92,
    data_age_seconds: 30,
    is_success: true,
    error_message: null,
    failure_mode: 'none',
    signal_vector: { freshness: 0.9, consistency: 0.8 },
    consensus_context: { consensusPrice: 65_100, agreement: 0.95 },
    snapshot_time: '2026-11-11T03:00:00.000Z',
    ...overrides,
  };
}

/** Build n success rows for one provider/symbol with tight deviations. */
function consensusBatch(
  n: number,
  overrides: Partial<TursoReputationHistoryRow> = {}
): TursoReputationHistoryRow[] {
  return Array.from({ length: n }, (_, i) =>
    historyRow({
      snapshot_time: new Date(Date.parse('2026-11-11T03:00:00Z') + i * 1_000).toISOString(),
      ...overrides,
    })
  );
}

beforeAll(async () => {
  client = createClient({ url: 'file::memory:' });
  await ensureTursoOpsSchema(client);
});

describe('readTursoReputationMode', () => {
  it('defaults to supabase and rejects unknown values', () => {
    expect(readTursoReputationMode(undefined)).toBe('supabase');
    expect(readTursoReputationMode('')).toBe('supabase');
    expect(readTursoReputationMode('turso')).toBe('turso');
    expect(() => readTursoReputationMode('shadow')).toThrow(
      'TURSO_REPUTATION_MODE must be supabase or turso'
    );
  });
});

describe('insertTursoReputationHistory', () => {
  it('inserts rows with jsonb columns serialized as text', async () => {
    const inserted = await insertTursoReputationHistory(client, [historyRow()]);
    expect(inserted).toBe(1);

    const stored = await client.execute(
      `SELECT provider, symbol, price, deviation_pct, is_success, failure_mode,
              signal_vector, consensus_context, created_at
       FROM reputation_history WHERE provider = 'chainlink' AND symbol = 'BTC'`
    );
    expect(stored.rows).toHaveLength(1);
    const row = stored.rows[0];
    expect(Number(row.is_success)).toBe(1);
    expect(Number(row.deviation_pct)).toBeCloseTo(0.15);
    expect(JSON.parse(String(row.signal_vector))).toEqual({
      freshness: 0.9,
      consistency: 0.8,
    });
    expect(JSON.parse(String(row.consensus_context))).toEqual({
      consensusPrice: 65_100,
      agreement: 0.95,
    });
    // created_at mirrors the snapshot time (insert semantics have no separate
    // default clock in the transcription).
    expect(String(row.created_at)).toBe('2026-11-11T03:00:00.000Z');
  });

  it('appends repeat samples (no conflict target, like Postgres)', async () => {
    await insertTursoReputationHistory(client, [historyRow()]);
    await insertTursoReputationHistory(client, [historyRow()]);
    const all = await client.execute('SELECT count(*) AS n FROM reputation_history');
    expect(Number(all.rows[0].n)).toBeGreaterThanOrEqual(2);
  });

  it('returns zero for an empty batch', async () => {
    await expect(insertTursoReputationHistory(client, [])).resolves.toBe(0);
  });
});

describe('aggregateTursoOracleReputation', () => {
  it('matches the v4 formula on a healthy consensus sample', async () => {
    // 30 success rows across 9 symbols with tight deviations and fast
    // latency → high sample factor, consistency bonus, coverage bonus.
    const rows = Array.from({ length: 30 }, (_, i) =>
      historyRow({
        // Distinct provider so the shared in-memory window only holds this
        // test's rows (earlier describes insert chainlink samples too).
        provider: 'bench-provider',
        symbol: ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'LINK'][i % 9],
        price: 65_000,
        consensus_price: 65_100,
        deviation_pct: 0.1538, // |65100-65000|/65100*100 ≈ 0.1536
        latency_ms: 400,
        data_age_seconds: 30,
        snapshot_time: new Date(Date.parse('2026-11-11T03:00:00Z') + i * 60_000).toISOString(),
      })
    );
    await insertTursoReputationHistory(client, rows);

    const now = new Date('2026-11-11T03:30:00Z');
    const aggregate = await aggregateTursoOracleReputation(client, 'bench-provider', {
      lookbackDays: 7,
      latencyBaseline: 1000,
      now,
    });

    // accuracy per row: 100 - min(0.1538*15, 85) ≈ 97.693
    expect(aggregate.accuracy_score).toBeGreaterThan(97);
    // uptime: 30/30 → 100
    expect(aggregate.uptime_percentage).toBe(100);
    expect(aggregate.avg_latency_ms).toBe(400);
    expect(aggregate.total_queries).toBe(30);
    expect(aggregate.failed_queries).toBe(0);
    // coverage bonus for 9 symbols (+3), sample factor 0.97 blend toward 75.
    expect(aggregate.overall_score).toBeGreaterThan(90);
    expect(aggregate.overall_score).toBeLessThanOrEqual(100);

    const stored = await client.execute(
      `SELECT * FROM oracle_reputation WHERE provider = 'bench-provider'`
    );
    expect(stored.rows).toHaveLength(1);
    expect(Number(stored.rows[0].overall_score)).toBe(aggregate.overall_score);
    expect(String(stored.rows[0].last_calculated_at)).toBe(now.toISOString());
  });

  it('upserts on the provider key without duplicating rows', async () => {
    await aggregateTursoOracleReputation(client, 'chainlink', {
      lookbackDays: 7,
      now: new Date('2026-11-11T04:00:00Z'),
    });
    await aggregateTursoOracleReputation(client, 'chainlink', {
      lookbackDays: 7,
      now: new Date('2026-11-11T05:00:00Z'),
    });
    const all = await client.execute(
      `SELECT count(*) AS n FROM oracle_reputation WHERE provider = 'chainlink'`
    );
    expect(Number(all.rows[0].n)).toBe(1);
    const updated = await client.execute(
      `SELECT last_calculated_at FROM oracle_reputation WHERE provider = 'chainlink'`
    );
    expect(String(updated.rows[0].last_calculated_at)).toBe('2026-11-11T05:00:00.000Z');
  });

  it('blends toward 75 with the 0.85 sample factor under 20 rows', async () => {
    // 10 rows, 1 failure, wide deviation → low scores pulled toward 75.
    await insertTursoReputationHistory(
      client,
      consensusBatch(9, { provider: 'pyth', symbol: 'BTC', deviation_pct: 1.8 })
        .concat([
          historyRow({
            provider: 'pyth',
            symbol: 'BTC',
            is_success: false,
            price: 0,
            consensus_price: null,
            deviation_pct: null,
            latency_ms: null,
            confidence: null,
            data_age_seconds: null,
            error_message: 'Price returned invalid value',
            failure_mode: 'invalid_response',
            signal_vector: null,
            consensus_context: null,
          }),
        ])
    );
    const aggregate = await aggregateTursoOracleReputation(client, 'pyth', {
      lookbackDays: 7,
      now: new Date('2026-11-11T03:10:00Z'),
    });
    expect(aggregate.total_queries).toBe(10);
    expect(aggregate.failed_queries).toBe(1);
    // 1 symbol → no coverage bonus; deviation ~1.8% → deviation_score ≤ 55.
    expect(aggregate.overall_score).toBeGreaterThan(40);
    expect(aggregate.overall_score).toBeLessThan(90);
  });

  it('ignores rows outside the lookback window', async () => {
    await insertTursoReputationHistory(
      client,
      consensusBatch(25, {
        provider: 'supra',
        snapshot_time: '2026-10-01T00:00:00.000Z',
      })
    );
    const aggregate = await aggregateTursoOracleReputation(client, 'supra', {
      lookbackDays: 7,
      now: new Date('2026-11-11T03:00:00Z'),
    });
    expect(aggregate.total_queries).toBe(0);
    // Empty window → all defaults: uptime 95, accuracy 85, freshness 80.
    expect(aggregate.uptime_percentage).toBe(95);
    expect(aggregate.accuracy_score).toBe(85);
    expect(aggregate.freshness_score).toBe(80);
  });
});

describe('trimTursoReputationHistory', () => {
  it('deletes rows older than the retention window', async () => {
    await insertTursoReputationHistory(
      client,
      consensusBatch(3, { provider: 'stale-provider', snapshot_time: '2025-10-01T00:00:00.000Z' })
    );
    const removed = await trimTursoReputationHistory(client, 7, new Date('2026-11-11T03:00:00Z'));
    expect(removed).toBeGreaterThanOrEqual(3);
    const stale = await client.execute(
      `SELECT count(*) AS n FROM reputation_history WHERE provider = 'stale-provider'`
    );
    expect(Number(stale.rows[0].n)).toBe(0);
  });

  it('rejects a non-positive retention window', async () => {
    await expect(trimTursoReputationHistory(client, 0)).rejects.toThrow('positive integer');
  });
});
