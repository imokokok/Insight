import { discoverBandFeeds } from '../providerDiscoverers';

const NOW_SECONDS = 1_789_928_600;
const ORIGINAL_FETCH = global.fetch;

const jsonResponse = (body: unknown, ok = true, status = 200): Response =>
  ({ ok, status, json: async () => body }) as Response;

describe('discoverBandFeeds', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW_SECONDS * 1000);
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    jest.restoreAllMocks();
  });

  it('admits available Band v3 USD prices and preserves their source timestamps', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('current_feeds')) {
        return Promise.resolve(
          jsonResponse({
            current_feeds: {
              feeds: [
                { signal_id: 'CS:BTC-USD', interval: '60', deviation_basis_point: '50' },
                { signal_id: 'FS:EUR-USD', interval: '60', deviation_basis_point: '50' },
                { signal_id: 'CS:OLD-USD', interval: '120', deviation_basis_point: '100' },
                { signal_id: 'CS:WAIT-USD', interval: '120', deviation_basis_point: '100' },
              ],
            },
          })
        );
      }
      return Promise.resolve(
        jsonResponse({
          prices: [
            {
              status: 'PRICE_STATUS_AVAILABLE',
              signal_id: 'CS:BTC-USD',
              price: '81181558344838',
              timestamp: String(NOW_SECONDS - 5),
            },
            {
              status: 'PRICE_STATUS_AVAILABLE',
              signal_id: 'FS:EUR-USD',
              price: '1170000000',
              timestamp: String(NOW_SECONDS - 3_600),
            },
            {
              status: 'PRICE_STATUS_AVAILABLE',
              signal_id: 'CS:OLD-USD',
              price: '1000000000',
              timestamp: String(NOW_SECONDS - 7_200),
            },
            {
              status: 'PRICE_STATUS_NOT_READY',
              signal_id: 'CS:WAIT-USD',
              price: '1000000000',
              timestamp: String(NOW_SECONDS),
            },
          ],
        })
      );
    }) as never;

    const result = await discoverBandFeeds();

    expect(result.errors).toEqual([]);
    expect(result.discovered).toBe(3);
    expect(result.feeds.map((feed) => feed.symbol)).toEqual(['BTC/USD', 'EUR/USD', 'OLD/USD']);
    expect(result.feeds[0]).toMatchObject({
      provider: 'band',
      chain_id: 0,
      address: 'CS:BTC-USD',
      decimals: 9,
      source: 'bandchain-v3-current-feeds',
      metadata: {
        preverified: true,
        discoveredTimestamp: NOW_SECONDS - 5,
        intervalSeconds: 60,
      },
    });
  });

  it('fails discovery closed when either official endpoint is unavailable', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, false, 503))
      .mockResolvedValueOnce(jsonResponse({ prices: [] })) as never;

    const result = await discoverBandFeeds();

    expect(result.discovered).toBe(0);
    expect(result.feeds).toEqual([]);
    expect(result.errors[0]).toContain('feeds=503');
  });
});
