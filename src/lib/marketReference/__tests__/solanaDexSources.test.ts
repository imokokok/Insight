import { MARKET_REFERENCE_SOURCE_RIGHTS } from '@/lib/dataRights/evidenceRights';
import { collectMarketReference } from '@/lib/marketReference/collector';
import { SOLANA_DEX_PRICE_MINTS } from '@/lib/marketReference/solanaDexSources';

type Json = unknown;

const MOCK_NOW = 1_752_000_000_000;
const WIF_MINT = SOLANA_DEX_PRICE_MINTS.WIF;
const BONK_MINT = SOLANA_DEX_PRICE_MINTS.BONK;

function jsonResponse(body: Json, ok = true, status = ok ? 200 : 500): Response {
  return { ok, status, json: async () => body } as Response;
}

function dexScreenerPairs(pairs: Json[]): Json {
  return pairs;
}

function dexPair(mint: string, overrides: Record<string, Json> = {}): Json {
  return {
    chainId: 'solana',
    dexId: 'raydium',
    baseToken: { address: mint, name: 'dogwifhat', symbol: 'WIF' },
    quoteToken: { address: 'So11111111111111111111111111111111111111112', symbol: 'WSOL' },
    priceUsd: '2.5',
    liquidity: { usd: '100000' },
    volume: { h24: '250000' },
    ...overrides,
  };
}

function geckoBody(tokens: Json[]): Json {
  return { data: tokens };
}

function geckoToken(mint: string, overrides: Record<string, Json> = {}): Json {
  return {
    id: `solana_${mint}`,
    type: 'token',
    attributes: {
      address: mint,
      symbol: 'WIF',
      price_usd: '2.51',
      volume_usd: { h24: '240000' },
    },
    ...overrides,
  };
}

/** Jupiter Lite v3 price entry per registered Solana mint. */
function jupiterBatchBody(price = '3002.1'): Json {
  return Object.fromEntries(
    Object.values(SOLANA_DEX_PRICE_MINTS).map((mint) => [
      mint,
      { usdPrice: price, blockId: 459140141, decimals: 5, priceChange24h: -0.47 },
    ])
  );
}

describe('solana dex market-reference sources', () => {
  it('collects WIF from dexscreener with vendor-licensed derived-analytics rights', async () => {
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes('api.dexscreener.com')) {
        expect(String(url)).toBe(
          `https://api.dexscreener.com/tokens/v1/solana/${Object.values(SOLANA_DEX_PRICE_MINTS).join(',')}`
        );
        return jsonResponse(dexScreenerPairs([dexPair(WIF_MINT)]));
      }
      if (String(url).includes('lite-api.jup.ag')) return jsonResponse(jupiterBatchBody());
      return jsonResponse(geckoBody([geckoToken(WIF_MINT)]));
    });

    const { rows, summary } = await collectMarketReference(new Date(MOCK_NOW), {
      purpose: 'customer-facing',
      fetchImpl,
      now: () => MOCK_NOW,
      symbols: ['WIF'],
    });

    expect(summary.eligibleExchanges).toContain('dexscreener');
    expect(rows).toHaveLength(3); // dexscreener + geckoterminal + jupiter
    const dexRow = rows.find((r) => r.exchange === 'dexscreener')!;
    expect(dexRow).toMatchObject({
      symbol: 'WIF',
      ref_price: 2.5,
      volume: 250000,
      bid: null,
      ask: null,
      bid_ask_spread_pct: null,
      rights_scope: 'vendor-licensed',
      rights_reference: 'dexscreener-public-api-terms-2026-10-derived-analytics',
      delivery_policy: 'derived-analytics-only',
      is_success: true,
    });
  });

  it('collects WIF from geckoterminal with the batch Accept header', async () => {
    const fetchImpl = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).includes('api.geckoterminal.com')) {
        expect(String(url)).toBe(
          `https://api.geckoterminal.com/api/v2/networks/solana/tokens/multi/${Object.values(SOLANA_DEX_PRICE_MINTS).join(',')}`
        );
        expect(new Headers(init?.headers).get('Accept')).toBe('application/json');
        return jsonResponse(geckoBody([geckoToken(WIF_MINT)]));
      }
      if (String(url).includes('lite-api.jup.ag')) return jsonResponse(jupiterBatchBody());
      return jsonResponse(dexScreenerPairs([dexPair(WIF_MINT)]));
    });

    const { rows } = await collectMarketReference(new Date(MOCK_NOW), {
      purpose: 'customer-facing',
      fetchImpl,
      now: () => MOCK_NOW,
      symbols: ['WIF'],
    });

    const geckoRow = rows.find((r) => r.exchange === 'geckoterminal')!;
    expect(geckoRow).toMatchObject({
      symbol: 'WIF',
      ref_price: 2.51,
      volume: 240000,
      rights_scope: 'vendor-licensed',
      rights_reference: 'geckoterminal-public-api-terms-2026-10-derived-analytics',
      delivery_policy: 'derived-analytics-only',
      is_success: true,
    });
  });

  it('issues exactly one batch request per source for a multi-symbol run', async () => {
    const urls: string[] = [];
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      const value = String(url);
      urls.push(value);
      if (value.includes('api.dexscreener.com')) {
        return jsonResponse(
          dexScreenerPairs([dexPair(WIF_MINT, { priceUsd: '2.5' }), dexPair(BONK_MINT)])
        );
      }
      if (value.includes('lite-api.jup.ag')) return jsonResponse(jupiterBatchBody());
      return jsonResponse(geckoBody([geckoToken(WIF_MINT), geckoToken(BONK_MINT)]));
    });

    const { rows } = await collectMarketReference(new Date(MOCK_NOW), {
      purpose: 'customer-facing',
      fetchImpl,
      now: () => MOCK_NOW,
      symbols: ['WIF', 'BONK'],
    });

    const dexCalls = urls.filter((u) => u.includes('api.dexscreener.com'));
    const geckoCalls = urls.filter((u) => u.includes('api.geckoterminal.com'));
    const jupiterCalls = urls.filter((u) => u.includes('lite-api.jup.ag'));
    expect(dexCalls).toHaveLength(1);
    expect(geckoCalls).toHaveLength(1);
    expect(jupiterCalls).toHaveLength(1);
    // The batch URLs carry both mints.
    expect(dexCalls[0]).toContain(`${WIF_MINT},${BONK_MINT}`);
    expect(jupiterCalls[0]).toContain(`${WIF_MINT},${BONK_MINT}`);
    expect(rows.filter((r) => r.is_success)).toHaveLength(6); // 2 symbols × 3 sources
  });

  it('collects the jupiter baseline with the batch ids URL and a null volume field', async () => {
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes('lite-api.jup.ag')) {
        expect(String(url)).toBe(
          `https://lite-api.jup.ag/price/v3?ids=${Object.values(SOLANA_DEX_PRICE_MINTS).join(',')}`
        );
        return jsonResponse(jupiterBatchBody());
      }
      return jsonResponse(dexScreenerPairs([dexPair(WIF_MINT)]));
    });

    const { rows } = await collectMarketReference(new Date(MOCK_NOW), {
      purpose: 'customer-facing',
      fetchImpl,
      now: () => MOCK_NOW,
      symbols: ['WIF'],
    });

    const jupiterRow = rows.find((r) => r.exchange === 'jupiter')!;
    expect(jupiterRow).toMatchObject({
      symbol: 'WIF',
      ref_price: 3002.1,
      volume: null,
      bid: null,
      ask: null,
      bid_ask_spread_pct: null,
      rights_scope: 'vendor-licensed',
      rights_reference: 'jupiter-lite-api-terms-2026-10-derived-analytics',
      delivery_policy: 'derived-analytics-only',
      is_success: true,
    });
  });

  it('picks the deepest-liquidity pair when a token trades in multiple pools', async () => {
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes('api.dexscreener.com')) {
        return jsonResponse(
          dexScreenerPairs([
            dexPair(WIF_MINT, { priceUsd: '9.99', liquidity: { usd: '1000' } }),
            dexPair(WIF_MINT, { priceUsd: '2.5', liquidity: { usd: '999999' }, dexId: 'orca' }),
            dexPair(WIF_MINT, { priceUsd: '7.77', liquidity: { usd: '50000' } }),
          ])
        );
      }
      return jsonResponse(geckoBody([]));
    });

    const { rows } = await collectMarketReference(new Date(MOCK_NOW), {
      purpose: 'customer-facing',
      fetchImpl,
      now: () => MOCK_NOW,
      symbols: ['WIF'],
    });

    expect(rows.find((r) => r.exchange === 'dexscreener')?.ref_price).toBe(2.5);
  });

  it('fails a symbol auditable when a source has no indexed pool or unusable price', async () => {
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes('api.dexscreener.com')) {
        // BONK missing from the pair list; WIF price unusable.
        return jsonResponse(dexScreenerPairs([dexPair(WIF_MINT, { priceUsd: '0' })]));
      }
      return jsonResponse(
        geckoBody([geckoToken(WIF_MINT, { attributes: { address: WIF_MINT, price_usd: null } })])
      );
    });

    const { rows, summary } = await collectMarketReference(new Date(MOCK_NOW), {
      purpose: 'customer-facing',
      fetchImpl,
      now: () => MOCK_NOW,
      symbols: ['WIF', 'BONK'],
    });

    const wifDex = rows.find((r) => r.symbol === 'WIF' && r.exchange === 'dexscreener')!;
    expect(wifDex.is_success).toBe(false);
    expect(wifDex.ref_price).toBeNull();
    expect(wifDex.error_message).toBe('dexscreener WIF/USD price is unusable');

    const bonkDex = rows.find((r) => r.symbol === 'BONK' && r.exchange === 'dexscreener')!;
    expect(bonkDex.is_success).toBe(false);
    expect(bonkDex.error_message).toContain('does not list BONK/USD');

    const wifGecko = rows.find((r) => r.symbol === 'WIF' && r.exchange === 'geckoterminal')!;
    expect(wifGecko.is_success).toBe(false);
    expect(wifGecko.error_message).toBe('geckoterminal WIF/USD price is unusable');

    expect(summary.covered).toHaveLength(0);
    expect(summary.uncovered).toEqual(['WIF', 'BONK']);
  });

  it('captures HTTP failures as failed rows without retry-storming the vendor', async () => {
    let dexCalls = 0;
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes('api.dexscreener.com')) {
        dexCalls += 1;
        return jsonResponse({ error: 'rate limited' }, false, 429);
      }
      return jsonResponse(geckoBody([geckoToken(WIF_MINT)]));
    });

    const { rows } = await collectMarketReference(new Date(MOCK_NOW), {
      purpose: 'customer-facing',
      fetchImpl,
      now: () => MOCK_NOW,
      symbols: ['WIF'],
    });

    const dexRow = rows.find((r) => r.exchange === 'dexscreener')!;
    expect(dexRow.is_success).toBe(false);
    expect(dexRow.error_message).toBe('dexscreener batch tokens 429');
    // One symbol in this run → exactly one batch attempt.
    expect(dexCalls).toBe(1);
  });

  it('excludes the Solana sources from a collection whose rights do not admit them', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse(dexScreenerPairs([dexPair(WIF_MINT)])));

    const { rows, summary } = await collectMarketReference(new Date(MOCK_NOW), {
      purpose: 'customer-facing',
      fetchImpl,
      now: () => MOCK_NOW,
      symbols: ['WIF'],
      sourceRights: {
        ...MARKET_REFERENCE_SOURCE_RIGHTS,
        kraken: {
          sourceId: 'kraken',
          rightsScope: 'research-quarantined',
          agreementReference: null,
          deliveryPolicy: 'not-authorized',
        },
        dexscreener: {
          sourceId: 'dexscreener',
          rightsScope: 'research-quarantined',
          agreementReference: null,
          deliveryPolicy: 'not-authorized',
        },
        geckoterminal: {
          sourceId: 'geckoterminal',
          rightsScope: 'research-quarantined',
          agreementReference: null,
          deliveryPolicy: 'not-authorized',
        },
        jupiter: {
          sourceId: 'jupiter',
          rightsScope: 'research-quarantined',
          agreementReference: null,
          deliveryPolicy: 'not-authorized',
        },
      },
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(rows).toEqual([]);
    expect(summary.eligibleExchanges).toEqual([]);
    expect(summary.uncovered).toEqual(['WIF']);
  });
});
