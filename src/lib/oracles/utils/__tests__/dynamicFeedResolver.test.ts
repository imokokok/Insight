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
    const getOracleFeedsWithStatus = jest
      .fn()
      .mockResolvedValueOnce({ feeds: [], errored: false })
      .mockResolvedValueOnce({ feeds: [], errored: true });
    mockedGetAdminQueries.mockReturnValue({ getOracleFeedsWithStatus } as never);

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

  it('backs off provider reads after an aggregate registry outage', async () => {
    const getOracleFeeds = jest.fn();
    const getOracleFeedsWithStatus = jest.fn().mockResolvedValue({ feeds: [], errored: true });
    mockedGetAdminQueries.mockReturnValue({ getOracleFeeds, getOracleFeedsWithStatus } as never);

    await expect(getAllActiveFeedsByProviderWithStatus()).resolves.toEqual({
      feeds: new Map(),
      errored: true,
    });
    await expect(getActiveFeedsMap('redstone')).resolves.toEqual(new Map());
    expect(getOracleFeeds).not.toHaveBeenCalled();
  });
  it('reuses one complete registry read for every provider', async () => {
    const getOracleFeeds = jest.fn().mockResolvedValue([
      { provider: 'redstone', symbol: 'etrUSD_FUNDAMENTAL', chain_id: 0, address: 'a' },
      { provider: 'dia', symbol: 'BTC', chain_id: 1, address: 'b' },
    ]);
    const getOracleFeedsWithStatus = jest.fn().mockResolvedValue({
      feeds: [
        { provider: 'redstone', symbol: 'etrUSD_FUNDAMENTAL', chain_id: 0, address: 'a' },
        { provider: 'dia', symbol: 'BTC', chain_id: 1, address: 'b' },
      ],
      errored: false,
    });
    mockedGetAdminQueries.mockReturnValue({ getOracleFeeds, getOracleFeedsWithStatus } as never);
    await getAllActiveFeedsByProviderWithStatus();
    expect(Array.from((await getActiveFeedsMap('redstone')).values())[0].symbol).toBe(
      'etrUSD_FUNDAMENTAL'
    );
    expect((await getActiveFeedsMap('dia')).size).toBe(1);
    expect((await getActiveFeedsMap('api3')).size).toBe(0);
    expect(getOracleFeedsWithStatus).toHaveBeenCalledTimes(1);
  });

  it('does not resurrect an obsolete provider cache after complete registry refresh', async () => {
    const getOracleFeeds = jest
      .fn()
      .mockResolvedValueOnce([{ provider: 'dia', symbol: 'ETH', chain_id: 1, address: 'a' }])
      .mockResolvedValueOnce([]);
    const getOracleFeedsWithStatus = jest.fn().mockResolvedValue({ feeds: [], errored: false });
    mockedGetAdminQueries.mockReturnValue({ getOracleFeeds, getOracleFeedsWithStatus } as never);
    await getActiveFeedsMap('dia');
    await getAllActiveFeedsByProviderWithStatus();
    expect((await getActiveFeedsMap('dia')).size).toBe(0);
    expect(getOracleFeeds).toHaveBeenCalledTimes(1);
    expect(getOracleFeedsWithStatus).toHaveBeenCalledTimes(1);
  });
});
