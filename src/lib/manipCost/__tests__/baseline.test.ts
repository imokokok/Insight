import {
  MANIP_COST_MAX_AGE_MS,
  getManipCostAdvisory,
  isManipCostCoveredSymbol,
  manipCostPoolKeysForSymbol,
} from '../baseline';

import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Fake Supabase client: only the chain used by getManipCostAdvisory.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

function fakeSupabase(result: { data?: Row[] | null; error?: { message: string } | null }) {
  const builder = {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    then: (
      resolve: (v: { data: Row[] | null; error: { message: string } | null }) => unknown,
      reject: (e: unknown) => unknown
    ) =>
      Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(
        resolve,
        reject
      ),
  };
  return { from: jest.fn().mockReturnValue(builder) } as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Fixtures — mirror the collector's cost_curve shape (collector.ts).
// ---------------------------------------------------------------------------

function curveEntry(movePct: number, upUsd: number, downUsd: number): Row {
  return {
    move_pct: movePct,
    up_usd: upUsd,
    down_usd: downUsd,
    up_roundtrip_fee_usd: upUsd * 0.001,
    down_roundtrip_fee_usd: downUsd * 0.001,
    within_range_assumed: true,
  };
}

function snapshotRow(poolKey: string, ageMinutes: number): Row {
  return {
    pool_key: poolKey,
    dex: poolKey.startsWith('uniswap-v3') ? 'uniswap-v3' : 'uniswap-v2',
    fee_tier: poolKey.startsWith('uniswap-v3') ? '0.0005' : null,
    snapshot_ts: new Date(Date.now() - ageMinutes * 60_000).toISOString(),
    block_number: 26_000_000,
    mid_price: 0.0004,
    tvl_usd: 154_000_000,
    cost_curve: [
      curveEntry(0.5, 300_000, 310_000),
      curveEntry(1, 600_000, 620_000),
      curveEntry(2, 1_200_000, 1_240_000),
    ],
  };
}

const NOW = new Date();

// ---------------------------------------------------------------------------
// Symbol mapping
// ---------------------------------------------------------------------------

describe('manipCostPoolKeysForSymbol', () => {
  it('maps ETH and WETH to the two ETH/USDC pools (not the WBTC pool)', () => {
    expect(manipCostPoolKeysForSymbol('ETH')).toEqual([
      'uniswap-v3-eth-usdc-005',
      'uniswap-v2-usdc-weth',
    ]);
    expect(manipCostPoolKeysForSymbol('weth')).toEqual(manipCostPoolKeysForSymbol('ETH'));
  });

  it('maps USDC to the ETH/USDC pools and WBTC to its own pool', () => {
    expect(manipCostPoolKeysForSymbol('usdc')).toEqual([
      'uniswap-v3-eth-usdc-005',
      'uniswap-v2-usdc-weth',
    ]);
    expect(manipCostPoolKeysForSymbol('WBTC')).toEqual(['uniswap-v3-wbtc-weth-030']);
  });

  it('returns null for uncovered symbols', () => {
    expect(manipCostPoolKeysForSymbol('APE')).toBeNull();
    expect(manipCostPoolKeysForSymbol('')).toBeNull();
    expect(isManipCostCoveredSymbol('SOL')).toBe(false);
    expect(isManipCostCoveredSymbol('ETH')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getManipCostAdvisory
// ---------------------------------------------------------------------------

describe('getManipCostAdvisory', () => {
  it('builds the advisory from fresh snapshots for all mapped pools (ETH)', async () => {
    const rows = [
      snapshotRow('uniswap-v3-eth-usdc-005', 5),
      snapshotRow('uniswap-v2-usdc-weth', 7),
    ];
    const advisory = await getManipCostAdvisory(fakeSupabase({ data: rows }), 'ETH', { now: NOW });

    expect(advisory).not.toBeNull();
    expect(advisory?.symbol).toBe('ETH');
    expect(advisory?.advisoryOnly).toBe(true);
    expect(advisory?.referenceChain).toBe('ethereum');
    expect(advisory?.pools).toHaveLength(2);
    // 1% step: min(up, down) across both pools = 600_000.
    expect(advisory?.cheapestMove1PctUsd).toBe(600_000);
    expect(advisory?.pools[0].curve[1]).toMatchObject({
      movePct: 1,
      upUsd: 600_000,
      downUsd: 620_000,
      minUsd: 600_000,
      minRoundtripFeeUsd: 600,
    });
  });

  it('normalizes WETH to the ETH advisory symbol', async () => {
    const rows = [
      snapshotRow('uniswap-v3-eth-usdc-005', 5),
      snapshotRow('uniswap-v2-usdc-weth', 7),
    ];
    const advisory = await getManipCostAdvisory(fakeSupabase({ data: rows }), 'WETH', { now: NOW });
    expect(advisory?.symbol).toBe('ETH');
  });

  it('returns null for uncovered symbols without querying', async () => {
    const client = fakeSupabase({ data: [] });
    const advisory = await getManipCostAdvisory(client, 'APE', { now: NOW });
    expect(advisory).toBeNull();
    expect(client.from).not.toHaveBeenCalled();
  });

  it('returns null when any mapped pool has no successful snapshot (fail-closed)', async () => {
    const rows = [snapshotRow('uniswap-v3-eth-usdc-005', 5)]; // v2 pool missing
    const advisory = await getManipCostAdvisory(fakeSupabase({ data: rows }), 'ETH', { now: NOW });
    expect(advisory).toBeNull();
  });

  it('withholds stale snapshots instead of serving them as current', async () => {
    const staleAgeMinutes = MANIP_COST_MAX_AGE_MS / 60_000 + 30; // 2h + 30min
    const rows = [
      snapshotRow('uniswap-v3-eth-usdc-005', staleAgeMinutes),
      snapshotRow('uniswap-v2-usdc-weth', staleAgeMinutes),
    ];
    const advisory = await getManipCostAdvisory(fakeSupabase({ data: rows }), 'ETH', { now: NOW });
    expect(advisory).toBeNull();
  });

  it('returns null on a malformed cost curve (never partial)', async () => {
    const bad = snapshotRow('uniswap-v3-eth-usdc-005', 5);
    bad.cost_curve = [{ move_pct: 1, up_usd: 'oops', down_usd: 620_000 }];
    const rows = [bad, snapshotRow('uniswap-v2-usdc-weth', 7)];
    const advisory = await getManipCostAdvisory(fakeSupabase({ data: rows }), 'ETH', { now: NOW });
    expect(advisory).toBeNull();
  });

  it('returns null on query error', async () => {
    const advisory = await getManipCostAdvisory(
      fakeSupabase({ data: null, error: { message: 'connection refused' } }),
      'ETH',
      { now: NOW }
    );
    expect(advisory).toBeNull();
  });

  it('returns null when the client itself throws (never propagates)', async () => {
    const client = {
      from: jest.fn().mockImplementation(() => {
        throw new Error('client unavailable');
      }),
    } as unknown as SupabaseClient;
    const advisory = await getManipCostAdvisory(client, 'ETH', { now: NOW });
    expect(advisory).toBeNull();
  });
});
