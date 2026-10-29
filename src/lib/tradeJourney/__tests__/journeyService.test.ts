import { nextActions } from '../journeyService';

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({ warn: jest.fn() })),
}));

describe('paid pre-trade next actions', () => {
  it('turns a CAUTION into an explicit fresh-recheck path with bounded reasons', () => {
    const next = nextActions({
      kind: 'pre_trade',
      journeyId: 'journey-1',
      outcomeToken: 'opaque-capability',
      verdict: 'CAUTION',
      receiptCreditState: 'not_available',
      contributingFactors: [
        {
          rule: 'cross_provider_spread',
          value: 0.7,
          threshold: 0.5,
          triggeredVerdict: 'CAUTION',
          message: 'Provider spread is above the caution threshold.',
        },
        {
          rule: 'oracle_staleness',
          value: 120,
          threshold: 60,
          triggeredVerdict: 'CAUTION',
          message: 'A provider is stale relative to its cadence.',
        },
        {
          rule: 'danger_rule',
          value: 3,
          threshold: 2,
          triggeredVerdict: 'DANGER',
          message: 'Must not appear as a CAUTION trigger.',
        },
      ],
      recommendedActions: [],
    }) as {
      cautionRecovery?: {
        state: string;
        recheck: { url: string; method: string; required: string[] };
        triggers: Array<{ rule: string }>;
      };
      recommendation: string;
    };

    expect(next.cautionRecovery).toEqual(
      expect.objectContaining({
        state: 'RECHECK_BEFORE_EXECUTION',
        recheck: expect.objectContaining({
          url: '/api/v1/safety/pre-trade/recheck',
          method: 'POST',
          required: expect.arrayContaining(['originalUid', 'originalRequestHash']),
        }),
        triggers: expect.arrayContaining([
          expect.objectContaining({ rule: 'cross_provider_spread' }),
          expect.objectContaining({ rule: 'oracle_staleness' }),
        ]),
      })
    );
    expect(next.recommendation).toContain('Recheck immediately');
  });

  it('does not attach recovery instructions to a PASS result', () => {
    const next = nextActions({
      kind: 'pre_trade',
      journeyId: 'journey-1',
      outcomeToken: 'opaque-capability',
      verdict: 'PASS',
      receiptCreditState: 'not_available',
    }) as Record<string, unknown>;

    expect(next).not.toHaveProperty('cautionRecovery');
  });
});
