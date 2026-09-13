import { DELETE, PATCH } from '../route';

jest.mock('@/lib/api/handler', () => {
  const actual = jest.requireActual('@/lib/api/handler');
  return {
    ...actual,
    createApiHandler: (handler: unknown) => handler,
  };
});

const mockRevokeApiKey = jest.fn();
const mockSetApiKeyBudget = jest.fn();
jest.mock('@/lib/api/apiKey', () => ({
  revokeApiKey: (...args: unknown[]) => mockRevokeApiKey(...args),
  setApiKeyBudget: (...args: unknown[]) => mockSetApiKeyBudget(...args),
}));

const USER_ID = 'user_keys';

function context(id?: string) {
  return {
    requestId: 'test',
    auth: { userId: USER_ID, accessToken: 'token' },
    validated: { params: id ? { id } : {} },
  };
}

function makePatchRequest(body: unknown): Request {
  return new Request('https://www.oracleinsight.xyz/api/user/api-keys/key_1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/user/api-keys/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRevokeApiKey.mockResolvedValue(undefined);
    mockSetApiKeyBudget.mockResolvedValue(undefined);
  });

  it('revokes only the authenticated user key', async () => {
    const response = await DELETE(new Request('https://example.com'), context('key_1') as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockRevokeApiKey).toHaveBeenCalledWith('key_1', USER_ID);
    expect(body.data).toEqual({ revoked: true });
  });

  it('rejects revocation when the route parameter is missing', async () => {
    const response = await DELETE(new Request('https://example.com'), context() as never);

    expect(response.status).toBe(400);
    expect(mockRevokeApiKey).not.toHaveBeenCalled();
  });

  it('sets a positive monthly key budget scoped to the caller', async () => {
    const response = await PATCH(makePatchRequest({ budgetMonthly: 1200 }), {
      ...context('key_1'),
    } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockSetApiKeyBudget).toHaveBeenCalledWith('key_1', USER_ID, 1200);
    expect(body.data).toEqual({ budgetMonthly: 1200 });
  });

  it('clears a monthly key budget with null', async () => {
    const response = await PATCH(makePatchRequest({ budgetMonthly: null }), {
      ...context('key_1'),
    } as never);

    expect(response.status).toBe(200);
    expect(mockSetApiKeyBudget).toHaveBeenCalledWith('key_1', USER_ID, null);
  });

  it('rejects invalid monthly budgets without updating the key', async () => {
    const response = await PATCH(makePatchRequest({ budgetMonthly: 0 }), {
      ...context('key_1'),
    } as never);

    expect(response.status).toBe(400);
    expect(mockSetApiKeyBudget).not.toHaveBeenCalled();
  });
});
