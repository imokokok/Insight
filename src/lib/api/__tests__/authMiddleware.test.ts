import { type NextRequest } from 'next/server';

import {
  createAuthMiddleware,
  extractAuthContext,
  requireAuth,
  optionalAuth,
  requireRoles,
  getUserId,
} from '../middleware/authMiddleware';

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

describe('authMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe('extractAuthContext', () => {
    it('should return null when no authorization header', async () => {
      const request = createMockRequest();
      const result = await extractAuthContext(request);

      expect(result).toBeNull();
    });

    it('should return null when authorization header does not start with Bearer', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Basic token123' },
      });
      const result = await extractAuthContext(request);

      expect(result).toBeNull();
    });

    it('should return null when Supabase config is missing', async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const request = createMockRequest({
        headers: { authorization: 'Bearer token123' },
      });
      const result = await extractAuthContext(request);

      expect(result).toBeNull();
    });

    it('should return auth context for valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { role: 'admin' },
      };

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

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

    it('should return null when token validation fails', async () => {
      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      require('@supabase/supabase-js').createClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      const request = createMockRequest({
        headers: { authorization: 'Bearer invalid-token' },
      });
      const result = await extractAuthContext(request);

      expect(result).toBeNull();
    });

    it('should handle errors during auth extraction', async () => {
      require('@supabase/supabase-js').createClient.mockImplementation(() => {
        throw new Error('Supabase error');
      });

      const request = createMockRequest({
        headers: { authorization: 'Bearer token' },
      });
      const result = await extractAuthContext(request);

      expect(result).toBeNull();
    });
  });

  describe('createAuthMiddleware', () => {
    it('should create middleware function', () => {
      const middleware = createAuthMiddleware();

      expect(typeof middleware).toBe('function');
    });

    it('should return 401 when auth is required and no auth context', async () => {
      const middleware = createAuthMiddleware({ required: true });
      const request = createMockRequest();

      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(401);
      }
    });

    it('should return success with empty userId when auth is not required', async () => {
      const middleware = createAuthMiddleware({ required: false });
      const request = createMockRequest();

      const result = await middleware(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.context.userId).toBe('');
      }
    });

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
      }
    });

    it('should return success when user has required role', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { role: 'admin' },
      };

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      require('@supabase/supabase-js').createClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      const middleware = createAuthMiddleware({ required: true, roles: ['admin'] });
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      const result = await middleware(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.context.userId).toBe('user-123');
        expect(result.context.role).toBe('admin');
      }
    });

    it('should skip role check when no roles specified', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
      };

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      require('@supabase/supabase-js').createClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      const middleware = createAuthMiddleware({ required: true });
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      const result = await middleware(request);

      expect(result.success).toBe(true);
    });

    it('should use default values when options not provided', async () => {
      const middleware = createAuthMiddleware();
      const request = createMockRequest();

      const result = await middleware(request);

      expect(result.success).toBe(false);
    });
  });

  describe('requireAuth', () => {
    it('should be a middleware that requires authentication', async () => {
      const request = createMockRequest();
      const result = await requireAuth(request);

      expect(result.success).toBe(false);
    });
  });

  describe('optionalAuth', () => {
    it('should be a middleware that does not require authentication', async () => {
      const request = createMockRequest();
      const result = await optionalAuth(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.context.userId).toBe('');
      }
    });
  });

  describe('requireRoles', () => {
    it('should create middleware that checks for specific roles', async () => {
      const middleware = requireRoles('admin', 'moderator');

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { role: 'moderator' },
      };

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

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
