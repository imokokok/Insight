import { createServiceRoleClient } from '@/lib/supabase/server';

import { feedSyncService } from '../feedSyncService';

jest.mock('@/lib/supabase/server');

const mockedCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;

describe('feedSyncService seed lifecycle', () => {
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
});
