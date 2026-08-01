import { discoverAPI3Feeds } from '../providerDiscoverers';

// Hermetic tracked-symbol set so the test does not depend on the project's
// evolving symbol lists.
jest.mock('@/lib/oracles/constants/supportedSymbols', () => ({
  getAllSupportedSymbols: () => ['BTC', 'ETH', 'SOL', 'EUR'],
}));

const ORIGINAL_FETCH = global.fetch;

function mockCatalogResponse(catalog: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => catalog,
  } as Response;
}

function mockFetchFailure(status = 502): Response {
  return {
    ok: false,
    status,
    json: async () => ({}),
  } as Response;
}

describe('discoverAPI3Feeds (catalog-based)', () => {
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
  });

  it('discovers active USD dAPIs across all 7 API3-supported chains', async () => {
    const catalog = [
      {
        name: 'BTC/USD',
        stage: 'active',
        metadata: { category: 'Cryptocurrency' },
        providers: ['coingecko'],
      },
      {
        name: 'ETH/USD',
        stage: 'active',
        metadata: { category: 'Cryptocurrency' },
        providers: ['coingecko'],
      },
      {
        name: 'SOL/USD',
        stage: 'active',
        metadata: { category: 'Cryptocurrency' },
        providers: ['coingecko'],
      },
      { name: 'EUR/USD', stage: 'active', metadata: { category: 'Forex' }, providers: ['ncfx'] },
    ];
    global.fetch = jest.fn().mockResolvedValue(mockCatalogResponse(catalog)) as never;

    const result = await discoverAPI3Feeds();

    expect(result.errors).toEqual([]);
    // 4 tracked active USD dAPIs × 7 chains = 28 candidate feeds
    expect(result.discovered).toBe(28);
    // The dAPI name is stored as `address` so the price fetcher can compute
    // the communal reader proxy address directly.
    expect(result.feeds).toContainEqual(
      expect.objectContaining({
        provider: 'api3',
        symbol: 'BTC',
        chain_id: 56, // BNB Chain
        address: 'BTC/USD',
        source: 'api3-catalog',
        is_active: true,
      })
    );
    // Forex dAPI mapped to the forex category via catalog metadata.
    expect(result.feeds).toContainEqual(
      expect.objectContaining({ symbol: 'EUR', chain_id: 1, category: 'forex' })
    );
  });

  it('excludes retired/deprecated dAPIs and non-USD pairs', async () => {
    const catalog = [
      { name: 'BTC/USD', stage: 'active', metadata: {}, providers: [] },
      { name: 'DEAD/USD', stage: 'retired', metadata: {}, providers: [] },
      { name: 'GONE/USD', stage: 'deprecated', metadata: {}, providers: [] },
      { name: 'BTC/ETH', stage: 'active', metadata: {}, providers: [] }, // not /USD
    ];
    global.fetch = jest.fn().mockResolvedValue(mockCatalogResponse(catalog)) as never;

    const result = await discoverAPI3Feeds();

    const symbols = new Set(result.feeds.map((f) => f.symbol));
    expect(symbols).toEqual(new Set(['BTC']));
    expect(result.discovered).toBe(7); // BTC × 7 chains
  });

  it('excludes dAPIs whose base symbol the project does not track', async () => {
    const catalog = [
      { name: 'BTC/USD', stage: 'active', metadata: {}, providers: [] },
      { name: 'ZZZUNKOWN/USD', stage: 'active', metadata: {}, providers: [] }, // not tracked
    ];
    global.fetch = jest.fn().mockResolvedValue(mockCatalogResponse(catalog)) as never;

    const result = await discoverAPI3Feeds();

    const symbols = new Set(result.feeds.map((f) => f.symbol));
    expect(symbols).toEqual(new Set(['BTC']));
  });

  it('falls back to the jsDelivr mirror when unpkg fails', async () => {
    const catalog = [{ name: 'BTC/USD', stage: 'active', metadata: {}, providers: [] }];
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('unpkg.com')) {
        return Promise.resolve(mockFetchFailure(500));
      }
      return Promise.resolve(mockCatalogResponse(catalog));
    }) as never;

    const result = await discoverAPI3Feeds();

    expect(result.errors).toEqual([]);
    expect(result.discovered).toBe(7);
  });

  it('records an error when all catalog mirrors fail', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockFetchFailure(502)) as never;

    const result = await discoverAPI3Feeds();

    expect(result.discovered).toBe(0);
    expect(result.errors).toHaveLength(1);
  });

  it('tolerates { data: [...] } catalog envelope', async () => {
    const catalog = {
      data: [{ name: 'BTC/USD', stage: 'active', metadata: {}, providers: [] }],
    };
    global.fetch = jest.fn().mockResolvedValue(mockCatalogResponse(catalog)) as never;

    const result = await discoverAPI3Feeds();

    expect(result.errors).toEqual([]);
    expect(result.discovered).toBe(7);
  });
});
