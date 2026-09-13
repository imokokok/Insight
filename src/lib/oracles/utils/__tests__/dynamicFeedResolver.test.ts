import { getAdminQueries } from '@/lib/supabase/server';

import {
  getActiveFeedsMap,
  getAllActiveFeedsByProviderWithStatus,
  invalidateAllFeedsCache,
} from '../dynamicFeedResolver';

jest.mock('@/lib/supabase/server');

const mockedGetAdminQueries = getAdminQueries as jest.MockedFunction<typeof getAdminQueries>;

describe('dynamicFeedResolver cache invalidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateAllFeedsCache();
  });

  it('clears per-provider caches as well as the aggregate cache', async () => {
    const getOracleFeeds = jest
      .fn()
      .mockResolvedValueOnce([{ provider: 'redstone', symbol: 'ETH', chain_id: 0, address: 'ETH' }])
      .mockResolvedValueOnce([
        { provider: 'redstone', symbol: 'BTC', chain_id: 0, address: 'BTC' },
      ]);
    mockedGetAdminQueries.mockReturnValue({ getOracleFeeds } as never);

    expect(Array.from((await getActiveFeedsMap('redstone')).values())[0].symbol).toBe('ETH');
    invalidateAllFeedsCache();
    expect(Array.from((await getActiveFeedsMap('redstone')).values())[0].symbol).toBe('BTC');
    expect(getOracleFeeds).toHaveBeenCalledTimes(2);
  });

  it('distinguishes a successful empty registry from a database failure', async () => {
    const getOracleFeeds = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('db'));
    mockedGetAdminQueries.mockReturnValue({ getOracleFeeds } as never);

    await expect(getAllActiveFeedsByProviderWithStatus()).resolves.toEqual({
      feeds: new Map(),
      errored: false,
    });
    invalidateAllFeedsCache();
    await expect(getAllActiveFeedsByProviderWithStatus()).resolves.toEqual({
      feeds: new Map(),
      errored: true,
    });
  });
});
