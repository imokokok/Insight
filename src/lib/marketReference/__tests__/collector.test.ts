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
      fetchImpl,
      now: () => MOCK_NOW,
    });

    const eth = rows.filter((r) => r.symbol === 'ETH');
    expect(eth).toHaveLength(3);
    expect(eth.every((r) => r.is_success)).toBe(true);
    expect(eth.map((r) => r.exchange).sort()).toEqual(['coinbase', 'gemini', 'kraken']);
    expect(eth[0].quote).toBe('USD');
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

    const { rows } = await collectMarketReference(new Date('2026-08-30T16:00:00Z'), { fetchImpl });
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

    const { rows } = await collectMarketReference(new Date('2026-08-30T16:00:00Z'), { fetchImpl });
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
      fetchImpl,
      now: () => MOCK_NOW,
      symbols: ['WBTC'],
    });

    const cryptoCom = rows.find((row) => row.exchange === 'crypto.com');
    expect(cryptoCom?.is_success).toBe(false);
    expect(cryptoCom?.error_message).toContain('outside freshness window');
  });

  it('keeps WBTC in the regular 15-minute market-reference set', () => {
    expect(MARKET_REFERENCE_CORE_SYMBOLS).toContain('WBTC');
  });
});
