import { getSupraDataService } from '@/lib/oracles/services/supraDataService';
import { resolveFeed } from '@/lib/oracles/utils/dynamicFeedResolver';

jest.mock('@/lib/oracles/utils/dynamicFeedResolver', () => ({
  resolveFeed: jest.fn(),
}));
jest.mock('supra-oracle-sdk', () => ({
  __esModule: true,
  default: class MockSupraOracleClient {},
}));

const mockResolveFeed = resolveFeed as jest.Mock;

describe('Supra historical DORA integration', () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.SUPRA_DORA_HISTORY_API_KEY;

  beforeEach(() => {
    process.env.SUPRA_DORA_HISTORY_API_KEY = 'test-history-key';
    mockResolveFeed.mockResolvedValue({
      source: 'supra-directory',
      symbol: 'ETH',
      name: 'ETH_USDT',
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.SUPRA_DORA_HISTORY_API_KEY;
    else process.env.SUPRA_DORA_HISTORY_API_KEY = originalApiKey;
    jest.clearAllMocks();
  });

  it('uses the reviewed pair name and parses the documented data envelope', async () => {
    const now = Date.now();
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'success',
        data: [
          {
            timestamp: now - 60_000,
            open: 2000,
            high: 2010,
            low: 1990,
            close: 2005,
            volume: 12,
          },
        ],
      }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await getSupraDataService().fetchHistoricalPrices(
      'eth_usdt',
      now - 60_000,
      now,
      60
    );

    expect(result).toEqual([
      { timestamp: now - 60_000, open: 2000, high: 2010, low: 1990, close: 2005, volume: 12 },
    ]);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('trading_pair=eth_usdt');
    expect(options.headers).toEqual({ 'x-api-key': 'test-history-key' });
  });

  it('does not guess a historical pair from a fallback symbol mapping', async () => {
    mockResolveFeed.mockResolvedValue({
      source: 'hardcoded',
      symbol: 'ETH',
      name: 'ETH/USD',
    });
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as typeof fetch;
    const now = Date.now();

    const result = await getSupraDataService().fetchHistoricalPrices(
      'eth_usdt',
      now - 60_000,
      now,
      60
    );

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
