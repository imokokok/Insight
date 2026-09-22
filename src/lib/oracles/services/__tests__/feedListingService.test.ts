import { createServiceRoleClient } from '@/lib/supabase/server';

import { listOracleFeeds } from '../feedListingService';

jest.mock('@/lib/supabase/server');

const mockedCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;

function makeQuery(result: { data: unknown[] | null; count: number | null; error: unknown }) {
  const query = {
    eq: jest.fn(),
    order: jest.fn(),
    range: jest.fn().mockResolvedValue(result),
  };
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  const select = jest.fn().mockReturnValue(query);
  const from = jest.fn().mockReturnValue({ select });
  mockedCreateServiceRoleClient.mockReturnValue({ from } as never);
  return { query, select, from };
}

describe('listOracleFeeds', () => {
  it('pushes all filters, ordering and pagination into one database query', async () => {
    const feed = { id: 'one', symbol: 'ETH', is_active: false };
    const { query, select, from } = makeQuery({ data: [feed], count: 47, error: null });

    const result = await listOracleFeeds({
      provider: 'chainlink',
      symbol: 'ETH',
      category: 'crypto',
      chainId: 1,
      isActive: false,
      limit: 25,
      offset: 25,
    });

    expect(result).toEqual({ feeds: [feed], total: 47 });
    expect(from).toHaveBeenCalledWith('oracle_feeds');
    expect(select).toHaveBeenCalledWith(expect.not.stringContaining('*'), { count: 'exact' });
    expect(query.eq.mock.calls).toEqual([
      ['provider', 'chainlink'],
      ['symbol', 'ETH'],
      ['category', 'crypto'],
      ['chain_id', 1],
      ['is_active', false],
    ]);
    expect(query.order.mock.calls).toEqual([
      ['symbol', { ascending: true }],
      ['chain_id', { ascending: true }],
      ['id', { ascending: true }],
    ]);
    expect(query.range).toHaveBeenCalledTimes(1);
    expect(query.range).toHaveBeenCalledWith(25, 49);
  });

  it('allows an empty page while preserving the exact total', async () => {
    const { query } = makeQuery({ data: [], count: 2776, error: null });
    await expect(listOracleFeeds({ limit: 100, offset: 3000 })).resolves.toEqual({
      feeds: [],
      total: 2776,
    });
    expect(query.eq).not.toHaveBeenCalled();
  });

  it('does not mistake a database error for an empty registry', async () => {
    makeQuery({ data: null, count: null, error: { message: 'timeout' } });
    await expect(listOracleFeeds({ limit: 100, offset: 0 })).rejects.toThrow('timeout');
  });
});
