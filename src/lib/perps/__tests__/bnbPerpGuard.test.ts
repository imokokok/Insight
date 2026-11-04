import { asterReviewedMarketForAsset, fetchAsterPerpMarketState } from '@/lib/dex/asterPerpMarket';

import { assessBnbPerpGuard } from '../bnbPerpGuard';

const NOW = new Date('2026-11-04T00:00:00.000Z');

const BASE_INPUT = {
  protocolId: 'aster-perps-bnb-mainnet' as const,
  action: 'open_long' as const,
  assetSymbol: 'BTC',
  marginAssetSymbol: 'USDT' as const,
  sizeUsd: 20_000,
  marginValueUsd: 2_000,
};

function oracleMock(verdict: 'PASS' | 'CAUTION' | 'DANGER' | 'BLOCK', consensusPrice: number) {
  return jest.fn(async () => ({
    verdict,
    consensusPrice,
    maxDeviationPct: 0.1,
    staleDataRisk: false,
    participantCount: 3,
    attestation: { uid: 'uid-1', attester: '0xattester' },
  })) as never;
}

function venueState(overrides: Partial<Parameters<typeof venueEvidenceFrom>[0]> = {}) {
  return venueEvidenceFrom({
    markPrice: 78_117.5,
    indexPrice: 78_139.0,
    liveMaxLeverage: 20,
    marketStatus: 'TRADING',
    ...overrides,
  });
}

function venueEvidenceFrom(state: {
  markPrice: number;
  indexPrice: number;
  liveMaxLeverage: number | null;
  marketStatus: string;
}) {
  return {
    symbol: 'BTCUSDT' as const,
    marketStatus: state.marketStatus,
    observedAt: NOW.toISOString(),
    sourceFreshnessSeconds: 1,
    markPrice: state.markPrice,
    indexPrice: state.indexPrice,
    fundingRatePerInterval: 0.0001,
    nextFundingTimeMs: NOW.getTime() + 3_600_000,
    openInterestBase: 5_000,
    dayNotionalVolume: 393_458_187,
    liveMaxLeverage: state.liveMaxLeverage,
  };
}

function passingDependencies(overrides: Record<string, unknown> = {}) {
  return {
    checkOracle: oracleMock('PASS', 78_139),
    fetchVenueState: jest.fn(async () => venueState()),
    now: () => NOW,
    ...overrides,
  } as never;
}

describe('assessBnbPerpGuard', () => {
  it('allows a reviewed market within the leverage band and venue integrity bands', async () => {
    const result = await assessBnbPerpGuard(BASE_INPUT, passingDependencies());
    expect(result.verdict).toBe('ALLOW');
    expect(result.schema).toBe('insight.bnb-perp-guard.v1');
    expect(result.scope).toEqual({
      venue: 'aster',
      network: 'eip155:56',
      transactionAuthority: 'none',
      valuation: 'caller_declared_post_action_usd',
    });
    expect(result.market.maxLeverage).toBe(20);
    expect(result.market.maxLeverageSource).toBe('reviewed-profile');
    expect(result.projected.effectiveLeverage).toBe(10);
  });

  it('blocks leverage at or above the reviewed cap', async () => {
    const result = await assessBnbPerpGuard(
      { ...BASE_INPUT, sizeUsd: 40_000, marginValueUsd: 2_000 },
      passingDependencies()
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/at or above the effective leverage cap/);
  });

  it('caps the reviewed profile by a lower live venue leverage value', async () => {
    const result = await assessBnbPerpGuard(
      BASE_INPUT,
      passingDependencies({
        fetchVenueState: jest.fn(async () => venueState({ liveMaxLeverage: 10 })),
      })
    );
    expect(result.market.maxLeverage).toBe(10);
    expect(result.market.maxLeverageSource).toBe('reviewed-profile-capped-by-live-venue');
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/at or above the effective leverage cap/);
  });

  it('blocks on an index price diverging from consensus beyond the backstop', async () => {
    const result = await assessBnbPerpGuard(
      BASE_INPUT,
      passingDependencies({
        fetchVenueState: jest.fn(async () =>
          venueState({ indexPrice: 78_139 * 1.06, markPrice: 78_139 * 1.06 })
        ),
      })
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/cross-oracle consensus diverges/);
  });

  it('blocks when the market is not in the TRADING state', async () => {
    const result = await assessBnbPerpGuard(
      BASE_INPUT,
      passingDependencies({
        fetchVenueState: jest.fn(async () => venueState({ marketStatus: 'SETTLING' })),
      })
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/not TRADING/);
  });

  it('discloses unavailable venue evidence without changing the verdict', async () => {
    const result = await assessBnbPerpGuard(
      BASE_INPUT,
      passingDependencies({
        fetchVenueState: jest.fn(async () => {
          throw new Error('Aster premiumIndex returned HTTP 503');
        }),
      })
    );
    expect(result.verdict).toBe('ALLOW');
    expect(result.venue.status).toBe('unavailable');
    expect(result.venue.aster.unavailableReason).toMatch(/HTTP 503/);
    expect(result.market.maxLeverageSource).toBe('reviewed-profile-live-unavailable');
    expect(result.reasons.join(' ')).toMatch(/Aster venue evidence was unavailable/);
  });

  it('blocks when either oracle assessment is blocking', async () => {
    const result = await assessBnbPerpGuard(
      BASE_INPUT,
      passingDependencies({ checkOracle: oracleMock('DANGER', 78_139) })
    );
    expect(result.verdict).toBe('BLOCK');
  });

  it('rejects markets outside the reviewed set', async () => {
    await expect(
      assessBnbPerpGuard({ ...BASE_INPUT, assetSymbol: 'HYPE' }, passingDependencies())
    ).rejects.toThrow(/not in the reviewed BNB perp guard market set/);
  });
});

describe('asterReviewedMarketForAsset', () => {
  it('maps reviewed assets to their USDT perp symbols and rejects the rest', () => {
    expect(asterReviewedMarketForAsset('BTC')).toBe('BTCUSDT');
    expect(asterReviewedMarketForAsset('eth')).toBe('ETHUSDT');
    expect(asterReviewedMarketForAsset('SOL')).toBeNull();
  });
});

describe('fetchAsterPerpMarketState', () => {
  const premiumPayload = {
    symbol: 'BTCUSDT',
    markPrice: '78117.54126450',
    indexPrice: '78138.99978261',
    estimatedSettlePrice: '78077.75746377',
    lastFundingRate: '0.00010000',
    interestRate: '0.00010000',
    nextFundingTime: 1_793_779_200_000,
    time: NOW.getTime(),
  };
  const tickerPayload = {
    symbol: 'BTCUSDT',
    lastPrice: '78125.1',
    volume: '5095.923',
    quoteVolume: '393458187.29',
  };
  const openInterestPayload = { symbol: 'BTCUSDT', openInterest: '5095.923', time: NOW.getTime() };
  const exchangeInfoPayload = {
    symbols: [
      {
        symbol: 'BTCUSDT',
        status: 'TRADING',
        contractType: 'PERPETUAL',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
        requiredMarginPercent: '5.0000',
        maintMarginPercent: '2.5000',
      },
    ],
  };

  function fetcherReturning(bodies: Record<string, unknown>) {
    return jest.fn(async (url: string | URL | Request): Promise<Response> => {
      const path = new URL(String(url)).pathname;
      const body = bodies[path];
      if (body === undefined) throw new Error(`unexpected fetch ${path}`);
      return new Response(JSON.stringify(body), { status: 200 });
    }) as unknown as typeof fetch;
  }

  it('decodes live-shaped payloads including the 20x margin-derived leverage cap', async () => {
    const state = await fetchAsterPerpMarketState('BTCUSDT', {
      fetcher: fetcherReturning({
        '/fapi/v1/premiumIndex': premiumPayload,
        '/fapi/v1/ticker/24hr': tickerPayload,
        '/fapi/v1/openInterest': openInterestPayload,
        '/fapi/v1/exchangeInfo': exchangeInfoPayload,
      }),
      now: () => NOW,
    });
    expect(state.symbol).toBe('BTCUSDT');
    expect(state.markPrice).toBeCloseTo(78_117.54, 2);
    expect(state.indexPrice).toBeCloseTo(78_139.0, 2);
    expect(state.marketStatus).toBe('TRADING');
    expect(state.liveMaxLeverage).toBe(20);
    expect(state.dayNotionalVolume).toBeCloseTo(393_458_187.29, 2);
    expect(state.nextFundingTimeMs).toBe(1_793_779_200_000);
    expect(state.sourceFreshnessSeconds).toBe(0);
  });

  it('throws on a market missing from exchangeInfo and on missing prices', async () => {
    await expect(
      fetchAsterPerpMarketState('ETHUSDT', {
        fetcher: fetcherReturning({
          '/fapi/v1/premiumIndex': premiumPayload,
          '/fapi/v1/ticker/24hr': tickerPayload,
          '/fapi/v1/openInterest': openInterestPayload,
          '/fapi/v1/exchangeInfo': exchangeInfoPayload,
        }),
      })
    ).rejects.toThrow(/does not list the reviewed market/);
    await expect(
      fetchAsterPerpMarketState('BTCUSDT', {
        fetcher: fetcherReturning({
          '/fapi/v1/premiumIndex': { ...premiumPayload, indexPrice: '' },
          '/fapi/v1/ticker/24hr': tickerPayload,
          '/fapi/v1/openInterest': openInterestPayload,
          '/fapi/v1/exchangeInfo': exchangeInfoPayload,
        }),
      })
    ).rejects.toThrow(/missing a usable mark or index price/);
  });
});
