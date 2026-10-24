import { createServiceRoleClient } from '@/lib/supabase/server';

import { CHRONICLE_MONAD_PRICE_FEEDS } from '../../constants/chronicleMonad';
import { PYTH_MONAD_SPONSORED_FEEDS } from '../../constants/pythMonad';
import { STORK_MONAD_PUSHED_FEEDS } from '../../constants/storkMonad';
import { SUPRA_MONAD_PUSHED_FEEDS } from '../../constants/supraMonad';
import { chronicleMonadOnChainService } from '../chronicleMonadOnChainService';
import { feedSyncService } from '../feedSyncService';
import { pythMonadOnChainService } from '../pythMonadOnChainService';
import { storkMonadOnChainService } from '../storkMonadOnChainService';
import { supraMonadOnChainService } from '../supraMonadOnChainService';

jest.mock('@/lib/supabase/server');

const mockedCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;

describe('feedSyncService seed lifecycle', () => {
  afterEach(() => jest.restoreAllMocks());

  it('does not reactivate existing health-deactivated rows during a metadata seed', async () => {
    const select = jest.fn().mockResolvedValue({ data: [{}], error: null });
    const upsert = jest.fn().mockReturnValue({ select });
    mockedCreateServiceRoleClient.mockReturnValue({
      from: jest.fn().mockReturnValue({ upsert }),
    } as never);

    await feedSyncService.seedSupraFeedsFromHardcoded();

    const rows = upsert.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => !Object.hasOwn(row, 'is_active'))).toBe(true);
  });

  it('retires only reviewed Pyth catalog removals, never feeds that merely fail a live probe', async () => {
    const upsertSelect = jest.fn().mockResolvedValue({ data: [{}], error: null });
    const upsert = jest.fn().mockReturnValue({ select: upsertSelect });

    const registryQuery = {
      select: jest.fn().mockResolvedValue({
        data: [{ symbol: 'RETIRED/USD' }],
        error: null,
      }),
      eq: jest.fn(),
    };
    registryQuery.select.mockReturnValue(registryQuery);
    registryQuery.eq.mockReturnValue(registryQuery);
    Object.assign(registryQuery, {
      then: (resolve: (value: { data: Array<{ symbol: string }>; error: null }) => unknown) =>
        resolve({ data: [{ symbol: 'RETIRED/USD' }], error: null }),
    });

    const retirementQuery = {
      update: jest.fn(),
      eq: jest.fn(),
    };
    retirementQuery.update.mockReturnValue(retirementQuery);
    retirementQuery.eq.mockReturnValue(retirementQuery);
    // PostgREST builders are awaitable; the final `.eq()` resolves this one.
    Object.assign(retirementQuery, {
      then: (resolve: (value: { error: null }) => unknown) => resolve({ error: null }),
    });

    mockedCreateServiceRoleClient.mockReturnValue({
      from: jest
        .fn()
        .mockReturnValueOnce({ upsert })
        .mockReturnValueOnce(registryQuery)
        .mockReturnValueOnce(retirementQuery),
    } as never);
    jest.spyOn(pythMonadOnChainService, 'getPrice').mockImplementation(async (feed) => ({
      symbol: feed.alias,
      feedId: `0x${feed.id}`,
      price: 1,
      conf: 0,
      exponent: -8,
      publishTime: Math.floor(Date.now() / 1000),
      timestamp: Date.now(),
      confidenceRatio: 0,
      maxAgeSeconds: feed.timeDifferenceSeconds * 2,
      priceDeviationPercent: feed.priceDeviationPercent,
    }));

    const result = await feedSyncService.seedPythMonadSponsoredFeeds();

    expect(result.discovered).toBe(PYTH_MONAD_SPONSORED_FEEDS.length);
    expect(result.upserted).toBe(1);
    expect(result.deactivated).toBe(1);
    expect(registryQuery.eq).toHaveBeenCalledWith('source', 'pyth-monad-sponsored-registry');
    expect(retirementQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: false,
        deactivated_reason: 'curated_registry_retired',
      })
    );
    expect(retirementQuery.eq).toHaveBeenCalledWith('symbol', 'RETIRED/USD');
  });

  it('seeds all reviewed Stork Monad feeds only after each passes the on-chain freshness gate', async () => {
    const select = jest.fn().mockResolvedValue({ data: STORK_MONAD_PUSHED_FEEDS, error: null });
    const upsert = jest.fn().mockReturnValue({ select });

    const registryQuery = {
      select: jest.fn(),
      eq: jest.fn(),
    };
    registryQuery.select.mockReturnValue(registryQuery);
    registryQuery.eq.mockReturnValue(registryQuery);
    Object.assign(registryQuery, {
      then: (resolve: (value: { data: []; error: null }) => unknown) =>
        resolve({ data: [], error: null }),
    });

    mockedCreateServiceRoleClient.mockReturnValue({
      from: jest.fn().mockReturnValueOnce({ upsert }).mockReturnValueOnce(registryQuery),
    } as never);
    const getPrice = jest
      .spyOn(storkMonadOnChainService, 'getPrice')
      .mockResolvedValue({} as never);

    const result = await feedSyncService.seedStorkMonadPushedFeeds();

    expect(result).toEqual({
      provider: 'stork',
      discovered: 38,
      upserted: 38,
      deactivated: 0,
      errors: 0,
    });
    expect(getPrice).toHaveBeenCalledTimes(38);
    const rows = upsert.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(38);
    expect(rows.find((row) => row.symbol === 'EARNAUSDA/USD.RR')?.metadata).toMatchObject({
      assetId: 'EARNAUSDAUSD_RR',
      quoteType: 'reference-rate',
    });
    expect(rows.find((row) => row.symbol === 'S/USD')?.metadata).toMatchObject({
      assetId: 'SUSD',
      quoteType: 'price',
    });
  });

  it('seeds only reviewed Chronicle Monad feeds after each passes readWithAge freshness', async () => {
    const select = jest.fn().mockResolvedValue({ data: CHRONICLE_MONAD_PRICE_FEEDS, error: null });
    const upsert = jest.fn().mockReturnValue({ select });

    const registryQuery = {
      select: jest.fn(),
      eq: jest.fn(),
    };
    registryQuery.select.mockReturnValue(registryQuery);
    registryQuery.eq.mockReturnValue(registryQuery);
    Object.assign(registryQuery, {
      then: (resolve: (value: { data: []; error: null }) => unknown) =>
        resolve({ data: [], error: null }),
    });

    mockedCreateServiceRoleClient.mockReturnValue({
      from: jest.fn().mockReturnValueOnce({ upsert }).mockReturnValueOnce(registryQuery),
    } as never);
    const getPrice = jest
      .spyOn(chronicleMonadOnChainService, 'getPrice')
      .mockResolvedValue({} as never);

    const result = await feedSyncService.seedChronicleMonadPriceFeeds();

    expect(result).toEqual({
      provider: 'chronicle',
      discovered: 22,
      upserted: 22,
      deactivated: 0,
      errors: 0,
    });
    expect(getPrice).toHaveBeenCalledTimes(22);
    const rows = upsert.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(22);
    expect(rows.find((row) => row.symbol === 'MON/USD')?.metadata).toMatchObject({
      feedName: 'Chronicle_MON_USD_1',
      quoteType: 'price',
      maxStalenessSeconds: 1800,
    });
  });

  it('seeds Supra Monad DORA pairs only after each passes the direct millisecond freshness gate', async () => {
    const select = jest.fn().mockResolvedValue({ data: SUPRA_MONAD_PUSHED_FEEDS, error: null });
    const upsert = jest.fn().mockReturnValue({ select });

    const registryQuery = {
      select: jest.fn(),
      eq: jest.fn(),
    };
    registryQuery.select.mockReturnValue(registryQuery);
    registryQuery.eq.mockReturnValue(registryQuery);
    Object.assign(registryQuery, {
      then: (resolve: (value: { data: []; error: null }) => unknown) =>
        resolve({ data: [], error: null }),
    });

    mockedCreateServiceRoleClient.mockReturnValue({
      from: jest.fn().mockReturnValueOnce({ upsert }).mockReturnValueOnce(registryQuery),
    } as never);
    const getPrice = jest
      .spyOn(supraMonadOnChainService, 'getPrice')
      .mockResolvedValue({ decimals: 18 } as never);

    const result = await feedSyncService.seedSupraMonadPushedFeeds();

    expect(result).toEqual({
      provider: 'supra',
      discovered: 39,
      upserted: 39,
      deactivated: 0,
      errors: 0,
    });
    expect(getPrice).toHaveBeenCalledTimes(39);
    const rows = upsert.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(39);
    expect(rows.find((row) => row.symbol === 'SUI/USDT')?.metadata).toMatchObject({
      pairIndex: 90,
      quoteAsset: 'USDT',
      quality: 'premium',
      quoteType: 'price',
      maxStalenessSeconds: 1800,
    });
    expect(rows.find((row) => row.symbol === 'SUI/USDT')?.decimals).toBe(18);
    expect(rows.find((row) => row.symbol === 'SBTC/BTC.RR')?.metadata).toMatchObject({
      pairIndex: 510,
      quoteType: 'reference-rate',
    });
  });
});
