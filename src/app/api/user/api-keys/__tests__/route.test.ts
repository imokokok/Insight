import { GET, POST } from '../route';

jest.mock('@/lib/api/handler', () => {
  const actual = jest.requireActual('@/lib/api/handler');
  return {
    ...actual,
    createApiHandler: (handler: unknown) => handler,
    createOptionsHandler: () => () => new Response(null, { status: 204 }),
  };
});

const mockListApiKeysForUser = jest.fn();
const mockCreateApiKeyForUser = jest.fn();
jest.mock('@/lib/api/apiKey', () => ({
  listApiKeysForUser: (...args: unknown[]) => mockListApiKeysForUser(...args),
  createApiKeyForUser: (...args: unknown[]) => mockCreateApiKeyForUser(...args),
}));

const USER_ID = 'user_keys';
const authContext = {
  requestId: 'test',
  auth: { userId: USER_ID, accessToken: 'token' },
};

function makePostRequest(body: unknown): Request {
  return new Request('https://www.oracleinsight.xyz/api/user/api-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/user/api-keys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListApiKeysForUser.mockResolvedValue([]);
  });

  it('rejects unauthenticated list requests', async () => {
    const response = await GET(new Request('https://example.com'), {
      requestId: 'test',
      auth: {},
    } as never);

    expect(response.status).toBe(401);
    expect(mockListApiKeysForUser).not.toHaveBeenCalled();
  });

  it('returns only the public API key fields', async () => {
    mockListApiKeysForUser.mockResolvedValue([
      {
        id: 'key_1',
        name: 'Production',
        key_prefix: 'ins_abcd',
        plan: 'developer',
        rate_limit: 30,
        last_used_at: null,
        created_at: '2026-09-06T00:00:00.000Z',
        key_hash: 'must-not-leak',
      },
    ]);

    const response = await GET(new Request('https://example.com'), authContext as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockListApiKeysForUser).toHaveBeenCalledWith(USER_ID);
    expect(body.data.keys[0]).toEqual({
      id: 'key_1',
      name: 'Production',
      prefix: 'ins_abcd',
      plan: 'developer',
      rateLimit: 30,
      lastUsedAt: null,
      createdAt: '2026-09-06T00:00:00.000Z',
    });
    expect(body.data.keys[0]).not.toHaveProperty('key_hash');
  });

  it('creates a key and returns its secret exactly once', async () => {
    mockCreateApiKeyForUser.mockResolvedValue({
      record: {
        id: 'key_2',
        name: 'Agent',
        key_prefix: 'ins_1234',
        plan: 'free',
        rate_limit: 10,
        created_at: '2026-09-06T00:00:00.000Z',
      },
      plainKey: 'ins_secret',
    });

    const response = await POST(makePostRequest({ name: 'Agent' }), authContext as never);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mockCreateApiKeyForUser).toHaveBeenCalledWith(USER_ID, 'Agent');
    expect(body.data.plainKey).toBe('ins_secret');
    expect(body.data.key).toEqual(
      expect.objectContaining({ id: 'key_2', prefix: 'ins_1234', name: 'Agent' })
    );
  });

  it('rejects an invalid key name without creating a key', async () => {
    const response = await POST(makePostRequest({ name: '' }), authContext as never);

    expect(response.status).toBe(400);
    expect(mockCreateApiKeyForUser).not.toHaveBeenCalled();
  });
});
