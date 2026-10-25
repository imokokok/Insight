import { verifyHyperliquidPerpExecution } from '../hyperliquidPerpExecution';

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}

const expectedOrder = {
  market: 'BTC' as const,
  side: 'buy' as const,
  size: '2',
  limitPrice: '101',
  reduceOnly: false,
  clientOrderId: '0x1234567890abcdef1234567890abcdef',
};

function fetcher(_url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const body = JSON.parse(String(init?.body)) as { type: string };
  if (body.type === 'orderStatus')
    return Promise.resolve(
      jsonResponse({
        status: 'order',
        order: {
          status: 'filled',
          statusTimestamp: 1_000_020,
          order: {
            coin: 'BTC',
            side: 'B',
            limitPx: '101.0',
            sz: '0.0',
            origSz: '2.0',
            oid: 7,
            reduceOnly: false,
            cloid: expectedOrder.clientOrderId,
          },
        },
      })
    );
  return Promise.resolve(
    jsonResponse([
      {
        coin: 'BTC',
        side: 'B',
        px: '100.5',
        sz: '1',
        fee: '0.01',
        time: 1_000_010,
        oid: 7,
        hash: `0x${'a'.repeat(64)}`,
      },
      {
        coin: 'BTC',
        side: 'B',
        px: '101',
        sz: '1',
        fee: '0.01',
        time: 1_000_020,
        oid: 7,
        hash: `0x${'b'.repeat(64)}`,
      },
      {
        coin: 'ETH',
        side: 'A',
        px: '50',
        sz: '1',
        fee: '0.01',
        time: 1_000_020,
        oid: 8,
        hash: `0x${'c'.repeat(64)}`,
      },
    ])
  );
}

describe('Hyperliquid perp execution observation', () => {
  it('compares returned order state and aggregates only matching fills', async () => {
    const result = await verifyHyperliquidPerpExecution(
      {
        user: '0x1111111111111111111111111111111111111111',
        orderId: expectedOrder.clientOrderId,
        submittedAt: '1970-01-01T00:16:35.000Z',
        expectedOrder,
      },
      { fetcher, nowMs: 1_000_030 }
    );
    expect(result.order).toMatchObject({ known: true, status: 'filled', oid: '7' });
    expect(result.expectedOrder).toEqual({ matches: true, mismatches: [] });
    expect(result.fills).toMatchObject({
      count: 2,
      filledBase: 2,
      filledNotionalUsd: 201.5,
      averagePrice: 100.75,
      totalFeeUsd: 0.02,
    });
  });

  it('does not call a known exchange order verified when intent differs', async () => {
    const result = await verifyHyperliquidPerpExecution(
      {
        user: '0x1111111111111111111111111111111111111111',
        orderId: '7',
        submittedAt: '1970-01-01T00:16:35.000Z',
        expectedOrder: { ...expectedOrder, limitPrice: '102' },
      },
      { fetcher, nowMs: 1_000_030 }
    );
    expect(result.expectedOrder).toEqual({ matches: false, mismatches: ['limitPrice'] });
  });

  it('rejects zero because the public API does not accept it as an order id', async () => {
    await expect(
      verifyHyperliquidPerpExecution(
        {
          user: '0x1111111111111111111111111111111111111111',
          orderId: '0',
          submittedAt: '1970-01-01T00:16:35.000Z',
          expectedOrder,
        },
        { fetcher, nowMs: 1_000_030 }
      )
    ).rejects.toThrow('Hyperliquid orderId must be a uint64 string');
  });
});
