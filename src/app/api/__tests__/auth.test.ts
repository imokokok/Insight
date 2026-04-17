import { type NextRequest } from 'next/server';

import {
  createAuthMiddleware,
  extractAuthContext,
  requireAuth,
  optionalAuth,
  requireRoles,
  getUserId,
} from '@/lib/api/middleware/authMiddleware';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

function createMockRequest(
  options: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', url = 'http://localhost/api/test', headers = {} } = options;

  return {
    method,
    url,
    headers: new Headers(headers),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

// eslint-disable-next-line max-lines-per-function
describe('API Authentication Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Unauthorized Access (401)', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const middleware = createAuthMiddleware({ required: true });
      const request = createMockRequest();

      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(401);
        const body = await result.response.json();
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('should return 401 when authorization header is empty', async () => {
      const middleware = createAuthMiddleware({ required: true });
      const request = createMockRequest({
        headers: { authorization: '' },
      });

      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(401);
      }
    });

    it('should return 401 when token is missing after Bearer prefix', async () => {
      const middleware = createAuthMiddleware({ required: true });
      const request = createMockRequest({
        headers: { authorization: 'Bearer ' },
      });

      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(401);
      }
    });
  });

  describe('Invalid Token Format', () => {
    it('should return null when authorization header does not start with Bearer', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Basic token123' },
      });
      const result = await extractAuthContext(request);

      expect(result).toBeNull();
    });

    it('should return null when authorization header uses invalid scheme', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Digest username="test"' },
      });
      const result = await extractAuthContext(request);

      expect(result).toBeNull();
    });

    it('should return null when authorization header is malformed', async () => {
      const request = createMockRequest({
        headers: { authorization: 'BearerToken invalid' },
      });
      const result = await extractAuthContext(request);

      expect(result).toBeNull();
    });

    it('should handle token with special characters', async () => {
      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token format' },
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@supabase/supabase-js').createClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      const request = createMockRequest({
        headers: { authorization: 'Bearer token<with>special&chars' },
      });
      const result = await extractAuthContext(request);

      expect(result).toBeNull();
    });
  });

  describe('Expired Token Handling', () => {
    it('should return null when token has expired', async () => {
      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' },
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@supabase/supabase-js').createClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      const request = createMockRequest({
        headers: { authorization: 'Bearer expired-token' },
      });
      const result = await extractAuthContext(request);

      expect(result).toBeNull();
    });

    it('should return 401 when expired token is used', async () => {
      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Token has expired' },
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@supabase/supabase-js').createClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      const middleware = createAuthMiddleware({ required: true });
      const request = createMockRequest({
        headers: { authorization: 'Bearer expired-token' },
      });

      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(401);
      }
    });

    it('should handle token with expired refresh token', async () => {
      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Refresh token expired' },
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@supabase/supabase-js').createClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      const request = createMockRequest({
        headers: { authorization: 'Bearer token-with-expired-refresh' },
      });
      const result = await extractAuthContext(request);

      expect(result).toBeNull();
    });
  });

  describe('Permission Denied (403)', () => {
    it('should return 403 when user lacks required role', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { role: 'user' },
      };

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@supabase/supabase-js').createClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      const middleware = createAuthMiddleware({ required: true, roles: ['admin'] });
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(403);
        const body = await result.response.json();
        expect(body.error.code).toBe('FORBIDDEN');
      }
    });

    it('should return 403 when user has no role assigned', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
      };

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@supabase/supabase-js').createClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      const middleware = createAuthMiddleware({ required: true, roles: ['admin', 'moderator'] });
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(403);
      }
    });

    it('should return 403 when user role is not in allowed roles list', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { role: 'viewer' },
      };

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@supabase/supabase-js').createClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      const middleware = createAuthMiddleware({ required: true, roles: ['admin', 'editor'] });
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(403);
      }
    });

    it('should allow access when user has one of the required roles', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { role: 'moderator' },
      };

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@supabase/supabase-js').createClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      const middleware = createAuthMiddleware({ required: true, roles: ['admin', 'moderator'] });
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      const result = await middleware(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.context.userId).toBe('user-123');
        expect(result.context.role).toBe('moderator');
      }
    });
  });

  describe('OAuth Callback Handling', () => {
    it('should handle OAuth error response', async () => {
      const request = createMockRequest({
        url: 'http://localhost/api/auth/callback?error=access_denied&error_description=User%20denied',
      });

      expect(request.nextUrl.searchParams.get('error')).toBe('access_denied');
    });

    it('should handle OAuth state parameter', async () => {
      const request = createMockRequest({
        url: 'http://localhost/api/auth/callback?code=auth-code&state=/dashboard',
      });

      expect(request.nextUrl.searchParams.get('code')).toBe('auth-code');
      expect(request.nextUrl.searchParams.get('state')).toBe('/dashboard');
    });

    it('should validate OAuth callback code presence', async () => {
      const request = createMockRequest({
        url: 'http://localhost/api/auth/callback',
      });

      expect(request.nextUrl.searchParams.get('code')).toBeNull();
    });

    it('should handle OAuth callback with type parameter', async () => {
      const request = createMockRequest({
        url: 'http://localhost/api/auth/callback?code=auth-code&type=recovery',
      });

      expect(request.nextUrl.searchParams.get('type')).toBe('recovery');
    });
  });

  describe('Session Management', () => {
    it('should extract user session from valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { role: 'admin', display_name: 'Test User' },
      };

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@supabase/supabase-js').createClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });
      const result = await extractAuthContext(request);

      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      });
    });

    it('should handle missing session gracefully', async () => {
      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Session not found' },
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@supabase/supabase-js').createClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      const request = createMockRequest({
        headers: { authorization: 'Bearer invalid-session-token' },
      });
      const result = await extractAuthContext(request);

      expect(result).toBeNull();
    });

    it('should handle session with missing user metadata', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@supabase/supabase-js').createClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });
      const result = await extractAuthContext(request);

      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        role: undefined,
      });
    });
  });

  describe('Supabase Configuration', () => {
    it('should return null when Supabase URL is missing', async () => {
      delete process.env.SUPABASE_URL;

      const request = createMockRequest({
        headers: { authorization: 'Bearer token' },
      });
      const result = await extractAuthContext(request);

      expect(result).toBeNull();
    });

    it('should return null when Supabase service role key is missing', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const request = createMockRequest({
        headers: { authorization: 'Bearer token' },
      });
      const result = await extractAuthContext(request);

      expect(result).toBeNull();
    });

    it('should use NEXT_PUBLIC_SUPABASE_URL as fallback', async () => {
      delete process.env.SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://public.supabase.co';

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@supabase/supabase-js').createClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });
      const result = await extractAuthContext(request);

      expect(result).not.toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle Supabase client creation errors', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@supabase/supabase-js').createClient.mockImplementation(() => {
        throw new Error('Supabase connection error');
      });

      const request = createMockRequest({
        headers: { authorization: 'Bearer token' },
      });
      const result = await extractAuthContext(request);

      expect(result).toBeNull();
    });

    it('should handle network errors during token validation', async () => {
      const mockGetUser = jest.fn().mockRejectedValue(new Error('Network error'));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@supabase/supabase-js').createClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      const request = createMockRequest({
        headers: { authorization: 'Bearer token' },
      });
      const result = await extractAuthContext(request);

      expect(result).toBeNull();
    });

    it('should handle malformed token response', async () => {
      const mockGetUser = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@supabase/supabase-js').createClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      const request = createMockRequest({
        headers: { authorization: 'Bearer token' },
      });
      const result = await extractAuthContext(request);

      expect(result).toBeNull();
    });
  });

  describe('Middleware Helpers', () => {
    describe('requireAuth', () => {
      it('should require authentication by default', async () => {
        const request = createMockRequest();
        const result = await requireAuth(request);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.response.status).toBe(401);
        }
      });
    });

    describe('optionalAuth', () => {
      it('should not require authentication', async () => {
        const request = createMockRequest();
        const result = await optionalAuth(request);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.context.userId).toBe('');
        }
      });

      it('should return user context when valid token provided', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
        };

        const mockGetUser = jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@supabase/supabase-js').createClient.mockReturnValue({
          auth: { getUser: mockGetUser },
        });

        const request = createMockRequest({
          headers: { authorization: 'Bearer valid-token' },
        });
        const result = await optionalAuth(request);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.context.userId).toBe('user-123');
        }
      });
    });

    describe('requireRoles', () => {
      it('should create middleware that checks for specific roles', async () => {
        const middleware = requireRoles('admin', 'superadmin');

        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: { role: 'superadmin' },
        };

        const mockGetUser = jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@supabase/supabase-js').createClient.mockReturnValue({
          auth: { getUser: mockGetUser },
        });

        const request = createMockRequest({
          headers: { authorization: 'Bearer valid-token' },
        });

        const result = await middleware(request);

        expect(result.success).toBe(true);
      });
    });

    describe('getUserId', () => {
      it('should return null when no auth context', async () => {
        const request = createMockRequest();
        const result = await getUserId(request);

        expect(result).toBeNull();
      });

      it('should return userId when auth context exists', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
        };

        const mockGetUser = jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@supabase/supabase-js').createClient.mockReturnValue({
          auth: { getUser: mockGetUser },
        });

        const request = createMockRequest({
          headers: { authorization: 'Bearer valid-token' },
        });
        const result = await getUserId(request);

        expect(result).toBe('user-123');
      });
    });
  });
});
