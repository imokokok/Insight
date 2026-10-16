import { MARKET_REFERENCE_SOURCE_RIGHTS } from '@/lib/dataRights/evidenceRights';
import {
  collectMarketReference,
  MARKET_REFERENCE_CORE_SYMBOLS,
  MAX_SOURCE_TICKER_AGE_MS,
} from '@/lib/marketReference/collector';

type Json = unknown;

function jsonResponse(body: Json, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as Response;
}

const MOCK_NOW = 1_752_000_000_000;

function cryptoComTickerResponse(timestampMs = Date.now(), instrument = 'WBTC_USD') {
  return {
    code: 0,
    result: {
      data: [
        {
          i: instrument,
          a: '84000.50',
          b: '83999.00',
          k: '84002.00',
          v: '17.25',
          t: String(timestampMs),
        },
      ],
    },
  };
}

describe('collectMarketReference', () => {
  it('does not contact a CEX for a customer-facing collection without reviewed vendor rights', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ price: '1' }));

    const { rows, summary } = await collectMarketReference(new Date(MOCK_NOW), {
      purpose: 'customer-facing',
      fetchImpl,
      now: () => MOCK_NOW,
      symbols: ['ETH'],
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(rows).toEqual([]);
    expect(summary).toMatchObject({
      collectionPurpose: 'customer-facing',
      eligibleExchanges: [],
      covered: [],
      uncovered: ['ETH'],
    });
  });

  it('persists an agreement reference only for a customer-admitted source', async () => {
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes('api.exchange.coinbase.com')) {
        return jsonResponse({ price: '3000', bid: '2999', ask: '3001' });
      }
      throw new Error(`unexpected URL ${String(url)}`);
    });

    const { rows, summary } = await collectMarketReference(new Date(MOCK_NOW), {
      purpose: 'customer-facing',
      fetchImpl,
      now: () => MOCK_NOW,
      symbols: ['ETH'],
      sourceRights: {
        ...MARKET_REFERENCE_SOURCE_RIGHTS,
        coinbase: {
          sourceId: 'coinbase',
          rightsScope: 'vendor-licensed',
          agreementReference: 'test-agreement-2026-10',
        },
      },
    });

    expect(summary.eligibleExchanges).toEqual(['coinbase']);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      exchange: 'coinbase',
      rights_scope: 'vendor-licensed',
      rights_reference: 'test-agreement-2026-10',
    });
  });

  it('writes one row per (symbol, exchange), marking successes and failures', async () => {
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('api.exchange.coinbase.com')) {
        return jsonResponse({ price: '3000.5', bid: '3000', ask: '3001', volume: '42' });
      }
      if (u.includes('api.kraken.com')) {
        return jsonResponse({
          error: [],
          result: { NORMALIZED: { c: ['3001.0'], b: ['3000'], a: ['3002'], v: ['1', '2'] } },
        });
      }
      if (u.includes('api.gemini.com')) {
        return jsonResponse({ last: '3002.25', bid: '3001', ask: '3003' });
      }
      if (u.includes('api.crypto.com')) {
        return jsonResponse(cryptoComTickerResponse(MOCK_NOW));
      }
      throw new Error('unexpected url ' + u);
    });

    const { rows, summary } = await collectMarketReference(new Date('2026-08-30T16:00:00Z'), {
      purpose: 'synthetic-test',
      fetchImpl,
      now: () => MOCK_NOW,
    });

    const eth = rows.filter((r) => r.symbol === 'ETH');
    expect(eth).toHaveLength(3);
    expect(eth.every((r) => r.is_success)).toBe(true);
    expect(eth.map((r) => r.exchange).sort()).toEqual(['coinbase', 'gemini', 'kraken']);
    expect(eth[0].quote).toBe('USD');
    expect(eth[0].rights_scope).toBe('synthetic');
    expect(eth[0].collector_version).toBeTruthy();
    expect(eth[0].data_age_seconds).toBeGreaterThanOrEqual(0);
    expect(eth.find((r) => r.exchange === 'coinbase')?.volume).toBe(42);
    expect(eth.find((r) => r.exchange === 'coinbase')?.bid_ask_spread_pct).toBeGreaterThan(0);

    expect(summary.covered).toContain('ETH');
    expect(summary.covered).toContain('BTC');
    expect(summary.covered).toContain('USDC');
    expect(summary.covered).toContain('USDT');
    expect(summary.covered).toContain('WBTC');
    const wbtc = rows.filter((r) => r.symbol === 'WBTC' && r.is_success);
    expect(wbtc.map((r) => r.exchange).sort()).toEqual(['crypto.com', 'kraken']);
    expect(wbtc.find((r) => r.exchange === 'crypto.com')).toMatchObject({
      quote: 'USD',
      ref_price: 84000.5,
      bid: 83999,
      ask: 84002,
      volume: 17.25,
    });
    expect(summary.uncovered).toHaveLength(0);
    // Cross-exchange spread over ETH: (3002.25-3000.5)/3002.25 ≈ 0.058%
    expect(summary.maxCrossExchangeSpreadPct).not.toBeNull();
  });

  it('records per-exchange failures and fail-closes a fully-down symbol', async () => {
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('api.exchange.coinbase.com')) {
        return jsonResponse({ price: '1.0' });
      }
      if (u.includes('api.kraken.com')) {
        if (u.includes('XXBTZUSD')) throw new Error('kraken down for BTC');
        return jsonResponse({ error: [], result: { NORMALIZED: { c: ['1.0'] } } });
      }
      if (u.includes('api.gemini.com')) {
        return jsonResponse({ last: '1.0' });
      }
      if (u.includes('api.crypto.com')) {
        return jsonResponse(cryptoComTickerResponse());
      }
      throw new Error('boom');
    });

    const { rows, summary } = await collectMarketReference(new Date('2026-08-30T16:00:00Z'), {
      purpose: 'synthetic-test',
      fetchImpl,
    });

    const btcRows = rows.filter((r) => r.symbol === 'BTC');
    expect(btcRows).toHaveLength(3);
    expect(btcRows.filter((r) => r.is_success)).toHaveLength(2); // coinbase + gemini ok
    expect(btcRows.find((r) => r.exchange === 'kraken')?.is_success).toBe(false);
    expect(btcRows.find((r) => r.exchange === 'kraken')?.error_message).toContain('kraken down');
    expect(btcRows.find((r) => r.exchange === 'kraken')?.ref_price).toBeNull();

    expect(summary.covered).toContain('BTC');
    expect(summary.uncovered).toHaveLength(0);
  });

  it('fails closed when every exchange is down (no estimate, explicit errors)', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error('network unreachable');
    });

    const { rows, summary } = await collectMarketReference(new Date('2026-08-30T16:00:00Z'), {
      purpose: 'synthetic-test',
      fetchImpl,
    });

    // Coinbase + Kraken are attempted across 13 symbols; Gemini is queried only
    // for its 7 mapped pairs and Crypto.com only for WBTC.
    expect(rows).toHaveLength(13 * 2 + 7 + 1);
    expect(rows.every((r) => r.is_success === false)).toBe(true);
    expect(rows.every((r) => r.ref_price === null)).toBe(true);
    expect(rows.every((r) => r.error_message)).toBe(true);
    expect(summary.covered).toHaveLength(0);
    expect(summary.uncovered).toEqual([
      'ETH',
      'BTC',
      'WBTC',
      'USDC',
      'USDT',
      'SOL',
      'ADA',
      'XRP',
      'ICP',
      'HYPE',
      'TAO',
      'VVV',
      'STG',
    ]);
    expect(summary.maxCrossExchangeSpreadPct).toBeNull();
  });

  it('supports a bounded core-only pass for the free-tier cadence router', async () => {
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('coinbase')) return jsonResponse({ price: '1.0' });
      if (u.includes('kraken')) {
        return jsonResponse({ error: [], result: { NORMALIZED: { c: ['1.0'] } } });
      }
      if (u.includes('api.crypto.com')) return jsonResponse(cryptoComTickerResponse(Date.now()));
      return jsonResponse({ last: '1.0' });
    });
    const { rows, summary } = await collectMarketReference(new Date('2026-08-30T16:15:00Z'), {
      purpose: 'synthetic-test',
      fetchImpl,
      symbols: MARKET_REFERENCE_CORE_SYMBOLS,
    });
    expect(rows).toHaveLength(15);
    expect(summary.symbols).toEqual(MARKET_REFERENCE_CORE_SYMBOLS);
  });

  it('treats a zero/negative exchange price as a failed quote', async () => {
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('api.exchange.coinbase.com')) return jsonResponse({ price: '0' });
      if (u.includes('api.kraken.com')) {
        return jsonResponse({
          error: [],
          result: {
            XETHZUSD: { c: ['-1'] },
            XXBTZUSD: { c: ['5'] },
            USDCUSD: { c: ['5'] },
            USDTZUSD: { c: ['5'] },
          },
        });
      }
      if (u.includes('api.crypto.com')) return jsonResponse(cryptoComTickerResponse());
      return jsonResponse({ last: '5' });
    });

    const { rows } = await collectMarketReference(new Date('2026-08-30T16:00:00Z'), {
      purpose: 'synthetic-test',
      fetchImpl,
    });
    const ethCoinbase = rows.find((r) => r.symbol === 'ETH' && r.exchange === 'coinbase')!;
    expect(ethCoinbase.is_success).toBe(false);
    expect(ethCoinbase.error_message).toBe('unusable price from exchange');
  });

  it('surfaces Kraken HTTP-200 error bodies (e.g. rate limit) instead of a generic miss', async () => {
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('api.exchange.coinbase.com')) return jsonResponse({ price: '1.0' });
      if (u.includes('api.kraken.com')) {
        return jsonResponse({ error: ['EGeneral:Too many requests'], result: {} });
      }
      if (u.includes('api.crypto.com')) return jsonResponse(cryptoComTickerResponse());
      return jsonResponse({ last: '1.0' });
    });

    const { rows } = await collectMarketReference(new Date('2026-08-30T16:00:00Z'), {
      purpose: 'synthetic-test',
      fetchImpl,
    });
    const ethKraken = rows.find((r) => r.symbol === 'ETH' && r.exchange === 'kraken')!;
    expect(ethKraken.is_success).toBe(false);
    expect(ethKraken.error_message).toContain('EGeneral:Too many requests');
  });

  it('collects WBTC from Kraken and Crypto.com as direct USD spot markets', async () => {
    const urls: string[] = [];
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      const value = String(url);
      urls.push(value);
      if (value.includes('api.exchange.coinbase.com')) return jsonResponse({ price: '84001' });
      if (value.includes('api.kraken.com')) {
        return jsonResponse({
          error: [],
          result: { WBTCUSD: { c: ['84000'], a: ['84001'], b: ['83999'] } },
        });
      }
      if (value.includes('api.crypto.com')) return jsonResponse(cryptoComTickerResponse(MOCK_NOW));
      throw new Error(`unexpected URL ${value}`);
    });

    const { rows } = await collectMarketReference(new Date(MOCK_NOW), {
      purpose: 'synthetic-test',
      fetchImpl,
      now: () => MOCK_NOW,
      symbols: ['WBTC'],
    });

    expect(urls).toContain(
      'https://api.crypto.com/exchange/v1/public/get-tickers?instrument_name=WBTC_USD'
    );
    expect(urls).toContain('https://api.kraken.com/0/public/Ticker?pair=WBTCUSD');
    expect(
      rows
        .filter((row) => row.is_success)
        .map((row) => row.exchange)
        .sort()
    ).toEqual(['crypto.com', 'kraken']);
    expect(rows.find((row) => row.exchange === 'coinbase')?.is_success).toBe(false);
    expect(rows.some((row) => row.exchange === 'binance')).toBe(false);
  });
});

describe('optional market reference adapters', () => {
  it('collects a fresh Binance WBTC/USD composite only when explicitly admitted in a synthetic test', async () => {
    const urls: string[] = [];
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      const value = String(url);
      urls.push(value);
      if (value.includes('/exchangeInfo?')) {
        return jsonResponse({
          symbols: [
            {
              symbol: 'WBTCUSDT',
              status: 'TRADING',
              baseAsset: 'WBTC',
              quoteAsset: 'USDT',
              isSpotTradingAllowed: true,
            },
            {
              symbol: 'USDTUSD',
              status: 'TRADING',
              baseAsset: 'USDT',
              quoteAsset: 'USD',
              isSpotTradingAllowed: true,
            },
          ],
        });
      }
      if (value.includes('/trades?symbol=WBTCUSDT')) {
        return jsonResponse([{ price: '84002.25', time: MOCK_NOW - 1000 }]);
      }
      if (value.includes('/trades?symbol=USDTUSD')) {
        return jsonResponse([{ price: '0.99877', time: MOCK_NOW - 2000 }]);
      }
      if (value.includes('/ticker/bookTicker?symbol=WBTCUSDT')) {
        return jsonResponse({ symbol: 'WBTCUSDT', bidPrice: '84001', askPrice: '84003' });
      }
      if (value.includes('/ticker/bookTicker?symbol=USDTUSD')) {
        return jsonResponse({ symbol: 'USDTUSD', bidPrice: '0.99876', askPrice: '0.99878' });
      }
      if (value.includes('/ticker/24hr?symbol=WBTCUSDT')) {
        return jsonResponse({ symbol: 'WBTCUSDT', volume: '12.75' });
      }
      if (value.includes('api.exchange.coinbase.com')) return jsonResponse({ price: '84000' });
      if (value.includes('api.kraken.com')) {
        return jsonResponse({ error: [], result: { WBTCUSD: { c: ['84000'] } } });
      }
      if (value.includes('api.crypto.com')) return jsonResponse(cryptoComTickerResponse(MOCK_NOW));
      throw new Error(`unexpected URL ${value}`);
    });

    const { rows } = await collectMarketReference(new Date(MOCK_NOW), {
      purpose: 'synthetic-test',
      fetchImpl,
      now: () => MOCK_NOW,
      symbols: ['WBTC', 'BTC'],
    });

    expect(rows.some((row) => row.exchange === 'binance')).toBe(false);
    expect(urls.some((url) => url.includes('data-api.binance.vision'))).toBe(false);

    urls.length = 0;
    const licensed = await collectMarketReference(new Date(MOCK_NOW), {
      purpose: 'synthetic-test',
      fetchImpl,
      now: () => MOCK_NOW,
      symbols: ['WBTC', 'BTC'],
      enabledExchanges: ['binance'],
    });
    const binance = licensed.rows.find((row) => row.exchange === 'binance');
    expect(binance).toMatchObject({
      symbol: 'WBTC',
      is_success: true,
      ref_price: (84001 * 0.99876 + 84003 * 0.99878) / 2,
      bid: 84001 * 0.99876,
      ask: 84003 * 0.99878,
      volume: 12.75,
      source_observed_at: new Date(MOCK_NOW - 2000).toISOString(),
    });
    expect(urls.some((url) => url.includes('/trades?symbol=WBTCUSDT'))).toBe(true);
    expect(urls.some((url) => url.includes('/trades?symbol=USDTUSD'))).toBe(true);
    expect(urls.some((url) => url.includes('/ticker/bookTicker?symbol=WBTCUSDT'))).toBe(true);
    expect(urls.some((url) => url.includes('/ticker/bookTicker?symbol=USDTUSD'))).toBe(true);
    expect(licensed.rows.some((row) => row.exchange === 'binance' && row.symbol === 'BTC')).toBe(
      false
    );
  });

  it('rejects stale trades and non-trading Binance cross-market legs', async () => {
    const makeFetcher = (overrides: { staleFx?: boolean; fxTrading?: boolean }) =>
      jest.fn(async (url: RequestInfo | URL) => {
        const value = String(url);
        if (value.includes('/exchangeInfo?')) {
          return jsonResponse({
            symbols: [
              {
                symbol: 'WBTCUSDT',
                status: 'TRADING',
                baseAsset: 'WBTC',
                quoteAsset: 'USDT',
                isSpotTradingAllowed: true,
              },
              {
                symbol: 'USDTUSD',
                status: overrides.fxTrading === false ? 'BREAK' : 'TRADING',
                baseAsset: 'USDT',
                quoteAsset: 'USD',
                isSpotTradingAllowed: true,
              },
            ],
          });
        }
        if (value.includes('/trades?symbol=WBTCUSDT')) {
          return jsonResponse([{ price: '84002', time: MOCK_NOW - 1000 }]);
        }
        if (value.includes('/trades?symbol=USDTUSD')) {
          const time = overrides.staleFx
            ? MOCK_NOW - MAX_SOURCE_TICKER_AGE_MS - 1
            : MOCK_NOW - 2000;
          return jsonResponse([{ price: '0.999', time }]);
        }
        if (value.includes('/ticker/bookTicker?symbol=WBTCUSDT')) {
          return jsonResponse({ symbol: 'WBTCUSDT', bidPrice: '84001', askPrice: '84003' });
        }
        if (value.includes('/ticker/bookTicker?symbol=USDTUSD')) {
          return jsonResponse({ symbol: 'USDTUSD', bidPrice: '0.998', askPrice: '1.001' });
        }
        if (value.includes('/ticker/24hr?symbol=WBTCUSDT')) {
          return jsonResponse({ symbol: 'WBTCUSDT', volume: '1' });
        }
        if (value.includes('api.exchange.coinbase.com')) return jsonResponse({ price: '84000' });
        if (value.includes('api.kraken.com')) {
          return jsonResponse({ error: [], result: { WBTCUSD: { c: ['84000'] } } });
        }
        if (value.includes('api.crypto.com'))
          return jsonResponse(cryptoComTickerResponse(MOCK_NOW));
        throw new Error(`unexpected URL ${value}`);
      });

    for (const scenario of [{ staleFx: true }, { fxTrading: false }]) {
      const { rows } = await collectMarketReference(new Date(MOCK_NOW), {
        purpose: 'synthetic-test',
        fetchImpl: makeFetcher(scenario),
        now: () => MOCK_NOW,
        symbols: ['WBTC'],
        enabledExchanges: ['binance'],
      });

      const binance = rows.find((row) => row.exchange === 'binance');
      expect(binance?.is_success).toBe(false);
      expect(binance?.ref_price).toBeNull();
      expect(binance?.error_message).toContain(
        scenario.staleFx ? 'outside freshness window' : 'enabled USDT/USD spot market'
      );
    }
  });

  it('rejects stale Crypto.com ticker data instead of counting it as an independent source', async () => {
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      const value = String(url);
      if (value.includes('api.exchange.coinbase.com')) return jsonResponse({ price: '84001' });
      if (value.includes('api.kraken.com')) {
        return jsonResponse({ error: [], result: { WBTCUSD: { c: ['84000'] } } });
      }
      if (value.includes('api.crypto.com')) {
        return jsonResponse(cryptoComTickerResponse(MOCK_NOW - MAX_SOURCE_TICKER_AGE_MS - 1));
      }
      throw new Error(`unexpected URL ${value}`);
    });

    const { rows } = await collectMarketReference(new Date(MOCK_NOW), {
      purpose: 'synthetic-test',
      fetchImpl,
      now: () => MOCK_NOW,
      symbols: ['WBTC'],
    });

    const cryptoCom = rows.find((row) => row.exchange === 'crypto.com');
    expect(cryptoCom?.is_success).toBe(false);
    expect(cryptoCom?.error_message).toContain('outside freshness window');
  });

  it('rejects a Crypto.com latest price outside its reported best bid/ask', async () => {
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      const value = String(url);
      if (value.includes('api.exchange.coinbase.com')) return jsonResponse({ price: '84001' });
      if (value.includes('api.kraken.com')) {
        return jsonResponse({ error: [], result: { WBTCUSD: { c: ['84000'] } } });
      }
      if (value.includes('api.crypto.com')) {
        return jsonResponse({
          code: 0,
          result: {
            data: [
              {
                i: 'WBTC_USD',
                a: '79798.76',
                b: '79981.51',
                k: '80573.54',
                v: '0.0006',
                t: MOCK_NOW,
              },
            ],
          },
        });
      }
      throw new Error(`unexpected URL ${value}`);
    });

    const { rows } = await collectMarketReference(new Date(MOCK_NOW), {
      purpose: 'synthetic-test',
      fetchImpl,
      now: () => MOCK_NOW,
      symbols: ['WBTC'],
    });

    const cryptoCom = rows.find((row) => row.exchange === 'crypto.com');
    expect(cryptoCom?.is_success).toBe(false);
    expect(cryptoCom?.error_message).toContain('outside the best bid/ask');
  });

  it('collects a listed Bitstamp USD spot pair and preserves its source timestamp', async () => {
    const urls: string[] = [];
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      const value = String(url);
      urls.push(value);
      if (value.includes('bitstamp.net/api/v2/markets/')) {
        return jsonResponse([
          {
            base_currency: 'BTC',
            counter_currency: 'USD',
            market_type: 'SPOT',
            trading: 'Enabled',
            market_symbol: 'btcusd',
          },
          {
            base_currency: 'BTC',
            counter_currency: 'USD',
            market_type: 'DERIVATIVE',
            trading: 'Enabled',
            market_symbol: 'btcusd-perp',
          },
          {
            base_currency: 'BTC',
            counter_currency: 'USDT',
            market_type: 'SPOT',
            trading: 'Enabled',
            market_symbol: 'btcusdt',
          },
        ]);
      }
      if (value.includes('bitstamp.net/api/v2/ticker/btcusd/')) {
        return jsonResponse({
          last: '84000.25',
          bid: '83999.50',
          ask: '84001.00',
          volume: '125.5',
          timestamp: String(MOCK_NOW / 1000),
          market_type: 'SPOT',
        });
      }
      if (value.includes('api.exchange.coinbase.com')) return jsonResponse({ price: '84000' });
      if (value.includes('api.kraken.com')) {
        return jsonResponse({ error: [], result: { XXBTZUSD: { c: ['84000'] } } });
      }
      if (value.includes('api.gemini.com')) return jsonResponse({ last: '84000' });
      throw new Error(`unexpected URL ${value}`);
    });

    const { rows } = await collectMarketReference(new Date(MOCK_NOW), {
      purpose: 'synthetic-test',
      fetchImpl,
      now: () => MOCK_NOW,
      symbols: ['BTC'],
      enabledExchanges: ['bitstamp'],
    });

    const bitstamp = rows.find((row) => row.exchange === 'bitstamp');
    expect(bitstamp).toMatchObject({
      is_success: true,
      ref_price: 84000.25,
      bid: 83999.5,
      ask: 84001,
      volume: 125.5,
      source_observed_at: new Date(MOCK_NOW).toISOString(),
    });
    expect(urls.filter((url) => url.includes('/api/v2/markets/'))).toHaveLength(1);
    expect(urls).toContain('https://www.bitstamp.net/api/v2/ticker/btcusd/');
  });

  it('collects a Bitfinex direct USD pair using its latest trade and ticker book', async () => {
    const urls: string[] = [];
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      const value = String(url);
      urls.push(value);
      if (value.includes('/conf/pub:list:pair:exchange')) {
        return jsonResponse([['BTCUSD', 'BTCEUR', 'WBTCBTC']]);
      }
      if (value.includes('/v2/tickers?symbols=tBTCUSD')) {
        return jsonResponse([['tBTCUSD', '84000', 1, '84001', 2, 12, 0.01, '84000.5', '15.25']]);
      }
      if (value.includes('/v2/trades/tBTCUSD/hist?limit=1&sort=-1')) {
        return jsonResponse([[123, MOCK_NOW, 0.1, '84000.25']]);
      }
      if (value.includes('api.exchange.coinbase.com')) return jsonResponse({ price: '84000' });
      if (value.includes('api.kraken.com')) {
        return jsonResponse({ error: [], result: { XXBTZUSD: { c: ['84000'] } } });
      }
      if (value.includes('api.gemini.com')) return jsonResponse({ last: '84000' });
      throw new Error(`unexpected URL ${value}`);
    });

    const { rows } = await collectMarketReference(new Date(MOCK_NOW), {
      purpose: 'synthetic-test',
      fetchImpl,
      now: () => MOCK_NOW,
      symbols: ['BTC'],
      enabledExchanges: ['bitfinex'],
    });

    const bitfinex = rows.find((row) => row.exchange === 'bitfinex');
    expect(bitfinex).toMatchObject({
      is_success: true,
      ref_price: 84000.25,
      bid: 84000,
      ask: 84001,
      volume: 15.25,
      source_observed_at: new Date(MOCK_NOW).toISOString(),
    });
    expect(urls).toContain('https://api-pub.bitfinex.com/v2/conf/pub:list:pair:exchange');
    expect(urls).toContain('https://api-pub.bitfinex.com/v2/tickers?symbols=tBTCUSD');
    expect(urls).toContain('https://api-pub.bitfinex.com/v2/trades/tBTCUSD/hist?limit=1&sort=-1');
  });

  it('fails closed when an explicitly admitted Bitfinex source timestamp is stale', async () => {
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      const value = String(url);
      if (value.includes('/conf/pub:list:pair:exchange')) return jsonResponse([['BTCUSD']]);
      if (value.includes('/v2/tickers?symbols=tBTCUSD')) {
        return jsonResponse([['tBTCUSD', '84000', 1, '84001', 2, 12, 0.01, '84000.5', '15.25']]);
      }
      if (value.includes('/v2/trades/tBTCUSD/hist')) {
        return jsonResponse([[123, MOCK_NOW - MAX_SOURCE_TICKER_AGE_MS - 1, 0.1, '84000.25']]);
      }
      if (value.includes('api.exchange.coinbase.com')) return jsonResponse({ price: '84000' });
      if (value.includes('api.kraken.com')) {
        return jsonResponse({ error: [], result: { XXBTZUSD: { c: ['84000'] } } });
      }
      if (value.includes('api.gemini.com')) return jsonResponse({ last: '84000' });
      throw new Error(`unexpected URL ${value}`);
    });

    const { rows } = await collectMarketReference(new Date(MOCK_NOW), {
      purpose: 'synthetic-test',
      fetchImpl,
      now: () => MOCK_NOW,
      symbols: ['BTC'],
      enabledExchanges: ['bitfinex'],
    });

    const bitfinex = rows.find((row) => row.exchange === 'bitfinex');
    expect(bitfinex?.is_success).toBe(false);
    expect(bitfinex?.error_message).toContain('outside freshness window');
    expect(bitfinex?.ref_price).toBeNull();
  });

  it('keeps WBTC in the regular 15-minute market-reference set', () => {
    expect(MARKET_REFERENCE_CORE_SYMBOLS).toContain('WBTC');
  });
});
