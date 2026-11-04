import {
  fetchPerplPerpMarketState,
  perplReviewedMarketForAsset,
} from '@/lib/perps/perplPerpMarket';

import { assessMonadPerpGuard } from '../monadPerpGuard';

const NOW = new Date('2026-11-05T00:00:00.000Z');

const BASE_INPUT = {
  protocolId: 'perpl-perps-monad-mainnet' as const,
  action: 'open_long' as const,
  assetSymbol: 'BTC',
  marginAssetSymbol: 'AUSD' as const,
  sizeUsd: 10_000,
  marginValueUsd: 2_000,
};

function oracleMockByAsset(
  verdicts: Record<
    string,
    { verdict: 'PASS' | 'CAUTION' | 'DANGER' | 'BLOCK'; participantCount?: number }
  >
) {
  return jest.fn(async (input: { asset: string }) => {
    const outcome =
      verdicts[input.asset.trim().toUpperCase()] ??
      verdicts[input.asset.trim().toUpperCase() === 'AUSD' ? 'AUSD' : 'DEFAULT'];
    if (!outcome) throw new Error(`unexpected oracle asset ${input.asset}`);
    return {
      verdict: outcome.verdict,
      consensusPrice: input.asset.toUpperCase() === 'AUSD' ? 1 : 78_139,
      maxDeviationPct: 0.1,
      staleDataRisk: false,
      participantCount: outcome.participantCount ?? 3,
      attestation: { uid: 'uid-1', attester: '0xattester' },
    };
  }) as never;
}

function venueState(overrides: Partial<Parameters<typeof venueEvidenceFrom>[0]> = {}) {
  return venueEvidenceFrom({
    markPrice: 78_117.5,
    indexPrice: 78_139.0,
    liveMaxLeverage: 6,
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
    symbol: 'BTC' as const,
    marketId: 1,
    marketStatus: state.marketStatus,
    observedAt: NOW.toISOString(),
    sourceFreshnessSeconds: 1,
    markPrice: state.markPrice,
    indexPrice: state.indexPrice,
    fundingRatePerInterval: -0.00001,
    nextFundingTimeMs: NOW.getTime() + 2_580_000,
    openInterestBase: 6.63842,
    dayNotionalVolume: 12_187_710.65,
    liveMaxLeverage: state.liveMaxLeverage,
  };
}

function passingDependencies(overrides: Record<string, unknown> = {}) {
  return {
    checkOracle: oracleMockByAsset({ DEFAULT: { verdict: 'PASS' }, AUSD: { verdict: 'PASS' } }),
    fetchVenueState: jest.fn(async () => venueState()),
    now: () => NOW,
    ...overrides,
  } as never;
}

describe('assessMonadPerpGuard', () => {
  it('allows a reviewed market within the leverage band and venue integrity bands', async () => {
    const result = await assessMonadPerpGuard(BASE_INPUT, passingDependencies());
    expect(result.verdict).toBe('ALLOW');
    expect(result.schema).toBe('insight.monad-perp-guard.v1');
    expect(result.scope).toEqual({
      venue: 'perpl',
      network: 'eip155:143',
      transactionAuthority: 'none',
      valuation: 'caller_declared_post_action_usd',
    });
    expect(result.market.maxLeverage).toBe(6);
    expect(result.market.maxLeverageSource).toBe('reviewed-profile');
    expect(result.projected.effectiveLeverage).toBe(5);
    expect(result.oracleChecks.marginConsensusStatus).toBe('verified');
  });

  it('blocks leverage at or above the reviewed cap', async () => {
    const result = await assessMonadPerpGuard(
      { ...BASE_INPUT, sizeUsd: 12_000, marginValueUsd: 2_000 },
      passingDependencies({
        fetchVenueState: jest.fn(async () => venueState({ liveMaxLeverage: 6 })),
      })
    );
    // effective leverage is exactly 6x = cap: BLOCK via >= cap.
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/at or above the effective leverage cap/);
  });

  it('caps the reviewed profile by a lower live venue leverage value', async () => {
    const result = await assessMonadPerpGuard(
      BASE_INPUT,
      passingDependencies({
        fetchVenueState: jest.fn(async () => venueState({ liveMaxLeverage: 5 })),
      })
    );
    expect(result.market.maxLeverage).toBe(5);
    expect(result.market.maxLeverageSource).toBe('reviewed-profile-capped-by-live-venue');
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/at or above the effective leverage cap/);
  });

  it('cautions inside the 90% leverage band', async () => {
    const result = await assessMonadPerpGuard(
      { ...BASE_INPUT, sizeUsd: 11_000, marginValueUsd: 2_000 },
      passingDependencies()
    );
    expect(result.verdict).toBe('CAUTION');
    expect(result.reasons.join(' ')).toMatch(/90% of the effective leverage cap/);
  });

  it('blocks on an oracle price diverging from consensus beyond the backstop', async () => {
    const result = await assessMonadPerpGuard(
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
    const result = await assessMonadPerpGuard(
      BASE_INPUT,
      passingDependencies({
        fetchVenueState: jest.fn(async () => venueState({ marketStatus: 'CLOSED' })),
      })
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/not TRADING/);
  });

  it('discloses unavailable venue evidence without changing the verdict', async () => {
    const result = await assessMonadPerpGuard(
      BASE_INPUT,
      passingDependencies({
        fetchVenueState: jest.fn(async () => {
          throw new Error('Perpl market data returned HTTP 503');
        }),
      })
    );
    expect(result.verdict).toBe('ALLOW');
    expect(result.venue.status).toBe('unavailable');
    expect(result.venue.perpl.unavailableReason).toMatch(/HTTP 503/);
    expect(result.market.maxLeverageSource).toBe('reviewed-profile-live-unavailable');
    expect(result.reasons.join(' ')).toMatch(/Perpl venue evidence was unavailable/);
  });

  it('blocks when either oracle assessment is blocking', async () => {
    const result = await assessMonadPerpGuard(
      BASE_INPUT,
      passingDependencies({
        checkOracle: oracleMockByAsset({
          DEFAULT: { verdict: 'DANGER' },
          AUSD: { verdict: 'PASS' },
        }),
      })
    );
    expect(result.verdict).toBe('BLOCK');
  });

  it('discloses AUSD insufficient margin coverage without hard-blocking', async () => {
    const result = await assessMonadPerpGuard(
      BASE_INPUT,
      passingDependencies({
        checkOracle: oracleMockByAsset({
          DEFAULT: { verdict: 'PASS' },
          AUSD: { verdict: 'BLOCK', participantCount: 2 },
        }),
      })
    );
    expect(result.verdict).toBe('ALLOW');
    expect(result.oracleChecks.marginConsensusStatus).toBe('insufficient_coverage');
    expect(result.oracleChecks.margin).toBeNull();
    expect(result.reasons.join(' ')).toMatch(
      /AUSD margin-asset cross-oracle consensus has insufficient independent coverage/
    );
  });

  it('escalates a genuine AUSD margin-asset DANGER verdict', async () => {
    const result = await assessMonadPerpGuard(
      BASE_INPUT,
      passingDependencies({
        checkOracle: oracleMockByAsset({
          DEFAULT: { verdict: 'PASS' },
          AUSD: { verdict: 'DANGER', participantCount: 4 },
        }),
      })
    );
    expect(result.oracleChecks.marginConsensusStatus).toBe('verified');
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/margin oracle assessment is DANGER or BLOCK/);
  });

  it('rejects markets outside the reviewed set', async () => {
    await expect(
      assessMonadPerpGuard({ ...BASE_INPUT, assetSymbol: 'HYPE' }, passingDependencies())
    ).rejects.toThrow(/not in the reviewed Monad perp guard market set/);
  });
});

describe('perplReviewedMarketForAsset', () => {
  it('maps reviewed assets to their Perpl market identities and rejects the rest', () => {
    expect(perplReviewedMarketForAsset('BTC')).toMatchObject({ marketId: 1, maxLeverage: 6 });
    expect(perplReviewedMarketForAsset('mon')).toMatchObject({ marketId: 10, maxLeverage: 10 });
    expect(perplReviewedMarketForAsset('eth')).toMatchObject({ marketId: 20, maxLeverage: 8 });
    expect(perplReviewedMarketForAsset('SOL')).toMatchObject({ marketId: 31, maxLeverage: 8 });
    expect(perplReviewedMarketForAsset('ZEC')).toBeNull();
  });
});

describe('fetchPerplPerpMarketState', () => {
  const contextPayload = {
    chain: { chain_id: 143 },
    tokens: [{ id: 1, symbol: 'AUSD', decimals: 6 }],
    markets: [
      {
        id: 1,
        symbol: '',
        name: 'Bitcoin Perpetual',
        funding_interval_sec: 2580,
        config: {
          at: { b: 119_408_900, t: NOW.getTime() },
          is_open: true,
          price_decimals: 1,
          size_decimals: 5,
          initial_margin: 1500,
          maintenance_margin: 2500,
          maker_fee: 45,
          taker_fee: 345,
        },
        state: {
          at: { b: 119_408_916, t: NOW.getTime() },
          orl: 801_569,
          mrk: 801_712,
          lst: 801_600,
          mid: 801_650,
          bid: 801_500,
          ask: 801_800,
          prv: 795_000,
          dv: 663_842,
          dva: '12187710654823',
          oi: 663_842,
          tvl: '1000000000000',
        },
        funding: { at: { b: 119_408_900, t: NOW.getTime() - 2_580_000 }, rate: -10, idx: 801_569 },
      },
    ],
  };

  function fetcherReturning(body: unknown) {
    return jest.fn(
      async (): Promise<Response> => new Response(JSON.stringify(body), { status: 200 })
    ) as unknown as typeof fetch;
  }

  it('decodes the live-shaped context payload including the margin-derived leverage cap', async () => {
    const state = await fetchPerplPerpMarketState('BTC', {
      fetcher: fetcherReturning(contextPayload),
      now: () => NOW,
    });
    expect(state.symbol).toBe('BTC');
    expect(state.marketId).toBe(1);
    expect(state.markPrice).toBeCloseTo(80_171.2, 1);
    expect(state.indexPrice).toBeCloseTo(80_156.9, 1);
    expect(state.marketStatus).toBe('TRADING');
    expect(state.liveMaxLeverage).toBe(6);
    expect(state.dayNotionalVolume).toBeCloseTo(12_187_710.65, 2);
    expect(state.fundingRatePerInterval).toBeCloseTo(-0.00001, 8);
    expect(state.nextFundingTimeMs).toBe(NOW.getTime() - 2_580_000 + 2_580_000);
    expect(state.sourceFreshnessSeconds).toBe(0);
  });

  it('throws when the reviewed market disappears or changes identity', async () => {
    await expect(
      fetchPerplPerpMarketState('ETH', { fetcher: fetcherReturning(contextPayload) })
    ).rejects.toThrow(/no longer lists reviewed market id 20/);
    await expect(
      fetchPerplPerpMarketState('BTC', {
        fetcher: fetcherReturning({
          ...contextPayload,
          markets: [{ ...contextPayload.markets[0], id: 999 }],
        }),
      })
    ).rejects.toThrow(/no longer lists reviewed market id 1/);
  });

  it('throws when prices or config are unusable', async () => {
    await expect(
      fetchPerplPerpMarketState('BTC', {
        fetcher: fetcherReturning({
          ...contextPayload,
          markets: [
            {
              ...contextPayload.markets[0],
              state: { ...contextPayload.markets[0].state, orl: 0 },
            },
          ],
        }),
      })
    ).rejects.toThrow(/lacks usable config or prices/);
  });
});
