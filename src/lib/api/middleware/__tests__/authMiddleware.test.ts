import { type NextRequest } from 'next/server';

import { createUserClient } from '@/lib/supabase/server';

import { ApiKeyStoreUnavailableError, validateApiKey } from '../../apiKey';
import { createAuthMiddleware } from '../authMiddleware';

jest.mock('@/lib/supabase/server', () => ({ createUserClient: jest.fn() }));

jest.mock('../../apiKey', () => ({
  ApiKeyStoreUnavailableError: class extends Error {},
  validateApiKey: jest.fn(),
}));

const mockedValidateApiKey = validateApiKey as jest.MockedFunction<typeof validateApiKey>;
const mockedCreateUserClient = createUserClient as jest.MockedFunction<typeof createUserClient>;

function apiKeyRequest(): NextRequest {
  return {
    headers: new Headers({ 'x-api-key': 'ik_test' }),
    nextUrl: new URL('https://example.test/api/internal'),
  } as unknown as NextRequest;
}

function bearerRequest(token: string): NextRequest {
  return {
    headers: new Headers({ authorization: `Bearer ${token}` }),
    nextUrl: new URL('https://example.test/api/internal'),
  } as unknown as NextRequest;
}

describe('auth middleware role checks', () => {
  afterEach(() => jest.resetAllMocks());

  it('rejects an API key when the route requires a user role', async () => {
    mockedValidateApiKey.mockResolvedValue({
      keyId: 'key_1',
      userId: 'user_1',
      plan: 'pro',
      rateLimit: 60,
      monthlyQuota: 1000,
    });

    const result = await createAuthMiddleware({
      allowApiKey: true,
      roles: ['admin'],
    })(apiKeyRequest());

    expect(result.success).toBe(false);
    if (!result.success) expect(result.response.status).toBe(403);
  });

  it('returns a retryable service error when the API key store is unavailable', async () => {
    mockedValidateApiKey.mockRejectedValue(new ApiKeyStoreUnavailableError());

    const result = await createAuthMiddleware({ requireApiKey: true })(apiKeyRequest());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(503);
      expect(result.response.headers.get('retry-after')).toBe('5');
      expect(result.response.headers.get('cache-control')).toBe('no-store');
      await expect(result.response.json()).resolves.toMatchObject({
        error: { code: 'API_KEY_STORE_UNAVAILABLE', retryable: true },
      });
    }
  });

  it('keeps an invalid bearer token as an unauthorized response', async () => {
    const getUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: { status: 401, message: 'Invalid JWT' },
    });
    mockedCreateUserClient.mockReturnValue({ auth: { getUser } } as never);

    const result = await createAuthMiddleware()(bearerRequest('invalid-token'));

    expect(result.success).toBe(false);
    if (!result.success) expect(result.response.status).toBe(401);
  });

  it('returns a retryable service error when Supabase Auth is unavailable', async () => {
    const getUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: { status: 503, message: 'Auth service unavailable' },
    });
    mockedCreateUserClient.mockReturnValue({ auth: { getUser } } as never);

    const result = await createAuthMiddleware()(bearerRequest('valid-token'));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(503);
      expect(result.response.headers.get('retry-after')).toBe('5');
      await expect(result.response.json()).resolves.toMatchObject({
        error: { code: 'AUTH_SERVICE_UNAVAILABLE', retryable: true },
      });
    }
  });
});
