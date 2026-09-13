import {
  getConsensusPrice,
  type ConsensusPriceResponse,
  type ConsensusProviderPrice,
} from '@/lib/api/services/consensusPriceService';

import {
  fetchLiveConsensusDeviations,
  resetConsensusDeviationCacheForTests,
} from '../implementation';

// jest.mock is hoisted above imports at runtime by babel-jest.
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

function makeResponse(symbol: string, providers: ConsensusProviderPrice[]): ConsensusPriceResponse {
  return {
    symbol,
    consensusPrice: 3000,
    method: 'median',
    recommendedMethod: 'median',
    confidence: 1,
    confidenceLevel: 'high',
    agreement: 1,
    participantCount: providers.length,
    excludedCount: 0,
    excludedProviders: [],
    priceRange: { low: 2900, high: 3100 },
    methodResults: [],
    providers,
    recommendedProvider: providers[0],
  };
}

beforeEach(() => {
  mockGetConsensusPrice.mockReset();
  resetConsensusDeviationCacheForTests();
});

describe('fetchLiveConsensusDeviations', () => {
  it('takes the max |deviation from consensus| across providers per asset', async () => {
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse('ETH', [
        makeProvider({ symbol: 'ETH', deviationPct: 0.5 }),
        makeProvider({ symbol: 'ETH', provider: 'pyth', deviationPct: -2.25 }),
        makeProvider({ symbol: 'ETH', provider: 'api3', deviationPct: 1.1 }),
      ])
    );
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse('USDC', [makeProvider({ symbol: 'USDC', deviationPct: 0.05 })])
    );

    const result = await fetchLiveConsensusDeviations(['ETH', 'USDC'], 'ethereum');

    expect(result).toEqual({ ETH: 2.25, USDC: 0.05 });
    expect(mockGetConsensusPrice).toHaveBeenNthCalledWith(1, 'ETH', 'ethereum');
    expect(mockGetConsensusPrice).toHaveBeenNthCalledWith(2, 'USDC', 'ethereum');
  });

  it('ignores unsupported/error providers and null deviations', async () => {
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse('ETH', [
        makeProvider({ deviationPct: 1.2 }),
        makeProvider({ provider: 'pyth', deviationPct: null }),
        makeProvider({ provider: 'api3', deviationPct: null, status: 'error' }),
        makeProvider({ provider: 'redstone', deviationPct: null, status: 'unsupported' }),
      ])
    );

    const result = await fetchLiveConsensusDeviations(['ETH'], 'ethereum');

    expect(result).toEqual({ ETH: 1.2 });
  });

  it('skips assets whose consensus fetch rejects (no oracle coverage)', async () => {
    mockGetConsensusPrice.mockRejectedValueOnce(new Error('unsupported symbol: FOOBAR'));
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse('ETH', [makeProvider({ deviationPct: 0.9 })])
    );

    const result = await fetchLiveConsensusDeviations(['FOOBAR', 'ETH'], 'ethereum');

    expect(result).toEqual({ ETH: 0.9 });
  });

  it('omits assets with zero deviation from the result', async () => {
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse('ETH', [makeProvider({ deviationPct: 0 }), makeProvider({ deviationPct: 0 })])
    );

    const result = await fetchLiveConsensusDeviations(['ETH'], 'ethereum');

    expect(result).toEqual({});
  });

  it('returns {} for an empty symbol list without calling the service', async () => {
    const result = await fetchLiveConsensusDeviations([], 'ethereum');

    expect(result).toEqual({});
    expect(mockGetConsensusPrice).not.toHaveBeenCalled();
  });

  it('reuses a non-expired cached deviation within the TTL instead of re-fetching', async () => {
    mockGetConsensusPrice.mockResolvedValueOnce(
      makeResponse('ETH', [makeProvider({ deviationPct: 1.8 })])
    );

    const first = await fetchLiveConsensusDeviations(['ETH'], 'ethereum');
    // Second call within the 60s TTL — same symbol+chain → cache hit.
    const second = await fetchLiveConsensusDeviations(['ETH'], 'ethereum');

    expect(first).toEqual({ ETH: 1.8 });
    expect(second).toEqual({ ETH: 1.8 });
    // Only one provider fetch happened across both calls.
    expect(mockGetConsensusPrice).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after the cache TTL expires', async () => {
    jest.useFakeTimers();
    try {
      mockGetConsensusPrice.mockResolvedValue(
        makeResponse('ETH', [makeProvider({ deviationPct: 1.2 })])
      );

      await fetchLiveConsensusDeviations(['ETH'], 'ethereum');
      expect(mockGetConsensusPrice).toHaveBeenCalledTimes(1);

      // 61s later the cached entry has expired → fetch again.
      jest.advanceTimersByTime(61_000);
      await fetchLiveConsensusDeviations(['ETH'], 'ethereum');

      expect(mockGetConsensusPrice).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('caches per symbol+chain (a different chain does not hit the cache)', async () => {
    mockGetConsensusPrice.mockResolvedValue(
      makeResponse('ETH', [makeProvider({ deviationPct: 0.5 })])
    );

    await fetchLiveConsensusDeviations(['ETH'], 'ethereum');
    await fetchLiveConsensusDeviations(['ETH'], 'arbitrum');

    expect(mockGetConsensusPrice).toHaveBeenCalledTimes(2);
  });
});
