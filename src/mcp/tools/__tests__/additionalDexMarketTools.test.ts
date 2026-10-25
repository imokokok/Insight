import { getToolCreditCost } from '@/lib/billing/metering';
import { getAerodromeSlipstreamMarketSnapshot } from '@/lib/dex/aerodromeSlipstream';
import { getBaseUniswapV3MarketSnapshot } from '@/lib/dex/baseUniswapV3';
import {
  getHyperliquidPerpMarketSnapshot,
  hyperliquidPerpMarketProfile,
} from '@/lib/dex/hyperliquidPerpMarket';
import { getSolanaJupiterRouteSnapshot } from '@/lib/dex/solanaJupiterRoute';

import {
  getAerodromeSlipstreamMarketTool,
  getBaseDexMarketTool,
  getHyperliquidPerpMarketTool,
  getSolanaDexRouteTool,
} from '../dexMarketTools';
import { getToolDefinitions } from '../index';

jest.mock('@/lib/dex/baseUniswapV3', () => ({
  getBaseUniswapV3MarketSnapshot: jest.fn(),
}));
jest.mock('@/lib/dex/aerodromeSlipstream', () => ({
  getAerodromeSlipstreamMarketSnapshot: jest.fn(),
}));
jest.mock('@/lib/dex/solanaJupiterRoute', () => ({
  getSolanaJupiterRouteSnapshot: jest.fn(),
}));
jest.mock('@/lib/dex/hyperliquidPerpMarket', () => ({
  getHyperliquidPerpMarketSnapshot: jest.fn(),
  hyperliquidPerpMarketProfile: jest.fn((market: string) => ({ coin: market })),
}));

const mockedBaseSnapshot = getBaseUniswapV3MarketSnapshot as jest.MockedFunction<
  typeof getBaseUniswapV3MarketSnapshot
>;
const mockedAerodromeSnapshot = getAerodromeSlipstreamMarketSnapshot as jest.MockedFunction<
  typeof getAerodromeSlipstreamMarketSnapshot
>;
const mockedSolanaSnapshot = getSolanaJupiterRouteSnapshot as jest.MockedFunction<
  typeof getSolanaJupiterRouteSnapshot
>;
const mockedHyperliquidSnapshot = getHyperliquidPerpMarketSnapshot as jest.MockedFunction<
  typeof getHyperliquidPerpMarketSnapshot
>;
const mockedHyperliquidProfile = hyperliquidPerpMarketProfile as jest.MockedFunction<
  typeof hyperliquidPerpMarketProfile
>;

describe('additional DEX market MCP tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedHyperliquidProfile.mockImplementation((market) => ({ coin: market }) as never);
  });

  it('registers the reviewed Base, Aerodrome, Solana, and Hyperliquid evidence tools at C1', () => {
    const names = getToolDefinitions().map((tool) => tool.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'get_base_dex_market',
        'get_aerodrome_slipstream_market',
        'get_solana_dex_route',
        'get_hyperliquid_perp_market',
      ])
    );
    expect(getBaseDexMarketTool.parameters.safeParse({}).success).toBe(true);
    expect(getAerodromeSlipstreamMarketTool.parameters.safeParse({}).success).toBe(true);
    expect(getSolanaDexRouteTool.parameters.safeParse({}).success).toBe(true);
    expect(getHyperliquidPerpMarketTool.parameters.safeParse({}).data).toEqual({ market: 'BTC' });
    expect(getHyperliquidPerpMarketTool.parameters.safeParse({ market: 'SOL' }).success).toBe(
      false
    );
    expect(getToolCreditCost('get_base_dex_market')).toBe(0.5);
    expect(getToolCreditCost('get_aerodrome_slipstream_market')).toBe(0.5);
    expect(getToolCreditCost('get_solana_dex_route')).toBe(0.5);
    expect(getToolCreditCost('get_hyperliquid_perp_market')).toBe(0.5);
  });

  it('keeps Base pool evidence explicitly separate from oracle consensus', async () => {
    mockedBaseSnapshot.mockResolvedValue({
      source: 'dex-market',
      venue: 'uniswap-v3',
      chainId: 8453,
      market: 'WETH/USDC',
      sourceFreshnessSeconds: 2,
      observedAt: '2026-10-25T00:00:02.000Z',
      block: { number: '1', hash: `0x${'a'.repeat(64)}`, timestamp: '2026-10-25T00:00:00.000Z' },
      contracts: {
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
        quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        pool: '0x6c561B446416E1A00E8E93E221854d6eA4171372',
        token0: '0x4200000000000000000000000000000000000006',
        token1: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        feeTier: 3_000,
      },
      spot: { tick: 0, token1PerToken0: 1_000_000_000_000 },
      twap: {
        windowSeconds: 1_800,
        tick: 0,
        token1PerToken0: 1_000_000_000_000,
        deviationBpsFromSpot: 0,
      },
      activeLiquidityRaw: '1',
      poolBalances: { token0Raw: '1', token0: 1e-18, token1Raw: '1', token1: 0.000001 },
      quotes: [],
    });

    const result = JSON.parse(await getBaseDexMarketTool.handler({}));
    expect(result.market).toBe('WETH/USDC');
    expect(result.caveats).toContain(
      'DEX market evidence is not an oracle-consensus vote or a venue-independent fair price.'
    );
  });

  it('reports Aerodrome’s pinned fee as venue context, not an oracle vote', async () => {
    mockedAerodromeSnapshot.mockResolvedValue({
      source: 'dex-market',
      venue: 'aerodrome-slipstream',
      chainId: 8453,
      market: 'WETH/USDC',
      sourceFreshnessSeconds: 2,
      observedAt: '2026-10-25T00:00:02.000Z',
      block: { number: '1', hash: `0x${'a'.repeat(64)}`, timestamp: '2026-10-25T00:00:00.000Z' },
      contracts: {
        factory: '0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A',
        quoterV2: '0x254cF9E1E6e233aa1AC962CB9B05b2cfeAaE15b0',
        pool: '0xb2cc224c1c9feE385f8ad6a55b4d94E92359DC59',
        token0: '0x4200000000000000000000000000000000000006',
        token1: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        tickSpacing: 100,
        feePips: 150,
      },
      spot: { tick: 0, token1PerToken0: 1_000_000_000_000 },
      twap: {
        windowSeconds: 1_800,
        tick: 0,
        token1PerToken0: 1_000_000_000_000,
        deviationBpsFromSpot: 0,
      },
      activeLiquidityRaw: '1',
      poolBalances: { token0Raw: '1', token0: 1e-18, token1Raw: '1', token1: 0.000001 },
      quotes: [],
    });

    const result = JSON.parse(await getAerodromeSlipstreamMarketTool.handler({}));
    expect(result.venue).toBe('aerodrome-slipstream');
    expect(result.caveats).toContain(
      'feePips is the pool fee read at the pinned block and can change with Aerodrome fee configuration.'
    );
  });

  it('labels Jupiter output as route evidence rather than a simulated swap', async () => {
    mockedSolanaSnapshot.mockResolvedValue({
      source: 'dex-route',
      venue: 'jupiter',
      network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      market: 'SOL/USDC',
      sourceFreshnessSeconds: 1,
      observedAt: '2026-10-25T00:00:01.000Z',
      finalizedSlot: 123,
      quotes: [],
    });

    const result = JSON.parse(await getSolanaDexRouteTool.handler({}));
    expect(result.market).toBe('SOL/USDC');
    expect(result.caveats).toContain(
      'A quote is not a transaction simulation or a guarantee that a later signed swap will land.'
    );
  });

  it('labels Hyperliquid output as bounded CLOB context rather than a fair-price oracle', async () => {
    mockedHyperliquidSnapshot.mockResolvedValue({
      source: 'dex-market',
      venue: 'hyperliquid-perp',
      network: 'hyperliquid:mainnet',
      market: 'BTC-PERP',
      coin: 'BTC',
      sourceFreshnessSeconds: 2,
      observedAt: '2026-10-25T00:00:02.000Z',
      book: {
        timestamp: '2026-10-25T00:00:00.000Z',
        displayedLevelsPerSide: 20,
        bestBid: 100,
        bestAsk: 101,
        spreadBps: 100,
        bidDepthNotionalUsd: 100_000,
        askDepthNotionalUsd: 100_000,
      },
      perpetual: {
        markPrice: 100.5,
        midPrice: 100.5,
        oraclePrice: 100.25,
        markDeviationBpsFromOracle: 24.9,
        fundingRate: 0.00001,
        openInterest: 12_000,
        dayNotionalVolume: 2_500_000,
        sizeDecimals: 5,
        maxLeverage: 40,
      },
      estimates: [],
    });

    const result = JSON.parse(await getHyperliquidPerpMarketTool.handler({ market: 'BTC' }));

    expect(mockedHyperliquidProfile).toHaveBeenCalledWith('BTC');
    expect(mockedHyperliquidSnapshot).toHaveBeenCalledWith({ coin: 'BTC' });
    expect(result.market).toBe('BTC-PERP');
    expect(result.caveats).toContain(
      'Book-impact estimates consume at most the published L2 levels and exclude fees, funding, margin, matching priority, and future book changes.'
    );
  });
});
