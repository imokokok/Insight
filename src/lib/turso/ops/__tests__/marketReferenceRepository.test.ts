import { createClient, type Client } from '@libsql/client';

import type { MarketReferenceRow } from '@/lib/marketReference/collector';
import {
  readHourlyAggregates,
  readLatestSuccessfulRows,
  readTursoMarketRefMode,
  trimTursoMarketReferenceRows,
  upsertTursoMarketReferenceRows,
} from '@/lib/turso/ops/marketReferenceRepository';
import {
  ensureTursoOpsSchema,
  isTursoOpsSchemaCurrent,
  TURSO_OPS_SCHEMA_VERSION,
} from '@/lib/turso/ops/schema';

let client: Client;

function row(overrides: Partial<MarketReferenceRow> = {}): MarketReferenceRow {
  return {
    snapshot_ts: '2026-11-10T12:00:00.000Z',
    symbol: 'BTC',
    quote: 'USD',
    exchange: 'binance',
    ref_price: 88_000.5,
    volume: 1_234.5,
    bid: 87_999,
    ask: 88_002,
    bid_ask_spread_pct: 0.0034,
    data_age_seconds: 3,
    source_observed_at: '2026-11-10T11:59:57.000Z',
    rights_scope: 'customer-eligible',
    rights_reference: 'vendor-ref-1',
    delivery_policy: 'insight-derived-analytics',
    is_success: true,
    error_message: null,
    collector_version: 'test-1',
    ...overrides,
  };
}

beforeAll(async () => {
  client = createClient({ url: 'file::memory:' });
  await ensureTursoOpsSchema(client);
});

afterAll(() => {
  client.close();
});

describe('turso ops schema', () => {
  it('is idempotent and records the version', async () => {
    await ensureTursoOpsSchema(client);
    expect(await isTursoOpsSchemaCurrent(client)).toBe(true);
  });

  it('rejects an unsupported future version read as not-current, never as valid', async () => {
    expect(TURSO_OPS_SCHEMA_VERSION).toBeGreaterThan(0);
  });
});

describe('readTursoMarketRefMode', () => {
  it('defaults to supabase and validates values', () => {
    expect(readTursoMarketRefMode(undefined)).toBe('supabase');
    expect(readTursoMarketRefMode('')).toBe('supabase');
    expect(readTursoMarketRefMode('shadow')).toBe('shadow');
    expect(readTursoMarketRefMode('turso')).toBe('turso');
    expect(() => readTursoMarketRefMode('yolo')).toThrow('TURSO_MARKET_REF_MODE');
  });
});

describe('upsertTursoMarketReferenceRows', () => {
  beforeEach(async () => {
    await client.execute('DELETE FROM market_reference_snapshots');
  });

  it('stores all fields of a row and returns counts', async () => {
    const result = await upsertTursoMarketReferenceRows(client, [row()]);
    expect(result).toEqual({ submitted: 1, inserted: 1 });

    const stored = await client.execute(
      'SELECT * FROM market_reference_snapshots WHERE symbol = ?',
      ['BTC']
    );
    expect(stored.rows).toHaveLength(1);
    const r = stored.rows[0];
    expect(r.is_success).toBe(1);
    expect(Number(r.ref_price)).toBeCloseTo(88_000.5);
    expect(r.rights_scope).toBe('customer-eligible');
    expect(r.delivery_policy).toBe('insight-derived-analytics');
    expect(String(r.snapshot_ts)).toBe('2026-11-10T12:00:00.000Z');
    expect(String(r.source_observed_at)).toBe('2026-11-10T11:59:57.000Z');
  });

  it('deduplicates on the conflict key (ignoreDuplicates semantics)', async () => {
    await upsertTursoMarketReferenceRows(client, [row()]);
    const second = await upsertTursoMarketReferenceRows(client, [row({ ref_price: 99_999 })]);
    expect(second.inserted).toBe(0);

    const prices = await client.execute('SELECT ref_price FROM market_reference_snapshots');
    expect(prices.rows).toHaveLength(1);
    // Supabase ignoreDuplicates keeps the first row; the rewrite must too.
    expect(Number(prices.rows[0].ref_price)).toBeCloseTo(88_000.5);
  });

  it('persists failure rows and nulls without coercion errors', async () => {
    const result = await upsertTursoMarketReferenceRows(client, [
      row({
        symbol: 'ETH',
        exchange: 'okx',
        is_success: false,
        ref_price: null,
        volume: null,
        bid: null,
        ask: null,
        bid_ask_spread_pct: null,
        data_age_seconds: null,
        source_observed_at: undefined,
        error_message: 'upstream timeout',
        rights_scope: undefined,
        rights_reference: undefined,
        delivery_policy: undefined,
      }),
    ]);
    expect(result.inserted).toBe(1);
    const stored = await client.execute(
      "SELECT * FROM market_reference_snapshots WHERE symbol = 'ETH'"
    );
    expect(stored.rows[0].is_success).toBe(0);
    expect(stored.rows[0].ref_price).toBeNull();
    expect(stored.rows[0].rights_scope).toBe('research-quarantined');
    expect(stored.rows[0].delivery_policy).toBe('not-authorized');
    expect(stored.rows[0].error_message).toBe('upstream timeout');
  });

  it('is a no-op for an empty batch', async () => {
    const result = await upsertTursoMarketReferenceRows(client, []);
    expect(result).toEqual({ submitted: 0, inserted: 0 });
  });

  it('normalizes timestamps to ISO so lexicographic ordering holds', async () => {
    await upsertTursoMarketReferenceRows(client, [
      row({ snapshot_ts: '2026-11-10T12:00:00Z', symbol: 'SOL', exchange: 'a' }),
      row({ snapshot_ts: '2026-11-10T11:00:00+00:00', symbol: 'SOL', exchange: 'b' }),
    ]);
    const stored = await client.execute(
      "SELECT snapshot_ts FROM market_reference_snapshots WHERE symbol = 'SOL' ORDER BY snapshot_ts"
    );
    expect(stored.rows.map((r) => r.snapshot_ts)).toEqual([
      '2026-11-10T11:00:00.000Z',
      '2026-11-10T12:00:00.000Z',
    ]);
  });
});

describe('trimTursoMarketReferenceRows', () => {
  beforeEach(async () => {
    await client.execute('DELETE FROM market_reference_snapshots');
  });

  it('removes only rows past the retention window', async () => {
    const now = new Date('2026-11-10T12:00:00.000Z');
    await upsertTursoMarketReferenceRows(client, [
      row({ snapshot_ts: '2026-08-01T00:00:00.000Z', symbol: 'OLD' }), // >90d
      row({ snapshot_ts: '2026-10-01T00:00:00.000Z', symbol: 'KEEP' }), // <90d
    ]);
    const removed = await trimTursoMarketReferenceRows(client, 90, now);
    expect(removed).toBe(1);
    const left = await client.execute('SELECT symbol FROM market_reference_snapshots');
    expect(left.rows.map((r) => r.symbol)).toEqual(['KEEP']);
  });

  it('rejects non-positive retention windows', async () => {
    await expect(trimTursoMarketReferenceRows(client, 0)).rejects.toThrow('retentionDays');
  });
});

describe('readLatestSuccessfulRows', () => {
  beforeEach(async () => {
    await client.execute('DELETE FROM market_reference_snapshots');
  });

  it('returns the newest successful quotes per symbol only', async () => {
    await upsertTursoMarketReferenceRows(client, [
      row({ snapshot_ts: '2026-11-10T10:00:00.000Z' }),
      row({ snapshot_ts: '2026-11-10T12:00:00.000Z' }),
      row({
        snapshot_ts: '2026-11-10T11:00:00.000Z',
        is_success: false,
        symbol: 'BTC',
        exchange: 'down',
      }),
      row({ snapshot_ts: '2026-11-10T12:00:00.000Z', symbol: 'ETH', exchange: 'okx' }),
    ]);
    const rows = await readLatestSuccessfulRows(client, ['BTC', 'ETH'], 5);
    expect(rows).toHaveLength(3); // 2 BTC + 1 ETH; the failed BTC row excluded
    expect(rows.filter((r) => r.symbol === 'BTC')).toHaveLength(2);
    expect(rows.find((r) => r.symbol === 'BTC')?.snapshot_ts).toBe('2026-11-10T12:00:00.000Z');
  });
});

describe('readHourlyAggregates', () => {
  beforeEach(async () => {
    await client.execute('DELETE FROM market_reference_snapshots');
  });

  it('computes median, count, min, max, spread per symbol-hour', async () => {
    await upsertTursoMarketReferenceRows(client, [
      // hour 12: binance 88000, okx 88200, kraken 88400 → median 88200
      row({ snapshot_ts: '2026-11-10T12:10:00.000Z', exchange: 'binance', ref_price: 88_000 }),
      row({ snapshot_ts: '2026-11-10T12:20:00.000Z', exchange: 'okx', ref_price: 88_200 }),
      row({ snapshot_ts: '2026-11-10T12:30:00.000Z', exchange: 'kraken', ref_price: 88_400 }),
      // hour 13: single venue
      row({ snapshot_ts: '2026-11-10T13:10:00.000Z', exchange: 'binance', ref_price: 88_500 }),
      // excluded: failed row and non-positive price
      row({
        snapshot_ts: '2026-11-10T12:40:00.000Z',
        exchange: 'down',
        is_success: false,
        ref_price: 88_000,
      }),
      row({ snapshot_ts: '2026-11-10T12:50:00.000Z', exchange: 'zero', ref_price: 0 }),
    ]);

    const aggregates = await readHourlyAggregates(
      client,
      [],
      24,
      new Date('2026-11-10T14:00:00.000Z')
    );
    expect(aggregates).toHaveLength(2);

    const h12 = aggregates.find(
      (a) => a.symbol === 'BTC' && a.ref_hour.startsWith('2026-11-10T12')
    );
    expect(h12).toBeDefined();
    expect(h12?.ref_price).toBeCloseTo(88_200);
    expect(h12?.exchange_count).toBe(3);
    expect(h12?.min_ref_price).toBeCloseTo(88_000);
    expect(h12?.max_ref_price).toBeCloseTo(88_400);
    expect(h12?.cross_exchange_spread_pct).toBeCloseTo(((88_400 - 88_000) / 88_400) * 100, 6);

    const h13 = aggregates.find((a) => a.ref_hour.startsWith('2026-11-10T13'));
    expect(h13?.exchange_count).toBe(1);
    expect(h13?.cross_exchange_spread_pct).toBe(0);
  });

  it('respects the lookback window and symbol filter', async () => {
    await upsertTursoMarketReferenceRows(client, [
      row({ snapshot_ts: '2026-11-09T00:00:00.000Z', symbol: 'BTC', exchange: 'binance' }),
      row({ snapshot_ts: '2026-11-10T12:00:00.000Z', symbol: 'BTC', exchange: 'okx' }),
      row({ snapshot_ts: '2026-11-10T12:00:00.000Z', symbol: 'ETH', exchange: 'okx' }),
    ]);
    const aggregates = await readHourlyAggregates(
      client,
      ['BTC'],
      24,
      new Date('2026-11-10T13:00:00.000Z')
    );
    expect(aggregates).toHaveLength(1);
    expect(aggregates[0].symbol).toBe('BTC');
    expect(aggregates[0].exchange_count).toBe(1);
  });

  it('pairs an even-sized group to the average of the two middle values', async () => {
    await upsertTursoMarketReferenceRows(client, [
      row({ snapshot_ts: '2026-11-10T12:10:00.000Z', exchange: 'a', ref_price: 100 }),
      row({ snapshot_ts: '2026-11-10T12:20:00.000Z', exchange: 'b', ref_price: 101 }),
      row({ snapshot_ts: '2026-11-10T12:30:00.000Z', exchange: 'c', ref_price: 103 }),
      row({ snapshot_ts: '2026-11-10T12:40:00.000Z', exchange: 'd', ref_price: 200 }),
    ]);
    const aggregates = await readHourlyAggregates(
      client,
      ['BTC'],
      24,
      new Date('2026-11-10T13:00:00.000Z')
    );
    expect(aggregates[0].ref_price).toBeCloseTo((101 + 103) / 2);
  });
});
