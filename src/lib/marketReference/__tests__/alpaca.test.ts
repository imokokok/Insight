import { fetchAlpacaStockQuotes } from '@/lib/marketReference/alpaca';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('fetchAlpacaStockQuotes', () => {
  it('requests the selected feed and normalizes quote provenance and midpoint', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({
        quotes: {
          AAPL: {
            bp: 224.1,
            ap: 224.3,
            bs: 10,
            as: 12,
            bx: 'V',
            ax: 'Q',
            t: '2026-10-13T00:00:00.000Z',
          },
        },
      })
    );

    const quotes = await fetchAlpacaStockQuotes({
      apiKeyId: 'test-key',
      apiSecretKey: 'test-secret',
      symbols: [' aapl '],
      now: () => Date.parse('2026-10-13T00:00:03.000Z'),
      fetchImpl,
    });

    expect(quotes).toEqual([
      {
        provider: 'alpaca',
        assetClass: 'us-equity',
        symbol: 'AAPL',
        feed: 'iex',
        bid: 224.1,
        ask: 224.3,
        midpoint: 224.2,
        bidSize: 10,
        askSize: 12,
        bidExchange: 'V',
        askExchange: 'Q',
        timestamp: '2026-10-13T00:00:00.000Z',
        ageSeconds: 3,
      },
    ]);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.toString()).toBe(
      'https://data.alpaca.markets/v2/stocks/quotes/latest?symbols=AAPL&feed=iex'
    );
    expect(new Headers(init.headers).get('APCA-API-KEY-ID')).toBe('test-key');
    expect(new Headers(init.headers).get('APCA-API-SECRET-KEY')).toBe('test-secret');
    expect(init.method).toBe('GET');
  });

  it('requires credentials before making a request', async () => {
    const fetchImpl = jest.fn();
    await expect(
      fetchAlpacaStockQuotes({
        apiKeyId: '',
        apiSecretKey: 'secret',
        symbols: ['AAPL'],
        fetchImpl,
      })
    ).rejects.toThrow('APCA_API_KEY_ID and APCA_API_SECRET_KEY');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails closed on missing, invalid, or crossed quote data', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({
        quotes: {
          AAPL: {
            bp: 225,
            ap: 224,
            bs: 1,
            as: 1,
            t: '2026-10-13T00:00:00.000Z',
          },
        },
      })
    );
    await expect(
      fetchAlpacaStockQuotes({
        apiKeyId: 'key',
        apiSecretKey: 'secret',
        symbols: ['AAPL'],
        fetchImpl,
      })
    ).rejects.toThrow('crossed quote');
  });

  it('does not return partial results if the API omitted a requested symbol', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ quotes: {} }));
    await expect(
      fetchAlpacaStockQuotes({
        apiKeyId: 'key',
        apiSecretKey: 'secret',
        symbols: ['AAPL'],
        fetchImpl,
      })
    ).rejects.toThrow('omitted a valid quote for AAPL');
  });

  it('surfaces authorization and rate-limit status without exposing credentials', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ message: 'bad key' }, 401));
    await expect(
      fetchAlpacaStockQuotes({
        apiKeyId: 'private-key',
        apiSecretKey: 'private-secret',
        symbols: ['AAPL'],
        fetchImpl,
      })
    ).rejects.toThrow('Alpaca Market Data HTTP 401; check credentials and feed access');
  });
});
