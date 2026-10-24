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

describe('reviewed Uniswap V3 pre-trade evidence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSnapshot.mockResolvedValue(snapshot as never);
  });

  it('pins an exact Base input amount into its own short-lived profile', async () => {
    const result = await getReviewedUniswapV3PreTradeEvidence(BASE_REQUEST);

    expect(result).toMatchObject({
      profile: 'base-weth-usdc',
      market: 'WETH/USDC',
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
