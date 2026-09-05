/**
 * Unit tests for POST /api/billing/signup-grant — the one-time trial credit.
 * Verifies the email-verification gate, the idempotent per-user grant, and the
 * granted vs. already-granted response shapes.
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

const mockTopUpCredits = jest.fn();
jest.mock('@/lib/billing/creditWallet', () => ({
  topUpCredits: (...args: unknown[]) => mockTopUpCredits(...args),
}));

const mockCreateServiceRoleClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: (...args: unknown[]) => mockCreateServiceRoleClient(...args),
}));

function createServiceMock(options: { emailConfirmedAt: string | null; existingGrant: boolean }) {
  const client = {
    auth: {
      admin: {
        getUserById: jest.fn().mockResolvedValue({
          data: {
            user: { id: 'user_1', email_confirmed_at: options.emailConfirmedAt },
          },
          error: null,
        }),
      },
    },
    from: jest.fn((_table: string) => {
      const chain: Record<string, unknown> = {};
      for (const fn of ['select', 'eq', 'order', 'limit']) {
        chain[fn] = jest.fn(() => chain);
      }
      chain.maybeSingle = jest.fn().mockResolvedValue({
        data: options.existingGrant ? { id: 1 } : null,
        error: null,
      });
      return chain;
    }),
  };
  return client;
}

async function callPost(context: Record<string, unknown> = {}): Promise<Response> {
  const request = new Request('https://www.oracleinsight.xyz/api/billing/signup-grant', {
    method: 'POST',
  });
  return POST(request, {
    requestId: 'test',
    auth: { userId: 'user_1' },
    ...context,
  } as never);
}

describe('POST /api/billing/signup-grant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTopUpCredits.mockResolvedValue(100);
  });

  it('returns 401 without an authenticated user', async () => {
    const response = await callPost({ auth: {} });
    expect(response.status).toBe(401);
  });

  it('refuses to grant to an unverified email (403)', async () => {
    mockCreateServiceRoleClient.mockReturnValue(
      createServiceMock({ emailConfirmedAt: null, existingGrant: false })
    );
    const response = await callPost();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('EMAIL_NOT_VERIFIED');
    expect(mockTopUpCredits).not.toHaveBeenCalled();
  });

  it('grants 100 credits once to a verified new user', async () => {
    mockCreateServiceRoleClient.mockReturnValue(
      createServiceMock({ emailConfirmedAt: '2026-09-03T00:00:00Z', existingGrant: false })
    );
    const response = await callPost();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ granted: true, balance: 100 });
    expect(mockTopUpCredits).toHaveBeenCalledWith({
      userId: 'user_1',
      amount: 100,
      meteringKey: 'signup:user_1',
      kind: 'grant',
      ref: 'signup',
    });
  });

  it('is a no-op (granted:false) when the user already claimed it', async () => {
    mockCreateServiceRoleClient.mockReturnValue(
      createServiceMock({ emailConfirmedAt: '2026-09-03T00:00:00Z', existingGrant: true })
    );
    mockTopUpCredits.mockResolvedValue(100);

    const response = await callPost();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ granted: false, balance: 100 });
    // topUpCredits is still called — idempotent server-side, same key.
    expect(mockTopUpCredits).toHaveBeenCalledWith(
      expect.objectContaining({ meteringKey: 'signup:user_1' })
    );
  });

  it('returns 500 when the grant RPC fails', async () => {
    mockCreateServiceRoleClient.mockReturnValue(
      createServiceMock({ emailConfirmedAt: '2026-09-03T00:00:00Z', existingGrant: false })
    );
    mockTopUpCredits.mockResolvedValue(null);

    const response = await callPost();
    expect(response.status).toBe(500);
  });

  it('returns 500 when the admin lookup fails', async () => {
    const client = createServiceMock({
      emailConfirmedAt: '2026-09-03T00:00:00Z',
      existingGrant: false,
    });
    client.auth.admin.getUserById.mockResolvedValue({ data: null, error: { message: 'boom' } });
    mockCreateServiceRoleClient.mockReturnValue(client);

    const response = await callPost();
    expect(response.status).toBe(500);
    expect(mockTopUpCredits).not.toHaveBeenCalled();
  });
});
