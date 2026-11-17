import {
  fetchKalshiMarket,
  fetchKalshiMarketSnapshot,
  fetchKalshiOrderbook,
  fetchKalshiSeries,
  normalizeKalshiMarket,
  type KalshiMarket,
} from '../kalshi';
import { assessKalshiGuard } from '../kalshiGuard';

const NOW = new Date('2026-11-18T12:00:00.000Z');

function market(overrides: Partial<KalshiMarket> = {}): KalshiMarket {
  return {
    ticker: 'KXTEST-26NOV18-T12',
    eventTicker: 'KXTEST-26NOV18',
    seriesTicker: 'KXTEST',
    marketType: 'binary',
    title: 'Will the test market resolve yes?',
    subtitle: null,
    status: 'open',
    closeTime: '2026-11-18T12:10:00.000Z',
    expirationTime: '2026-11-18T12:15:00.000Z',
    latestExpirationTime: null,
    result: null,
    rulesPrimary: 'Resolves according to the official source described here.',
    rulesSecondary: null,
    yesBid: 0.48,
    yesAsk: 0.52,
    noBid: 0.47,
    noAsk: 0.53,
    lastPrice: 0.5,
    volume: 1200,
    volume24h: 200,
    openInterest: 500,
    liquidity: 250,
    feeMetadata: { feeType: 'standard', feeMultiplier: 1, makerFee: null },
    settlementSources: [{ name: 'Official source', url: 'https://example.test/source' }],
    orderbook: {
      yesBids: [{ price: 0.48, quantity: 100 }],
      noBids: [{ price: 0.47, quantity: 100 }],
      depth: 10,
    },
    metadataWarnings: [],
    ...overrides,
  };
}

describe('Kalshi adapter', () => {
  it('normalizes cents, fixed-point fields and timestamps from the public API shape', () => {
    const result = normalizeKalshiMarket({
      ticker: 'KXTEST-26NOV18-T12',
      market_type: 'binary',
      title: 'Test market',
      status: 'active',
      close_time: '2026-11-18T12:10:00Z',
      yes_bid: 48,
      yes_ask: 52,
      no_bid: 47,
      no_ask: 53,
      last_price: 50,
      volume_fp: '1200.00',
      volume_24h_fp: '200.00',
      open_interest_fp: '500.00',
      rules_primary: 'Official rules',
    });

    expect(result.yesBid).toBe(0.48);
    expect(result.yesAsk).toBe(0.52);
    expect(result.noAsk).toBe(0.53);
    expect(result.lastPrice).toBe(0.5);
    expect(result.volume24h).toBe(200);
    expect(result.closeTime).toBe('2026-11-18T12:10:00.000Z');
  });

  it('fetches one public market without authentication', async () => {
    const fetcher = jest.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe('https://example.test/markets/KXTEST-26NOV18-T12');
      expect(init?.headers).toEqual({ accept: 'application/json' });
      return new Response(JSON.stringify({ market: { ...market(), status: 'active' } }), {
        status: 200,
      });
    }) as unknown as typeof fetch;

    const result = await fetchKalshiMarket('KXTEST-26NOV18-T12', {
      baseUrl: 'https://example.test',
      fetcher,
    });

    expect(result?.ticker).toBe('KXTEST-26NOV18-T12');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('normalizes the public orderbook and series fee metadata', async () => {
    const fetcher = jest.fn(async (url: string) => {
      if (url.endsWith('/orderbook?depth=2')) {
        return new Response(
          JSON.stringify({
            orderbook_fp: {
              yes_dollars: [
                ['0.48', '100.00'],
                ['0.50', '25.00'],
              ],
              no_dollars: [['0.47', '80.00']],
            },
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          series: {
            ticker: 'KXTEST',
            fee_type: 'quadratic',
            fee_multiplier: 1.2,
            settlement_sources: [{ name: 'Official source', url: 'https://example.test/source' }],
          },
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const orderbook = await fetchKalshiOrderbook('KXTEST-26NOV18-T12', {
      baseUrl: 'https://example.test',
      depth: 2,
      fetcher,
    });
    const series = await fetchKalshiSeries('KXTEST', {
      baseUrl: 'https://example.test',
      fetcher,
    });

    expect(orderbook?.yesBids).toEqual([
      { price: 0.48, quantity: 100 },
      { price: 0.5, quantity: 25 },
    ]);
    expect(orderbook?.depth).toBe(2);
    expect(series).toEqual({
      feeType: 'quadratic',
      feeMultiplier: 1.2,
      settlementSources: [{ name: 'Official source', url: 'https://example.test/source' }],
    });
  });

  it('rejects a market response for a different ticker', async () => {
    const fetcher = jest.fn(
      async () =>
        new Response(JSON.stringify({ market: { ...market(), ticker: 'OTHER-MARKET' } }), {
          status: 200,
        })
    ) as unknown as typeof fetch;

    await expect(
      fetchKalshiMarket('KXTEST-26NOV18-T12', {
        baseUrl: 'https://example.test',
        fetcher,
      })
    ).rejects.toThrow('ticker does not match');
  });

  it('keeps the primary market usable when supplemental public metadata fails', async () => {
    const fetcher = jest.fn(async (url: string) => {
      if (url.endsWith('/markets/KXTEST-26NOV18-T12')) {
        return new Response(
          JSON.stringify({
            market: { ...market(), status: 'active', series_ticker: 'KXTEST' },
          }),
          {
            status: 200,
          }
        );
      }
      return new Response('temporarily unavailable', { status: 503 });
    }) as unknown as typeof fetch;

    const result = await fetchKalshiMarketSnapshot('KXTEST-26NOV18-T12', {
      baseUrl: 'https://example.test',
      fetcher,
    });

    expect(result?.ticker).toBe('KXTEST-26NOV18-T12');
    expect(result?.orderbook).toBeNull();
    expect(result?.metadataWarnings).toEqual(
      expect.arrayContaining(['orderbook unavailable', 'series metadata unavailable'])
    );
  });
});

describe('assessKalshiGuard', () => {
  it('allows a structurally healthy market with explicit off-chain caution', async () => {
    const result = await assessKalshiGuard(
      {
        protocolId: 'kalshi-prediction-mainnet',
        action: 'buy_yes',
        marketTicker: 'KXTEST-26NOV18-T12',
      },
      { fetchMarket: async () => market(), now: () => NOW }
    );

    expect(result.verdict).toBe('CAUTION');
    expect(result.schema).toBe('insight.kalshi-guard.v2');
    expect(result.scope.settlement).toBe('official_api_declared');
    expect(result.quotes.chosenSidePrice).toBe(0.52);
    expect(result.market.rulesPresent).toBe(true);
    expect(result.quotes.orderbook?.yesBids[0]?.price).toBe(0.48);
    expect(result.market.settlementSources).toHaveLength(1);
    expect(result.reasons).toContain('off-chain settlement is not independently recomputable');
    expect(result.checks.filter((check) => check.status === 'block')).toEqual([]);
  });

  it('blocks closed markets', async () => {
    const result = await assessKalshiGuard(
      {
        protocolId: 'kalshi-prediction-mainnet',
        action: 'buy_no',
        marketTicker: 'KXTEST-26NOV18-T12',
      },
      { fetchMarket: async () => market({ status: 'closed' }), now: () => NOW }
    );

    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons).toContain('market closed');
  });

  it('blocks scalar markets because the guard only supports binary Yes/No contracts', async () => {
    const result = await assessKalshiGuard(
      {
        protocolId: 'kalshi-prediction-mainnet',
        action: 'buy_yes',
        marketTicker: 'KXTEST-26NOV18-T12',
      },
      { fetchMarket: async () => market({ marketType: 'scalar' }), now: () => NOW }
    );

    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons).toContain('scalar market is outside binary guard scope');
  });

  it('cautions when the fee schedule is missing without blocking the read-only screen', async () => {
    const result = await assessKalshiGuard(
      {
        protocolId: 'kalshi-prediction-mainnet',
        action: 'buy_yes',
        marketTicker: 'KXTEST-26NOV18-T12',
      },
      {
        fetchMarket: async () =>
          market({ feeMetadata: { feeType: null, feeMultiplier: null, makerFee: null } }),
        now: () => NOW,
      }
    );

    expect(result.verdict).toBe('CAUTION');
    expect(result.reasons).toContain('fee schedule unavailable');
  });

  it('fails closed when the public market input is unavailable', async () => {
    const result = await assessKalshiGuard(
      {
        protocolId: 'kalshi-prediction-mainnet',
        action: 'buy_yes',
        marketTicker: 'KXTEST-26NOV18-T12',
      },
      {
        fetchMarket: async () => {
          throw new Error('Kalshi API 503');
        },
        now: () => NOW,
      }
    );

    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons).toContain('assessment input unavailable');
    expect(result.checks[0].detail).toContain('Kalshi API 503');
  });
});
