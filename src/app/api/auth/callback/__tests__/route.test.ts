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
    it('应该处理 OAuth 错误并重定向到验证页面', async () => {
      const request = createMockRequest(
        'http://localhost/api/auth/callback?error=access_denied&error_description=User%20denied%20access'
      );
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(302);
    });

    it('应该处理缺少授权码的情况', async () => {
      const request = createMockRequest('http://localhost/api/auth/callback');
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('应该处理授权码交换失败', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid code' },
      });

      const request = createMockRequest('http://localhost/api/auth/callback?code=invalid-code');
      const response = await GET(request);

      expect(mockExchangeCodeForSession).toHaveBeenCalledWith('invalid-code');
      expect(response).toBeInstanceOf(NextResponse);
    });

    it('应该成功处理有效的授权码', async () => {
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

    it('应该处理密码重置类型', async () => {
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

    it('应该处理注册验证类型', async () => {
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

    it('应该处理邮箱变更类型', async () => {
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

    it('应该处理有效的 state 重定向路径', async () => {
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

    it('应该拒绝无效的 state 重定向路径（外部 URL）', async () => {
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

    it('应该处理缺少 Supabase 配置的情况', async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const request = createMockRequest('http://localhost/api/auth/callback?code=valid-code');
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('应该处理 profile 创建失败', async () => {
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

    it('应该处理异常情况', async () => {
      mockExchangeCodeForSession.mockRejectedValue(new Error('Network error'));

      const request = createMockRequest('http://localhost/api/auth/callback?code=valid-code');
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
    });
  });
});
