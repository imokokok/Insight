import { createServiceRoleClient } from '@/lib/supabase/server';

import { getOracleWatchHistory } from '../oracleWatchTrendService';

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));

const mockCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;

describe('getOracleWatchHistory database query', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the bounded RPC, isolates the global series, and rolls 90 days up daily', async () => {
    const newest = new Date().toISOString();
    const rpc = jest.fn().mockResolvedValue({
      data: [
        {
          bucket_at: newest.slice(0, 10) + 'T00:00:00.000Z',
          last_observed_at: newest,
          verdict: 'normal',
          recommendation: 'proceed',
          max_deviation_pct: 0.2,
          agreement: 0.99,
          participant_count: 5,
          ml_risk_score: 0.1,
          ml_risk_level: 'low',
          trust_score: 92,
          trust_level: 'high',
        },
      ],
      error: null,
    });
    mockCreateServiceRoleClient.mockReturnValue({ rpc } as never);

    const result = await getOracleWatchHistory({
      symbol: 'ETH',
      days: 90,
      interval: '30min',
    });

    expect(rpc).toHaveBeenCalledWith('get_oracle_watch_history', {
      p_symbol: 'ETH',
      p_chain: null,
      p_days: 90,
      p_interval: 'daily',
    });
    expect(result.grain).toBe('daily');
    expect(result.chain).toBeNull();
    expect(result.series).toHaveLength(1);
    expect(result.summary.lastCollectedAt).toBe(newest);
    expect(result.summary.spineStale).toBe(false);
  });

  it('passes an explicit chain to the RPC instead of mixing chain series', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
    mockCreateServiceRoleClient.mockReturnValue({ rpc } as never);

    await getOracleWatchHistory({
      symbol: 'BTC',
      chain: 'arbitrum',
      days: 14,
      interval: '30min',
    });

    expect(rpc).toHaveBeenCalledWith('get_oracle_watch_history', {
      p_symbol: 'BTC',
      p_chain: 'arbitrum',
      p_days: 14,
      p_interval: 'hourly',
    });
  });
});
