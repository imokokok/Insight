import {
  assessPolymarketMarket,
  discoverPolymarketMarkets,
  normalizePolymarketMarket,
} from '../market';

const NOW = Date.parse('2026-11-24T12:00:00.000Z');
const BOOK_HASH = 'ab'.repeat(32);
const mockResponse = (body: unknown) =>
  ({
    ok: true,
    status: 200,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  }) as Response;

describe('Polymarket V1/V2 market normalization', () => {
  it('normalizes V1 token arrays and JSON-encoded outcome fields', () => {
    const market = normalizePolymarketMarket({
      id: '101',
      version: 'v1',
      conditionId: `0x${'11'.repeat(32)}`,
      slug: 'will-x-happen',
      question: 'Will X happen?',
      outcomes: '["Yes","No"]',
      clobTokenIds: '["12345","67890"]',
      outcomePrices: '["0.4","0.6"]',
    });

    expect(market?.protocolVersion).toBe('v1');
    expect(market?.outcomes).toEqual([
      { name: 'Yes', assetId: '12345', probability: 0.4 },
      { name: 'No', assetId: '67890', probability: 0.6 },
    ]);
  });

  it('normalizes V2 structured outcomes and position IDs', () => {
    const market = normalizePolymarketMarket({
      id: '202',
      version: 'v2',
      conditionId: `0x${'22'.repeat(32)}`,
      question: 'Will Team A win?',
      outcomes: {
        yes: { tokenId: null, positionId: '55555' },
        no: { tokenId: null, positionId: '66666' },
      },
      positionIds: ['55555', '66666'],
    });

    expect(market?.protocolVersion).toBe('v2');
    expect(market?.outcomes.map(({ name, assetId }) => [name, assetId])).toEqual([
      ['yes', '55555'],
      ['no', '66666'],
    ]);
  });
});

describe('Polymarket discovery and read-only assessment', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(globalThis, 'fetch');
  });

  function replaceFetch(implementation: typeof fetch) {
    const fetchMock = jest.fn(implementation);
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
    });
    return fetchMock;
  }

  it('searches Gamma events and retrieves full market outcome IDs', async () => {
    const fetchMock = replaceFetch(async (input) => {
      const url = String(input);
      if (url.startsWith('https://gamma-api.polymarket.com/public-search?')) {
        return mockResponse({ events: [{ id: '900' }] });
      }
      if (url.startsWith('https://gamma-api.polymarket.com/events/900?')) {
        return mockResponse({ markets: [{ id: '101', question: 'Will X happen?' }] });
      }
      if (url.startsWith('https://gamma-api.polymarket.com/markets?')) {
        return mockResponse([
          {
            id: '101',
            version: 'v1',
            question: 'Will X happen?',
            slug: 'will-x-happen',
            outcomes: '["Yes","No"]',
            clobTokenIds: '["12345","67890"]',
          },
        ]);
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await discoverPolymarketMarkets({ query: 'X happen', limit: 5 });

    expect(result.markets).toHaveLength(1);
    expect(result.markets[0]?.outcomes[0]?.assetId).toBe('12345');
    expect(result.source).toContain('/public-search');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('preserves keyset cursor boundaries instead of skipping undisplayed markets', async () => {
    const fetchMock = replaceFetch(async (input) => {
      const url = String(input);
      if (url.startsWith('https://gamma-api.polymarket.com/markets/keyset?')) {
        expect(new URL(url).searchParams.get('limit')).toBe('1');
        return mockResponse({ markets: [{ id: '101' }], next_cursor: 'next-page' });
      }
      if (url.startsWith('https://gamma-api.polymarket.com/markets?')) {
        return mockResponse([
          {
            id: '101',
            question: 'Will X happen?',
            outcomes: '["Yes","No"]',
            clobTokenIds: '["12345","67890"]',
            active: true,
            closed: false,
          },
        ]);
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await discoverPolymarketMarkets({ tagId: '123', limit: 1 });

    expect(result.markets).toHaveLength(1);
    expect(result.nextCursor).toBe('next-page');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('assesses V2 books, normalizes an unprefixed CLOB hash, and signs no trade authority', async () => {
    const fetchMock = replaceFetch(async (input) => {
      const url = String(input);
      if (url.startsWith('https://gamma-api.polymarket.com/markets?')) {
        return mockResponse([
          {
            id: '202',
            version: 'v2',
            conditionId: `0x${'22'.repeat(32)}`,
            slug: 'team-a-win',
            question: 'Will Team A win the final?',
            description: 'Resolves yes if Team A wins the final match.',
            resolutionSource: 'https://example.test/official-results',
            endDate: new Date(NOW + 3_600_000).toISOString(),
            active: true,
            closed: false,
            outcomes: {
              yes: { tokenId: null, positionId: '55555' },
              no: { tokenId: null, positionId: '66666' },
            },
            positionIds: ['55555', '66666'],
            outcomePrices: '["0.52","0.48"]',
            liquidityNum: 250,
            volumeNum: 1200,
          },
        ]);
      }
      if (url === 'https://clob.polymarket.com/book?token_id=55555') {
        return mockResponse({
          timestamp: String(NOW),
          hash: BOOK_HASH,
          bids: [{ price: '0.50', size: '20' }],
          asks: [{ price: '0.53', size: '30' }],
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    jest.spyOn(Date, 'now').mockReturnValue(NOW);

    const result = await assessPolymarketMarket({ marketId: '202', outcome: 'yes' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://clob.polymarket.com/book?token_id=55555',
      expect.any(Object)
    );
    expect(result.market.protocolVersion).toBe('v2');
    expect(result.quotes?.bestAsk).toBe(0.53);
    expect(result.quotes?.hash).toBe(`0x${BOOK_HASH}`);
    expect(result.scope).toEqual({
      transactionAuthority: 'none',
      forecast: 'not_provided',
      execution: 'not_performed',
      suitability: 'not_assessed',
    });
  });
});
