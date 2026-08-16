import { discoverRedStoneFeeds } from '../providerDiscoverers';

global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

jest.mock('@/lib/utils/logger', () => ({
  normalizeError: (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

const createMockResponse = (data: unknown, ok = true, status = 200, statusText = 'OK'): Response =>
  ({
    ok,
    status,
    statusText,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: jest.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: jest.fn(),
    blob: jest.fn(),
    formData: jest.fn(),
  }) as unknown as Response;

describe('discoverRedStoneFeeds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it('ingests feeds when the API returns an object (symbol -> feed), the real RedStone shape', async () => {
    // RedStone's full-feed (no `symbols=`) prices endpoint returns an OBJECT,
    // not an array. This used to be silently dropped (discovery was a no-op).
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        BTC: { symbol: 'BTC', value: 63000 },
        ETH: { symbol: 'ETH', value: 3500 },
        SOL: { symbol: 'SOL', value: 150 },
      })
    );

    const result = await discoverRedStoneFeeds();

    expect(result.discovered).toBe(3);
    expect(result.errors).toHaveLength(0);
    expect(result.feeds.map((f) => f.symbol).sort()).toEqual(['BTC', 'ETH', 'SOL']);
    expect(result.feeds.every((f) => f.chain_id === 0)).toBe(true);
    expect(result.feeds.every((f) => f.source === 'redstone-api')).toBe(true);
  });

  it('still works when the API returns an array (defensive/legacy shape)', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse([
        { symbol: 'ARB', value: 1 },
        { symbol: 'OP', value: 2 },
      ])
    );

    const result = await discoverRedStoneFeeds();

    expect(result.discovered).toBe(2);
    expect(result.feeds.map((f) => f.symbol).sort()).toEqual(['ARB', 'OP']);
  });

  it('returns zero feeds (not a crash) when the API returns an empty object', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({}));

    const result = await discoverRedStoneFeeds();

    expect(result.discovered).toBe(0);
    expect(result.feeds).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('records an error when the API responds non-OK', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 500, 'Internal Server Error'));

    const result = await discoverRedStoneFeeds();

    expect(result.discovered).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
