import { createClient, type Client } from '@libsql/client';

import type { PriceRecordInsert } from '@/lib/supabase/queries';

import {
  deleteExpiredTursoPriceRecords,
  insertTursoPriceRecords,
  listTursoPriceRecords,
  readTursoLatestPriceRecord,
  type TursoPriceRecordsFilters,
} from '../recordsRepository';
import { ensureTursoPriceSchema } from '../schema';

const NOW_MS = Date.parse('2026-11-08T02:00:00.000Z');

function record(overrides: Partial<PriceRecordInsert> = {}): PriceRecordInsert {
  return {
    provider: 'chainlink',
    symbol: 'ETH',
    chain: 'ethereum',
    price: 3345.12345678,
    timestamp: '2026-11-08T01:00:00.000Z',
    decimals: 8,
    confidence: 0.9876,
    source: 'aggregator',
    verification: { verified: true, blockNumber: 123 } as never,
    ingestion_timestamp: '2026-11-08T01:00:05.000Z',
    metadata_fallback: false,
    failure_mode: null,
    signal_vector: { volatility: 0.12 },
    ttl: '2h',
    ...overrides,
  };
}

describe('Turso price_records repository', () => {
  let client: Client;

  beforeEach(async () => {
    client = createClient({ url: 'file::memory:' });
    await ensureTursoPriceSchema(client, 1);
  });

  afterEach(() => {
    client.close();
  });

  it('writes valid rows, skips invalid prices, and deduplicates within a batch', async () => {
    const saved = await insertTursoPriceRecords(
      client,
      [
        record(),
        record(),
        record({ price: 0 }),
        record({ symbol: 'BTC', timestamp: '2026-11-08T01:30:00.000Z' }),
      ],
      NOW_MS
    );

    expect(saved).toBe(2);
    const rows = await client.execute('SELECT provider, symbol FROM price_records ORDER BY symbol');
    expect(rows.rows).toHaveLength(2);
    expect(rows.rows.map((row) => row.symbol)).toEqual(['BTC', 'ETH']);
  });

  it('reads the latest non-expired row and preserves JSON fields', async () => {
    await insertTursoPriceRecords(
      client,
      [
        record({ timestamp: '2026-11-08T00:00:00.000Z', price: 3300 }),
        record({ timestamp: '2026-11-08T01:00:00.000Z', price: 3345.12345678 }),
      ],
      NOW_MS
    );

    const latest = await readTursoLatestPriceRecord(client, {
      provider: 'chainlink',
      symbol: 'ETH',
      chain: 'ethereum',
      nowMs: NOW_MS,
    });

    expect(latest).toMatchObject({
      provider: 'chainlink',
      symbol: 'ETH',
      chain: 'ethereum',
      price: 3345.12345678,
      decimals: 8,
      confidence: 0.9876,
      source: 'aggregator',
      metadata_fallback: false,
      failure_mode: null,
      signal_vector: { volatility: 0.12 },
    });
    expect(latest?.verification).toEqual({ verified: true, blockNumber: 123 });
    expect(latest?.timestamp).toBe('2026-11-08T01:00:00.000Z');
    expect(latest?.ttl).toBe('2026-11-08T04:00:00.000Z');
  });

  it('treats a null chain as a distinct cache key', async () => {
    await insertTursoPriceRecords(
      client,
      [
        record({ chain: null, price: 3301, timestamp: '2026-11-08T00:00:00.000Z' }),
        record({ chain: 'ethereum', price: 3302, timestamp: '2026-11-08T01:00:00.000Z' }),
      ],
      NOW_MS
    );

    const nullChain = await readTursoLatestPriceRecord(client, {
      provider: 'chainlink',
      symbol: 'ETH',
      chain: null,
      nowMs: NOW_MS,
    });
    expect(nullChain?.price).toBe(3301);

    const anyChain = await readTursoLatestPriceRecord(client, {
      provider: 'chainlink',
      symbol: 'ETH',
      nowMs: NOW_MS,
    });
    expect(anyChain?.price).toBe(3302);
  });

  it('filters history by provider, symbol, time window, limit, and offset', async () => {
    await insertTursoPriceRecords(
      client,
      [
        record({ provider: 'chainlink', timestamp: '2026-11-08T00:00:00.000Z', price: 1 }),
        record({ provider: 'chainlink', timestamp: '2026-11-08T01:00:00.000Z', price: 2 }),
        record({ provider: 'pyth', timestamp: '2026-11-08T01:30:00.000Z', price: 3 }),
        record({ provider: 'chainlink', timestamp: '2026-11-08T02:00:00.000Z', price: 4 }),
      ],
      NOW_MS
    );

    const filters: TursoPriceRecordsFilters = {
      provider: 'chainlink',
      symbol: 'ETH',
      startTime: Date.parse('2026-11-08T00:30:00.000Z'),
      endTime: Date.parse('2026-11-08T01:30:00.000Z'),
    };
    const rows = await listTursoPriceRecords(client, { ...filters, limit: 10 });
    expect(rows.map((row) => row.price)).toEqual([2]);

    const page = await listTursoPriceRecords(client, {
      provider: 'chainlink',
      limit: 1,
      offset: 1,
    });
    expect(page).toHaveLength(1);
    expect(page[0].timestamp).toBe('2026-11-08T01:00:00.000Z');
  });

  it('deletes rows only after their TTL', async () => {
    await insertTursoPriceRecords(client, [record({ ttl: '1h' })], NOW_MS);

    expect(await deleteExpiredTursoPriceRecords(client, NOW_MS)).toBe(0);
    expect(
      await deleteExpiredTursoPriceRecords(client, Date.parse('2026-11-08T03:00:01.000Z'))
    ).toBe(1);
  });
});
