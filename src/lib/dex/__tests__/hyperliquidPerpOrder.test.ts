import { prepareHyperliquidPerpOrder } from '../hyperliquidPerpOrder';

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}

const context = [
  { universe: [{ name: 'BTC', szDecimals: 5, maxLeverage: 40 }] },
  [
    {
      markPx: '100.5',
      midPx: '100.5',
      oraclePx: '100.25',
      funding: '0.00001',
      openInterest: '12000',
      dayNtlVlm: '2500000',
    },
  ],
];

function fetcher(_url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const body = JSON.parse(String(init?.body)) as { type: string };
  if (body.type === 'metaAndAssetCtxs') return Promise.resolve(jsonResponse(context));
  return Promise.resolve(
    jsonResponse({
      coin: 'BTC',
      time: 999_000,
      levels: [
        [{ px: '100', sz: '10', n: 1 }],
        [
          { px: '101', sz: '2', n: 1 },
          { px: '102', sz: '5', n: 1 },
        ],
      ],
    })
  );
}

const request = {
  market: 'BTC' as const,
  side: 'buy' as const,
  size: '2',
  limitPrice: '101',
  reduceOnly: false,
  clientOrderId: '0x1234567890abcdef1234567890abcdef',
  maxNotionalUsd: 250,
  maxPriceImpactBps: 10,
  maxMarkOracleDeviationBps: 30,
};

describe('Hyperliquid IOC order preflight', () => {
  it('gates an exact local-signing envelope against the fresh CLOB witness', async () => {
    const result = await prepareHyperliquidPerpOrder(request, { fetcher, nowMs: 1_000_000 });
    expect(result).toMatchObject({
      verdict: 'READY_TO_SIGN',
      market: { assetIndex: 0, sizeDecimals: 5 },
      displayedBookEstimate: { filledBase: 2, complete: true, priceImpactBps: 0 },
      unsignedExchangeEnvelope: {
        action: { type: 'order', grouping: 'na' },
        expiresAfter: 1_030_000,
      },
    });
    expect(result.unsignedExchangeEnvelope?.action.orders[0]).toMatchObject({
      a: 0,
      b: true,
      p: '101',
      s: '2',
      c: request.clientOrderId,
      t: { limit: { tif: 'Ioc' } },
    });
  });

  it('refuses a partial fill or a bad perpetual tick before a caller can sign', async () => {
    const partial = await prepareHyperliquidPerpOrder(
      { ...request, size: '3', maxNotionalUsd: 350 },
      { fetcher, nowMs: 1_000_000 }
    );
    expect(partial).toMatchObject({ verdict: 'BLOCK', unsignedExchangeEnvelope: null });
    await expect(
      prepareHyperliquidPerpOrder(
        { ...request, limitPrice: '101.12' },
        { fetcher, nowMs: 1_000_000 }
      )
    ).rejects.toThrow('tick precision');
  });
});
