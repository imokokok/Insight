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

describe('reviewed Aerodrome Slipstream pre-trade evidence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSnapshot.mockResolvedValue(snapshot as never);
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

  it('rejects unreviewed directions or native-asset aliases rather than substituting a route', async () => {
    await expect(
      getReviewedAerodromeSlipstreamPreTradeEvidence({ ...REQUEST, destinationAsset: 'WETH' })
    ).rejects.toThrow('No reviewed Aerodrome Slipstream pre-trade profile');
    await expect(
      getReviewedAerodromeSlipstreamPreTradeEvidence({ ...REQUEST, asset: 'ETH' })
    ).rejects.toThrow('No reviewed Aerodrome Slipstream pre-trade profile');
    expect(mockedSnapshot).not.toHaveBeenCalled();
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
