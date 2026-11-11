import { createClient, type Client } from '@libsql/client';

import type { ManipCostRow } from '@/lib/manipCost/collector';
import {
  readTursoManipCostAdvisoryRows,
  readTursoManipCostMode,
  trimTursoManipCostRows,
  upsertTursoManipCostRows,
} from '@/lib/turso/ops/manipCostRepository';
import { ensureTursoOpsSchema } from '@/lib/turso/ops/schema';

let client: Client;

function row(overrides: Partial<ManipCostRow> = {}): ManipCostRow {
  return {
    snapshot_ts: '2026-11-11T03:00:00.000Z',
    pool_key: 'univ3-eth-usdc-500',
    chain: 'ethereum',
    pool_addr: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    dex: 'uniswap-v3',
    fee_tier: '500',
    block_number: 23_456_789,
    mid_price: 3_200.5,
    tvl_usd: 412_500.25,
    eth_usd_mid: 3_200.5,
    pool_state: { liquidity: '1234567890' },
    cost_curve: [{ size_eth: 10, cost_bps: 25 }],
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

describe('readTursoManipCostMode', () => {
  it('defaults to supabase and rejects unknown values', () => {
    expect(readTursoManipCostMode(undefined)).toBe('supabase');
    expect(readTursoManipCostMode('')).toBe('supabase');
    expect(readTursoManipCostMode('turso')).toBe('turso');
    expect(() => readTursoManipCostMode('shadow')).toThrow(
      'TURSO_MANIP_COST_MODE must be supabase or turso'
    );
  });
});

describe('upsertTursoManipCostRows', () => {
  it('inserts rows and deduplicates conflicts', async () => {
    const inserted = await upsertTursoManipCostRows(client, [row()]);
    expect(inserted).toBe(1);

    const stored = await client.execute(
      `SELECT mid_price, tvl_usd, is_success, pool_state, cost_curve
       FROM manip_cost_pool_snapshots WHERE pool_key = 'univ3-eth-usdc-500'`
    );
    expect(stored.rows).toHaveLength(1);
    expect(Number(stored.rows[0].mid_price)).toBeCloseTo(3_200.5);
    expect(Number(stored.rows[0].is_success)).toBe(1);
    expect(JSON.parse(String(stored.rows[0].pool_state))).toEqual({
      liquidity: '1234567890',
    });
    expect(JSON.parse(String(stored.rows[0].cost_curve))).toEqual([{ size_eth: 10, cost_bps: 25 }]);

    const reinserted = await upsertTursoManipCostRows(client, [
      row(),
      row({ pool_key: 'univ3-eth-usdc-3000' }),
    ]);
    expect(reinserted).toBe(1);
    const all = await client.execute('SELECT count(*) AS n FROM manip_cost_pool_snapshots');
    expect(Number(all.rows[0].n)).toBe(2);
  });

  it('persists failure rows with error messages', async () => {
    await upsertTursoManipCostRows(client, [
      row({
        pool_key: 'curve-eth-stable',
        is_success: false,
        error_message: 'RPC timeout',
        mid_price: null,
        tvl_usd: null,
      }),
    ]);
    const stored = await client.execute(
      `SELECT is_success, error_message FROM manip_cost_pool_snapshots
       WHERE pool_key = 'curve-eth-stable'`
    );
    expect(Number(stored.rows[0].is_success)).toBe(0);
    expect(stored.rows[0].error_message).toBe('RPC timeout');
  });

  it('returns zero for an empty batch', async () => {
    await expect(upsertTursoManipCostRows(client, [])).resolves.toBe(0);
  });
});

describe('trimTursoManipCostRows', () => {
  it('deletes rows older than the retention window', async () => {
    await upsertTursoManipCostRows(client, [
      row({
        snapshot_ts: '2025-10-01T00:00:00.000Z',
        pool_key: 'stale-pool',
      }),
    ]);
    const removed = await trimTursoManipCostRows(client, 365, new Date('2026-11-11T03:00:00Z'));
    expect(removed).toBe(1);
    const stale = await client.execute(
      `SELECT count(*) AS n FROM manip_cost_pool_snapshots WHERE pool_key = 'stale-pool'`
    );
    expect(Number(stale.rows[0].n)).toBe(0);
  });

  it('rejects a non-positive retention window', async () => {
    await expect(trimTursoManipCostRows(client, 0)).rejects.toThrow('positive integer');
  });
});

describe('readTursoManipCostAdvisoryRows', () => {
  it('returns only successful rows for the requested pools with parsed curves', async () => {
    await upsertTursoManipCostRows(client, [
      row(),
      row({
        snapshot_ts: '2026-11-11T04:00:00.000Z',
        is_success: false,
        error_message: 'rpc timeout',
      }),
      row({ snapshot_ts: '2026-11-11T05:00:00.000Z', pool_key: 'univ3-wbtc-weth-030' }),
    ]);

    const rows = await readTursoManipCostAdvisoryRows(
      client,
      ['univ3-eth-usdc-500', 'univ3-wbtc-weth-030'],
      20
    );
    expect(rows).toHaveLength(2);
    const eth = rows.find((r) => r.pool_key === 'univ3-eth-usdc-500')!;
    expect(eth.dex).toBe('uniswap-v3');
    expect(eth.fee_tier).toBe('500');
    expect(eth.block_number).toBe(23_456_789);
    expect(eth.mid_price).toBeCloseTo(3_200.5);
    expect(eth.cost_curve).toEqual([{ size_eth: 10, cost_bps: 25 }]);

    const wbtc = rows.find((r) => r.pool_key === 'univ3-wbtc-weth-030')!;
    expect(wbtc).toBeDefined();
    expect(rows.every((r) => r.pool_key !== 'unrelated')).toBe(true);
  });

  it('returns an empty array for an empty pool list', async () => {
    expect(await readTursoManipCostAdvisoryRows(client, [], 10)).toEqual([]);
  });
});
