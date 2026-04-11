import { type NextRequest } from 'next/server';

import { GET, PUT, DELETE } from '../route';

import type { UserFavorite } from '@/lib/supabase/queries';

const mockGetUserId = jest.fn();
const mockGetServerQueries = jest.fn();
const mockSanitizeUuid = jest.fn();
const mockSanitizeString = jest.fn();
const mockSanitizeObject = jest.fn();

jest.mock('@/lib/api/utils', () => ({
  getUserId: () => mockGetUserId(),
}));

jest.mock('@/lib/supabase/server', () => ({
  getServerQueries: () => mockGetServerQueries(),
}));

jest.mock('@/lib/security', () => ({
  sanitizeString: (str: string, _options?: unknown) => mockSanitizeString(str, _options),
  sanitizeObject: (obj: unknown) => mockSanitizeObject(obj),
  sanitizeUuid: (id: string) => mockSanitizeUuid(id),
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const mockFavorite: UserFavorite = {
  id: 'fav-123',
  user_id: 'user-123',
  name: 'BTC Oracle Config',
  config_type: 'oracle_config',
  config_data: { selectedOracles: ['chainlink', 'pyth'] },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const createMockRequest = (
  options: {
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): NextRequest => {
  return {
    headers: new Headers(options.headers || {}),
    json: async () => options.body,
  } as unknown as NextRequest;
};

const createMockParams = (id: string): Promise<{ id: string }> => {
  return Promise.resolve({ id });
};

describe('/api/favorites/[id]', () => {
  let mockQueries: {
    getFavorites: jest.Mock;
    updateFavorite: jest.Mock;
    deleteFavorite: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueries = {
      getFavorites: jest.fn(),
      updateFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
    };

    mockGetServerQueries.mockReturnValue(mockQueries);
    mockSanitizeUuid.mockImplementation((id: string) => id);
    mockSanitizeString.mockImplementation((str: string) => str);
    mockSanitizeObject.mockImplementation((obj: unknown) => obj);
  });

  describe('GET', () => {
    it('应该返回指定的收藏', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getFavorites.mockResolvedValue([mockFavorite]);

      const request = createMockRequest();
      const params = createMockParams('fav-123');
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.favorite).toEqual(mockFavorite);
    });

    it('应该返回未授权错误当用户未登录时', async () => {
      mockGetUserId.mockResolvedValue(null);

      const request = createMockRequest();
      const params = createMockParams('fav-123');
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('应该返回错误当 ID 无效时', async () => {
      mockSanitizeUuid.mockReturnValue(null);

      const request = createMockRequest();
      const params = createMockParams('invalid-id');
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid favorite ID');
    });

    it('应该返回 404 当收藏不存在时', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getFavorites.mockResolvedValue([]);

      const request = createMockRequest();
      const params = createMockParams('fav-nonexistent');
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Favorite not found');
    });

    it('应该只返回当前用户的收藏', async () => {
      mockGetUserId.mockResolvedValue('user-123');

      mockQueries.getFavorites.mockResolvedValue([]);

      const request = createMockRequest();
      const params = createMockParams('fav-456');
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Favorite not found');
    });

    it('应该处理异常情况', async () => {
      mockGetUserId.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest();
      const params = createMockParams('fav-123');
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('PUT', () => {
    const updateData = {
      name: 'Updated Name',
      config_data: { selectedOracles: ['chainlink'] },
    };

    it('应该成功更新收藏', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getFavorites.mockResolvedValue([mockFavorite]);
      mockQueries.updateFavorite.mockResolvedValue({
        ...mockFavorite,
        ...updateData,
      });

      const request = createMockRequest({ body: updateData });
      const params = createMockParams('fav-123');
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.favorite.name).toBe('Updated Name');
      expect(data.message).toBe('Favorite updated successfully');
    });

    it('应该返回未授权错误当用户未登录时', async () => {
      mockGetUserId.mockResolvedValue(null);

      const request = createMockRequest({ body: updateData });
      const params = createMockParams('fav-123');
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('应该返回错误当 ID 无效时', async () => {
      mockSanitizeUuid.mockReturnValue(null);

      const request = createMockRequest({ body: updateData });
      const params = createMockParams('invalid-id');
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid favorite ID');
    });

    it('应该返回 404 当收藏不存在时', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getFavorites.mockResolvedValue([]);

      const request = createMockRequest({ body: updateData });
      const params = createMockParams('fav-nonexistent');
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Favorite not found');
    });

    it('应该返回错误当没有有效更新字段时', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getFavorites.mockResolvedValue([mockFavorite]);

      const request = createMockRequest({ body: {} });
      const params = createMockParams('fav-123');
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No valid fields to update');
    });

    it('应该处理无效的 JSON body', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getFavorites.mockResolvedValue([mockFavorite]);

      const request = {
        headers: new Headers(),
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as unknown as NextRequest;
      const params = createMockParams('fav-123');
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON body');
    });

    it('应该处理更新失败情况', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getFavorites.mockResolvedValue([mockFavorite]);
      mockQueries.updateFavorite.mockResolvedValue(null);

      const request = createMockRequest({ body: updateData });
      const params = createMockParams('fav-123');
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update favorite');
    });

    it('应该处理异常情况', async () => {
      mockGetUserId.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({ body: updateData });
      const params = createMockParams('fav-123');
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('DELETE', () => {
    it('应该成功删除收藏', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getFavorites.mockResolvedValue([mockFavorite]);
      mockQueries.deleteFavorite.mockResolvedValue(true);

      const request = createMockRequest();
      const params = createMockParams('fav-123');
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Favorite deleted successfully');
    });

    it('应该返回未授权错误当用户未登录时', async () => {
      mockGetUserId.mockResolvedValue(null);

      const request = createMockRequest();
      const params = createMockParams('fav-123');
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('应该返回错误当 ID 无效时', async () => {
      mockSanitizeUuid.mockReturnValue(null);

      const request = createMockRequest();
      const params = createMockParams('invalid-id');
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid favorite ID');
    });

    it('应该返回 404 当收藏不存在时', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getFavorites.mockResolvedValue([]);

      const request = createMockRequest();
      const params = createMockParams('fav-nonexistent');
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Favorite not found');
    });

    it('应该处理删除失败情况', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getFavorites.mockResolvedValue([mockFavorite]);
      mockQueries.deleteFavorite.mockResolvedValue(false);

      const request = createMockRequest();
      const params = createMockParams('fav-123');
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete favorite');
    });

    it('应该处理异常情况', async () => {
      mockGetUserId.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest();
      const params = createMockParams('fav-123');
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('边界情况', () => {
    it('应该处理空字符串 ID', async () => {
      mockSanitizeUuid.mockReturnValue(null);

      const request = createMockRequest();
      const params = createMockParams('');
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid favorite ID');
    });

    it('应该处理特殊字符 ID', async () => {
      mockSanitizeUuid.mockReturnValue(null);

      const request = createMockRequest();
      const params = createMockParams('<script>alert(1)</script>');
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid favorite ID');
    });
  });
});
