import {
  getConsensusPrice,
  type ConsensusPriceResponse,
  type ConsensusProviderPrice,
} from '@/lib/api/services/consensusPriceService';
import { UnsupportedSymbolError } from '@/lib/errors';
import { computeMarketDivergencePct } from '@/lib/marketReference/client';
import { scorePreTradeMultiHorizon } from '@/lib/ml/inference';

import { fetchHistoricalOracleState } from '../oracleWatchHistory';
import { getOracleWatchSignal, clearOracleWatchCache } from '../oracleWatchService';

jest.mock('@/lib/api/services/consensusPriceService', () => ({
  getConsensusPrice: jest.fn(),
}));

jest.mock('@/lib/ml/inference', () => ({
  scorePreTradeMultiHorizon: jest.fn(),
}));

jest.mock('@/lib/marketReference/client', () => ({
  computeMarketDivergencePct: jest.fn(),
}));

jest.mock('../oracleWatchHistory', () => ({
  fetchHistoricalOracleState: jest.fn(),
}));

const mockGetConsensusPrice = getConsensusPrice as jest.MockedFunction<typeof getConsensusPrice>;
const mockScoreMl = scorePreTradeMultiHorizon as jest.MockedFunction<
  typeof scorePreTradeMultiHorizon
>;
const mockDivergence = computeMarketDivergencePct as jest.MockedFunction<
  typeof computeMarketDivergencePct
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
  mockDivergence.mockReset();
  mockDivergence.mockResolvedValue(null); // default: no market-truth signal
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
        participantCount: 3,
        providers: [
          makeProvider({ deviationPct: 0.2 }),
          makeProvider({ deviationPct: 1.2, provider: 'pyth' }),
          makeProvider({ deviationPct: 0.3, provider: 'redstone' }),
        ],
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
        participantCount: 3,
        providers: [
          makeProvider({ deviationPct: 0.4 }),
          makeProvider({ deviationPct: 0.4, provider: 'pyth' }),
          makeProvider({ deviationPct: 0.4, provider: 'redstone' }),
        ],
      })
    );

    const signal = await getOracleWatchSignal('ETH');

    expect(signal.verdict).toBe('caution');
  });

  it('returns CAUTION when an outlier or stale provider is present', async () => {
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse({
        agreement: 0.98,
        participantCount: 3,
        providers: [
          makeProvider({ deviationPct: 0.4, isOutlier: true, provider: 'chainlink' }),
          makeProvider({ deviationPct: 0.2, isStale: true, provider: 'pyth' }),
          makeProvider({ deviationPct: 0.2, provider: 'redstone' }),
        ],
      })
    );

    const signal = await getOracleWatchSignal('ETH');

    expect(signal.verdict).toBe('caution');
    expect(signal.outlierCount).toBe(1);
    expect(signal.staleCount).toBe(1);
  });

  it('returns DANGER / insufficient_cross_oracle_quorum when too few providers respond', async () => {
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse({
        agreement: 0.99,
        participantCount: 1,
        providers: [makeProvider({ deviationPct: 0.2 })],
      })
    );

    const signal = await getOracleWatchSignal('ETH');

    expect(signal.verdict).toBe('danger');
    expect(signal.recommendation).toBe('halt');
    expect(signal.reason).toBe('insufficient_cross_oracle_quorum');
    expect(signal.quorumSatisfied).toBe(false);
  });

  it('escalates a healthy-now feed to CAUTION when forward-looking ML risk is high', async () => {
    mockScoreMl.mockReturnValue({ combined: 0.72, score1h: 0.9, score6h: 0.72 });
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

    const signal = await getOracleWatchSignal('ETH');

    expect(signal.mlRiskLevel).toBe('high');
    expect(signal.verdict).toBe('caution');
    expect(signal.recommendation).toBe('proceed_with_caution');
    expect(signal.reason).toBe('ml_forward_risk_high');
  });

  it('surfaces a high trust score for healthy, well-covered, reputable feeds', async () => {
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse({
        agreement: 0.99,
        participantCount: 5,
        providers: [
          makeProvider({ deviationPct: 0.1, reputationScore: 95 }),
          makeProvider({ deviationPct: 0.1, reputationScore: 92, provider: 'pyth' }),
          makeProvider({ deviationPct: 0.1, reputationScore: 90, provider: 'redstone' }),
          makeProvider({ deviationPct: 0.1, reputationScore: 88, provider: 'chainlink' }),
          makeProvider({ deviationPct: 0.1, reputationScore: 85, provider: 'api3' }),
        ],
      })
    );

    const signal = await getOracleWatchSignal('ETH');

    expect(signal.verdict).toBe('normal');
    expect(signal.quorumSatisfied).toBe(true);
    expect(signal.trustLevel).toBe('high');
    expect(signal.trustScore).toBeGreaterThanOrEqual(75);
    expect(signal.trustComponents).toEqual(
      expect.objectContaining({
        quorum: expect.any(Number),
        agreement: expect.any(Number),
        deviation: expect.any(Number),
        ml: expect.any(Number),
        reputation: expect.any(Number),
        cleanliness: expect.any(Number),
      })
    );
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

    // The scorer must receive the REAL v3 governance values and the symbol for
    // per-asset-class calibration (train/serve skew guard on the Watch path).
    expect(mockScoreMl).toHaveBeenCalledTimes(1);
    const [features, opts] = mockScoreMl.mock.calls[0];
    expect(features.agreement).toBe(0.98);
    expect(features.outlierCount).toBe(0);
    expect(features.avgReputation).toBe(0.5); // neutral when no reputations supplied
    expect(opts).toEqual({ assetClass: 'ETH' });
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

  it('surfaces MARKET_DIVERGENCE as an advisory code without touching the verdict', async () => {
    // Healthy consensus gates + 2.5% oracle-vs-market divergence: the receipt
    // must carry the market-truth reason code while the verdict stays NORMAL
    // (external truth is evidence, never a verdict input).
    mockDivergence.mockResolvedValue(2.5);
    mockGetConsensusPrice.mockResolvedValue(
      makeResponse({
        agreement: 0.99,
        participantCount: 4,
        consensusPrice: 3000,
        providers: [
          makeProvider({ deviationPct: 0.2, provider: 'chainlink' }),
          makeProvider({ deviationPct: 0.3, provider: 'redstone' }),
          makeProvider({ deviationPct: 0.25, provider: 'dia' }),
          makeProvider({ deviationPct: 0.1, provider: 'pyth' }),
        ],
      })
    );

    const signal = await getOracleWatchSignal('ETH');

    expect(signal.verdict).toBe('normal');
    expect(signal.recommendation).toBe('proceed');
    expect(signal.reasonCodes).toContain('MARKET_DIVERGENCE');
    // The divergence value fed the decision (asserted, reproducible) — the
    // client received symbol + consensus.
    expect(mockDivergence).toHaveBeenCalledWith('ETH', 3000);
  });

  it('omits MARKET_DIVERGENCE when the reference layer reports no divergence', async () => {
    mockDivergence.mockResolvedValue(0.4); // below the 2% advisory line
    mockGetConsensusPrice.mockResolvedValue(
      makeResponse({
        agreement: 0.99,
        participantCount: 4,
        consensusPrice: 3000,
        providers: [
          makeProvider({ deviationPct: 0.2, provider: 'chainlink' }),
          makeProvider({ deviationPct: 0.3, provider: 'redstone' }),
          makeProvider({ deviationPct: 0.25, provider: 'dia' }),
          makeProvider({ deviationPct: 0.1, provider: 'pyth' }),
        ],
      })
    );

    const signal = await getOracleWatchSignal('ETH');

    expect(signal.verdict).toBe('normal');
    expect(signal.reasonCodes).not.toContain('MARKET_DIVERGENCE');
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

describe('getOracleWatchSignal — independence gate', () => {
  it('counts TWAP toward quorum but never toward independence', async () => {
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse({
        agreement: 0.99,
        participantCount: 3,
        providers: [
          makeProvider({ provider: 'chainlink', deviationPct: 0.1 }),
          makeProvider({ provider: 'redstone', deviationPct: 0.1 }),
          makeProvider({ provider: 'twap', deviationPct: 0.1 }),
        ],
      })
    );

    const signal = await getOracleWatchSignal('ETH', 'ethereum');

    expect(signal.participantCount).toBe(3);
    expect(signal.quorumSatisfied).toBe(true);
    // chainlink + redstone = 2 non-derived groups; TWAP is derived and excluded
    // from the count even though it feeds the consensus.
    expect(signal.sourceGroupCount).toBe(2);
    expect(signal.independenceSatisfied).toBe(true);
    expect(signal.requiredSourceGroupCount).toBe(2);
    expect(signal.verdict).toBe('normal');
    expect(signal.reasonCodes).toEqual([]);
  });

  it('halts on a single operator even when quorum is satisfied and prices agree', async () => {
    // The case a headcount gate cannot see: three responses, one operator
    // behind all of them. Deviation and agreement are near-perfect.
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse({
        agreement: 0.999,
        participantCount: 3,
        providers: [
          makeProvider({ provider: 'chainlink', deviationPct: 0.01 }),
          makeProvider({ provider: 'twap', deviationPct: 0.01 }),
          makeProvider({ provider: 'twap', deviationPct: 0.01 }),
        ],
      })
    );

    const signal = await getOracleWatchSignal('ETH', 'ethereum');

    expect(signal.quorumSatisfied).toBe(true);
    expect(signal.sourceGroupCount).toBe(1);
    expect(signal.independenceSatisfied).toBe(false);
    expect(signal.verdict).toBe('danger');
    expect(signal.recommendation).toBe('halt');
    // The dominant-cause string must name independence, not deviation — the
    // prices were fine, the sourcing was not.
    expect(signal.reason).toBe('insufficient_oracle_independence');
    expect(signal.reasonCodes).toContain('INSUFFICIENT_INDEPENDENCE');
  });

  it('emits both gates when quorum and independence fail together', async () => {
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse({
        agreement: 0.99,
        participantCount: 2,
        providers: [
          makeProvider({ provider: 'chainlink', deviationPct: 0.1 }),
          makeProvider({ provider: 'twap', deviationPct: 0.1 }),
        ],
      })
    );

    const signal = await getOracleWatchSignal('ETH', 'ethereum');

    expect(signal.quorumSatisfied).toBe(false);
    expect(signal.independenceSatisfied).toBe(false);
    // A single `reason` string can only name one of them; the codes carry both.
    expect(signal.reason).toBe('insufficient_cross_oracle_quorum');
    expect(signal.reasonCodes).toEqual(['INSUFFICIENT_INDEPENDENCE', 'INSUFFICIENT_QUORUM']);
  });

  it('holds the trust score below medium when independence fails', async () => {
    // Without this, a feed sourced entirely from one operator could report
    // "trust 86/100 (high)" next to a "danger / halt" verdict.
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse({
        agreement: 1,
        participantCount: 3,
        providers: [
          makeProvider({ provider: 'chainlink', deviationPct: 0, reputationScore: 95 }),
          makeProvider({ provider: 'twap', deviationPct: 0, reputationScore: 95 }),
          makeProvider({ provider: 'twap', deviationPct: 0, reputationScore: 95 }),
        ],
      })
    );

    const signal = await getOracleWatchSignal('ETH', 'ethereum');

    expect(signal.independenceSatisfied).toBe(false);
    expect(signal.trustScore).toBeLessThan(50);
    expect(signal.trustLevel).toBe('low');
    expect(signal.trustComponents.quorum).toBe(0);
  });

  it('reports NO_COVERAGE alone when nothing responded', async () => {
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse({ agreement: 0, participantCount: 0, providers: [], consensusPrice: null })
    );

    const signal = await getOracleWatchSignal('ETH', 'ethereum');

    // Not a pile of every gate that happens to be unsatisfied — one code that
    // says what actually happened: there was nothing to judge.
    expect(signal.reasonCodes).toEqual(['NO_COVERAGE']);
    expect(signal.independenceSatisfied).toBe(false);
  });
});
