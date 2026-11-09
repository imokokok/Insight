import { type NextRequest } from 'next/server';

import { validateApiKey } from '../../apiKey';
import { createAuthMiddleware } from '../authMiddleware';

jest.mock('../../apiKey', () => ({ validateApiKey: jest.fn() }));

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
});
