/**
 * Unit tests for GET /api/billing/subscription — verifies the "prefer the
 * active/past_due subscription over a stale incomplete one" fix (P3), so an
 * abandoned checkout can never mask the user's real subscription in the
 * billing panel.
 */

import { GET } from '../route';

jest.mock('@/lib/api/handler', () => {
  const actual = jest.requireActual('@/lib/api/handler');
  return {
    ...actual,
    createApiHandler: (handler: unknown) => handler,
    createOptionsHandler: () => () => new Response(null, { status: 204 }),
    ApiResponseBuilder: actual.ApiResponseBuilder,
  };
});

function createSupabaseMock(rows: Record<string, unknown[] | null>) {
  const client = {
    from: jest.fn((table: string) => {
      const data = rows[table] ?? [];
      const chain: Record<string, unknown> = {};
      for (const fn of ['select', 'eq', 'order', 'limit']) {
        chain[fn] = jest.fn(() => chain);
      }
      chain.maybeSingle = jest.fn().mockResolvedValue({ data: data[0] ?? null });
      chain.single = jest.fn().mockResolvedValue({ data: data[0] ?? null });
      // .order(...).limit(...) resolves to the array.
      chain.then = jest.fn((resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data, error: null }).then(resolve)
      );
      return chain;
    }),
  };
  return client;
}

const mockCreateUserClient = jest.fn();
const mockCreateServiceRoleClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createUserClient: (...args: unknown[]) => mockCreateUserClient(...args),
  createServiceRoleClient: (...args: unknown[]) => mockCreateServiceRoleClient(...args),
}));

async function callGet(context: Record<string, unknown> = {}): Promise<Response> {
  const request = new Request('https://www.oracleinsight.xyz/api/billing/subscription');
  return GET(request, {
    requestId: 'test',
    auth: { userId: 'user_1', accessToken: 'tok' },
    ...context,
  } as never);
}

describe('GET /api/billing/subscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the active subscription when a newer incomplete checkout exists', async () => {
    const activeSub = {
      id: 'sub_active',
      user_id: 'user_1',
      plan: 'team',
      status: 'active',
      interval: 'month',
    };
    const staleIncomplete = {
      id: 'sub_stale',
      user_id: 'user_1',
      plan: 'developer',
      status: 'incomplete',
      interval: 'month',
    };
    mockCreateUserClient.mockReturnValue(
      createSupabaseMock({ subscriptions: [staleIncomplete, activeSub] })
    );
    mockCreateServiceRoleClient.mockReturnValue(createSupabaseMock({ api_keys: [] }));

    const response = await callGet();
    const body = await response.json();

    expect(response.status).toBe(200);
    // newest row is incomplete, but we must surface the active one.
    expect(body.data.subscription.id).toBe('sub_active');
    expect(body.data.subscription.status).toBe('active');
  });

  it('prefers past_due over a newer incomplete row', async () => {
    mockCreateUserClient.mockReturnValue(
      createSupabaseMock({
        subscriptions: [
          { id: 'sub_new', user_id: 'user_1', status: 'incomplete' },
          { id: 'sub_pd', user_id: 'user_1', status: 'past_due' },
        ],
      })
    );
    mockCreateServiceRoleClient.mockReturnValue(createSupabaseMock({ api_keys: [] }));

    const body = await (await callGet()).json();
    expect(body.data.subscription.id).toBe('sub_pd');
  });

  it('falls back to the latest row when none is active or past_due', async () => {
    mockCreateUserClient.mockReturnValue(
      createSupabaseMock({
        subscriptions: [
          { id: 'sub_latest', user_id: 'user_1', status: 'canceled' },
          { id: 'sub_older', user_id: 'user_1', status: 'canceled' },
        ],
      })
    );
    mockCreateServiceRoleClient.mockReturnValue(createSupabaseMock({ api_keys: [] }));

    const body = await (await callGet()).json();
    expect(body.data.subscription.id).toBe('sub_latest');
  });

  it('returns null subscription when the user has none', async () => {
    mockCreateUserClient.mockReturnValue(createSupabaseMock({ subscriptions: [] }));
    mockCreateServiceRoleClient.mockReturnValue(createSupabaseMock({ api_keys: [] }));

    const body = await (await callGet()).json();
    expect(body.data.subscription).toBeNull();
  });
});
