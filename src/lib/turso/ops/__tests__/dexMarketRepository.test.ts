import { createClient, type Client } from '@libsql/client';

import {
  loadTursoDexCursor,
  persistTursoDexWindow,
  readTursoDexMarketMode,
  readTursoDexVolumeWindow,
  trimTursoDexSwapEvents,
  type TursoDexSwapRow,
} from '@/lib/turso/ops/dexMarketRepository';
import { ensureTursoOpsSchema } from '@/lib/turso/ops/schema';

let client: Client;

const KEY = { chainId: 143, dex: 'uniswap-v3', poolAddress: '0xpool' };

function swap(txHash: string, blockTimestamp = '2026-11-11T04:00:00.000Z'): TursoDexSwapRow {
  return {
    chainId: KEY.chainId,
    dex: KEY.dex,
    poolAddress: KEY.poolAddress,
    txHash,
    logIndex: '1',
    blockNumber: '100',
    blockHash: '0xbh',
    blockTimestamp,
    amount0Raw: '1000',
    amount1Raw: '2000',
  };
}

beforeAll(async () => {
  client = createClient({ url: 'file::memory:' });
  await ensureTursoOpsSchema(client);
});

describe('readTursoDexMarketMode', () => {
  it('defaults to supabase and validates the flag', () => {
    expect(readTursoDexMarketMode(undefined)).toBe('supabase');
    expect(readTursoDexMarketMode('turso')).toBe('turso');
    expect(() => readTursoDexMarketMode('bogus')).toThrow('TURSO_DEX_MARKET_MODE');
  });
});

describe('loadTursoDexCursor', () => {
  it('returns null before the first scan', async () => {
    await expect(loadTursoDexCursor(client, KEY)).resolves.toBeNull();
  });
});

describe('persistTursoDexWindow', () => {
  it('persists events and the cursor in one transaction', async () => {
    await persistTursoDexWindow(client, KEY, [swap('0xtx1'), swap('0xtx2')], {
      lastScannedBlock: '100',
      lastScannedTimestamp: '2026-11-11T04:05:00.000Z',
      coverageStartedAt: '2026-11-11T04:00:00.000Z',
    });
    const events = await client.execute('SELECT count(*) AS n FROM dex_market_swap_events');
    expect(Number(events.rows[0].n)).toBe(2);
    const cursor = await loadTursoDexCursor(client, KEY);
    expect(cursor?.lastScannedBlock).toBe('100');
  });

  it('re-persists the same window idempotently and advances only the cursor', async () => {
    await persistTursoDexWindow(client, KEY, [swap('0xtx1')], {
      lastScannedBlock: '150',
      lastScannedTimestamp: '2026-11-11T05:05:00.000Z',
      coverageStartedAt: '2026-11-11T04:00:00.000Z',
    });
    const events = await client.execute('SELECT count(*) AS n FROM dex_market_swap_events');
    expect(Number(events.rows[0].n)).toBe(2);
    const cursor = await loadTursoDexCursor(client, KEY);
    expect(cursor?.lastScannedBlock).toBe('150');
    expect(cursor?.coverageStartedAt).toBe('2026-11-11T04:00:00.000Z');
  });

  it('advances the cursor even with no swaps (caught-up window)', async () => {
    await persistTursoDexWindow(client, KEY, [], {
      lastScannedBlock: '200',
      lastScannedTimestamp: '2026-11-11T06:00:00.000Z',
      coverageStartedAt: '2026-11-11T04:00:00.000Z',
    });
    const cursor = await loadTursoDexCursor(client, KEY);
    expect(cursor?.lastScannedBlock).toBe('200');
  });
});

describe('trimTursoDexSwapEvents', () => {
  it('drops events older than the retention window', async () => {
    const now = new Date('2026-11-11T06:00:00.000Z');
    await client.execute({
      sql: "INSERT INTO dex_market_swap_events (chain_id, dex, pool_address, tx_hash, log_index, block_number, block_hash, block_timestamp, amount0_raw, amount1_raw, created_at) VALUES (143, 'uniswap-v3', '0xpool', '0xold', '9', '10', '0xbh', '2026-10-01T00:00:00.000Z', '1', '2', '2026-10-01T00:00:00.000Z')",
      args: [],
    });
    const deleted = await trimTursoDexSwapEvents(client, 35, now);
    expect(deleted).toBeGreaterThanOrEqual(1);
  });

  it('rejects a non-positive retention window', async () => {
    await expect(trimTursoDexSwapEvents(client, 0)).rejects.toThrow('retentionDays');
  });
});

describe('readTursoDexVolumeWindow', () => {
  const params = {
    chainId: 185,
    dex: 'uniswap-v3',
    poolAddress: '0xpool',
    windowStart: '2026-11-11T00:00:00.000Z',
    windowEnd: '2026-11-11T01:00:00.000Z',
  };

  it('counts swaps and sums absolute amounts over (start, end]', async () => {
    await client.batch(
      [
        // inside the window
        {
          sql: "INSERT INTO dex_market_swap_events VALUES (185,'uniswap-v3','0xpool','0x1',0,'100','0xb1','2026-11-11T00:10:00.000Z','1000000','2500000','2026-11-11T00:10:00.000Z')",
          args: [],
        },
        {
          sql: "INSERT INTO dex_market_swap_events VALUES (185,'uniswap-v3','0xpool','0x2',0,'101','0xb2','2026-11-11T00:20:00.000Z','2000000','-1500000','2026-11-11T00:20:00.000Z')",
          args: [],
        },
        // excluded: at/below exclusive start, above inclusive end
        {
          sql: "INSERT INTO dex_market_swap_events VALUES (185,'uniswap-v3','0xpool','0x3',0,'99','0xb3','2026-11-11T00:00:00.000Z','1','999999','2026-11-11T00:00:00.000Z')",
          args: [],
        },
        {
          sql: "INSERT INTO dex_market_swap_events VALUES (185,'uniswap-v3','0xpool','0x4',0,'102','0xb4','2026-11-11T01:00:00.000Z','1','500000','2026-11-11T01:00:00.000Z')",
          args: [],
        },
        // excluded: boundary row in the other text format at exclusive start
        {
          sql: "INSERT INTO dex_market_swap_events VALUES (185,'uniswap-v3','0xpool','0x5',0,'98','0xb5','2026-11-11T00:00:00+00:00','1','777777','2026-11-11T00:00:00+00:00')",
          args: [],
        },
        // included: end-second row in the other text format (inclusive end)
        {
          sql: "INSERT INTO dex_market_swap_events VALUES (185,'uniswap-v3','0xpool','0x6',0,'103','0xb6','2026-11-11T01:00:00+00:00','1','250000','2026-11-11T01:00:00+00:00')",
          args: [],
        },
      ],
      'write'
    );

    const window = await readTursoDexVolumeWindow(client, params);
    expect(window.swapCount).toBe(4);
    // 2,500,000 + 1,500,000 + 500,000 + 250,000 (abs amounts)
    expect(window.grossQuoteVolumeRaw).toBe('4750000');
  });

  it('rejects an invalid window', async () => {
    await expect(
      readTursoDexVolumeWindow(client, { ...params, windowEnd: params.windowStart })
    ).rejects.toThrow('Invalid DEX volume window');
  });
});
