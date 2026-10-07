import { getAllActiveFeedsByProviderWithStatus } from '@/lib/oracles/utils/dynamicFeedResolver';
import type { OracleFeed } from '@/lib/supabase/queries';

import { getSymbolsTool, recommendOracleSetupTool } from '../utilityTools';

jest.mock('@/lib/oracles/utils/dynamicFeedResolver', () => ({
  getAllActiveFeedsByProviderWithStatus: jest.fn(),
}));

const mockLoader = getAllActiveFeedsByProviderWithStatus as jest.MockedFunction<
  typeof getAllActiveFeedsByProviderWithStatus
>;

function feed(provider: string, symbol: string): OracleFeed {
  return { provider, symbol } as unknown as OracleFeed;
}

describe('utilityTools paid-path data failures', () => {
  beforeEach(() => {
    mockLoader.mockReset();
  });

  it('get_symbols lists symbols from the feed registry', async () => {
    mockLoader.mockResolvedValue({
      feeds: new Map([
        ['chainlink', [feed('chainlink', 'eth'), feed('chainlink', 'btc')]],
        ['api3', [feed('api3', 'eth')]],
      ]),
      errored: false,
    });

    const result = await getSymbolsTool.handler({});
    expect(result).toContain('(2 total)');
    expect(result).toContain('BTC, ETH');
  });

  it('get_symbols throws when the feed registry is unavailable (never a fake empty success)', async () => {
    mockLoader.mockResolvedValue({ feeds: new Map(), errored: true });

    await expect(getSymbolsTool.handler({})).rejects.toThrow(/temporarily unavailable/i);
  });

  it('get_symbols reports an honest empty result for a query with no matches', async () => {
    mockLoader.mockResolvedValue({
      feeds: new Map([['chainlink', [feed('chainlink', 'eth')]]]),
      errored: false,
    });

    const result = await getSymbolsTool.handler({ query: 'zzz' });
    expect(result).toBe('No supported symbols match "zzz".');
  });

  it('recommend_oracle_setup throws when the feed registry is unavailable', async () => {
    mockLoader.mockResolvedValue({ feeds: new Map(), errored: true });

    await expect(recommendOracleSetupTool.handler({ symbol: 'eth' })).rejects.toThrow(
      /temporarily unavailable/i
    );
  });
});
