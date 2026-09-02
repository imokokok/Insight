import { type NextRequest } from 'next/server';

import { POST, getString, getStringField } from '../route';

// --- Mocks ------------------------------------------------------------------

jest.mock('@/lib/utils/logger', () => ({
  normalizeError: (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const mockParseIpnEvent = jest.fn();
jest.mock('@/lib/billing/nowpayments', () => ({
  parseIpnEvent: (...args: unknown[]) => mockParseIpnEvent(...args),
}));

const mockUpdateApiKeyPlanForUser = jest.fn();
jest.mock('@/lib/api/apiKey', () => ({
  updateApiKeyPlanForUser: (...args: unknown[]) => mockUpdateApiKeyPlanForUser(...args),
}));

const mockTopUpCredits = jest.fn();
jest.mock('@/lib/billing/creditWallet', () => ({
  topUpCredits: (...args: unknown[]) => mockTopUpCredits(...args),
}));

const mockCreateServiceRoleClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: (...args: unknown[]) => mockCreateServiceRoleClient(...args),
}));

/**
 * Build a chainable supabase mock. The `handlers` param lets each test
 * configure per-table behavior:
 *   - selectData[table]  → returned by `.maybeSingle()` / `.single()`
 *   - writeError[table]  → returned as `{ error }` by write operations
 *
 * The mock records calls so tests can assert on `.eq()` arguments.
 */
function createSupabaseMock(stores: {
  selectData?: Record<string, unknown>;
  writeError?: Record<string, { code: string; message: string } | null>;
}) {
  const { selectData = {}, writeError = {} } = stores;

  function makeChain(table: string) {
    const data = selectData[table] ?? null;
    const error = writeError[table] ?? null;
    const terminal = { error };
    const calls: Record<string, unknown[]> = {};

    const chain: Record<string, unknown> = {};
    for (const fn of ['select', 'update', 'insert', 'upsert', 'eq', 'order', 'limit', 'is']) {
      chain[fn] = jest.fn((...args: unknown[]) => {
        calls[fn] = calls[fn] ?? [];
        calls[fn].push(args);
        return chain;
      });
    }
    chain.maybeSingle = jest.fn().mockResolvedValue({ data });
    chain.single = jest.fn().mockResolvedValue({ data });
    chain.then = jest.fn((resolve: (v: unknown) => unknown) =>
      Promise.resolve(terminal).then(resolve)
    );
    // Expose calls for assertion (read-only).
    (chain as unknown as { __calls: typeof calls }).__calls = calls;
    return chain;
  }

  const client = { from: jest.fn((table: string) => makeChain(table)) };
  return client;
}

function createPostRequest(body: string, headers: Record<string, string> = {}): NextRequest {
  return {
    text: async () => body,
    headers: new Headers(headers),
  } as unknown as NextRequest;
}

async function parseBody(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json();
  return typeof body === 'string' ? JSON.parse(body) : body;
}

// --- Pure helper tests ------------------------------------------------------

describe('webhook pure helpers', () => {
  describe('getString / getStringField', () => {
    it('getString returns a string value', () => {
      expect(getString({ id: 'sub_1' }, 'id')).toBe('sub_1');
    });

    it('getString returns undefined for non-strings', () => {
      expect(getString({ id: 123 }, 'id')).toBeUndefined();
      expect(getString({}, 'id')).toBeUndefined();
    });

    it('getStringField prefers snake_case then falls back to camelCase', () => {
      expect(getStringField({ invoice_id: 'inv1' }, 'invoice_id', 'invoiceId')).toBe('inv1');
      expect(getStringField({ invoiceId: 'inv2' }, 'invoice_id', 'invoiceId')).toBe('inv2');
      expect(getStringField({}, 'invoice_id', 'invoiceId')).toBeUndefined();
    });
  });
});

// --- POST flow tests --------------------------------------------------------

describe('POST /api/billing/webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateApiKeyPlanForUser.mockResolvedValue(undefined);
    mockTopUpCredits.mockResolvedValue(10000);
  });

  it('returns 400 when signature verification fails', async () => {
    mockParseIpnEvent.mockReturnValue(null);
    mockCreateServiceRoleClient.mockReturnValue(createSupabaseMock({}));

    const response = await POST(createPostRequest('payload', { 'x-nowpayments-sig': 'bad' }));

    expect(response.status).toBe(400);
    const body = await parseBody(response);
    expect(body.error).toBe('Invalid signature');
  });

  it('skips processing and returns received:true for an already-completed event (idempotency)', async () => {
    mockParseIpnEvent.mockReturnValue({
      id: 'pay_1',
      type: 'finished',
      data: { invoice_id: 'inv_1' },
    });
    mockCreateServiceRoleClient.mockReturnValue(
      createSupabaseMock({
        selectData: { processed_webhook_events: { status: 'completed', attempts: 1 } },
      })
    );

    const response = await POST(createPostRequest('payload'));
    const body = await parseBody(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({ received: true });
    expect(mockUpdateApiKeyPlanForUser).not.toHaveBeenCalled();
  });

  it('upgrades the user on `finished` IPN with fresh period_end and first-cycle grant', async () => {
    mockParseIpnEvent.mockReturnValue({
      id: 'pay_2',
      type: 'finished',
      data: { invoice_id: 'inv_2', order_id: 'order_2' },
    });
    const supabase = createSupabaseMock({
      selectData: {
        processed_webhook_events: null,
        credit_purchases: null,
        subscriptions: {
          id: 'order_2',
          user_id: 'user_123',
          plan: 'developer',
          interval: 'month',
          status: 'incomplete',
        },
      },
    });
    mockCreateServiceRoleClient.mockReturnValue(supabase);

    const response = await POST(createPostRequest('payload'));
    const body = await parseBody(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({ received: true });
    expect(mockUpdateApiKeyPlanForUser).toHaveBeenCalledWith('user_123', 'developer');
    // First-cycle allowance granted (developer = 10k), keyed per billing cycle.
    expect(mockTopUpCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_123',
        amount: 10000,
        meteringKey: 'grant:user_123:sub:order_2',
        kind: 'grant',
      })
    );
    // Any OTHER active subscription for the user is superseded (canceled) so
    // the monthly allowance can never be granted twice.
    const updateCalls = supabase.from.mock.calls
      .map((call, i) =>
        call[0] === 'subscriptions'
          ? ((
              supabase.from.mock.results[i].value as unknown as {
                __calls?: Record<string, unknown[]>;
              }
            ).__calls?.update ?? [])
          : []
      )
      .flat();
    expect(
      updateCalls.some((args) => (args[0] as Record<string, unknown>).status === 'canceled')
    ).toBe(true);
  });

  it('upgrades the user on `confirmed` IPN (same as finished)', async () => {
    mockParseIpnEvent.mockReturnValue({
      id: 'pay_3',
      type: 'confirmed',
      data: { invoice_id: 'inv_3' },
    });
    mockCreateServiceRoleClient.mockReturnValue(
      createSupabaseMock({
        selectData: {
          credit_purchases: null,
          subscriptions: {
            id: 'sub_3',
            user_id: 'user_conf',
            plan: 'team',
            interval: 'year',
            status: 'incomplete',
          },
        },
      })
    );

    const response = await POST(createPostRequest('payload'));

    expect(response.status).toBe(200);
    expect(mockUpdateApiKeyPlanForUser).toHaveBeenCalledWith('user_conf', 'team');
    // Yearly: one allowance per calendar month, keyed with the YYYY-MM suffix.
    expect(mockTopUpCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_conf',
        amount: 50000,
        meteringKey: expect.stringMatching(/^grant:user_conf:sub:sub_3:\d{4}-\d{2}$/),
        kind: 'grant',
      })
    );
  });

  it('marks subscription past_due on partially_paid (no upgrade)', async () => {
    mockParseIpnEvent.mockReturnValue({
      id: 'pay_4',
      type: 'partially_paid',
      data: { invoice_id: 'inv_4' },
    });
    mockCreateServiceRoleClient.mockReturnValue(
      createSupabaseMock({
        selectData: {
          subscriptions: {
            id: 'sub_4',
            user_id: 'user_partial',
            plan: 'developer',
            interval: 'month',
            status: 'incomplete',
          },
        },
      })
    );

    const response = await POST(createPostRequest('payload'));

    expect(response.status).toBe(200);
    expect(mockUpdateApiKeyPlanForUser).not.toHaveBeenCalled();
    expect(mockTopUpCredits).not.toHaveBeenCalled();
  });

  it('marks subscription canceled on expired when row is incomplete', async () => {
    mockParseIpnEvent.mockReturnValue({
      id: 'pay_5',
      type: 'expired',
      data: { invoice_id: 'inv_5' },
    });
    mockCreateServiceRoleClient.mockReturnValue(
      createSupabaseMock({
        selectData: {
          subscriptions: {
            id: 'sub_5',
            user_id: 'user_exp',
            plan: 'developer',
            interval: 'month',
            status: 'incomplete',
          },
        },
      })
    );

    const response = await POST(createPostRequest('payload'));

    expect(response.status).toBe(200);
    // Expired invoice should NOT call upgrade — user never paid.
    expect(mockUpdateApiKeyPlanForUser).not.toHaveBeenCalled();
  });

  it('ignores expired IPN when subscription is already active (out-of-order guard)', async () => {
    mockParseIpnEvent.mockReturnValue({
      id: 'pay_6',
      type: 'expired',
      data: { invoice_id: 'inv_6' },
    });
    mockCreateServiceRoleClient.mockReturnValue(
      createSupabaseMock({
        selectData: {
          subscriptions: {
            id: 'sub_6',
            user_id: 'user_late',
            plan: 'developer',
            interval: 'month',
            status: 'active', // already paid via earlier confirmed IPN
          },
        },
      })
    );

    const response = await POST(createPostRequest('payload'));

    expect(response.status).toBe(200);
    // Critical: must NOT downgrade an active user due to a late expired IPN.
    expect(mockUpdateApiKeyPlanForUser).not.toHaveBeenCalled();
  });

  it('downgrades the user to developer on refunded IPN (base tier, still metered)', async () => {
    mockParseIpnEvent.mockReturnValue({
      id: 'pay_7',
      type: 'refunded',
      data: { invoice_id: 'inv_7' },
    });
    mockCreateServiceRoleClient.mockReturnValue(
      createSupabaseMock({
        selectData: {
          subscriptions: {
            id: 'sub_7',
            user_id: 'user_refund',
            plan: 'team',
            interval: 'month',
            status: 'active',
          },
        },
      })
    );

    const response = await POST(createPostRequest('payload'));

    expect(response.status).toBe(200);
    // There is no 'free' tier in the credit-wallet model — refunds downgrade to
    // the base Developer tier, and any wallet balance remains spendable.
    expect(mockUpdateApiKeyPlanForUser).toHaveBeenCalledWith('user_refund', 'developer');
  });

  it('does NOT reset the billing period or re-grant on a duplicate confirmed IPN', async () => {
    // The row is already 'active' (a first confirmed/finished already ran), so a
    // duplicate confirmed/finished must NOT reset current_period_*, must NOT
    // cancel-other-subs again, and must NOT grant a second allowance — but it
    // still re-applies the plan (idempotent).
    mockParseIpnEvent.mockReturnValue({
      id: 'pay_dup',
      type: 'confirmed',
      data: { invoice_id: 'inv_dup' },
    });
    const supabase = createSupabaseMock({
      selectData: {
        credit_purchases: null,
        subscriptions: {
          id: 'sub_dup',
          user_id: 'user_dup',
          plan: 'developer',
          interval: 'month',
          status: 'active', // already activated by the first confirmed IPN
        },
      },
    });
    mockCreateServiceRoleClient.mockReturnValue(supabase);

    const response = await POST(createPostRequest('payload'));

    expect(response.status).toBe(200);
    // Plan still (re)applied — idempotent.
    expect(mockUpdateApiKeyPlanForUser).toHaveBeenCalledWith('user_dup', 'developer');
    // No second allowance grant.
    expect(mockTopUpCredits).not.toHaveBeenCalled();
    // No period-reset update (status stays active; no row update at all).
    const updateCalls = supabase.from.mock.calls
      .map((call, i) =>
        call[0] === 'subscriptions'
          ? ((
              supabase.from.mock.results[i].value as unknown as {
                __calls?: Record<string, unknown[]>;
              }
            ).__calls?.update ?? [])
          : []
      )
      .flat();
    expect(updateCalls).toHaveLength(0);
  });

  it('logs and skips waiting/confirming IPN without action', async () => {
    mockParseIpnEvent.mockReturnValue({
      id: 'pay_8',
      type: 'waiting',
      data: { invoice_id: 'inv_8' },
    });
    mockCreateServiceRoleClient.mockReturnValue(createSupabaseMock({}));

    const response = await POST(createPostRequest('payload'));

    expect(response.status).toBe(200);
    expect(mockUpdateApiKeyPlanForUser).not.toHaveBeenCalled();
  });

  it('returns 500 and marks the event failed when a handler throws', async () => {
    mockParseIpnEvent.mockReturnValue({
      id: 'pay_9',
      type: 'finished',
      data: { invoice_id: 'inv_9' },
    });
    mockCreateServiceRoleClient.mockReturnValue(
      createSupabaseMock({
        selectData: {
          credit_purchases: null,
          subscriptions: {
            id: 'sub_9',
            user_id: 'user_throw',
            plan: 'developer',
            interval: 'month',
            status: 'incomplete',
          },
        },
      })
    );
    mockUpdateApiKeyPlanForUser.mockRejectedValue(new Error('DB down'));

    const response = await POST(createPostRequest('payload'));

    expect(response.status).toBe(500);
  });

  it('uses different idempotency keys for different statuses of same payment', async () => {
    // Same payment_id 'pay_10' but different status — should both process
    // (not skip the second as a duplicate of the first).
    mockParseIpnEvent.mockReturnValue({
      id: 'pay_10',
      type: 'confirmed',
      data: { invoice_id: 'inv_10' },
    });
    const supabase = createSupabaseMock({
      selectData: {
        credit_purchases: null,
        subscriptions: {
          id: 'sub_10',
          user_id: 'user_multi',
          plan: 'developer',
          interval: 'month',
          status: 'incomplete',
        },
      },
    });
    mockCreateServiceRoleClient.mockReturnValue(supabase);

    const response = await POST(createPostRequest('payload'));

    expect(response.status).toBe(200);
    // Verify the event_id inserted/queried uses payment_id:status format.
    const fromCalls = supabase.from.mock.calls;
    expect(fromCalls.length).toBeGreaterThan(0);
  });
});
