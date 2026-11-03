/**
 * Unit tests for POST /api/billing/reconcile — the "I've paid" fallback that
 * re-checks a pending order against NOWPayments and re-runs the (idempotent)
 * lifecycle logic when the IPN was lost/delayed.
 *
 * createApiHandler is unwrapped (handler invoked directly) and the lifecycle
 * handlers are mocked so the test focuses on the dispatch logic: row lookup
 * scoped to the caller, terminal-state short-circuit, invoice status → handler
 * mapping, and the reconciled-status response.
 */

import { POST } from '../route';

jest.mock('@/lib/api/handler', () => {
  const actual = jest.requireActual('@/lib/api/handler');
  return {
    ...actual,
    createApiHandler: (handler: unknown) => handler,
    createOptionsHandler: () => () => new Response(null, { status: 204 }),
    ApiResponseBuilder: actual.ApiResponseBuilder,
  };
});

const mockHandlePaymentConfirmed = jest.fn();
const mockHandlePartiallyPaid = jest.fn();
const mockHandlePaymentExpiredOrFailed = jest.fn();
const mockRecordPaymentReference = jest.fn();
jest.mock('@/lib/billing/subscriptionLifecycle', () => ({
  handlePaymentConfirmed: (...args: unknown[]) => mockHandlePaymentConfirmed(...args),
  handlePartiallyPaid: (...args: unknown[]) => mockHandlePartiallyPaid(...args),
  handlePaymentExpiredOrFailed: (...args: unknown[]) => mockHandlePaymentExpiredOrFailed(...args),
  recordPaymentReference: (...args: unknown[]) => mockRecordPaymentReference(...args),
}));

const mockGetPaymentStatus = jest.fn();
jest.mock('@/lib/billing/nowpayments', () => ({
  getPaymentStatus: (...args: unknown[]) => mockGetPaymentStatus(...args),
}));

const mockCreateUserClient = jest.fn();
const mockCreateServiceRoleClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createUserClient: (...args: unknown[]) => mockCreateUserClient(...args),
  createServiceRoleClient: (...args: unknown[]) => mockCreateServiceRoleClient(...args),
}));

/** Build a per-table row lookup. `rows[table]` is what `.maybeSingle()` returns. */
function createSupabaseMock(rows: Record<string, unknown | null>) {
  const client = {
    from: jest.fn((table: string) => {
      const data = rows[table] ?? null;
      const chain: Record<string, unknown> = {};
      for (const fn of ['select', 'eq', 'order', 'limit']) {
        chain[fn] = jest.fn(() => chain);
      }
      chain.maybeSingle = jest.fn().mockResolvedValue({ data });
      chain.single = jest.fn().mockResolvedValue({ data });
      return chain;
    }),
  };
  return client;
}

const USER_ID = 'user_1';

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('https://www.oracleinsight.xyz/api/billing/reconcile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function callPost(
  body: Record<string, unknown>,
  context: Record<string, unknown> = {}
): Promise<Response> {
  return POST(makeRequest(body), {
    requestId: 'test',
    auth: { userId: USER_ID, accessToken: 'tok' },
    validated: { body },
    ...context,
  } as never);
}

describe('POST /api/billing/reconcile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPaymentStatus.mockResolvedValue({
      id: '1001',
      status: 'finished',
      priceAmount: 229,
      priceCurrency: 'usd',
      orderId: 'sub_1',
      invoiceId: 'inv_1',
    });
    mockCreateServiceRoleClient.mockReturnValue(createSupabaseMock({}));
  });

  it('returns 401 without an authenticated user', async () => {
    const response = await POST(makeRequest({ type: 'subscription', id: 'sub_1' }), {
      requestId: 'test',
      auth: {},
      validated: { body: { type: 'subscription', id: 'sub_1' } },
    } as never);
    expect(response.status).toBe(401);
  });

  it('returns 404 when the order does not belong to the caller', async () => {
    mockCreateUserClient.mockReturnValue(createSupabaseMock({ subscriptions: null }));
    const response = await callPost({
      type: 'subscription',
      id: '00000000-0000-0000-0000-000000000000',
    });
    expect(response.status).toBe(404);
  });

  it('short-circuits when the order is already settled (terminal status)', async () => {
    mockCreateUserClient.mockReturnValue(
      createSupabaseMock({ subscriptions: { id: 'sub_1', user_id: USER_ID, status: 'active' } })
    );
    const response = await callPost({ type: 'subscription', id: 'sub_1' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ status: 'active', reconciled: false });
    expect(mockGetPaymentStatus).not.toHaveBeenCalled();
    expect(mockHandlePaymentConfirmed).not.toHaveBeenCalled();
  });

  it('returns 409 when the pending order has no invoice yet', async () => {
    mockCreateUserClient.mockReturnValue(
      createSupabaseMock({ subscriptions: { id: 'sub_1', user_id: USER_ID, status: 'incomplete' } })
    );
    const response = await callPost({ type: 'subscription', id: 'sub_1' });
    expect(response.status).toBe(409);
  });

  it('requires a payment ID when no signed IPN has supplied one', async () => {
    mockCreateUserClient.mockReturnValue(
      createSupabaseMock({
        subscriptions: {
          id: 'sub_1',
          user_id: USER_ID,
          status: 'incomplete',
          nowpayments_invoice_id: 'inv_1',
        },
      })
    );
    const response = await callPost({ type: 'subscription', id: 'sub_1' });
    expect(response.status).toBe(409);
    expect(mockGetPaymentStatus).not.toHaveBeenCalled();
  });

  it('uses a payment ID already recorded by an earlier IPN', async () => {
    mockCreateUserClient.mockReturnValue(
      createSupabaseMock({
        subscriptions: {
          id: 'sub_1',
          user_id: USER_ID,
          status: 'incomplete',
          nowpayments_invoice_id: 'inv_1',
          nowpayments_payment_id: '1001',
        },
      })
    );
    const response = await callPost({ type: 'subscription', id: 'sub_1' });
    expect(response.status).toBe(200);
    expect(mockGetPaymentStatus).toHaveBeenCalledWith('1001');
    expect(mockHandlePaymentConfirmed).toHaveBeenCalledTimes(1);
  });

  it('rejects a payment belonging to another invoice before any credits are granted', async () => {
    mockCreateUserClient.mockReturnValue(
      createSupabaseMock({
        credit_purchases: {
          id: 'top_1',
          user_id: USER_ID,
          status: 'incomplete',
          nowpayments_invoice_id: 'inv_1',
        },
      })
    );
    mockGetPaymentStatus.mockResolvedValue({
      id: '1001',
      status: 'finished',
      invoiceId: 'other_invoice',
      orderId: 'other_order',
      priceAmount: 99,
      priceCurrency: 'usd',
    });
    const response = await callPost({ type: 'topup', id: 'top_1', paymentId: '1001' });
    expect(response.status).toBe(409);
    expect(mockHandlePaymentConfirmed).not.toHaveBeenCalled();
    expect(mockRecordPaymentReference).not.toHaveBeenCalled();
  });

  it('runs handlePaymentConfirmed on a finished payment bound to the invoice', async () => {
    mockCreateUserClient.mockReturnValue(
      createSupabaseMock({
        subscriptions: {
          id: 'sub_1',
          user_id: USER_ID,
          status: 'incomplete',
          nowpayments_invoice_id: 'inv_1',
        },
      })
    );
    mockGetPaymentStatus.mockResolvedValue({
      id: '1001',
      status: 'finished',
      priceAmount: 229,
      priceCurrency: 'usd',
      orderId: 'sub_1',
      invoiceId: 'inv_1',
    });

    const response = await callPost({ type: 'subscription', id: 'sub_1', paymentId: '1001' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockHandlePaymentConfirmed).toHaveBeenCalledTimes(1);
    expect(mockHandlePaymentConfirmed.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        invoice_id: 'inv_1',
        order_id: 'sub_1',
        payment_status: 'finished',
        price_amount: 229,
        price_currency: 'usd',
      })
    );
    expect(body.data).toEqual(
      expect.objectContaining({ reconciled: true, providerStatus: 'finished' })
    );
  });

  it('routes partially_paid to handlePartiallyPaid', async () => {
    mockCreateUserClient.mockReturnValue(
      createSupabaseMock({
        credit_purchases: {
          id: 'top_1',
          user_id: USER_ID,
          status: 'incomplete',
          nowpayments_invoice_id: 'inv_2',
        },
      })
    );
    mockGetPaymentStatus.mockResolvedValue({
      id: '1002',
      status: 'partially_paid',
      invoiceId: 'inv_2',
      orderId: 'top_1',
    });

    await callPost({ type: 'topup', id: 'top_1', paymentId: '1002' });

    expect(mockHandlePartiallyPaid).toHaveBeenCalledTimes(1);
    expect(mockHandlePaymentConfirmed).not.toHaveBeenCalled();
  });

  it('routes expired/failed to handlePaymentExpiredOrFailed', async () => {
    mockCreateUserClient.mockReturnValue(
      createSupabaseMock({
        subscriptions: {
          id: 'sub_1',
          user_id: USER_ID,
          status: 'incomplete',
          nowpayments_invoice_id: 'inv_3',
        },
      })
    );
    mockGetPaymentStatus.mockResolvedValue({
      id: '1003',
      status: 'expired',
      invoiceId: 'inv_3',
      orderId: 'sub_1',
    });

    await callPost({ type: 'subscription', id: 'sub_1', paymentId: '1003' });

    expect(mockHandlePaymentExpiredOrFailed).toHaveBeenCalledTimes(1);
  });

  it('leaves the row untouched while the provider still reports in-progress', async () => {
    mockCreateUserClient.mockReturnValue(
      createSupabaseMock({
        subscriptions: {
          id: 'sub_1',
          user_id: USER_ID,
          status: 'incomplete',
          nowpayments_invoice_id: 'inv_4',
        },
      })
    );
    mockGetPaymentStatus.mockResolvedValue({
      id: '1004',
      status: 'waiting',
      invoiceId: 'inv_4',
      orderId: 'sub_1',
    });

    const response = await callPost({ type: 'subscription', id: 'sub_1', paymentId: '1004' });
    const body = await response.json();

    expect(mockHandlePaymentConfirmed).not.toHaveBeenCalled();
    expect(mockHandlePartiallyPaid).not.toHaveBeenCalled();
    expect(mockHandlePaymentExpiredOrFailed).not.toHaveBeenCalled();
    expect(body.data).toEqual(
      expect.objectContaining({ reconciled: true, providerStatus: 'waiting' })
    );
  });

  it('returns 502 when the payment provider is unreachable', async () => {
    mockCreateUserClient.mockReturnValue(
      createSupabaseMock({
        subscriptions: {
          id: 'sub_1',
          user_id: USER_ID,
          status: 'incomplete',
          nowpayments_invoice_id: 'inv_5',
        },
      })
    );
    mockGetPaymentStatus.mockResolvedValue(null);

    const response = await callPost({ type: 'subscription', id: 'sub_1', paymentId: '1005' });
    expect(response.status).toBe(502);
  });
});
