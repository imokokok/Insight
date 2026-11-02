import {
  getReviewedUniswapV3PreTradeEvidence,
  type ReviewedUniswapV3PreTradeRequest,
} from '../preTradeUniswapV3';
import { getUniswapV3MarketSnapshot } from '../uniswapV3Market';

jest.mock('../uniswapV3Market', () => ({
  ...jest.requireActual('../uniswapV3Market'),
  getUniswapV3MarketSnapshot: jest.fn(),
}));

const mockedSnapshot = getUniswapV3MarketSnapshot as jest.MockedFunction<
  typeof getUniswapV3MarketSnapshot
>;

const BASE_REQUEST: ReviewedUniswapV3PreTradeRequest = {
  chainId: 8453,
  asset: 'WETH',
  destinationAsset: 'USDC',
  amountIn: '1.25',
};

const PANCAKE_REQUEST: ReviewedUniswapV3PreTradeRequest = {
  chainId: 8453,
  asset: 'USDC',
  destinationAsset: 'USDT',
  amountIn: '1250.5',
};

const snapshot = {
  source: 'dex-market',
  venue: 'uniswap-v3',
  chainId: 8453,
  market: 'WETH/USDC',
  sourceFreshnessSeconds: 2,
  observedAt: '2026-10-25T00:00:00.000Z',
  block: {
    number: '123',
    hash: `0x${'11'.repeat(32)}`,
    timestamp: '2026-10-24T23:59:58.000Z',
  },
  contracts: {
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    pool: '0x6c561B446416E1A00E8E93E221854d6eA4171372',
    token0: '0x4200000000000000000000000000000000000006',
    token1: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    feeTier: 3_000,
    codeIdentity: {
      factory: `0x${'aa'.repeat(32)}`,
      quoterV2: `0x${'bb'.repeat(32)}`,
      pool: `0x${'cc'.repeat(32)}`,
    },
  },
  spot: { tick: 1, token1PerToken0: 2000 },
  twap: { windowSeconds: 1800, tick: 1, token1PerToken0: 1999, deviationBpsFromSpot: 5 },
  activeLiquidityRaw: '1',
  poolBalances: { token0Raw: '1', token0: 1, token1Raw: '1', token1: 1 },
  quotes: [
    {
      amountIn: 1.25,
      amountInRaw: '1250000000000000000',
      amountOut: 2500,
      amountOutRaw: '2500000000',
      effectiveToken1PerToken0: 2000,
      initializedTicksCrossed: 1,
      priceImpactBps: 6,
    },
  ],
} as const;

type SnapshotDirection = 'token0-to-token1' | 'token1-to-token0';

function snapshotWithDirection(direction: SnapshotDirection) {
  if (direction === 'token1-to-token0') {
    return {
      ...snapshot,
      quotes: [
        {
          amountIn: 1250.5,
          amountInRaw: '1250500000',
          amountOut: 1249.875,
          amountOutRaw: '1249875000',
          effectiveToken0PerToken1: 0.9998,
          initializedTicksCrossed: 1,
          priceImpactBps: 6,
          direction,
        },
      ],
    };
  }
  return { ...snapshot, quotes: [{ ...snapshot.quotes[0], direction }] };
}

describe('reviewed Uniswap V3 pre-trade evidence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSnapshot.mockImplementation(async (profile: { id: string }) => {
      const direction: SnapshotDirection = profile.id.includes('token1-to-token0')
        ? 'token1-to-token0'
        : 'token0-to-token1';
      return snapshotWithDirection(direction) as never;
    });
  });

  it('pins an exact Base input amount into its own short-lived profile', async () => {
    const result = await getReviewedUniswapV3PreTradeEvidence(BASE_REQUEST);

    expect(result).toMatchObject({
      profile: 'base-weth-usdc',
      market: 'WETH/USDC',
      contracts: {
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
        codeIdentity: { factory: `0x${'aa'.repeat(32)}` },
      },
      quote: { amountInRaw: '1250000000000000000' },
    });
    const profile = mockedSnapshot.mock.calls[0]?.[0];
    expect(profile).toMatchObject({
      id: expect.stringContaining('1250000000000000000'),
      quoteAmountsToken0: undefined,
      quoteAmountsToken0Raw: [1250000000000000000n],
    });
    expect(mockedSnapshot.mock.calls[0]?.[1]).toMatchObject({ cache: false });
  });

  it('selects only the allowlisted PancakeSwap V3 USDC/USDT direction on Base', async () => {
    const result = await getReviewedUniswapV3PreTradeEvidence(PANCAKE_REQUEST);

    expect(result).toMatchObject({
      profile: 'base-pancakeswap-v3-usdc-usdt',
      venue: 'uniswap-v3',
      market: 'WETH/USDC',
    });
    const profile = mockedSnapshot.mock.calls[0]?.[0];
    expect(profile).toMatchObject({
      id: expect.stringContaining('1250500000'),
      venue: 'pancakeswap-v3',
      market: 'USDC/USDT',
      quoteAmountsToken0Raw: [1250500000n],
    });
  });

  it('binds the explicitly named deeper 0.05% WETH/USDC pool when requested', async () => {
    const result = await getReviewedUniswapV3PreTradeEvidence({
      ...BASE_REQUEST,
      profileId: 'base-uniswap-v3-weth-usdc-500',
    });

    expect(result).toMatchObject({
      profile: 'base-uniswap-v3-weth-usdc-500',
      market: 'WETH/USDC',
      direction: 'token0-to-token1',
    });
    expect(mockedSnapshot.mock.calls[0]?.[0]).toMatchObject({
      id: expect.stringContaining('base-uniswap-v3-weth-usdc-500-pretrade-'),
      quoteAmountsToken0Raw: [1250000000000000000n],
    });
  });

  it('quotes the reviewed reverse stable lane USDT→USDC through the PancakeSwap pool', async () => {
    const result = await getReviewedUniswapV3PreTradeEvidence({
      chainId: 8453,
      asset: 'USDT',
      destinationAsset: 'USDC',
      amountIn: '1250.5',
    });

    expect(result).toMatchObject({
      profile: 'base-pancakeswap-v3-usdc-usdt',
      market: 'WETH/USDC',
      direction: 'token1-to-token0',
    });
    expect(mockedSnapshot.mock.calls[0]?.[0]).toMatchObject({
      venue: 'pancakeswap-v3',
      market: 'USDC/USDT',
      quoteAmountsToken1Raw: [1250500000n],
    });
  });

  it('rejects an unreviewed route instead of substituting another pool or direction', async () => {
    await expect(
      getReviewedUniswapV3PreTradeEvidence({ ...BASE_REQUEST, destinationAsset: 'WETH' })
    ).rejects.toThrow('No reviewed Uniswap V3 pre-trade profile');
    expect(mockedSnapshot).not.toHaveBeenCalled();
  });

  it('rejects exponent-form input rather than rounding it into a different trade', async () => {
    await expect(
      getReviewedUniswapV3PreTradeEvidence({ ...BASE_REQUEST, amountIn: '1e-3' })
    ).rejects.toThrow('amountIn');
    expect(mockedSnapshot).not.toHaveBeenCalled();
  });

  it('rejects a zero input before it can become an ambiguous quote request', async () => {
    await expect(
      getReviewedUniswapV3PreTradeEvidence({ ...BASE_REQUEST, amountIn: '0.0' })
    ).rejects.toThrow('amountIn');
    expect(mockedSnapshot).not.toHaveBeenCalled();
  });
});
