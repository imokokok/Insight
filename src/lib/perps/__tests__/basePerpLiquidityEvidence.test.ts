import { getUniswapV3MarketSnapshot } from '@/lib/dex/uniswapV3Market';

import {
  basePerpLiquidityConcern,
  fetchBasePerpLiquidityEvidence,
} from '../basePerpLiquidityEvidence';

jest.mock('@/lib/dex/uniswapV3Market', () => ({
  ...jest.requireActual('@/lib/dex/uniswapV3Market'),
  getUniswapV3MarketSnapshot: jest.fn(),
}));

const getSnapshot = getUniswapV3MarketSnapshot as jest.Mock;

const snapshot = (overrides: Record<string, unknown> = {}) =>
  ({
    source: 'dex-market',
    venue: 'uniswap-v3',
    chainId: 8453,
    market: 'WETH/USDC',
    sourceFreshnessSeconds: 2,
    observedAt: '2026-11-03T00:00:00.000Z',
    block: {
      number: '123',
      hash: `0x${'a'.repeat(64)}`,
      timestamp: '2026-11-03T00:00:00.000Z',
    },
    contracts: {
      factory: `0x${'b'.repeat(40)}`,
      quoterV2: `0x${'c'.repeat(40)}`,
      pool: `0x${'d'.repeat(40)}`,
      token0: `0x${'e'.repeat(40)}`,
      token1: `0x${'f'.repeat(40)}`,
      feeTier: 500,
    },
    spot: { tick: 1841620, token1PerToken0: 3000 },
    twap: { windowSeconds: 1800, tick: 1841620, token1PerToken0: 3000, deviationBpsFromSpot: 5 },
    activeLiquidityRaw: '1000000000000',
    poolBalances: { token0Raw: '1', token0: 5000, token1Raw: '2', token1: 15_000_000 },
    quotes: [
      {
        direction: 'token0-to-token1',
        amountIn: 1,
        amountInRaw: '1',
        amountOut: 2999,
        amountOutRaw: '2999',
        effectiveToken1PerToken0: 2999,
        initializedTicksCrossed: 1,
        priceImpactBps: 3.3,
      },
      {
        direction: 'token0-to-token1',
        amountIn: 10,
        amountInRaw: '10',
        amountOut: 29980,
        amountOutRaw: '29980',
        effectiveToken1PerToken0: 2998,
        initializedTicksCrossed: 2,
        priceImpactBps: 20,
      },
      {
        direction: 'token0-to-token1',
        amountIn: 100,
        amountInRaw: '100',
        amountOut: 299500,
        amountOutRaw: '299500',
        effectiveToken1PerToken0: 2995,
        initializedTicksCrossed: 4,
        priceImpactBps: 150,
      },
    ],
    ...overrides,
  }) as never;

describe('Base perp liquidity evidence', () => {
  beforeEach(() => {
    getSnapshot.mockReset();
  });

  it('observes the reviewed WETH/USDC 0.05% pool for ETH and selects the covering rung', async () => {
    getSnapshot.mockResolvedValue(snapshot());
    const evidence = await fetchBasePerpLiquidityEvidence({ assetSymbol: 'ETH', sizeUsd: 25_000 });

    expect(getSnapshot).toHaveBeenCalledTimes(1);
    const profile = getSnapshot.mock.calls[0]![0] as { id: string; feeTier: number };
    expect(profile.id).toBe('base-uniswap-v3-weth-usdc-500');
    expect(profile.feeTier).toBe(500);
    expect(evidence.status).toBe('observed');
    expect(evidence.spotPriceUsdcPerToken).toBe(3000);
    expect(evidence.declaredSize?.referenceRung?.amountIn).toBe(10);
    expect(evidence.declaredSize?.beyondReviewedLadder).toBe(false);
    expect(evidence.quotes).toHaveLength(3);
  });

  it('accepts WETH as the same reviewed underlying', async () => {
    getSnapshot.mockResolvedValue(snapshot());
    const evidence = await fetchBasePerpLiquidityEvidence({ assetSymbol: 'weth', sizeUsd: 1_000 });
    expect(evidence.status).toBe('observed');
  });

  it('flags a declared size beyond the reviewed ladder and keeps the largest rung', async () => {
    getSnapshot.mockResolvedValue(snapshot());
    const evidence = await fetchBasePerpLiquidityEvidence({ assetSymbol: 'ETH', sizeUsd: 500_000 });

    expect(evidence.declaredSize?.beyondReviewedLadder).toBe(true);
    expect(evidence.declaredSize?.referenceRung?.amountIn).toBe(100);
    expect(basePerpLiquidityConcern(evidence)).toContain('exceeds the largest reviewed depth rung');
  });

  it('returns no concern for quiet observed evidence', async () => {
    getSnapshot.mockResolvedValue(snapshot());
    const evidence = await fetchBasePerpLiquidityEvidence({ assetSymbol: 'ETH', sizeUsd: 25_000 });

    expect(basePerpLiquidityConcern(evidence)).toBeNull();
  });

  it('raises a concern when the TWAP deviates beyond the advisory band', async () => {
    getSnapshot.mockResolvedValue(
      snapshot({
        twap: { windowSeconds: 1800, tick: 1, token1PerToken0: 2950, deviationBpsFromSpot: 166.7 },
      })
    );
    const evidence = await fetchBasePerpLiquidityEvidence({ assetSymbol: 'ETH', sizeUsd: 25_000 });

    expect(basePerpLiquidityConcern(evidence)).toContain('TWAP deviates');
  });

  it('raises a concern when the covering rung price impact exceeds the advisory band', async () => {
    getSnapshot.mockResolvedValue(
      snapshot({
        quotes: [
          {
            direction: 'token0-to-token1',
            amountIn: 10,
            amountInRaw: '10',
            amountOut: 28000,
            amountOutRaw: '28000',
            effectiveToken1PerToken0: 2800,
            initializedTicksCrossed: 9,
            priceImpactBps: 400,
          },
        ],
      })
    );
    const evidence = await fetchBasePerpLiquidityEvidence({ assetSymbol: 'ETH', sizeUsd: 25_000 });

    expect(evidence.declaredSize?.beyondReviewedLadder).toBe(false);
    expect(evidence.declaredSize?.referenceRung?.priceImpactBps).toBe(400);
    expect(basePerpLiquidityConcern(evidence)).toContain('price impact');
  });

  it('discloses unavailable evidence for underlyings without a reviewed spot market', async () => {
    const evidence = await fetchBasePerpLiquidityEvidence({ assetSymbol: 'BTC', sizeUsd: 25_000 });

    expect(getSnapshot).not.toHaveBeenCalled();
    expect(evidence.status).toBe('no_reviewed_spot_market');
    expect(basePerpLiquidityConcern(evidence)).toContain('wash-traded');
  });

  it('discloses source failure without throwing', async () => {
    getSnapshot.mockRejectedValue(new Error('rpc down'));
    const evidence = await fetchBasePerpLiquidityEvidence({ assetSymbol: 'ETH', sizeUsd: 25_000 });

    expect(evidence.status).toBe('market_source_unavailable');
    expect(basePerpLiquidityConcern(evidence)).toContain('oracle consensus only');
  });

  it('reports no concern for the not-requested placeholder', () => {
    expect(
      basePerpLiquidityConcern({
        status: 'not_requested',
        assetSymbol: 'ETH',
        reason: 'Liquidity evidence was not requested for this assessment.',
      })
    ).toBeNull();
  });
});
