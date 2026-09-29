import { createServiceRoleClient } from '@/lib/supabase/server';

import { getCronHealth } from './opsQueries';

jest.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: jest.fn() }));

const mockCreateClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;

describe('getCronHealth', () => {
  it('starts independent freshness queries together and retains partial-error reporting', async () => {
    type QueryResult = {
      data: Record<string, string>[] | null;
      error: { message: string } | null;
    };
    const pending = new Map<string, (result: QueryResult) => void>();
    mockCreateClient.mockImplementation(
      () =>
        ({
          from: (table: string) => ({
            select: () => ({
              order: () => ({
                limit: () => new Promise<QueryResult>((resolve) => pending.set(table, resolve)),
              }),
            }),
          }),
        }) as unknown as ReturnType<typeof createServiceRoleClient>
    );

    const healthPromise = getCronHealth();
    expect(pending.size).toBe(4);

    pending.get('hourly_price_snapshots')!({
      data: [{ snapshot_hour: new Date().toISOString() }],
      error: null,
    });
    pending.get('daily_reports')!({
      data: [{ report_date: new Date().toISOString().slice(0, 10) }],
      error: null,
    });
    pending.get('oracle_reputation')!({ data: null, error: { message: 'unavailable' } });
    pending.get('pre_trade_checks')!({
      data: [{ created_at: new Date().toISOString() }],
      error: null,
    });

    const health = await healthPromise;
    expect(health.jobs).toHaveLength(4);
    expect(health.jobs[0].stale).toBe(false);
    expect(health.jobs[2].stale).toBe(true);
    expect(health.errored).toBe(true);
  });
});
