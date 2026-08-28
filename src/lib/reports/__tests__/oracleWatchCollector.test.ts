import {
  getOracleWatchSignal,
  type OracleWatchResult,
} from '@/lib/api/services/oracleWatchService';
import { createServiceRoleClient } from '@/lib/supabase/server';

import { buildFeedHealthSnapshotRow, collectOracleWatchSnapshots } from '../oracleWatchCollector';

jest.mock('@/lib/api/services/oracleWatchService', () => ({
  getOracleWatchSignal: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));

const mockGetSignal = getOracleWatchSignal as jest.MockedFunction<typeof getOracleWatchSignal>;
const mockCreateClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;

function makeSignal(overrides: Partial<OracleWatchResult> = {}): OracleWatchResult {
  return {
    symbol: 'ETH',
    chain: null,
    verdict: 'normal',
    recommendation: 'proceed',
    maxDeviationPct: 0.3,
    agreement: 0.99,
    participantCount: 3,
    outlierCount: 0,
    staleCount: 0,
    consensusPrice: 3000,
    reason: 'within_tolerance',
    mlRiskScore: 0.1,
    mlScore1h: 0.1,
    mlScore6h: 0.1,
    mlRiskLevel: 'low',
    avgReputation: 88,
    minReputation: 84,
    providers: [],
    evaluatedAt: '2026-08-28T00:00:00.000Z',
    ...overrides,
  };
}

const mockInsertResult = { error: null };

beforeEach(() => {
  mockGetSignal.mockReset();
  mockCreateClient.mockReset();
});

/** Configure the mocked service-role client so `insert` resolves as wanted. */
function mockInsert(resolve: { error: Error | null }): jest.Mock {
  const insertMock = jest.fn().mockResolvedValue(resolve);
  mockCreateClient.mockReturnValue({
    from: jest.fn().mockReturnValue({ insert: insertMock }),
  } as unknown as ReturnType<typeof createServiceRoleClient>);
  return insertMock;
}

describe('buildFeedHealthSnapshotRow', () => {
  it('maps an Oracle Watch signal onto the snapshot row schema', () => {
    const row = buildFeedHealthSnapshotRow(makeSignal());

    expect(row).toEqual({
      symbol: 'ETH',
      chain: null,
      evaluated_at: '2026-08-28T00:00:00.000Z',
      verdict: 'normal',
      recommendation: 'proceed',
      reason: 'within_tolerance',
      max_deviation_pct: 0.3,
      agreement: 0.99,
      participant_count: 3,
      outlier_count: 0,
      stale_count: 0,
      consensus_price: 3000,
      ml_risk_score: 0.1,
      ml_risk_level: 'low',
      avg_reputation: 88,
      min_reputation: 84,
    });
  });

  it('propagates null ML fields', () => {
    const row = buildFeedHealthSnapshotRow(makeSignal({ mlRiskScore: null, mlRiskLevel: null }));

    expect(row.ml_risk_score).toBeNull();
    expect(row.ml_risk_level).toBeNull();
  });
});

describe('collectOracleWatchSnapshots', () => {
  it('collects signals and inserts rows', async () => {
    const insertMock = mockInsert(mockInsertResult);
    mockGetSignal.mockResolvedValueOnce(makeSignal());
    mockGetSignal.mockResolvedValueOnce(makeSignal({ symbol: 'BTC', consensusPrice: 60000 }));

    const result = await collectOracleWatchSnapshots([{ symbol: 'ETH' }, { symbol: 'BTC' }]);

    expect(result.collected).toBe(2);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock.mock.calls[0][0]).toEqual([
      expect.objectContaining({ symbol: 'ETH', verdict: 'normal' }),
      expect.objectContaining({ symbol: 'BTC', verdict: 'normal' }),
    ]);
  });

  it('skips failed targets and returns collected count', async () => {
    const insertMock = mockInsert(mockInsertResult);
    mockGetSignal.mockRejectedValueOnce(new Error('boom'));
    mockGetSignal.mockResolvedValueOnce(makeSignal({ symbol: 'ETH' }));

    const result = await collectOracleWatchSnapshots([{ symbol: 'FOO' }, { symbol: 'ETH' }]);

    expect(result.collected).toBe(1);
    expect(insertMock.mock.calls[0][0]).toEqual([expect.objectContaining({ symbol: 'ETH' })]);
  });

  it('returns 0 and skips insert when nothing was collected', async () => {
    const insertMock = mockInsert(mockInsertResult);
    mockGetSignal.mockRejectedValue(new Error('boom'));

    const result = await collectOracleWatchSnapshots([{ symbol: 'FOO' }, { symbol: 'BAR' }]);

    expect(result.collected).toBe(0);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('throws when the insert fails', async () => {
    mockInsert({ error: new Error('db down') });
    mockGetSignal.mockResolvedValue(makeSignal());

    await expect(collectOracleWatchSnapshots([{ symbol: 'ETH' }])).rejects.toThrow('db down');
  });
});
