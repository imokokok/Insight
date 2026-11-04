import type { HyperliquidPerpExecutionMarketState } from '@/lib/dex/hyperliquidPerpMarket';

import {
  assessHyperliquidPerpGuard,
  HyperliquidPerpGuardInputSchema,
  type HyperliquidPerpGuardInput,
} from '../hyperliquidPerpGuard';

const oracle = (verdict: string, consensusPrice = 50_000) =>
  ({
    verdict,
    consensusPrice,
    maxDeviationPct: 0.2,
    staleDataRisk: false,
    participantCount: 4,
  }) as never;

function venueState(overrides: Partial<HyperliquidPerpExecutionMarketState> = {}) {
  const now = 1_792_252_800_000;
  return {
    source: 'dex-market',
    venue: 'hyperliquid-perp',
    network: 'hyperliquid:mainnet',
    market: 'BTC-PERP',
    coin: 'BTC',
    observedAt: new Date(now).toISOString(),
    sourceFreshnessSeconds: 1,
    assetIndex: 0,
    perpetual: {
      markPrice: 50_000,
      midPrice: 50_000,
      oraclePrice: 50_000,
      fundingRate: 0.0000125,
      openInterest: 100,
      dayNotionalVolume: 1_000_000_000,
      sizeDecimals: 5,
      maxLeverage: 40,
    },
    book: {
      timestamp: new Date(now).toISOString(),
      bids: [{ price: 49_999, size: 2 }],
      asks: [{ price: 50_001, size: 2 }],
    },
    ...overrides,
  } as HyperliquidPerpExecutionMarketState;
}

const perpInput: HyperliquidPerpGuardInput = {
  protocolId: 'hyperliquid-perps-mainnet',
  action: 'open_long',
  assetSymbol: 'BTC',
  marginAssetSymbol: 'USDC',
  sizeUsd: 25_000,
  marginValueUsd: 2_500,
};

function deps(
  options: {
    oracleVerdict?: string;
    consensusPrice?: number;
    venue?: HyperliquidPerpExecutionMarketState | null;
  } = {}
): Parameters<typeof assessHyperliquidPerpGuard>[1] {
  const venue = options.venue === undefined ? venueState() : options.venue;
  return {
    checkOracle: (async () =>
      oracle(options.oracleVerdict ?? 'PASS', options.consensusPrice ?? 50_000)) as never,
    fetchVenueState: (async () => venue) as never,
  };
}

describe('HyperliquidPerpGuardInputSchema', () => {
  it('rejects non-USDC margin and non-positive values', () => {
    expect(
      HyperliquidPerpGuardInputSchema.safeParse({
        ...perpInput,
        marginAssetSymbol: 'USDT',
      }).success
    ).toBe(false);
    expect(HyperliquidPerpGuardInputSchema.safeParse({ ...perpInput, sizeUsd: 0 }).success).toBe(
      false
    );
  });

  it('rejects markets outside the reviewed set', async () => {
    await expect(
      assessHyperliquidPerpGuard({ ...perpInput, assetSymbol: 'FARTCOIN' })
    ).rejects.toThrow('not in the reviewed Hyperliquid perp guard market set');
  });
});

describe('assessHyperliquidPerpGuard', () => {
  it('returns ALLOW with reviewed-profile leverage and venue evidence', async () => {
    const result = await assessHyperliquidPerpGuard(perpInput, deps());
    expect(result.schema).toBe('insight.hyperliquid-perp-guard.v1');
    expect(result.verdict).toBe('ALLOW');
    expect(result.scope).toMatchObject({
      venue: 'hyperliquid',
      network: 'hyperliquid:mainnet',
      transactionAuthority: 'none',
    });
    expect(result.market.maxLeverage).toBe(40);
    expect(result.market.maxLeverageSource).toBe('reviewed-profile');
    expect(result.projected.effectiveLeverage).toBe(10);
    expect(result.venue.status).toBe('observed');
    expect(result.venue.displayedTopDepthNotionalUsd).toBeCloseTo(100_002);
    expect(result.next.execution).toBe('not_performed');
  });

  it('blocks at or above the effective leverage cap', async () => {
    const result = await assessHyperliquidPerpGuard(
      { ...perpInput, sizeUsd: 100_000, marginValueUsd: 2_500 },
      deps()
    );
    expect(result.verdict).toBe('BLOCK');
  });

  it('caps the reviewed leverage by the live venue limit', async () => {
    const result = await assessHyperliquidPerpGuard(
      { ...perpInput, sizeUsd: 30_000 },
      deps({ venue: venueState({ perpetual: { ...venueState().perpetual, maxLeverage: 10 } }) })
    );
    expect(result.market.maxLeverage).toBe(10);
    expect(result.market.maxLeverageSource).toBe('reviewed-profile-capped-by-live-venue');
    expect(result.verdict).toBe('BLOCK');
  });

  it('cautions when leverage consumes at least 90% of the cap', async () => {
    const result = await assessHyperliquidPerpGuard(
      { ...perpInput, sizeUsd: 91_000, marginValueUsd: 2_500 },
      deps()
    );
    expect(result.verdict).toBe('CAUTION');
  });

  it('blocks on a DANGER oracle assessment', async () => {
    const result = await assessHyperliquidPerpGuard(perpInput, deps({ oracleVerdict: 'DANGER' }));
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons).toContain(
      'At least one underlying or margin oracle assessment is DANGER or BLOCK.'
    );
  });

  it('blocks on extreme mark/oracle divergence and cautions on the advisory band', async () => {
    const divergent = (mark: number) =>
      venueState({ perpetual: { ...venueState().perpetual, markPrice: mark } });
    const caution = await assessHyperliquidPerpGuard(perpInput, deps({ venue: divergent(50_500) }));
    expect(caution.verdict).toBe('CAUTION');
    const block = await assessHyperliquidPerpGuard(perpInput, deps({ venue: divergent(55_000) }));
    expect(block.verdict).toBe('BLOCK');
  });

  it('blocks when consensus diverges from the venue oracle beyond the backstop', async () => {
    const result = await assessHyperliquidPerpGuard(perpInput, deps({ consensusPrice: 47_000 }));
    expect(result.venue.consensusVenueDeviationPct).toBeGreaterThan(5);
    expect(result.verdict).toBe('BLOCK');
  });

  it('discloses venue unavailability without changing the verdict', async () => {
    const result = await assessHyperliquidPerpGuard(perpInput, deps({ venue: null }));
    expect(result.venue.status).toBe('unavailable');
    expect(result.verdict).toBe('ALLOW');
    expect(result.reasons.some((reason) => reason.includes('venue evidence was unavailable'))).toBe(
      true
    );
  });
});
