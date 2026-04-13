import { type NextRequest } from 'next/server';

import type { UserProfile } from '@/lib/supabase/queries';

import { GET, PUT } from '../route';

const mockGetUserId = jest.fn();
const mockGetServerQueries = jest.fn();
const mockSanitizeObject = jest.fn();
const mockSanitizeString = jest.fn();

jest.mock('@/lib/api/utils', () => ({
  getUserId: () => mockGetUserId(),
}));

jest.mock('@/lib/supabase/server', () => ({
  getServerQueries: () => mockGetServerQueries(),
}));

jest.mock('@/lib/security', () => ({
  sanitizeObject: (obj: unknown) => mockSanitizeObject(obj),
  sanitizeString: (str: string, options?: unknown) => mockSanitizeString(str, options),
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const mockProfile: UserProfile = {
  id: 'user-123',
  display_name: 'Test User',
  preferences: {
    theme: 'dark',
    default_oracle: 'chainlink',
    default_symbol: 'BTC/USD',
    defaultChain: 'ethereum',
    refreshInterval: 30000,
    notificationsEnabled: true,
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const createMockRequest = (
  options: { body?: unknown; headers?: Record<string, string> } = {}
): NextRequest => {
  return {
    headers: new Headers(options.headers || {}),
    json: async () => options.body,
  } as unknown as NextRequest;
};

describe('/api/auth/profile', () => {
  let mockQueries: {
    getUserProfile: jest.Mock;
    upsertUserProfile: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueries = {
      getUserProfile: jest.fn(),
      upsertUserProfile: jest.fn(),
    };

    mockGetServerQueries.mockReturnValue(mockQueries);
    mockSanitizeObject.mockImplementation((obj: unknown) => obj);
    mockSanitizeString.mockImplementation((str: string) => str);
  });

  describe('GET', () => {
    it('应该返回用户资料', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getUserProfile.mockResolvedValue(mockProfile);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile).toEqual(mockProfile);
    });

    it('应该返回未授权错误当用户未登录时', async () => {
      mockGetUserId.mockResolvedValue(null);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('应该返回默认资料当用户资料不存在时', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getUserProfile.mockResolvedValue(null);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile.id).toBe('user-123');
      expect(data.profile.display_name).toBeNull();
      expect(data.profile.preferences.default_oracle).toBe('chainlink');
    });

    it('应该处理异常情况', async () => {
      mockGetUserId.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('PUT', () => {
    it('应该成功更新用户资料', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.upsertUserProfile.mockResolvedValue({
        ...mockProfile,
        display_name: 'Updated Name',
      });

      const request = createMockRequest({ body: { display_name: 'Updated Name' } });
      const response = await PUT(request);
      const _data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile.display_name).toBe('Updated Name');
      expect(data.message).toBe('Profile updated successfully');
    });

    it('应该返回未授权错误当用户未登录时', async () => {
      mockGetUserId.mockResolvedValue(null);

      const request = createMockRequest({ body: { display_name: 'Test' } });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('应该处理无效的 JSON body', async () => {
      mockGetUserId.mockResolvedValue('user-123');

      const request = {
        headers: new Headers(),
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as unknown as NextRequest;
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON body');
    });

    it('应该返回错误当没有有效更新字段时', async () => {
      mockGetUserId.mockResolvedValue('user-123');

      const request = createMockRequest({ body: {} });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No valid fields to update');
    });

    it('应该返回错误当 display_name 格式无效时', async () => {
      mockGetUserId.mockResolvedValue('user-123');

      const request = createMockRequest({ body: { display_name: 123 } });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid display_name format');
    });

    it('应该成功更新 preferences', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.upsertUserProfile.mockResolvedValue({
        ...mockProfile,
        preferences: {
          ...mockProfile.preferences,
          theme: 'light',
        },
      });

      const request = createMockRequest({
        body: {
          preferences: {
            theme: 'light',
            default_oracle: 'pyth',
          },
        },
      });
      const response = await PUT(request);
      const _data = await response.json();

      expect(response.status).toBe(200);
    });

    it('应该处理更新失败情况', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.upsertUserProfile.mockResolvedValue(null);

      const request = createMockRequest({ body: { display_name: 'Test' } });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update profile');
    });

    it('应该处理异常情况', async () => {
      mockGetUserId.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({ body: { display_name: 'Test' } });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
