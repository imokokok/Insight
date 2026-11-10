import { createClient, type Client } from '@libsql/client';

import type { HourlySnapshotRow } from '@/lib/supabase/adaptiveSnapshotPersistence';
import {
  readTursoPriceProjectionMode,
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
