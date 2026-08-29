import { getOracleWatchSignal } from '@/lib/api/services/oracleWatchService';

import { oracleWatchTool } from '../oracleWatchTools';

jest.mock('@/lib/api/services/oracleWatchService', () => ({
  getOracleWatchSignal: jest.fn(),
}));

// Audit is fire-and-forget and hits Supabase; stub it so the tool's formatting
// contract is what's under test, not the DB round trip.
jest.mock('@/lib/api/services/oracleWatchAudit', () => ({
  recordOracleWatchCheckAsync: jest.fn(),
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
      quorumSatisfied: true,
      requiredParticipantCount: 3,
      reasonCodes: [],
      sourceGroupCount: 3,
      requiredSourceGroupCount: 2,
      independenceSatisfied: true,
      trustScore: 88,
      trustLevel: 'high',
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
    expect(result).toContain('Credibility trust score: 88/100 (HIGH)');
    expect(result).toContain('Independent providers met quorum: yes');
    expect(result).toContain('CHAINLINK: ok');
    // The two gates are reported separately: quorum counts heads, independence
    // counts operators. A healthy feed emits no reason-codes line.
    expect(result).toContain('Consensus providers: 3/3 responding (quorum met)');
    expect(result).toContain('Independent operator groups: 3/2 non-derived (independence met)');
    expect(result).not.toContain('Reason codes:');
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
      quorumSatisfied: false,
      requiredParticipantCount: 3,
      reasonCodes: ['INSUFFICIENT_QUORUM', 'MAX_DEVIATION', 'OUTLIER_PRESENT'],
      sourceGroupCount: 2,
      requiredSourceGroupCount: 2,
      independenceSatisfied: true,
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
    // Codes are composable: the single `reason` string names the dominant cause
    // (deviation) and silently hides the other two that fired.
    expect(result).toContain('Consensus providers: 2/3 responding (quorum NOT met)');
    expect(result).toContain('Reason codes: INSUFFICIENT_QUORUM, MAX_DEVIATION, OUTLIER_PRESENT');
  });

  it('surfaces an independence failure that quorum alone would have passed', async () => {
    // Three providers that all resolve to one operator. Prices agree almost
    // perfectly, quorum is satisfied — and the feed is still a single point of
    // failure. This is the case headcount-based quorum cannot see.
    mockGetOracleWatchSignal.mockResolvedValueOnce({
      symbol: 'USDC',
      chain: 'base',
      verdict: 'danger',
      recommendation: 'halt',
      maxDeviationPct: 0.02,
      agreement: 0.999,
      participantCount: 3,
      outlierCount: 0,
      staleCount: 0,
      consensusPrice: 1.0,
      reason: 'insufficient_oracle_independence',
      quorumSatisfied: true,
      requiredParticipantCount: 3,
      reasonCodes: ['INSUFFICIENT_INDEPENDENCE'],
      sourceGroupCount: 1,
      requiredSourceGroupCount: 2,
      independenceSatisfied: false,
      trustScore: 42,
      trustLevel: 'low',
      // Display-only here: the group count is computed upstream in the service,
      // whose own test covers the provider→operator mapping.
      providers: [
        {
          provider: 'chainlink',
          status: 'success',
          deviationPct: 0.01,
          isOutlier: false,
          isStale: false,
        },
        {
          provider: 'twap',
          status: 'success',
          deviationPct: 0.0,
          isOutlier: false,
          isStale: false,
        },
      ],
      evaluatedAt: '2026-01-01T00:00:00Z',
    });

    const result = await oracleWatchTool.handler({ symbol: 'USDC', chain: 'base' });

    expect(result).toContain('Consensus providers: 3/3 responding (quorum met)');
    expect(result).toContain('Independent operator groups: 1/2 non-derived (independence NOT met)');
    expect(result).toContain('Reason codes: INSUFFICIENT_INDEPENDENCE');
    expect(result).toContain('Verdict: DANGER');
    expect(result).toContain('Recommendation: halt');
  });
});
