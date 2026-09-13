import { GET } from '../route';

jest.mock('@/lib/api/handler', () => {
  const actual = jest.requireActual('@/lib/api/handler');
  return {
    ...actual,
    createApiHandler: (handler: unknown) => handler,
    ApiResponseBuilder: actual.ApiResponseBuilder,
  };
});

const mockGetWalletBalance = jest.fn();
jest.mock('@/lib/billing/creditWallet', () => ({
  getWalletBalance: (...args: unknown[]) => mockGetWalletBalance(...args),
}));

const rowsByTable: Record<string, unknown[]> = {};
const mockFrom = jest.fn((table: string) => {
  const chain: Record<string, jest.Mock> = {};
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.limit = jest.fn().mockResolvedValue({ data: rowsByTable[table] ?? [] });
  return chain;
});
jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({ from: mockFrom }),
}));

function makeRequest(): Request {
  return new Request('https://www.oracleinsight.xyz/api/billing/wallet');
}

describe('GET /api/billing/wallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      const chain: Record<string, jest.Mock> = {};
      chain.select = jest.fn(() => chain);
      chain.eq = jest.fn(() => chain);
      chain.order = jest.fn(() => chain);
      chain.limit = jest.fn().mockResolvedValue({ data: rowsByTable[table] ?? [] });
      return chain;
    });
    rowsByTable.credit_purchases = [];
    rowsByTable.credit_ledger = [];
    mockGetWalletBalance.mockResolvedValue({ balance: 500, frozen: 20 });
  });

  it('rejects a request without an authenticated user', async () => {
    const response = await GET(makeRequest(), { requestId: 'test', auth: {} } as never);

    expect(response.status).toBe(401);
    expect(mockGetWalletBalance).not.toHaveBeenCalled();
  });

  it('returns the caller wallet, pending purchases, and recent ledger rows', async () => {
    rowsByTable.credit_purchases = [
      {
        id: 'purchase_1',
        credits: '25000',
        nowpayments_invoice_id: 'invoice_1',
        created_at: '2026-09-06T00:00:00.000Z',
      },
    ];
    rowsByTable.credit_ledger = [
      {
        delta: '-5',
        kind: 'api_usage',
        ref_id: 'request_1',
        created_at: '2026-09-06T00:01:00.000Z',
      },
    ];

    const response = await GET(makeRequest(), {
      requestId: 'test',
      auth: { userId: 'user_wallet', accessToken: 'token' },
    } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetWalletBalance).toHaveBeenCalledWith('user_wallet');
    expect(body.data).toEqual({
      balance: 500,
      frozen: 20,
      pending: [
        {
          id: 'purchase_1',
          credits: 25_000,
          invoiceId: 'invoice_1',
          createdAt: '2026-09-06T00:00:00.000Z',
        },
      ],
      recent: [
        {
          delta: -5,
          kind: 'api_usage',
          ref: 'request_1',
          createdAt: '2026-09-06T00:01:00.000Z',
        },
      ],
    });
  });

  it('uses zero balances and empty lists when no wallet exists yet', async () => {
    mockGetWalletBalance.mockResolvedValue(null);

    const response = await GET(makeRequest(), {
      requestId: 'test',
      auth: { userId: 'new_user', accessToken: 'token' },
    } as never);
    const body = await response.json();

    expect(body.data).toEqual({ balance: 0, frozen: 0, pending: [], recent: [] });
  });
});
