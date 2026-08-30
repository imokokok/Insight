import { collectMarketReference } from '@/lib/marketReference/collector';

type Json = unknown;

function jsonResponse(body: Json, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as Response;
}

describe('collectMarketReference', () => {
  it('writes one row per (symbol, exchange), marking successes and failures', async () => {
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('api.coinbase.com')) {
        return jsonResponse({ data: { amount: '3000.5' } }); // ETH
      }
      if (u.includes('api.kraken.com')) {
        // price lives at result[PAIR].c[0]; response keyed by the CANONICAL
        // pair names verified against the live API (XETHZUSD, XXBTZUSD,
        // USDCUSD, USDTZUSD).
        const pair = u.includes('XETHZUSD')
          ? 'XETHZUSD'
          : u.includes('XXBTZUSD')
            ? 'XXBTZUSD'
            : u.includes('USDTZUSD')
              ? 'USDTZUSD'
              : 'USDCUSD';
        return jsonResponse({ error: [], result: { [pair]: { c: ['3001.0'] } } });
      }
      if (u.includes('api.binance.com')) {
        return jsonResponse({ price: '3002.25' });
      }
      throw new Error('unexpected url ' + u);
    });

    const { rows, summary } = await collectMarketReference(new Date('2026-08-30T16:00:00Z'), {
      fetchImpl,
      now: () => 1_752_000_000_000,
    });

    const eth = rows.filter((r) => r.symbol === 'ETH');
    expect(eth).toHaveLength(3);
    expect(eth.every((r) => r.is_success)).toBe(true);
    expect(eth.map((r) => r.exchange).sort()).toEqual(['binance', 'coinbase', 'kraken']);
    expect(eth[0].quote).toBe('USD');
    expect(eth[0].collector_version).toBeTruthy();
    expect(eth[0].data_age_seconds).toBeGreaterThanOrEqual(0);

    expect(summary.covered).toContain('ETH');
    expect(summary.covered).toContain('BTC');
    expect(summary.covered).toContain('USDC');
    expect(summary.covered).toContain('USDT');
    expect(summary.uncovered).toHaveLength(0);
    // Cross-exchange spread over ETH: (3002.25-3000.5)/3002.25 ≈ 0.058%
    expect(summary.maxCrossExchangeSpreadPct).not.toBeNull();
  });

  it('records per-exchange failures and fail-closes a fully-down symbol', async () => {
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('api.coinbase.com')) {
        return jsonResponse({ data: { amount: '1.0' } });
      }
      if (u.includes('api.kraken.com')) {
        if (u.includes('XXBTZUSD')) throw new Error('kraken down for BTC');
        return jsonResponse({
          error: [],
          result: {
            XETHZUSD: { c: ['1.0'] },
            USDCUSD: { c: ['1.0'] },
            USDTZUSD: { c: ['1.0'] },
          },
        });
      }
      if (u.includes('api.binance.com')) {
        return jsonResponse({ price: '1.0' });
      }
      throw new Error('boom');
    });

    const { rows, summary } = await collectMarketReference(new Date('2026-08-30T16:00:00Z'), {
      fetchImpl,
    });

    const btcRows = rows.filter((r) => r.symbol === 'BTC');
    expect(btcRows).toHaveLength(3);
    expect(btcRows.filter((r) => r.is_success)).toHaveLength(2); // coinbase + binance ok
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

    expect(rows).toHaveLength(4 * 3); // 4 symbols × 3 exchanges
    expect(rows.every((r) => r.is_success === false)).toBe(true);
    expect(rows.every((r) => r.ref_price === null)).toBe(true);
    expect(rows.every((r) => r.error_message)).toBe(true);
    expect(summary.covered).toHaveLength(0);
    expect(summary.uncovered).toEqual(['ETH', 'BTC', 'USDC', 'USDT']);
    expect(summary.maxCrossExchangeSpreadPct).toBeNull();
  });

  it('treats a zero/negative exchange price as a failed quote', async () => {
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('api.coinbase.com')) return jsonResponse({ data: { amount: '0' } });
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
      return jsonResponse({ price: '5' });
    });

    const { rows } = await collectMarketReference(new Date('2026-08-30T16:00:00Z'), { fetchImpl });
    const ethCoinbase = rows.find((r) => r.symbol === 'ETH' && r.exchange === 'coinbase')!;
    expect(ethCoinbase.is_success).toBe(false);
    expect(ethCoinbase.error_message).toBe('unusable price from exchange');
  });

  it('surfaces Kraken HTTP-200 error bodies (e.g. rate limit) instead of a generic miss', async () => {
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('api.coinbase.com')) return jsonResponse({ data: { amount: '1.0' } });
      if (u.includes('api.kraken.com')) {
        return jsonResponse({ error: ['EGeneral:Too many requests'], result: {} });
      }
      return jsonResponse({ price: '1.0' });
    });

    const { rows } = await collectMarketReference(new Date('2026-08-30T16:00:00Z'), { fetchImpl });
    const ethKraken = rows.find((r) => r.symbol === 'ETH' && r.exchange === 'kraken')!;
    expect(ethKraken.is_success).toBe(false);
    expect(ethKraken.error_message).toContain('EGeneral:Too many requests');
  });
});
