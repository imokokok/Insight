import { createServiceRoleClient } from '@/lib/supabase/server';

import {
  CHAINLINK_SOLANA_MAINNET_CAIP2,
  CHAINLINK_SOLANA_STORE_PROGRAM_ID,
} from '../../constants/chainlinkSolana';
import { CHRONICLE_MONAD_PRICE_FEEDS } from '../../constants/chronicleMonad';
import { PYTH_MONAD_SPONSORED_FEEDS } from '../../constants/pythMonad';
import {
  PYTH_SOLANA_PRICE_UPDATE_OWNER_PROGRAM_ID,
  PYTH_SOLANA_SPONSORED_FEEDS,
} from '../../constants/pythSolana';
import { STORK_MONAD_PUSHED_FEEDS } from '../../constants/storkMonad';
import { SUPRA_MONAD_PUSHED_FEEDS } from '../../constants/supraMonad';
import { chainlinkSolanaOnChainService } from '../chainlinkSolanaOnChainService';
import { chronicleMonadOnChainService } from '../chronicleMonadOnChainService';
import { feedSyncService } from '../feedSyncService';
import { pythMonadOnChainService } from '../pythMonadOnChainService';
import { pythSolanaOnChainService } from '../pythSolanaOnChainService';
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
    const getPrices = jest.spyOn(pythMonadOnChainService, 'getPrices').mockResolvedValue(
      PYTH_MONAD_SPONSORED_FEEDS.map((feed) => ({
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
      }))
    );

    const result = await feedSyncService.seedPythMonadSponsoredFeeds();

    expect(result.discovered).toBe(PYTH_MONAD_SPONSORED_FEEDS.length);
    expect(result.upserted).toBe(1);
    expect(result.deactivated).toBe(1);
    expect(getPrices).toHaveBeenCalledWith(PYTH_MONAD_SPONSORED_FEEDS);
    expect(registryQuery.eq).toHaveBeenCalledWith('source', 'pyth-monad-sponsored-registry');
    expect(retirementQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: false,
        deactivated_reason: 'curated_registry_retired',
      })
    );
    expect(retirementQuery.eq).toHaveBeenCalledWith('symbol', 'RETIRED/USD');
  });

  it('seeds every currently usable Pyth Solana sponsored feed with its verified account evidence', async () => {
    const select = jest.fn().mockResolvedValue({ data: PYTH_SOLANA_SPONSORED_FEEDS, error: null });
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
    jest.spyOn(pythSolanaOnChainService, 'getPrices').mockResolvedValue(
      PYTH_SOLANA_SPONSORED_FEEDS.map((feed, index) => ({
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
        accountAddress: `PythSolanaAccount${index}`,
        accountOwner: PYTH_SOLANA_PRICE_UPDATE_OWNER_PROGRAM_ID,
        postedSlot: String(index),
        observationSlot: 123_456_789,
        accountDataHash: `0x${index.toString(16).padStart(64, '0')}`,
      })) as never
    );

    const result = await feedSyncService.seedPythSolanaSponsoredFeeds();

    expect(result).toEqual({
      provider: 'pyth',
      discovered: 64,
      upserted: 64,
      deactivated: 0,
      errors: 0,
    });
    const rows = upsert.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(64);
    expect(rows.find((row) => row.symbol === 'SOL/USD')).toMatchObject({
      chain_id: 0,
      address: 'PythSolanaAccount0',
      source: 'pyth-solana-sponsored-registry',
      metadata: {
        feedId: `0x${PYTH_SOLANA_SPONSORED_FEEDS[0].id}`,
        solanaNetwork: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        shardId: 0,
      },
    });
    expect(rows.find((row) => row.symbol === 'JITOSOL/SOL.RR')?.metadata).toMatchObject({
      quoteType: 'reference-rate',
    });
  });

  it('seeds Chainlink Solana only after the official directory entry passes its native account gates', async () => {
    const select = jest.fn().mockResolvedValue({ data: [{}], error: null });
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
    jest.spyOn(chainlinkSolanaOnChainService, 'getOfficialFeeds').mockResolvedValue([
      {
        alias: 'SOL/USD',
        accountAddress: 'CH31Xns5z3M1cTAbKW34jcxPPciazARpijcHj9rxtemt',
        heartbeatSeconds: 60,
        category: 'Crypto',
      },
    ]);
    jest.spyOn(chainlinkSolanaOnChainService, 'getPrices').mockResolvedValue([
      {
        symbol: 'SOL/USD',
        price: 101.25,
        timestamp: Date.now(),
        decimals: 8,
        roundId: '42',
        answer: '10125000000',
        accountAddress: 'CH31Xns5z3M1cTAbKW34jcxPPciazARpijcHj9rxtemt',
        accountOwner: CHAINLINK_SOLANA_STORE_PROGRAM_ID,
        description: 'SOL / USD',
        heartbeatSeconds: 60,
        maxAgeSeconds: 120,
        observationSlot: 460_973_132,
        transmissionSlot: '460973100',
        accountDataHash: `0x${'12'.repeat(32)}`,
      },
    ]);

    await expect(feedSyncService.syncChainlinkSolanaFeeds()).resolves.toEqual({
      provider: 'chainlink',
      discovered: 1,
      upserted: 1,
      deactivated: 0,
      errors: 0,
    });

    const rows = upsert.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(rows).toEqual([
      expect.objectContaining({
        provider: 'chainlink',
        symbol: 'SOL/USD',
        chain_id: 0,
        address: 'CH31Xns5z3M1cTAbKW34jcxPPciazARpijcHj9rxtemt',
        source: 'chainlink-solana-rdd',
        metadata: expect.objectContaining({
          solanaNetwork: CHAINLINK_SOLANA_MAINNET_CAIP2,
          accountOwner: CHAINLINK_SOLANA_STORE_PROGRAM_ID,
          roundId: '42',
          heartbeatSeconds: 60,
        }),
      }),
    ]);
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
    const getPrices = jest
      .spyOn(storkMonadOnChainService, 'getPrices')
      .mockResolvedValue(
        STORK_MONAD_PUSHED_FEEDS.map((feed) => ({ encodedAssetId: feed.encodedAssetId })) as never
      );

    const result = await feedSyncService.seedStorkMonadPushedFeeds();

    expect(result).toEqual({
      provider: 'stork',
      discovered: 38,
      upserted: 38,
      deactivated: 0,
      errors: 0,
    });
    expect(getPrices).toHaveBeenCalledWith(STORK_MONAD_PUSHED_FEEDS);
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
    const getPrices = jest
      .spyOn(chronicleMonadOnChainService, 'getPrices')
      .mockResolvedValue(
        CHRONICLE_MONAD_PRICE_FEEDS.map((feed) => ({ feedAddress: feed.address })) as never
      );

    const result = await feedSyncService.seedChronicleMonadPriceFeeds();

    expect(result).toEqual({
      provider: 'chronicle',
      discovered: 22,
      upserted: 22,
      deactivated: 0,
      errors: 0,
    });
    expect(getPrices).toHaveBeenCalledWith(CHRONICLE_MONAD_PRICE_FEEDS);
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
    const getPrices = jest.spyOn(supraMonadOnChainService, 'getPrices').mockResolvedValue(
      SUPRA_MONAD_PUSHED_FEEDS.map((feed) => ({
        pairIndex: feed.pairIndex,
        decimals: 18,
      })) as never
    );

    const result = await feedSyncService.seedSupraMonadPushedFeeds();

    expect(result).toEqual({
      provider: 'supra',
      discovered: 39,
      upserted: 39,
      deactivated: 0,
      errors: 0,
    });
    expect(getPrices).toHaveBeenCalledWith(SUPRA_MONAD_PUSHED_FEEDS);
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
