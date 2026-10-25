import {
  assertHyperliquidPerpMarketProfile,
  getHyperliquidPerpMarketSnapshot,
  hyperliquidPerpMarketProfile,
  resetHyperliquidPerpMarketCacheForTests,
} from '../hyperliquidPerpMarket';

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

const contextPayload = [
  {
    universe: [
      { name: 'BTC', szDecimals: 5, maxLeverage: 40 },
      { name: 'ETH', szDecimals: 4, maxLeverage: 25 },
      { name: 'HYPE', szDecimals: 2, maxLeverage: 10 },
    ],
  },
  [
    {
      markPx: '100.5',
      midPx: '100.5',
      oraclePx: '100.25',
      funding: '0.00001',
      openInterest: '12000',
      dayNtlVlm: '2500000',
    },
    {
      markPx: '50.5',
      midPx: '50.5',
      oraclePx: '50.25',
      funding: '-0.00002',
      openInterest: '34000',
      dayNtlVlm: '1700000',
    },
    {
      markPx: '25.5',
      midPx: '25.5',
      oraclePx: '25.25',
      funding: '0.00003',
      openInterest: '56000',
      dayNtlVlm: '900000',
    },
  ],
];

function fetcher(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  expect(String(url)).toBe('https://api.hyperliquid.xyz/info');
  const body = JSON.parse(String(init?.body)) as { type: string; coin?: string };
  if (body.type === 'metaAndAssetCtxs') return Promise.resolve(jsonResponse(contextPayload));
  if (body.type === 'l2Book' && body.coin === 'BTC') {
    return Promise.resolve(
      jsonResponse({
        coin: 'BTC',
        time: 999_000,
        levels: [
          [
            { px: '100', sz: '10', n: 2 },
            { px: '99', sz: '20', n: 3 },
          ],
          [
            { px: '101', sz: '10', n: 2 },
            { px: '102', sz: '20', n: 3 },
          ],
        ],
      })
    );
  }
  throw new Error(`Unexpected request ${JSON.stringify(body)}`);
}

describe('Hyperliquid perpetual-market evidence', () => {
  beforeEach(() => resetHyperliquidPerpMarketCacheForTests());

  it('pins the reviewed mainnet market set and its bounded book-impact ladders', () => {
    expect(hyperliquidPerpMarketProfile('BTC')).toMatchObject({
      id: 'hyperliquid-perp-btc',
      network: 'hyperliquid:mainnet',
      venue: 'hyperliquid-perp',
      market: 'BTC-PERP',
      quoteNotionalsUsd: [10_000, 100_000, 1_000_000],
    });
    expect(hyperliquidPerpMarketProfile('HYPE').quoteNotionalsUsd).toEqual([
      1_000, 10_000, 100_000,
    ]);
    expect(() =>
      assertHyperliquidPerpMarketProfile({
        ...hyperliquidPerpMarketProfile(),
        quoteNotionalsUsd: [100_000, 10_000],
      })
    ).toThrow('unordered quote ladder');
  });

  it('binds perp context to a fresh, ordered L2 book and derives two-sided impact estimates', async () => {
    const snapshot = await getHyperliquidPerpMarketSnapshot(hyperliquidPerpMarketProfile('BTC'), {
      fetcher,
      nowMs: 1_000_000,
    });

    expect(snapshot).toMatchObject({
      source: 'dex-market',
      venue: 'hyperliquid-perp',
      network: 'hyperliquid:mainnet',
      market: 'BTC-PERP',
      coin: 'BTC',
      sourceFreshnessSeconds: 1,
      book: {
        bestBid: 100,
        bestAsk: 101,
        spreadBps: 100,
        bidDepthNotionalUsd: 2_980,
        askDepthNotionalUsd: 3_050,
      },
      perpetual: {
        markPrice: 100.5,
        oraclePrice: 100.25,
        fundingRate: 0.00001,
        openInterest: 12_000,
        dayNotionalVolume: 2_500_000,
        sizeDecimals: 5,
        maxLeverage: 40,
      },
    });
    expect(snapshot.estimates).toHaveLength(6);
    expect(snapshot.estimates[0]).toMatchObject({
      side: 'buy',
      targetNotionalUsd: 10_000,
      filledNotionalUsd: 3_050,
      complete: false,
    });
    expect(snapshot.estimates[1]).toMatchObject({
      side: 'sell',
      targetNotionalUsd: 10_000,
      filledNotionalUsd: 2_980,
      complete: false,
    });
    expect(snapshot.perpetual.markDeviationBpsFromOracle).toBeCloseTo(24.9376559, 4);
  });

  it('fails closed for a crossed book instead of manufacturing market evidence', async () => {
    const crossed = (url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { type: string; coin?: string };
      if (body.type === 'metaAndAssetCtxs') return Promise.resolve(jsonResponse(contextPayload));
      expect(String(url)).toBe('https://api.hyperliquid.xyz/info');
      return Promise.resolve(
        jsonResponse({
          coin: body.coin,
          time: 900_000,
          levels: [[{ px: '101', sz: '1', n: 1 }], [{ px: '100', sz: '1', n: 1 }]],
        })
      );
    };
    await expect(
      getHyperliquidPerpMarketSnapshot(hyperliquidPerpMarketProfile('BTC'), {
        fetcher: crossed as typeof fetch,
        nowMs: 1_000_000,
      })
    ).rejects.toThrow('crossed L2 book');
  });

  it('fails closed when the L2 witness exceeds the profile freshness limit', async () => {
    const stale = (url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { type: string; coin?: string };
      if (body.type === 'metaAndAssetCtxs') return Promise.resolve(jsonResponse(contextPayload));
      expect(String(url)).toBe('https://api.hyperliquid.xyz/info');
      return Promise.resolve(
        jsonResponse({
          coin: body.coin,
          time: 960_000,
          levels: [[{ px: '100', sz: '1', n: 1 }], [{ px: '101', sz: '1', n: 1 }]],
        })
      );
    };

    await expect(
      getHyperliquidPerpMarketSnapshot(hyperliquidPerpMarketProfile('BTC'), {
        fetcher: stale as typeof fetch,
        nowMs: 1_000_000,
      })
    ).rejects.toThrow('freshness limit');
  });
});
