import { createServiceRoleClient } from '@/lib/supabase/server';

import { STORK_MONAD_PUSHED_FEEDS } from '../../constants/storkMonad';
import { feedSyncService } from '../feedSyncService';
import { storkMonadOnChainService } from '../storkMonadOnChainService';

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

  it('seeds all reviewed Stork Monad feeds only after each passes the on-chain freshness gate', async () => {
    const select = jest.fn().mockResolvedValue({ data: STORK_MONAD_PUSHED_FEEDS, error: null });
    const upsert = jest.fn().mockReturnValue({ select });
    mockedCreateServiceRoleClient.mockReturnValue({
      from: jest.fn().mockReturnValue({ upsert }),
    } as never);
    const getPrice = jest
      .spyOn(storkMonadOnChainService, 'getPrice')
      .mockResolvedValue({} as never);

    const result = await feedSyncService.seedStorkMonadPushedFeeds();

    expect(result).toMatchObject({
      provider: 'stork',
      discovered: 38,
      upserted: 38,
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
});
