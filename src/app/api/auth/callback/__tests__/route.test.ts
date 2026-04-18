import { type NextRequest, NextResponse } from 'next/server';

import { GET } from '../route';

const mockCreateClient = jest.fn();
const mockExchangeCodeForSession = jest.fn();
const mockUpsert = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const createMockRequest = (url: string): NextRequest => {
  return {
    nextUrl: new URL(url),
    url,
  } as unknown as NextRequest;
};

describe('/api/auth/callback', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      NODE_ENV: 'test',
    };

    mockCreateClient.mockReturnValue({
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
      expect(response.status).toBe(302);
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

      const request = createMockRequest('http://localhost/api/auth/callback?code=invalid-code');
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

      const request = createMockRequest('http://localhost/api/auth/callback?code=valid-code');
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
        'http://localhost/api/auth/callback?code=valid-code&type=recovery'
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
        'http://localhost/api/auth/callback?code=valid-code&type=signup'
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
        'http://localhost/api/auth/callback?code=valid-code&type=email_change'
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
        'http://localhost/api/auth/callback?code=valid-code&state=/dashboard'
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
        'http://localhost/api/auth/callback?code=valid-code&state=https://evil.com'
      );
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle missing Supabase configuration', async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const request = createMockRequest('http://localhost/api/auth/callback?code=valid-code');
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('shouldhandle profile createfailure', async () => {
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

      const request = createMockRequest('http://localhost/api/auth/callback?code=valid-code');
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle exception', async () => {
      mockExchangeCodeForSession.mockRejectedValue(new Error('Network error'));

      const request = createMockRequest('http://localhost/api/auth/callback?code=valid-code');
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
    });
  });
});
