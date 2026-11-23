import { type NextRequest } from 'next/server';

import { ApiKeyStoreUnavailableError, validateApiKey } from '../../apiKey';
import { createAuthMiddleware } from '../authMiddleware';

jest.mock('../../apiKey', () => ({
  ApiKeyStoreUnavailableError: class extends Error {},
  validateApiKey: jest.fn(),
}));

const mockedValidateApiKey = validateApiKey as jest.MockedFunction<typeof validateApiKey>;

function apiKeyRequest(): NextRequest {
  return {
    headers: new Headers({ 'x-api-key': 'ik_test' }),
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
});
