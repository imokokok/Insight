import { getAerodromeSlipstreamMarketSnapshotForProfile } from '../aerodromeSlipstream';
import {
  getReviewedAerodromeSlipstreamPreTradeEvidence,
  type ReviewedAerodromeSlipstreamPreTradeRequest,
} from '../preTradeAerodromeSlipstream';

jest.mock('../aerodromeSlipstream', () => ({
  ...jest.requireActual('../aerodromeSlipstream'),
  getAerodromeSlipstreamMarketSnapshotForProfile: jest.fn(),
}));

const mockedSnapshot = getAerodromeSlipstreamMarketSnapshotForProfile as jest.MockedFunction<
  typeof getAerodromeSlipstreamMarketSnapshotForProfile
>;

const REQUEST: ReviewedAerodromeSlipstreamPreTradeRequest = {
  chainId: 8453,
  asset: 'WETH',
  destinationAsset: 'USDC',
  amountIn: '1.25',
};

const snapshot = {
  source: 'dex-market',
  venue: 'aerodrome-slipstream',
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
    factory: '0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A',
    quoterV2: '0x254cF9E1E6e233aa1AC962CB9B05b2cfeAaE15b0',
    pool: '0xb2cc224c1c9feE385f8ad6a55b4d94E92359DC59',
    token0: '0x4200000000000000000000000000000000000006',
    token1: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    tickSpacing: 100,
    feePips: 150,
    codeIdentity: {
      factory: '0x7340cf80843bd721bcaefbfc050e38304cb4174c239e6e914e3056f27f39b11c',
      quoterV2: '0xfb0ab713266d089d5b6ac48d50455c4fadc9cd49a1efcc83a091e7c2e48dad0e',
      pool: '0xacd6710f7037ad095b1e4d5f8ee5b2681069cb4dd316e77e4e0cb8f85716a2a1',
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

const usdcUsdtSnapshot = {
  ...snapshot,
  market: 'USDC/USDT',
  contracts: {
    ...snapshot.contracts,
    pool: '0xa41Bc0AFfbA7Fd420d186b84899d7ab2aC57fcD1',
    token0: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    token1: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    tickSpacing: 1,
    feePips: 1,
  },
  spot: { tick: 1, token1PerToken0: 1.0002 },
  twap: { windowSeconds: 1800, tick: 1, token1PerToken0: 1.0001, deviationBpsFromSpot: 1 },
  quotes: [
    {
      amountIn: 1000,
      amountInRaw: '1000000000',
      amountOut: 1000.2,
      amountOutRaw: '1000200000',
      effectiveToken1PerToken0: 1.0002,
      initializedTicksCrossed: 0,
      priceImpactBps: 0,
    },
  ],
} as const;

type SnapshotDirection = 'token0-to-token1' | 'token1-to-token0';

function snapshotWithDirection(
  base: typeof snapshot | typeof usdcUsdtSnapshot,
  direction: SnapshotDirection
) {
  if (direction === 'token1-to-token0') {
    return {
      ...base,
      quotes: [
        {
          amountIn: 1000,
          amountInRaw: '1000000000',
          amountOut: 999.8,
          amountOutRaw: '999800000',
          effectiveToken0PerToken1: 0.9998,
          initializedTicksCrossed: 0,
          priceImpactBps: 0,
          direction,
        },
      ],
    };
  }
  return { ...base, quotes: [{ ...base.quotes[0], direction }] };
}

describe('reviewed Aerodrome Slipstream pre-trade evidence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSnapshot.mockImplementation(async (profile: { id: string }) => {
      const direction: SnapshotDirection = profile.id.includes('token1-to-token0')
        ? 'token1-to-token0'
        : 'token0-to-token1';
      const base = profile.id.includes('usdc-usdt-cl1') ? usdcUsdtSnapshot : snapshot;
      return snapshotWithDirection(base, direction) as never;
    });
  });

  it('pins an exact WETH input amount into a dedicated, uncached CL100 profile', async () => {
    const result = await getReviewedAerodromeSlipstreamPreTradeEvidence(REQUEST);

    expect(result).toMatchObject({
      profile: 'base-aerodrome-slipstream-weth-usdc-cl100',
      market: 'WETH/USDC',
      contracts: { tickSpacing: 100, feePips: 150 },
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

  it('binds an explicitly named reviewed profile to the same exact route', async () => {
    await getReviewedAerodromeSlipstreamPreTradeEvidence({
      ...REQUEST,
      profileId: 'base-aerodrome-slipstream-weth-usdc-cl100',
    });

    expect(mockedSnapshot.mock.calls[0]?.[0]).toMatchObject({
      id: expect.stringContaining('base-aerodrome-slipstream-weth-usdc-cl100-pretrade-'),
    });
  });

  it('fails closed when a named reviewed profile does not match the requested route', async () => {
    await expect(
      getReviewedAerodromeSlipstreamPreTradeEvidence({
        ...REQUEST,
        profileId: 'base-aerodrome-slipstream-weth-usdc-cl100',
        destinationAsset: 'WETH',
      })
    ).rejects.toThrow('No reviewed Aerodrome Slipstream pre-trade profile');
    expect(mockedSnapshot).not.toHaveBeenCalled();
  });

  it('rejects unreviewed directions or native-asset aliases rather than substituting a route', async () => {
    await expect(
      getReviewedAerodromeSlipstreamPreTradeEvidence({ ...REQUEST, destinationAsset: 'USDT' })
    ).rejects.toThrow('No reviewed Aerodrome Slipstream pre-trade profile');
    await expect(
      getReviewedAerodromeSlipstreamPreTradeEvidence({ ...REQUEST, asset: 'ETH' })
    ).rejects.toThrow('No reviewed Aerodrome Slipstream pre-trade profile');
    expect(mockedSnapshot).not.toHaveBeenCalled();
  });

  it('quotes the reviewed reverse lane USDC→WETH with a token1 ladder', async () => {
    const result = await getReviewedAerodromeSlipstreamPreTradeEvidence({
      ...REQUEST,
      asset: 'USDC',
      destinationAsset: 'WETH',
    });

    expect(result).toMatchObject({
      profile: 'base-aerodrome-slipstream-weth-usdc-cl100',
      market: 'WETH/USDC',
      direction: 'token1-to-token0',
    });
    expect(mockedSnapshot.mock.calls[0]?.[0]).toMatchObject({
      quoteAmountsToken1Raw: [1_250_000n],
    });
  });

  it('quotes the reviewed USDC/USDT CL1 pool in both directions', async () => {
    const forward = await getReviewedAerodromeSlipstreamPreTradeEvidence({
      chainId: 8453,
      asset: 'USDC',
      destinationAsset: 'USDT',
      amountIn: '1000',
    });
    const reverse = await getReviewedAerodromeSlipstreamPreTradeEvidence({
      chainId: 8453,
      asset: 'USDT',
      destinationAsset: 'USDC',
      amountIn: '1000',
    });

    expect(forward).toMatchObject({
      profile: 'base-aerodrome-slipstream-usdc-usdt-cl1',
      market: 'USDC/USDT',
      direction: 'token0-to-token1',
    });
    expect(reverse).toMatchObject({
      profile: 'base-aerodrome-slipstream-usdc-usdt-cl1',
      market: 'USDC/USDT',
      direction: 'token1-to-token0',
    });
  });

  it('rejects exponent-form and zero amounts before a quote can be requested', async () => {
    await expect(
      getReviewedAerodromeSlipstreamPreTradeEvidence({ ...REQUEST, amountIn: '1e-3' })
    ).rejects.toThrow('amountIn');
    await expect(
      getReviewedAerodromeSlipstreamPreTradeEvidence({ ...REQUEST, amountIn: '0.0' })
    ).rejects.toThrow('amountIn');
    expect(mockedSnapshot).not.toHaveBeenCalled();
  });
});
