import { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';

import { assessExecutionPreflight, composeExecutionPreflight } from '../executionPreflight';

jest.mock('@/lib/api/services/preTradeSafetyService', () => ({
  preTradeSafetyCheck: jest.fn(),
}));

const mockedSafetyCheck = preTradeSafetyCheck as jest.MockedFunction<typeof preTradeSafetyCheck>;

const input = {
  asset: 'MON',
  destinationAsset: 'USDC',
  chainId: 143,
  action: 'swap' as const,
  tradeAmountUsd: 1_000,
};

function assessment(overrides: Record<string, unknown> = {}) {
  return {
    verdict: 'PASS',
    consensusPrice: 1,
    maxDeviationPct: 0,
    manipulationRiskScore: 0,
    staleDataRisk: false,
    crossProviderAgreement: 1,
    recommendedMaxPositionUsd: 1_000_000,
    participantCount: 3,
    providerPrices: {
      pyth: {
        price: 1,
        deviationPct: 0,
        isOutlier: false,
        isStale: false,
        dataAgeSeconds: 12,
        confidence: 0.99,
        reputationScore: 90,
        source: 'Pyth Core Monad:MON/USD',
        status: 'success' as const,
      },
    },
    depegWarnings: [],
    warnings: [],
    contributingFactors: [],
    protocolSafety: null,
    recommendedActions: [],
    mlScore: null,
    mlModelVersion: null,
    mlScore1h: null,
    mlScore6h: null,
    mlRiskLevel: null,
    mlMediumThreshold: null,
    mlHighThreshold: null,
    mlFeatureVector: {},
    anomalyScore: 0,
    attestation: null,
    evaluatedAt: '2026-10-23T00:00:00.000Z',
    latencyMs: 1,
    ...overrides,
  } as never;
}

describe('execution preflight', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires a verified venue quote before a healthy oracle assessment can allow execution', () => {
    const result = composeExecutionPreflight(input, assessment());

    expect(result.verdict).toBe('caution');
    expect(result.recommendation).toBe('review_before_execution');
    expect(result.chain.profile).toBe('monad_pyth');
    expect(result.gates.oracleSafety.status).toBe('passed');
    expect(result.gates.nativeOracle).toMatchObject({
      provider: 'pyth',
      status: 'passed',
      dataAgeSeconds: 12,
      onChainVerified: true,
    });
    expect(result.requiredBeforeAllow).toHaveLength(1);
  });

  it('allows only when both the oracle and venue-quote gates pass', () => {
    const result = composeExecutionPreflight(
      {
        ...input,
        decisionInput: {
          decisionPriceUsd: 1,
          quotePriceUsd: 1,
          quoteObservedAt: '2026-10-23T00:00:00.000Z',
          maxReferenceDeviationBps: 50,
          maxSlippageBps: 50,
          maxQuoteAgeSeconds: 30,
        },
      },
      assessment({ decisionInputAssessment: { eligibleToProceed: true } })
    );

    expect(result.verdict).toBe('allow');
    expect(result.gates.venueQuote).toEqual({
      requested: true,
      eligibleToProceed: true,
      status: 'passed',
    });
  });

  it('fails closed when either the quote or oracle safety gate fails', () => {
    const rejectedQuote = composeExecutionPreflight(
      {
        ...input,
        decisionInput: {
          decisionPriceUsd: 1,
          quotePriceUsd: 1,
          quoteObservedAt: '2026-10-23T00:00:00.000Z',
          maxReferenceDeviationBps: 50,
          maxSlippageBps: 50,
          maxQuoteAgeSeconds: 30,
        },
      },
      assessment({ decisionInputAssessment: { eligibleToProceed: false } })
    );
    const unsafeOracle = composeExecutionPreflight(input, assessment({ verdict: 'DANGER' }));

    expect(rejectedQuote.verdict).toBe('block');
    expect(unsafeOracle.verdict).toBe('block');
  });

  it('does not allow a Monad action when its native Pyth Core observation is unavailable', () => {
    const result = composeExecutionPreflight(
      {
        ...input,
        decisionInput: {
          decisionPriceUsd: 1,
          quotePriceUsd: 1,
          quoteObservedAt: '2026-10-23T00:00:00.000Z',
          maxReferenceDeviationBps: 50,
          maxSlippageBps: 50,
          maxQuoteAgeSeconds: 30,
        },
      },
      assessment({ providerPrices: {}, decisionInputAssessment: { eligibleToProceed: true } })
    );

    expect(result.verdict).toBe('caution');
    expect(result.gates.nativeOracle.status).toBe('failed');
    expect(result.requiredBeforeAllow).toContain(
      'Restore a fresh, readable Monad Pyth Core observation.'
    );
  });

  it('does not allow a Monad action when its native Pyth Core observation is stale', () => {
    const result = composeExecutionPreflight(
      {
        ...input,
        decisionInput: {
          decisionPriceUsd: 1,
          quotePriceUsd: 1,
          quoteObservedAt: '2026-10-23T00:00:00.000Z',
          maxReferenceDeviationBps: 50,
          maxSlippageBps: 50,
          maxQuoteAgeSeconds: 30,
        },
      },
      assessment({
        decisionInputAssessment: { eligibleToProceed: true },
        providerPrices: {
          pyth: {
            ...assessment().providerPrices.pyth,
            isStale: true,
          },
        },
      })
    );

    expect(result.verdict).toBe('caution');
    expect(result.gates.nativeOracle.status).toBe('caution');
    expect(result.requiredBeforeAllow).toContain(
      'Wait for a fresh Monad Pyth Core update or obtain independent confirmation.'
    );
  });

  it('issues schema v3 by default without overwriting an explicit caller choice', async () => {
    mockedSafetyCheck.mockResolvedValue(assessment());

    await assessExecutionPreflight(input);
    expect(mockedSafetyCheck).toHaveBeenCalledWith(
      expect.objectContaining({ schemaVersion: 3 }),
      undefined
    );

    await assessExecutionPreflight({ ...input, schemaVersion: 2 });
    expect(mockedSafetyCheck).toHaveBeenLastCalledWith(
      expect.objectContaining({ schemaVersion: 2 }),
      undefined
    );
  });
});
