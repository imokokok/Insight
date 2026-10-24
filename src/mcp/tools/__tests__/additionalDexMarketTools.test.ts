import { getToolCreditCost } from '@/lib/billing/metering';
import { getBaseUniswapV3MarketSnapshot } from '@/lib/dex/baseUniswapV3';
import { getSolanaJupiterRouteSnapshot } from '@/lib/dex/solanaJupiterRoute';

import { getBaseDexMarketTool, getSolanaDexRouteTool } from '../dexMarketTools';
import { getToolDefinitions } from '../index';

jest.mock('@/lib/dex/baseUniswapV3', () => ({
  getBaseUniswapV3MarketSnapshot: jest.fn(),
}));
jest.mock('@/lib/dex/solanaJupiterRoute', () => ({
  getSolanaJupiterRouteSnapshot: jest.fn(),
}));

const mockedBaseSnapshot = getBaseUniswapV3MarketSnapshot as jest.MockedFunction<
  typeof getBaseUniswapV3MarketSnapshot
>;
const mockedSolanaSnapshot = getSolanaJupiterRouteSnapshot as jest.MockedFunction<
  typeof getSolanaJupiterRouteSnapshot
>;

describe('additional DEX market MCP tools', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers the reviewed Base and Solana evidence tools at C1', () => {
    const names = getToolDefinitions().map((tool) => tool.name);
    expect(names).toEqual(expect.arrayContaining(['get_base_dex_market', 'get_solana_dex_route']));
    expect(getBaseDexMarketTool.parameters.safeParse({}).success).toBe(true);
    expect(getSolanaDexRouteTool.parameters.safeParse({}).success).toBe(true);
    expect(getToolCreditCost('get_base_dex_market')).toBe(0.5);
    expect(getToolCreditCost('get_solana_dex_route')).toBe(0.5);
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
});
