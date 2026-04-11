import { type NextRequest } from 'next/server';

import type { UserFavorite } from '@/lib/supabase/queries';

import { GET, POST } from '../route';

const mockGetUserId = jest.fn();
const mockGetServerQueries = jest.fn();
const mockSanitizeString = jest.fn();
const mockSanitizeObject = jest.fn();
const mockValidateAndSanitize = jest.fn();

jest.mock('@/lib/api/utils', () => ({
  getUserId: () => mockGetUserId(),
}));

jest.mock('@/lib/supabase/server', () => ({
  getServerQueries: () => mockGetServerQueries(),
}));

jest.mock('@/lib/security', () => ({
  sanitizeString: (str: string, _options?: unknown) => mockSanitizeString(str, _options),
  sanitizeObject: (obj: unknown) => mockSanitizeObject(obj),
}));

jest.mock('@/lib/security/validation', () => ({
  validateAndSanitize: (_schema: unknown, data: unknown) => mockValidateAndSanitize(_schema, data),
  CreateFavoriteRequestSchema: {},
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const mockFavorites: UserFavorite[] = [
  {
    id: 'fav-1',
    user_id: 'user-123',
    name: 'BTC Oracle Config',
    config_type: 'oracle_config',
    config_data: { selectedOracles: ['chainlink', 'pyth'] },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'fav-2',
    user_id: 'user-123',
    name: 'ETH Symbol',
    config_type: 'symbol',
    config_data: { symbol: 'ETH/USD' },
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

const createMockRequest = (
  options: {
    url?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): NextRequest => {
  const url = new URL(options.url || 'http://localhost/api/favorites');

  const request = {
    nextUrl: url,
    headers: new Headers(options.headers || {}),
    json: async () => options.body,
  } as unknown as NextRequest;

  return request;
};

describe('/api/favorites', () => {
  let mockQueries: {
    getFavorites: jest.Mock;
    getFavoritesByType: jest.Mock;
    addFavorite: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueries = {
      getFavorites: jest.fn(),
      getFavoritesByType: jest.fn(),
      addFavorite: jest.fn(),
    };

    mockGetServerQueries.mockReturnValue(mockQueries);
    mockSanitizeString.mockImplementation((str: string) => str);
    mockSanitizeObject.mockImplementation((obj: unknown) => obj);
    mockValidateAndSanitize.mockImplementation((_: unknown, data: unknown) => data);
  });

  describe('GET', () => {
    it('应该返回未授权错误当用户未登录时', async () => {
      mockGetUserId.mockResolvedValue(null);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('应该返回所有收藏当不指定类型时', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getFavorites.mockResolvedValue(mockFavorites);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.favorites).toEqual(mockFavorites);
      expect(data.count).toBe(2);
      expect(mockQueries.getFavorites).toHaveBeenCalledWith('user-123');
    });

    it('应该返回指定类型的收藏', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getFavoritesByType.mockResolvedValue([mockFavorites[0]]);

      const request = createMockRequest({
        url: 'http://localhost/api/favorites?config_type=oracle_config',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.favorites.length).toBe(1);
      expect(data.favorites[0].config_type).toBe('oracle_config');
      expect(mockQueries.getFavoritesByType).toHaveBeenCalledWith('user-123', 'oracle_config');
    });

    it('应该忽略无效的配置类型', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getFavorites.mockResolvedValue(mockFavorites);

      const request = createMockRequest({
        url: 'http://localhost/api/favorites?config_type=invalid_type',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockQueries.getFavorites).toHaveBeenCalledWith('user-123');
    });

    it('应该返回空数组当没有收藏时', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getFavorites.mockResolvedValue([]);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.favorites).toEqual([]);
      expect(data.count).toBe(0);
    });

    it('应该处理数据库错误', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getFavorites.mockResolvedValue(null);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch favorites');
    });

    it('应该处理异常情况', async () => {
      mockGetUserId.mockRejectedValue(new Error('Database connection error'));

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('POST', () => {
    const validFavoriteData = {
      name: 'New Favorite',
      config_type: 'oracle_config' as const,
      config_data: { selectedOracles: ['chainlink'] },
    };

    it('应该成功创建收藏', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.addFavorite.mockResolvedValue({
        id: 'fav-new',
        user_id: 'user-123',
        ...validFavoriteData,
        created_at: '2024-01-03T00:00:00Z',
      });

      const request = createMockRequest({ body: validFavoriteData });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.favorite.name).toBe('New Favorite');
      expect(data.message).toBe('Favorite added successfully');
    });

    it('应该返回未授权错误当用户未登录时', async () => {
      mockGetUserId.mockResolvedValue(null);

      const request = createMockRequest({ body: validFavoriteData });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('应该返回错误当请求数据无效时', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockValidateAndSanitize.mockReturnValue(null);

      const request = createMockRequest({ body: { invalid: 'data' } });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request data');
    });

    it('应该处理创建失败情况', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.addFavorite.mockResolvedValue(null);

      const request = createMockRequest({ body: validFavoriteData });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to add favorite');
    });

    it('应该处理异常情况', async () => {
      mockGetUserId.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({ body: validFavoriteData });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
