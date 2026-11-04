import { getToolCreditCost } from '@/lib/billing/metering';
import { getMonadUniswapV3MarketSnapshot } from '@/lib/dex/monadUniswapV3';
import { getMonadUniswapV3VolumeSummary } from '@/lib/dex/monadUniswapV3Volume';

import { getMonadDexMarketTool } from '../dexMarketTools';
import { getToolDefinitions } from '../index';

jest.mock('@/lib/dex/monadUniswapV3', () => ({
  getMonadUniswapV3MarketSnapshot: jest.fn(),
}));
jest.mock('@/lib/dex/monadUniswapV3Volume', () => ({
  getMonadUniswapV3VolumeSummary: jest.fn(),
}));

const mockedSnapshot = getMonadUniswapV3MarketSnapshot as jest.MockedFunction<
  typeof getMonadUniswapV3MarketSnapshot
>;
const mockedVolume = getMonadUniswapV3VolumeSummary as jest.MockedFunction<
  typeof getMonadUniswapV3VolumeSummary
>;

describe('get_monad_dex_market MCP tool', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is discoverable, takes no untrusted market selector, and has C1 pricing', () => {
    expect(getMonadDexMarketTool.parameters.safeParse({}).success).toBe(true);
    expect(getToolDefinitions().map((tool) => tool.name)).toContain('get_monad_dex_market');
    expect(getToolCreditCost('get_monad_dex_market')).toBe(0.5);
  });

  it('returns block-pinned market evidence with explicit non-oracle caveats', async () => {
    mockedSnapshot.mockResolvedValue({
      source: 'dex-market',
      venue: 'uniswap-v3',
      chainId: 143,
      market: 'MON/USDC',
      sourceFreshnessSeconds: 4,
      observedAt: '2026-10-24T00:00:04.000Z',
      block: {
        number: '1',
        hash: `0x${'a'.repeat(64)}`,
        timestamp: '2026-10-24T00:00:00.000Z',
      },
      contracts: {
        factory: '0x204faca1764b154221e35c0d20abb3c525710498',
        quoterV2: '0x661e93cca42afacb172121ef892830ca3b70f08d',
        pool: '0x659bD0BC4167BA25c62E05656F78043E7eD4a9da',
        token0: '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A',
        token1: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
        feeTier: 3000,
      },
      spot: { tick: 1, usdcPerWmon: 0.02 },
      twap: { windowSeconds: 900, tick: 1, usdcPerWmon: 0.02, deviationBpsFromSpot: 0 },
      activeLiquidityRaw: '1',
      poolBalances: { wmonRaw: '1', wmon: 1, usdcRaw: '1', usdc: 0.000001 },
      quotes: [],
    });
    mockedVolume.mockResolvedValue({
      status: 'warming',
      asOf: '2026-10-24T00:00:00.000Z',
      indexLagSeconds: 4,
      coverageStartedAt: '2026-10-24T00:00:00.000Z',
      windows: {
        fiveMinutes: { windowSeconds: 300, swapCount: null, grossUsdcVolume: null },
        twentyFourHours: { windowSeconds: 86400, swapCount: null, grossUsdcVolume: null },
      },
    });

    const result = JSON.parse(await getMonadDexMarketTool.handler({}));

    expect(result.market).toBe('MON/USDC');
    expect(result.volume.status).toBe('warming');
    expect(result.caveats).toContain(
      'DEX market evidence is not an oracle-consensus vote or a venue-independent fair price.'
    );
    expect(mockedVolume).toHaveBeenCalledWith('2026-10-24T00:00:00.000Z');
  });
});
