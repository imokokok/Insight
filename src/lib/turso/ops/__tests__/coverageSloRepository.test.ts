import { createClient, type Client } from '@libsql/client';

import {
  enrollTursoCoverageTarget,
  hasTursoCoverageSample,
  insertTursoCoverageSample,
  readTursoCoverageSloMode,
  readTursoCoverageSummary,
  trimTursoCoverageSamples,
} from '@/lib/turso/ops/coverageSloRepository';
import { ensureTursoOpsSchema } from '@/lib/turso/ops/schema';

let client: Client;

function sample(overrides: Record<string, unknown> = {}) {
  return {
    targetId: 'ETH:1:cov-v2',
    slot: 1_794_300_000,
    status: 'PASS',
    signedReady: true,
    reasons: ['QUORUM_OK'],
    proof: {
      report: { status: 'PASS', evaluation: { providers: ['chainlink'] } },
      signature: '0xabc',
    },
    recordedAt: '2026-11-11T04:00:00.000Z',
    ...overrides,
  };
}

beforeAll(async () => {
  client = createClient({ url: 'file::memory:' });
  await ensureTursoOpsSchema(client);
});

describe('readTursoCoverageSloMode', () => {
  it('defaults to supabase and rejects unknown values', () => {
    expect(readTursoCoverageSloMode(undefined)).toBe('supabase');
    expect(readTursoCoverageSloMode('turso')).toBe('turso');
    expect(() => readTursoCoverageSloMode('shadow')).toThrow(
      'TURSO_COVERAGE_SLO_MODE must be supabase or turso'
    );
  });
});

describe('coverage enrollment and samples', () => {
  it('enrolls a target idempotently with enrollment time', async () => {
    const target = {
      id: 'ETH:1:cov-v2',
      asset: 'ETH',
      chainId: 1,
      policyId: 'cov-v2',
      objectiveBps: 9900,
    };
    await enrollTursoCoverageTarget(client, target, '2026-11-10T00:00:00.000Z');
    await enrollTursoCoverageTarget(client, target, '2026-11-11T00:00:00.000Z');
    const targets = await client.execute(
      'SELECT count(*) AS n, enrolled_at FROM coverage_slo_targets'
    );
    expect(Number(targets.rows[0].n)).toBe(1);
    expect(String(targets.rows[0].enrolled_at)).toBe('2026-11-10T00:00:00.000Z');
  });

  it('detects existing slots and inserts samples duplicate-tolerantly', async () => {
    expect(await hasTursoCoverageSample(client, 'ETH:1:cov-v2', 1_794_300_000)).toBe(false);
    await insertTursoCoverageSample(client, sample());
    expect(await hasTursoCoverageSample(client, 'ETH:1:cov-v2', 1_794_300_000)).toBe(true);

    // A duplicate insert must not create a second row (immutable first attempt).
    await insertTursoCoverageSample(client, sample({ status: 'DEGRADED' }));
    const rows = await client.execute(
      `SELECT status, signed_ready, reasons, proof FROM coverage_slo_samples
       WHERE target_id = 'ETH:1:cov-v2' AND slot = 1794300000`
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].status).toBe('PASS');
    expect(Number(rows.rows[0].signed_ready)).toBe(1);
    expect(JSON.parse(String(rows.rows[0].reasons))).toEqual(['QUORUM_OK']);
    expect(JSON.parse(String(rows.rows[0].proof)).signature).toBe('0xabc');
  });

  it('persists unavailable samples without proof', async () => {
    await insertTursoCoverageSample(
      client,
      sample({
        targetId: 'HYPE:999:cov-v2',
        slot: 1_794_300_000,
        status: 'UNAVAILABLE',
        signedReady: false,
        reasons: ['PROBE_UNAVAILABLE', 'SIGNER_UNAVAILABLE'],
        proof: null,
      })
    );
    const rows = await client.execute(
      `SELECT status, proof FROM coverage_slo_samples WHERE target_id = 'HYPE:999:cov-v2'`
    );
    expect(rows.rows[0].status).toBe('UNAVAILABLE');
    expect(rows.rows[0].proof).toBeNull();
  });
});

describe('readTursoCoverageSummary', () => {
  it('aggregates window counts and the newest sample', async () => {
    const enrolled = '2026-11-10T00:00:00.000Z';
    await enrollTursoCoverageTarget(
      client,
      { id: 'SOL:1:cov-v2', asset: 'SOL', chainId: 1, policyId: 'cov-v2', objectiveBps: 9900 },
      enrolled
    );
    const base = 1_794_300_000;
    await insertTursoCoverageSample(
      client,
      sample({ targetId: 'SOL:1:cov-v2', slot: base, status: 'PASS', signedReady: true })
    );
    await insertTursoCoverageSample(
      client,
      sample({
        targetId: 'SOL:1:cov-v2',
        slot: base + 900,
        status: 'UNAVAILABLE',
        signedReady: false,
        reasons: ['PROBE_UNAVAILABLE'],
        proof: null,
      })
    );
    const rows = await readTursoCoverageSummary(client, 24, new Date(1_794_310_000 * 1000));
    const row = rows.find((r) => r.id === 'SOL:1:cov-v2');
    expect(row).toBeDefined();
    expect(row!.observed).toBe(2);
    expect(row!.data_ready).toBe(1);
    expect(row!.signed_ready).toBe(1);
    expect(row!.unavailable).toBe(1);
    expect(row!.expected).toBeGreaterThan(2);
    expect(row!.missing).toBe(row!.expected - 2);
    expect(row!.latest).toMatchObject({ slot: base + 900, status: 'UNAVAILABLE' });
    expect(row!.latest!.reasons).toEqual(['PROBE_UNAVAILABLE']);
  });

  it('rejects unsupported windows', async () => {
    await expect(readTursoCoverageSummary(client, 48 as 24)).rejects.toThrow(
      'Unsupported SLO window'
    );
  });
});

describe('trimTursoCoverageSamples', () => {
  it('deletes samples older than the retention window', async () => {
    await insertTursoCoverageSample(
      client,
      sample({
        targetId: 'USDC:1:cov-v2',
        slot: 1,
        recordedAt: '2025-08-01T00:00:00.000Z',
      })
    );
    const removed = await trimTursoCoverageSamples(client, 90, new Date('2026-11-11T04:00:00Z'));
    expect(removed).toBeGreaterThanOrEqual(1);
  });

  it('rejects a non-positive retention window', async () => {
    await expect(trimTursoCoverageSamples(client, 0)).rejects.toThrow('positive integer');
  });
});
