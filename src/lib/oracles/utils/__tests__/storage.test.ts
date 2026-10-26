/** @jest-environment node */

import { getHistoricalPricesFromDatabase, getLatestPriceSnapshotFromDatabase } from '../storage';

const mockGetPriceRecords = jest.fn();
const mockHistory = jest.fn();
const mockLoggerError = jest.fn();
const mockSnapshotMaybeSingle = jest.fn();
const mockSnapshotFrom = jest.fn();

const mockSnapshotQuery = {
  select: jest.fn(),
  eq: jest.fn(),
  gt: jest.fn(),
  order: jest.fn(),
  limit: jest.fn(),
  maybeSingle: (...args: unknown[]) => mockSnapshotMaybeSingle(...args),
};
for (const method of ['select', 'eq', 'gt', 'order', 'limit'] as const) {
  mockSnapshotQuery[method].mockReturnValue(mockSnapshotQuery);
}

jest.mock('@/lib/supabase/server', () => ({
  getAdminQueries: () => ({
    getPriceRecords: (...args: unknown[]) => mockGetPriceRecords(...args),
  }),
  createServiceRoleClient: () => ({
    from: (...args: unknown[]) => mockSnapshotFrom(...args),
  }),
}));
jest.mock('@/lib/supabase/snapshotHistory', () => ({
  loadSnapshotHistoryRange: (...args: unknown[]) => mockHistory(...args),
}));
jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({ error: (...args: unknown[]) => mockLoggerError(...args) }),
  normalizeError: (error: unknown) => error,
}));

function makePriceRecord(timestamp: string) {
  return {
    id: 'record-1',
    provider: 'chainlink',
    symbol: 'BTC',
    chain: 'ethereum',
    price: 50_100,
    timestamp,
    confidence: 0.99,
    source: 'live',
    created_at: timestamp,
    ttl: new Date(Date.now() + 60_000).toISOString(),
  };
}

describe('oracle storage historical archive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSnapshotFrom.mockReturnValue(mockSnapshotQuery);
    for (const method of ['select', 'eq', 'gt', 'order', 'limit'] as const) {
      mockSnapshotQuery[method].mockReturnValue(mockSnapshotQuery);
    }
  });

  it('loads the newest successful snapshot as an outage-only fallback', async () => {
    const snapshotTs = new Date().toISOString();
    mockSnapshotMaybeSingle.mockResolvedValue({
      data: {
        snapshot_ts: snapshotTs,
        provider: 'chainlink',
        symbol: 'BTC',
        chain_id: 1,
        price: '50100',
        confidence: '0.98',
        data_age_seconds: 90,
      },
      error: null,
    });

    const fallback = await getLatestPriceSnapshotFromDatabase('chainlink', 'BTC', 'ethereum');
    expect(mockLoggerError.mock.calls).toEqual([]);
    expect(fallback).toMatchObject({
      provider: 'chainlink',
      symbol: 'BTC',
      chain: 'ethereum',
      price: 50_100,
      source: 'price_snapshots',
    });
    expect(fallback?.timestamp).toBe(Date.parse(snapshotTs) - 90_000);
    expect(mockSnapshotFrom).toHaveBeenCalledWith('price_snapshots');
    expect(mockSnapshotQuery.eq).toHaveBeenCalledWith('chain_id', 1);
  });

  it('does not present the 24-hour TTL cache as long-term history', async () => {
    mockGetPriceRecords.mockResolvedValue([makePriceRecord(new Date().toISOString())]);
    mockHistory.mockResolvedValue([]);

    await expect(
      getHistoricalPricesFromDatabase('chainlink', 'BTC', 'ethereum', 48)
    ).resolves.toBeNull();
  });

  it('merges durable snapshots with richer recent records in timestamp order', async () => {
    const now = Date.now();
    mockGetPriceRecords.mockResolvedValue([
      makePriceRecord(new Date(now - 30 * 60 * 1000).toISOString()),
    ]);
    mockHistory.mockResolvedValue([
      {
        snapshot_ts: new Date(now - 36 * 60 * 60 * 1000).toISOString(),
        provider: 'chainlink',
        symbol: 'BTC',
        chain_id: 1,
        price: '50000',
        confidence: '0.98',
      },
    ]);

    const prices = await getHistoricalPricesFromDatabase('chainlink', 'BTC', 'ethereum', 48);

    expect(mockLoggerError.mock.calls).toEqual([]);
    expect(prices).toHaveLength(2);
    expect(prices?.[0].source).toBe('price_snapshots');
    expect(prices?.[1].source).toBe('live');
    expect(prices?.[0].timestamp).toBeLessThan(prices?.[1].timestamp ?? 0);
  });

  it('continues serving recent cache history when the archive has no row', async () => {
    mockGetPriceRecords.mockResolvedValue([makePriceRecord(new Date().toISOString())]);
    mockHistory.mockResolvedValue([]);

    const prices = await getHistoricalPricesFromDatabase('chainlink', 'BTC', 'ethereum', 24);

    expect(prices).toHaveLength(1);
    expect(prices?.[0].source).toBe('live');
  });
});
