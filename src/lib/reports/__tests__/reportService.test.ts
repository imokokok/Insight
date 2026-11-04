import { createServiceRoleClient } from '@/lib/supabase/server';

import { reportService } from '../reportService';

jest.mock('@/lib/supabase/snapshotArchives', () => ({ loadArchivedSnapshots: async () => [] }));

jest.mock('@/lib/supabase/server');

const mockedCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;

describe('reportService.generateDailyReport', () => {
  it('refuses to persist a successful-looking report when the day has no snapshots', async () => {
    const range = jest.fn().mockResolvedValue({ data: [], count: 0, error: null });
    const query = {
      gte: jest.fn(),
      lt: jest.fn(),
      order: jest.fn(),
      range,
    };
    query.gte.mockReturnValue(query);
    query.lt.mockReturnValue(query);
    query.order.mockReturnValue(query);
    const from = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(query) });
    mockedCreateServiceRoleClient.mockReturnValue({ from } as never);

    await expect(reportService.generateDailyReport('2026-09-12')).rejects.toThrow(
      'no hourly price snapshots are available'
    );
    expect(from).toHaveBeenCalledTimes(1);
  });
});

describe('reportService.upsertHourlySnapshots', () => {
  it('delegates conditional hourly writes to the database function', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: 1, error: null });
    mockedCreateServiceRoleClient.mockReturnValue({ rpc } as never);

    await expect(
      reportService.upsertHourlySnapshots([
        {
          snapshotHour: new Date('2026-10-25T13:00:00.000Z'),
          provider: 'dia',
          symbol: 'ETH',
          chainId: 1,
          price: 3210.5,
          isSuccess: true,
        },
      ])
    ).resolves.toBe(1);

    expect(rpc).toHaveBeenCalledWith('upsert_hourly_price_snapshots', {
      p_rows: [
        expect.objectContaining({
          snapshot_hour: '2026-10-25T13:00:00.000Z',
          provider: 'dia',
          symbol: 'ETH',
          chain_id: 1,
          is_success: true,
        }),
      ],
    });
  });
});
