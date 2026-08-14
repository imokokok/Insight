import { type NextRequest, NextResponse } from 'next/server';

import { GET } from '../route';

const mockCreateServerClient = jest.fn();
const mockExchangeCodeForSession = jest.fn();
const mockUpsert = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

// Plain (non-jest.fn) logger methods survive `resetMocks: true`, which would
// otherwise strip the factory impl of `jest.fn(() => ({ ... }))` and turn
// `createLogger()` into `undefined` on the route's error paths.
jest.mock('@/lib/utils/logger', () => ({
  normalizeError: (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
  createLogger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }),
}));

// Module-level rate limiter state persists across tests within a file, so each
// request must use a unique client IP to avoid tripping the limit (max 10/min).
let requestCounter = 0;

interface MockRequestOptions {
  oauthState?: string | null;
}

const createMockRequest = (url: string, options: MockRequestOptions = {}): NextRequest => {
  const ip = `ip-${requestCounter++}`;
  const cookieStore = new Map<string, string>();
  if (options.oauthState !== undefined && options.oauthState !== null) {
    cookieStore.set('oauth_state', options.oauthState);
  }

  return {
    nextUrl: new URL(url),
    url,
    headers: new Headers({ 'x-forwarded-for': ip }),
    cookies: {
      get: (name: string) => {
        const value = cookieStore.get(name);
        return value === undefined ? undefined : { name, value };
      },
      getAll: () => Array.from(cookieStore.entries()).map(([name, value]) => ({ name, value })),
      set: (name: string, value: string) => {
        cookieStore.set(name, value);
      },
    },
  } as unknown as NextRequest;
};

describe('/api/auth/callback', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      NODE_ENV: 'test',
    };

    mockCreateServerClient.mockReturnValue({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
      },
      from: jest.fn().mockReturnValue({
        upsert: mockUpsert,
      }),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GET', () => {
    it('should handle OAuth error and redirect to auth page', async () => {
      const request = createMockRequest(
        'http://localhost/api/auth/callback?error=access_denied&error_description=User%20denied%20access'
      );
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(307);
    });

    it('should handle missing authorization code', async () => {
      const request = createMockRequest('http://localhost/api/auth/callback');
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle authorization code exchange failure', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid code' },
      });

      const request = createMockRequest(
        'http://localhost/api/auth/callback?code=invalid-code&state=valid-state',
        { oauthState: 'valid-state' }
      );
      const response = await GET(request);

      expect(mockExchangeCodeForSession).toHaveBeenCalledWith('invalid-code');
      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should successfully handle valid authorization code', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
      };
      const mockUser = {
        id: 'user-123',
        user_metadata: {
          display_name: 'Test User',
        },
      };

      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      mockUpsert.mockResolvedValue({ error: null });

      const request = createMockRequest(
        'http://localhost/api/auth/callback?code=valid-code&state=valid-state',
        { oauthState: 'valid-state' }
      );
      const response = await GET(request);

      expect(mockExchangeCodeForSession).toHaveBeenCalledWith('valid-code');
      expect(mockUpsert).toHaveBeenCalled();
      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle password reset type', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
      };
      const mockUser = {
        id: 'user-123',
        user_metadata: {},
      };

      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      mockUpsert.mockResolvedValue({ error: null });

      const request = createMockRequest(
        'http://localhost/api/auth/callback?code=valid-code&type=recovery&state=valid-state',
        { oauthState: 'valid-state' }
      );
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle signup confirmation type', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
      };
      const mockUser = {
        id: 'user-123',
        user_metadata: {},
      };

      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      mockUpsert.mockResolvedValue({ error: null });

      const request = createMockRequest(
        'http://localhost/api/auth/callback?code=valid-code&type=signup&state=valid-state',
        { oauthState: 'valid-state' }
      );
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle email change type', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
      };
      const mockUser = {
        id: 'user-123',
        user_metadata: {},
      };

      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      mockUpsert.mockResolvedValue({ error: null });

      const request = createMockRequest(
        'http://localhost/api/auth/callback?code=valid-code&type=email_change&state=valid-state',
        { oauthState: 'valid-state' }
      );
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle valid state redirect path', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
      };
      const mockUser = {
        id: 'user-123',
        user_metadata: {},
      };

      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      mockUpsert.mockResolvedValue({ error: null });

      const request = createMockRequest(
        'http://localhost/api/auth/callback?code=valid-code&state=/settings',
        { oauthState: '/settings' }
      );
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should reject invalid state redirect path (external URL)', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
      };
      const mockUser = {
        id: 'user-123',
        user_metadata: {},
      };

      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      mockUpsert.mockResolvedValue({ error: null });

      const request = createMockRequest(
        'http://localhost/api/auth/callback?code=valid-code&state=https://evil.com',
        { oauthState: 'https://evil.com' }
      );
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle missing Supabase configuration', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const request = createMockRequest(
        'http://localhost/api/auth/callback?code=valid-code&state=valid-state',
        { oauthState: 'valid-state' }
      );
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle profile create failure', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
      };
      const mockUser = {
        id: 'user-123',
        user_metadata: {},
      };

      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      mockUpsert.mockResolvedValue({ error: { message: 'Database error' } });

      const request = createMockRequest(
        'http://localhost/api/auth/callback?code=valid-code&state=valid-state',
        { oauthState: 'valid-state' }
      );
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle exception', async () => {
      mockExchangeCodeForSession.mockRejectedValue(new Error('Network error'));

      const request = createMockRequest(
        'http://localhost/api/auth/callback?code=valid-code&state=valid-state',
        { oauthState: 'valid-state' }
      );
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
    });
  });
});
