import {
  getConsensusPrice,
  type ConsensusPriceResponse,
  type ConsensusProviderPrice,
} from '@/lib/api/services/consensusPriceService';
import { UnsupportedSymbolError } from '@/lib/errors';
import { scorePreTradeMultiHorizon } from '@/lib/ml/inference';

import { fetchHistoricalOracleState } from '../oracleWatchHistory';
import { getOracleWatchSignal, clearOracleWatchCache } from '../oracleWatchService';

jest.mock('@/lib/api/services/consensusPriceService', () => ({
  getConsensusPrice: jest.fn(),
}));

jest.mock('@/lib/ml/inference', () => ({
  scorePreTradeMultiHorizon: jest.fn(),
}));

jest.mock('../oracleWatchHistory', () => ({
  fetchHistoricalOracleState: jest.fn(),
}));

const mockGetConsensusPrice = getConsensusPrice as jest.MockedFunction<typeof getConsensusPrice>;
const mockScoreMl = scorePreTradeMultiHorizon as jest.MockedFunction<
  typeof scorePreTradeMultiHorizon
>;
const mockFetchHistorical = fetchHistoricalOracleState as jest.MockedFunction<
  typeof fetchHistoricalOracleState
>;

const EMPTY_STATE = {
  history: [],
  deviationVelocity1h: 0,
  deviationVelocity3h: 0,
  participantCountDelta1h: 0,
  rollingVolatility6h: 0,
  maxDeviationZscore24h: 0,
};

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
  clearOracleWatchCache();
  mockScoreMl.mockReturnValue({ combined: 0.15, score1h: 0.1, score6h: 0.15 });
  mockFetchHistorical.mockResolvedValue(EMPTY_STATE);
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

describe('getOracleWatchSignal — reputation & ML advisory', () => {
  it('surfaces per-provider reputation and the avg/min aggregate', async () => {
    mockGetConsensusPrice.mockResolvedValue(
      makeResponse({
        agreement: 0.99,
        participantCount: 2,
        providers: [
          makeProvider({
            deviationPct: 0.1,
            reputationScore: 92,
            provider: 'chainlink',
          }),
          makeProvider({
            deviationPct: 0.2,
            reputationScore: 84,
            provider: 'redstone',
          }),
        ],
      })
    );

    const signal = await getOracleWatchSignal('ETH', 'ethereum');

    expect(signal.avgReputation).toBe(88);
    expect(signal.minReputation).toBe(84);
    expect(signal.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: 'chainlink', reputationScore: 92 }),
        expect.objectContaining({ provider: 'redstone', reputationScore: 84 }),
      ])
    );
  });

  it('returns ML advisory fields derived from the scorer', async () => {
    mockScoreMl.mockReturnValue({ combined: 0.72, score1h: 0.9, score6h: 0.72 });
    mockGetConsensusPrice.mockResolvedValue(
      makeResponse({
        agreement: 0.98,
        participantCount: 2,
        consensusPrice: 3000,
        providers: [
          makeProvider({ deviationPct: 0.4, provider: 'chainlink' }),
          makeProvider({ deviationPct: 0.6, provider: 'redstone' }),
        ],
      })
    );

    const signal = await getOracleWatchSignal('ETH');

    expect(signal.mlRiskScore).toBe(0.72);
    expect(signal.mlScore1h).toBe(0.9);
    expect(signal.mlScore6h).toBe(0.72);
    expect(signal.mlRiskLevel).toBe('high');
  });

  it('leaves ML advisory fields null when the scorer has no model', async () => {
    mockScoreMl.mockReturnValue(null);
    mockGetConsensusPrice.mockResolvedValue(
      makeResponse({
        agreement: 0.98,
        participantCount: 2,
        consensusPrice: 3000,
        providers: [makeProvider({ deviationPct: 0.4, provider: 'chainlink' })],
      })
    );

    const signal = await getOracleWatchSignal('ETH');

    expect(signal.mlRiskScore).toBeNull();
    expect(signal.mlRiskLevel).toBeNull();
  });

  it('reputations with no rank are null, not NaN', async () => {
    mockGetConsensusPrice.mockResolvedValue(
      makeResponse({
        agreement: 0.99,
        participantCount: 1,
        providers: [makeProvider({ deviationPct: 0.1, reputationScore: null })],
      })
    );

    const signal = await getOracleWatchSignal('ETH');

    expect(signal.avgReputation).toBeNull();
    expect(signal.minReputation).toBeNull();
  });
});

describe('getOracleWatchSignal — caching', () => {
  it('serves the same symbol|chain from cache without refetching', async () => {
    mockGetConsensusPrice.mockResolvedValue(
      makeResponse({ agreement: 0.99, participantCount: 1, providers: [makeProvider()] })
    );

    const first = await getOracleWatchSignal('ETH', 'ethereum');
    const second = await getOracleWatchSignal('ETH', 'ethereum');

    expect(mockGetConsensusPrice).toHaveBeenCalledTimes(1);
    expect(second.verdict).toBe(first.verdict);
  });

  it('distinguishes cache entries by chain', async () => {
    mockGetConsensusPrice.mockResolvedValue(
      makeResponse({ agreement: 0.99, participantCount: 1, providers: [makeProvider()] })
    );

    await getOracleWatchSignal('ETH', 'ethereum');
    // Same symbol, different chain -> must not hit the ethereum cache entry.
    await getOracleWatchSignal('ETH', 'arbitrum');

    expect(mockGetConsensusPrice).toHaveBeenCalledTimes(2);
  });
});
