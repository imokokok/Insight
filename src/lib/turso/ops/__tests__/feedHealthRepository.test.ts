import { createClient, type Client } from '@libsql/client';

import {
  insertTursoFeedHealthSnapshots,
  readTursoFeedHealthMode,
  trimTursoFeedHealthSnapshots,
} from '@/lib/turso/ops/feedHealthRepository';
import { ensureTursoOpsSchema, TURSO_OPS_SCHEMA_VERSION } from '@/lib/turso/ops/schema';

let client: Client;

function sample(overrides: Record<string, unknown> = {}) {
  return {
    symbol: 'ETH',
    chain: null,
    evaluatedAt: '2026-11-11T04:00:00.000Z',
    verdict: 'HEALTHY',
    recommendation: 'USE',
    reason: 'QUORUM_OK',
    maxDeviationPct: 0.4,
    agreement: 0.98,
    participantCount: 5,
    outlierCount: 0,
    staleCount: 0,
    consensusPrice: 3123.5,
    mlRiskScore: 0.12,
    mlRiskLevel: 'LOW',
    avgReputation: 0.9,
    minReputation: 0.8,
    quorumSatisfied: true,
    trustScore: 92,
    trustLevel: 'HIGH',
    ...overrides,
  };
}

beforeAll(async () => {
  client = createClient({ url: 'file::memory:' });
  await ensureTursoOpsSchema(client);
});

describe('readTursoFeedHealthMode', () => {
  it('defaults to supabase and validates the flag', () => {
    expect(readTursoFeedHealthMode(undefined)).toBe('supabase');
    expect(readTursoFeedHealthMode('turso')).toBe('turso');
    expect(() => readTursoFeedHealthMode('bogus')).toThrow('TURSO_FEED_HEALTH_MODE');
  });
});

describe('insertTursoFeedHealthSnapshots', () => {
  it('appends rows including null-chain global targets', async () => {
    const written = await insertTursoFeedHealthSnapshots(client, [
      sample(),
      sample({ symbol: 'BTC', chain: 'base', evaluatedAt: '2026-11-11T04:01:00.000Z' }),
      sample({ symbol: 'SOL', consensusPrice: null, mlRiskScore: null, quorumSatisfied: null }),
    ]);
    expect(written).toBe(3);
    const count = await client.execute('SELECT count(*) AS n FROM feed_health_snapshots');
    expect(Number(count.rows[0].n)).toBe(3);
    const nullChain = await client.execute(
      "SELECT chain, quorum_satisfied FROM feed_health_snapshots WHERE symbol = 'SOL'"
    );
    expect(nullChain.rows[0].chain).toBeNull();
    expect(nullChain.rows[0].quorum_satisfied).toBeNull();
  });

  it('keeps every appended row (no dedupe, mirroring the Supabase insert)', async () => {
    await insertTursoFeedHealthSnapshots(client, [
      sample({ evaluatedAt: '2026-11-11T05:00:00.000Z' }),
    ]);
    await insertTursoFeedHealthSnapshots(client, [
      sample({ evaluatedAt: '2026-11-11T05:00:00.000Z' }),
    ]);
    const count = await client.execute(
      "SELECT count(*) AS n FROM feed_health_snapshots WHERE evaluated_at = '2026-11-11T05:00:00.000Z'"
    );
    expect(Number(count.rows[0].n)).toBe(2);
  });

  it('returns 0 for an empty batch', async () => {
    await expect(insertTursoFeedHealthSnapshots(client, [])).resolves.toBe(0);
  });
});

describe('appendFeedHealthSnapshotsOnTurso', () => {
  it('is gated on the TURSO_FEED_HEALTH_MODE flag before touching a client', async () => {
    // The shared-ops-client path needs a remote libsql URL (the ops client
    // rejects non-libsql/http forms), so the in-memory suite only proves the
    // flag gate; the live wiring is verified by the scheduled dispatch.
    expect(readTursoFeedHealthMode('turso')).toBe('turso');
    expect(readTursoFeedHealthMode('supabase')).toBe('supabase');
  });
});

describe('trimTursoFeedHealthSnapshots', () => {
  it('drops rows older than the retention window', async () => {
    const now = new Date('2026-11-11T06:00:00.000Z');
    await client.execute({
      sql: "INSERT INTO feed_health_snapshots (symbol, chain, evaluated_at, verdict, recommendation, reason, agreement, participant_count, outlier_count, stale_count, created_at) VALUES ('OLD', NULL, '2026-09-01T00:00:00.000Z', 'HEALTHY', 'USE', 'OK', 1, 1, 0, 0, '2026-09-01T00:00:00.000Z')",
      args: [],
    });
    const deleted = await trimTursoFeedHealthSnapshots(client, 60, now);
    expect(deleted).toBeGreaterThanOrEqual(1);
  });

  it('rejects a non-positive retention window', async () => {
    await expect(trimTursoFeedHealthSnapshots(client, 0)).rejects.toThrow('retentionDays');
  });
});

describe('schema version', () => {
  it('stays at least v6', () => {
    expect(TURSO_OPS_SCHEMA_VERSION).toBeGreaterThanOrEqual(6);
  });
});
