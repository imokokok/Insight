import { createClient, type Client } from '@libsql/client';

import type { HourlySnapshotRow } from '@/lib/supabase/adaptiveSnapshotPersistence';
import {
  readTursoOracleHistoryBaseline,
  readTursoPriceProjectionMode,
  upsertTursoHourlySnapshots,
  writeProjectedTursoPriceSlot,
} from '@/lib/turso/ops/hourlyPriceProjectionRepository';
import {
  ensureTursoOpsSchema,
  isTursoOpsSchemaCurrent,
  TURSO_OPS_SCHEMA_VERSION,
} from '@/lib/turso/ops/schema';

let client: Client;

function hourlyRow(overrides: Partial<HourlySnapshotRow> = {}): HourlySnapshotRow {
  return {
    provider: 'chainlink',
    symbol: 'BTC',
    chain_id: 1,
    price: 88_000.5,
    consensus_price: 88_001,
    deviation_pct: 0.001,
    latency_ms: 120,
    data_age_seconds: 4,
    confidence: 0.98,
    is_success: true,
    error_message: null,
    snapshot_hour: '2026-11-11T02:00:00.000Z',
    ...overrides,
  };
}

function projectionInput(overrides: { hourlyRows?: HourlySnapshotRow[]; inputHash?: string } = {}) {
  return {
    hourlyRows: overrides.hourlyRows ?? [hourlyRow()],
    snapshotTs: new Date('2026-11-11T02:05:00.000Z'),
    inputHash: overrides.inputHash ?? 'hash-slot-1',
    partitionKey: 'bootstrap',
    rawDigest: 'digest-slot-1',
  };
}

beforeAll(async () => {
  client = createClient({ url: 'file::memory:' });
  await ensureTursoOpsSchema(client);
});

describe('Turso ops schema', () => {
  it('reports the current schema version', async () => {
    expect(TURSO_OPS_SCHEMA_VERSION).toBeGreaterThanOrEqual(2);
    expect(await isTursoOpsSchemaCurrent(client)).toBe(true);
  });

  it('is idempotent across repeated applications', async () => {
    await ensureTursoOpsSchema(client);
    expect(await isTursoOpsSchemaCurrent(client)).toBe(true);
  });
});

describe('readTursoPriceProjectionMode', () => {
  it('defaults to supabase and rejects unknown values', () => {
    expect(readTursoPriceProjectionMode(undefined)).toBe('supabase');
    expect(readTursoPriceProjectionMode('')).toBe('supabase');
    expect(readTursoPriceProjectionMode('turso')).toBe('turso');
    expect(() => readTursoPriceProjectionMode('shadow')).toThrow(
      'TURSO_PRICE_PROJECTION_MODE must be supabase or turso'
    );
  });
});

describe('writeProjectedTursoPriceSlot', () => {
  it('writes hourly rows and the delivery ledger', async () => {
    const result = await writeProjectedTursoPriceSlot(client, projectionInput());
    expect(result).toEqual({ hourlyWritten: 1, replayed: false });

    const hourly = await client.execute(
      `SELECT price, is_success, error_message FROM hourly_price_snapshots
       WHERE provider = 'chainlink' AND symbol = 'BTC' AND chain_id = 1
         AND snapshot_hour = '2026-11-11T02:00:00.000Z'`
    );
    expect(hourly.rows).toHaveLength(1);
    expect(Number(hourly.rows[0].price)).toBeCloseTo(88_000.5);
    expect(Number(hourly.rows[0].is_success)).toBe(1);

    const runs = await client.execute(
      `SELECT slot_ms, hourly_written, partition_key FROM price_slot_projection_runs
       WHERE input_hash = 'hash-slot-1'`
    );
    expect(runs.rows).toHaveLength(1);
    expect(Number(runs.rows[0].hourly_written)).toBe(1);
  });

  it('re-projects the same slot idempotently and reports replay', async () => {
    const result = await writeProjectedTursoPriceSlot(
      client,
      projectionInput({ hourlyRows: [hourlyRow({ price: 88_100 })] })
    );
    expect(result).toEqual({ hourlyWritten: 1, replayed: true });

    const runs = await client.execute(
      `SELECT hourly_written FROM price_slot_projection_runs WHERE input_hash = 'hash-slot-1'`
    );
    expect(runs.rows).toHaveLength(1);

    const hourly = await client.execute(
      `SELECT price FROM hourly_price_snapshots
       WHERE provider = 'chainlink' AND symbol = 'BTC' AND chain_id = 1
         AND snapshot_hour = '2026-11-11T02:00:00.000Z'`
    );
    expect(hourly.rows).toHaveLength(1);
    expect(Number(hourly.rows[0].price)).toBeCloseTo(88_100);
  });

  it('writes multiple rows in one transaction', async () => {
    const rows = [
      hourlyRow({ provider: 'pyth', symbol: 'ETH', snapshot_hour: '2026-11-11T02:00:00.000Z' }),
      hourlyRow({ provider: 'pyth', symbol: 'SOL', snapshot_hour: '2026-11-11T02:00:00.000Z' }),
      hourlyRow({ provider: 'pyth', symbol: 'BTC', chain_id: 8453 }),
    ];
    const result = await writeProjectedTursoPriceSlot(
      client,
      projectionInput({ hourlyRows: rows, inputHash: 'hash-multi' })
    );
    expect(result.hourlyWritten).toBe(3);
  });

  it('throws for an unsafe slot timestamp', async () => {
    await expect(
      writeProjectedTursoPriceSlot(client, {
        ...projectionInput({ inputHash: 'hash-invalid' }),
        snapshotTs: new Date('not-a-date'),
      })
    ).rejects.toThrow('invalid timestamp');
  });
});

describe('readTursoOracleHistoryBaseline', () => {
  const since = Date.parse('2026-11-11T00:00:00Z');
  const before = Date.parse('2026-11-11T04:00:00Z');

  async function seed(): Promise<void> {
    const rows: Array<[string, string, number, number | null]> = [
      // hour 00: prices 100/200 → median 150; deviations 1, 3 → max 3
      ['2026-11-11T00:00:00.000Z', 'winklink', 100, 1],
      ['2026-11-11T00:00:00+00:00', 'chainlink', 200, 3],
      // hour 01: even count → interpolated median (100+300)/2 = 200; NULL deviation → 0
      ['2026-11-11T01:00:00.000Z', 'winklink', 100, null],
      ['2026-11-11T01:00:00+00:00', 'chainlink', 300, 2],
      // hour 02: excluded — failure row / non-positive price / unaligned minute
      ['2026-11-11T02:00:00.000Z', 'winklink', 100, 0],
      ['2026-11-11T02:00:00+00:00', 'chainlink', -5, 0],
      ['2026-11-11T02:30:00.000Z', 'winklink', 100, 0],
      // hour 04: excluded — outside [since, before) upper bound
      ['2026-11-11T04:00:00.000Z', 'winklink', 100, 0],
    ];
    await client.batch(
      rows.map(([hour, provider, price, dev]) => ({
        sql: `INSERT INTO hourly_price_snapshots
              (provider, symbol, chain_id, price, consensus_price, deviation_pct,
               is_success, snapshot_hour, created_at)
              VALUES (?, 'ETH', 1, ?, ?, ?, 1, ?, ?)`,
        args: [provider, price, price, dev, hour, hour],
      })),
      'write'
    );
    // failure rows: is_success must be 0 — update the seeded failure row
    await client.execute(
      "UPDATE hourly_price_snapshots SET is_success = 0 WHERE snapshot_hour = '2026-11-11T02:00:00.000Z' AND provider = 'winklink'"
    );
  }

  it('groups mixed-format rows per hour and ports the RPC aggregates', async () => {
    await seed();
    const rows = await readTursoOracleHistoryBaseline(client, 'eth', since, before);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      hour: '2026-11-11T00:00:00.000Z',
      max_deviation_pct: 3,
      consensus_price: 150,
      participant_count: 2,
    });
    expect(rows[1].consensus_price).toBe(200);
    expect(rows[1].max_deviation_pct).toBe(2);
    expect(rows[1].participant_count).toBe(2);
    expect(rows[2].hour).toBe('2026-11-11T02:00:00.000Z');
    expect(rows[2].participant_count).toBe(1);
  });
});

describe('upsertTursoHourlySnapshots', () => {
  function upsertRow(
    overrides: Partial<{
      snapshot_hour: string;
      provider: string;
      price: number;
      is_success: boolean;
      error_message: string | null;
    }> = {}
  ) {
    return {
      snapshot_hour: '2026-11-11T00:00:00.000Z',
      provider: 'upsert-probe',
      symbol: 'ETH',
      chain_id: 1,
      price: 100,
      consensus_price: null,
      deviation_pct: null,
      latency_ms: null,
      data_age_seconds: null,
      confidence: null,
      is_success: true,
      error_message: null,
      ...overrides,
    };
  }

  it('dedupes the batch (success wins, later ordinality breaks ties) and writes once', async () => {
    const written = await upsertTursoHourlySnapshots(client, [
      upsertRow({ price: 100 }),
      upsertRow({ price: 111, is_success: false, error_message: 'boom' }),
      upsertRow({ price: 122 }),
      upsertRow({ snapshot_hour: '2026-11-11T00:00:00+00:00', price: 133, is_success: false }),
    ]);
    expect(written).toBe(1);
    const result = await client.execute(
      "SELECT price, is_success FROM hourly_price_snapshots WHERE symbol='ETH' AND provider='upsert-probe'"
    );
    expect(result.rows).toHaveLength(1);
    expect(Number(result.rows[0]!.price)).toBe(122);
    expect(Number(result.rows[0]!.is_success)).toBe(1);
  });

  it('replaces an existing failure with a success but never downgrades', async () => {
    await upsertTursoHourlySnapshots(client, [
      upsertRow({
        snapshot_hour: '2026-11-11T05:00:00.000Z',
        price: 50,
        is_success: false,
        error_message: 'x',
      }),
    ]);
    const upgraded = await upsertTursoHourlySnapshots(client, [
      upsertRow({ snapshot_hour: '2026-11-11T05:00:00.000Z', price: 60 }),
    ]);
    expect(upgraded).toBe(1);
    const downgraded = await upsertTursoHourlySnapshots(client, [
      upsertRow({
        snapshot_hour: '2026-11-11T05:00:00.000Z',
        price: 70,
        is_success: false,
        error_message: 'y',
      }),
    ]);
    expect(downgraded).toBe(0);
    const result = await client.execute(
      "SELECT price, is_success FROM hourly_price_snapshots WHERE snapshot_hour = '2026-11-11T05:00:00.000Z'"
    );
    expect(Number(result.rows[0]!.price)).toBe(60);
    expect(Number(result.rows[0]!.is_success)).toBe(1);
  });

  it('rejects batches over 500 rows', async () => {
    const rows = Array.from({ length: 501 }, (_, i) =>
      upsertRow({ provider: `p${i}`, snapshot_hour: `2026-11-11T00:00:00.000Z` })
    );
    await expect(upsertTursoHourlySnapshots(client, rows)).rejects.toThrow('at most 500');
  });
});
