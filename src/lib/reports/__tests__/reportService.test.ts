import { createServiceRoleClient } from '@/lib/supabase/server';

import { reportService } from '../reportService';

jest.mock('@/lib/supabase/server');

const mockedCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;

describe('reportService.generateDailyReport', () => {
  it('refuses to persist a successful-looking report when the day has no snapshots', async () => {
    const order = jest.fn().mockResolvedValue({ data: [], error: null });
    const query = {
      gte: jest.fn(),
      lt: jest.fn(),
      order,
    };
    query.gte.mockReturnValue(query);
    query.lt.mockReturnValue(query);
    const from = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(query) });
    mockedCreateServiceRoleClient.mockReturnValue({ from } as never);

    await expect(reportService.generateDailyReport('2026-09-12')).rejects.toThrow(
      'no hourly price snapshots are available'
    );
    expect(from).toHaveBeenCalledTimes(1);
  });
});
