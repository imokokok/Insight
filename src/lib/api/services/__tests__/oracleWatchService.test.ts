import {
  getConsensusPrice,
  type ConsensusPriceResponse,
  type ConsensusProviderPrice,
} from '@/lib/api/services/consensusPriceService';
import { UnsupportedSymbolError } from '@/lib/errors';

import { getOracleWatchSignal } from '../oracleWatchService';

jest.mock('@/lib/api/services/consensusPriceService', () => ({
  getConsensusPrice: jest.fn(),
}));

const mockGetConsensusPrice = getConsensusPrice as jest.MockedFunction<typeof getConsensusPrice>;

function makeProvider(overrides: Partial<ConsensusProviderPrice> = {}): ConsensusProviderPrice {
  return {
    provider: 'chainlink',
    symbol: 'ETH',
    price: 3000,
    deviationPct: null,
    isOutlier: false,
    confidence: null,
    timestamp: Date.now(),
    dataAgeSeconds: null,
    reputationScore: null,
    status: 'success',
    isStale: false,
    ...overrides,
  };
}

function makeResponse(overrides: Partial<ConsensusPriceResponse> = {}): ConsensusPriceResponse {
  return {
    symbol: 'ETH',
    chain: 'ethereum' as const,
    consensusPrice: 3000,
    method: 'median',
    recommendedMethod: 'median',
    confidence: 1,
    confidenceLevel: 'high',
    agreement: 1,
    participantCount: 1,
    excludedCount: 0,
    excludedProviders: [],
    priceRange: { min: 2900, max: 3100 },
    methodResults: [],
    providers: [makeProvider()],
    recommendedProvider: 'chainlink' as const,
    ...overrides,
  };
}

beforeEach(() => {
  mockGetConsensusPrice.mockReset();
});

describe('getOracleWatchSignal', () => {
  it('returns NORMAL / proceed when deviation and agreement are within tolerance', async () => {
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse({
        agreement: 0.99,
        participantCount: 3,
        providers: [
          makeProvider({ deviationPct: 0.2 }),
          makeProvider({ deviationPct: 0.1, provider: 'pyth' }),
          makeProvider({ deviationPct: 0.3, provider: 'redstone' }),
        ],
      })
    );

    const signal = await getOracleWatchSignal('ETH', 'ethereum');

    expect(signal.verdict).toBe('normal');
    expect(signal.recommendation).toBe('proceed');
    expect(signal.maxDeviationPct).toBe(0.3);
    expect(signal.agreement).toBe(0.99);
    expect(signal.participantCount).toBe(3);
    expect(signal.reason).toBe('within_tolerance');
  });

  it('returns CAUTION / proceed_with_caution when max deviation breaches the caution threshold', async () => {
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse({
        agreement: 0.98,
        providers: [makeProvider({ deviationPct: 1.2 })],
      })
    );

    const signal = await getOracleWatchSignal('ETH');

    expect(signal.verdict).toBe('caution');
    expect(signal.recommendation).toBe('proceed_with_caution');
    expect(signal.reason).toBe('deviation_agreement_outlier_or_stale');
  });

  it('returns CAUTION when agreement breaches the caution threshold', async () => {
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse({
        agreement: 0.93,
        providers: [makeProvider({ deviationPct: 0.4 })],
      })
    );

    const signal = await getOracleWatchSignal('ETH');

    expect(signal.verdict).toBe('caution');
  });

  it('returns CAUTION when an outlier or stale provider is present', async () => {
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse({
        agreement: 0.98,
        providers: [
          makeProvider({ deviationPct: 0.4, isOutlier: true, provider: 'chainlink' }),
          makeProvider({ deviationPct: 0.2, isStale: true, provider: 'pyth' }),
        ],
      })
    );

    const signal = await getOracleWatchSignal('ETH');

    expect(signal.verdict).toBe('caution');
    expect(signal.outlierCount).toBe(1);
    expect(signal.staleCount).toBe(1);
  });

  it('returns DANGER / halt when max deviation breaches the danger threshold', async () => {
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse({
        agreement: 0.97,
        providers: [makeProvider({ deviationPct: 3.5 })],
      })
    );

    const signal = await getOracleWatchSignal('ETH');

    expect(signal.verdict).toBe('danger');
    expect(signal.recommendation).toBe('halt');
    expect(signal.reason).toBe('deviation_or_agreement_breached_danger');
  });

  it('returns DANGER when agreement drops below the danger threshold', async () => {
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse({
        agreement: 0.8,
        providers: [makeProvider({ deviationPct: 0.5 })],
      })
    );

    const signal = await getOracleWatchSignal('ETH');

    expect(signal.verdict).toBe('danger');
    expect(signal.recommendation).toBe('halt');
  });

  it('returns DANGER / no_cross_oracle_coverage for an unsupported symbol', async () => {
    mockGetConsensusPrice.mockRejectedValueOnce(
      UnsupportedSymbolError.create('FOO', [], undefined)
    );

    const signal = await getOracleWatchSignal('FOO');

    expect(signal.verdict).toBe('danger');
    expect(signal.recommendation).toBe('halt');
    expect(signal.reason).toBe('no_cross_oracle_coverage');
    expect(signal.participantCount).toBe(0);
  });

  it('returns DANGER / no_cross_oracle_coverage when zero participants respond', async () => {
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse({
        participantCount: 0,
        providers: [
          makeProvider({ status: 'error', errorMessage: 'timeout' }),
          makeProvider({ status: 'error', provider: 'pyth', errorMessage: 'timeout' }),
        ],
      })
    );

    const signal = await getOracleWatchSignal('ETH');

    expect(signal.verdict).toBe('danger');
    expect(signal.reason).toBe('no_cross_oracle_coverage');
  });

  it('rethrows unexpected errors', async () => {
    mockGetConsensusPrice.mockRejectedValueOnce(new Error('boom'));

    await expect(getOracleWatchSignal('ETH')).rejects.toThrow('boom');
  });
});
