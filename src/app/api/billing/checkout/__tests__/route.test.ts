import { POST } from '../route';

jest.mock('@/lib/api/handler', () => {
  const actual = jest.requireActual('@/lib/api/handler');
  return {
    ...actual,
    createApiHandler: (handler: unknown) => handler,
    ApiResponseBuilder: actual.ApiResponseBuilder,
  };
});

const mockCreateInvoice = jest.fn();
jest.mock('@/lib/billing/nowpayments', () => ({
  createInvoice: (...args: unknown[]) => mockCreateInvoice(...args),
}));

const mockInsert = jest.fn();
const mockFrom = jest.fn(() => ({ insert: mockInsert }));
jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({ from: mockFrom }),
}));

jest.mock('@/lib/utils/appUrl', () => ({
  getAppUrl: () => 'https://www.oracleinsight.xyz',
}));

const USER_ID = 'user_checkout';

function makeRequest(body: unknown): Request {
  return new Request('https://www.oracleinsight.xyz/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function callPost(body: unknown): Promise<Response> {
  return POST(makeRequest(body), {
    requestId: 'test',
    auth: { userId: USER_ID, accessToken: 'token' },
  } as never);
}

describe('POST /api/billing/checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation(() => ({ insert: mockInsert }));
    mockCreateInvoice.mockResolvedValue({
      invoiceId: 'invoice_1',
      invoiceUrl: 'https://nowpayments.io/payment?iid=invoice_1',
    });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('rejects a request without an authenticated user', async () => {
    const response = await POST(makeRequest({ type: 'topup', pack: 'starter' }), {
      requestId: 'test',
      auth: {},
    } as never);

    expect(response.status).toBe(401);
    expect(mockCreateInvoice).not.toHaveBeenCalled();
  });

  it('rejects missing type-specific fields before creating an invoice', async () => {
    const response = await callPost({ type: 'subscription', plan: 'developer' });

    expect(response.status).toBe(400);
    expect(mockCreateInvoice).not.toHaveBeenCalled();
  });

  it('creates and records a prepaid credit invoice', async () => {
    const response = await callPost({ type: 'topup', pack: 'starter' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockCreateInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        priceAmount: 39,
        priceCurrency: 'usd',
        ipnCallbackUrl: 'https://www.oracleinsight.xyz/api/billing/webhook',
      })
    );
    expect(mockFrom).toHaveBeenCalledWith('credit_purchases');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ID,
        credits: 25_000,
        price_usd: 39,
        nowpayments_invoice_id: 'invoice_1',
        status: 'incomplete',
      })
    );
    expect(body.data.url).toContain('nowpayments.io/payment');
  });

  it('records the subscription before returning the invoice URL', async () => {
    const response = await callPost({
      type: 'subscription',
      plan: 'developer',
      interval: 'month',
    });

    expect(response.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledWith('subscriptions');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ID,
        plan: 'developer',
        interval: 'month',
        payment_provider: 'nowpayments',
        nowpayments_invoice_id: 'invoice_1',
        status: 'incomplete',
      })
    );
  });

  it('does not write a pending order when invoice creation fails', async () => {
    mockCreateInvoice.mockResolvedValue({ error: 'provider unavailable' });

    const response = await callPost({ type: 'topup', pack: 'starter' });

    expect(response.status).toBe(502);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('returns a recoverable server error when the invoice cannot be recorded', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'database unavailable' } });

    const response = await callPost({ type: 'topup', pack: 'starter' });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
