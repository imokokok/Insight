import { getOracleWatchSignal } from '@/lib/api/services/oracleWatchService';

import { oracleWatchTool } from '../oracleWatchTools';

jest.mock('@/lib/api/services/oracleWatchService', () => ({
  getOracleWatchSignal: jest.fn(),
}));

const mockGetOracleWatchSignal = getOracleWatchSignal as jest.MockedFunction<
  typeof getOracleWatchSignal
>;

describe('oracleWatchTool', () => {
  it('formats a NORMAL verdict into a text report for agents', async () => {
    mockGetOracleWatchSignal.mockResolvedValueOnce({
      symbol: 'ETH',
      chain: 'ethereum',
      verdict: 'normal',
      recommendation: 'proceed',
      maxDeviationPct: 0.3,
      agreement: 0.99,
      participantCount: 3,
      outlierCount: 0,
      staleCount: 0,
      consensusPrice: 3000,
      reason: 'within_tolerance',
      providers: [
        {
          provider: 'chainlink',
          status: 'success',
          deviationPct: 0.3,
          isOutlier: false,
          isStale: false,
        },
      ],
      evaluatedAt: '2026-01-01T00:00:00Z',
    });

    const result = await oracleWatchTool.handler({ symbol: 'ETH', chain: 'ethereum' });

    expect(result).toContain('Oracle Watch: ETH');
    expect(result).toContain('on ethereum');
    expect(result).toContain('Verdict: NORMAL');
    expect(result).toContain('Recommendation: proceed');
    expect(result).toContain('Agreement: 99.00%');
    expect(result).toContain('CHAINLINK: ok');
  });

  it('formats a DANGER verdict with a halt recommendation', async () => {
    mockGetOracleWatchSignal.mockResolvedValueOnce({
      symbol: 'ETH',
      chain: null,
      verdict: 'danger',
      recommendation: 'halt',
      maxDeviationPct: 3.5,
      agreement: 0.97,
      participantCount: 2,
      outlierCount: 1,
      staleCount: 0,
      consensusPrice: 3100,
      reason: 'deviation_or_agreement_breached_danger',
      providers: [
        {
          provider: 'chainlink',
          status: 'success',
          deviationPct: 3.5,
          isOutlier: true,
          isStale: false,
        },
        {
          provider: 'pyth',
          status: 'success',
          deviationPct: 0.2,
          isOutlier: false,
          isStale: false,
        },
      ],
      evaluatedAt: '2026-01-01T00:00:00Z',
    });

    const result = await oracleWatchTool.handler({ symbol: 'ETH' });

    expect(result).toContain('Verdict: DANGER');
    expect(result).toContain('Recommendation: halt');
    expect(result).toContain('CHAINLINK: OUTLIER deviation +3.50%');
    // No chain provided → header carries no "on <chain>" suffix.
    expect(result).toContain('Oracle Watch: ETH**');
  });
});
