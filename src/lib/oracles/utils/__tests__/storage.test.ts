/** @jest-environment node */

import { getHistoricalPricesFromDatabase } from '../storage';

const mockGetPriceRecords = jest.fn();
const mockFrom = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  getAdminQueries: () => ({
    getPriceRecords: (...args: unknown[]) => mockGetPriceRecords(...args),
  }),
  createServiceRoleClient: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
}));
jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({ error: (...args: unknown[]) => mockLoggerError(...args) }),
  normalizeError: (error: unknown) => error,
}));

function makeSnapshotQuery(data: unknown[]) {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    gte: jest.fn(),
    lte: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  query.lte.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockResolvedValue({ data, error: null });
  return query;
}

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
  });

  it('does not present the 24-hour TTL cache as long-term history', async () => {
    mockGetPriceRecords.mockResolvedValue([makePriceRecord(new Date().toISOString())]);
    mockFrom.mockReturnValue(makeSnapshotQuery([]));

    await expect(
      getHistoricalPricesFromDatabase('chainlink', 'BTC', 'ethereum', 48)
    ).resolves.toBeNull();
  });

  it('merges durable snapshots with richer recent records in timestamp order', async () => {
    const now = Date.now();
    mockGetPriceRecords.mockResolvedValue([
      makePriceRecord(new Date(now - 30 * 60 * 1000).toISOString()),
    ]);
    mockFrom.mockReturnValue(
      makeSnapshotQuery([
        {
          snapshot_ts: new Date(now - 36 * 60 * 60 * 1000).toISOString(),
          provider: 'chainlink',
          symbol: 'BTC',
          chain_id: 1,
          price: '50000',
          confidence: '0.98',
        },
      ])
    );

    const prices = await getHistoricalPricesFromDatabase('chainlink', 'BTC', 'ethereum', 48);

    expect(mockLoggerError.mock.calls).toEqual([]);
    expect(prices).toHaveLength(2);
    expect(prices?.[0].source).toBe('price_snapshots');
    expect(prices?.[1].source).toBe('live');
    expect(prices?.[0].timestamp).toBeLessThan(prices?.[1].timestamp ?? 0);
  });

  it('continues serving recent cache history when the archive has no row', async () => {
    mockGetPriceRecords.mockResolvedValue([makePriceRecord(new Date().toISOString())]);
    mockFrom.mockReturnValue(makeSnapshotQuery([]));

    const prices = await getHistoricalPricesFromDatabase('chainlink', 'BTC', 'ethereum', 24);

    expect(prices).toHaveLength(1);
    expect(prices?.[0].source).toBe('live');
  });
});
