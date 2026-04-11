import { type NextRequest } from 'next/server';

import type { UserSnapshot } from '@/lib/supabase/queries';

import { GET, PUT, DELETE } from '../route';

const mockGetUserId = jest.fn();
const mockGetServerQueries = jest.fn();
const mockSanitizeUuid = jest.fn();
const mockSanitizeString = jest.fn();
const mockSanitizeSymbol = jest.fn();
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
  sanitizeSymbol: (symbol: string) => mockSanitizeSymbol(symbol),
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const mockSnapshot: UserSnapshot = {
  id: 'snapshot-123',
  user_id: 'user-123',
  name: 'BTC Snapshot',
  symbol: 'BTC/USD',
  selected_oracles: ['chainlink', 'pyth'],
  price_data: [
    {
      provider: 'chainlink',
      symbol: 'BTC/USD',
      price: 50000,
      timestamp: Date.now(),
      decimals: 8,
    },
  ],
  stats: {
    avgPrice: 50000,
    weightedAvgPrice: 50000,
    maxPrice: 51000,
    minPrice: 49000,
    priceRange: 2000,
    variance: 100000,
    standardDeviation: 316.23,
    standardDeviationPercent: 0.63,
  },
  is_public: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const createMockRequest = (options: { body?: unknown; headers?: Record<string, string> } = {}): NextRequest => {
  return {
    headers: new Headers(options.headers || {}),
    json: async () => options.body,
  } as unknown as NextRequest;
};

const createMockParams = (id: string): Promise<{ id: string }> => {
  return Promise.resolve({ id });
};

describe('/api/snapshots/[id]', () => {
  let mockQueries: {
    getSnapshotById: jest.Mock;
    updateSnapshot: jest.Mock;
    deleteSnapshot: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueries = {
      getSnapshotById: jest.fn(),
      updateSnapshot: jest.fn(),
      deleteSnapshot: jest.fn(),
    };

    mockGetServerQueries.mockReturnValue(mockQueries);
    mockSanitizeUuid.mockImplementation((id: string) => id);
    mockSanitizeString.mockImplementation((str: string) => str);
    mockSanitizeSymbol.mockImplementation((symbol: string) => symbol);
    mockSanitizeObject.mockImplementation((obj: unknown) => obj);
  });

  describe('GET', () => {
    it('应该返回指定的快照', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getSnapshotById.mockResolvedValue(mockSnapshot);

      const request = createMockRequest();
      const params = createMockParams('snapshot-123');
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.snapshot).toEqual(mockSnapshot);
    });

    it('应该返回公开的快照给未登录用户', async () => {
      mockGetUserId.mockResolvedValue(null);
      const publicSnapshot = { ...mockSnapshot, is_public: true };
      mockQueries.getSnapshotById.mockResolvedValue(publicSnapshot);

      const request = createMockRequest();
      const params = createMockParams('snapshot-123');
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.snapshot).toEqual(publicSnapshot);
    });

    it('应该返回未授权错误当访问私有快照时', async () => {
      mockGetUserId.mockResolvedValue('other-user');
      mockQueries.getSnapshotById.mockResolvedValue(mockSnapshot);

      const request = createMockRequest();
      const params = createMockParams('snapshot-123');
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
      expect(data.error).toBe('Invalid snapshot ID');
    });

    it('应该返回 404 当快照不存在时', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getSnapshotById.mockResolvedValue(null);

      const request = createMockRequest();
      const params = createMockParams('snapshot-nonexistent');
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Snapshot not found');
    });

    it('应该处理异常情况', async () => {
      mockGetUserId.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest();
      const params = createMockParams('snapshot-123');
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('PUT', () => {
    const updateData = {
      name: 'Updated Snapshot',
      is_public: true,
    };

    it('应该成功更新快照', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getSnapshotById.mockResolvedValue(mockSnapshot);
      mockQueries.updateSnapshot.mockResolvedValue({
        ...mockSnapshot,
        ...updateData,
      });

      const request = createMockRequest({ body: updateData });
      const params = createMockParams('snapshot-123');
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.snapshot.name).toBe('Updated Snapshot');
      expect(data.message).toBe('Snapshot updated successfully');
    });

    it('应该返回未授权错误当用户未登录时', async () => {
      mockGetUserId.mockResolvedValue(null);

      const request = createMockRequest({ body: updateData });
      const params = createMockParams('snapshot-123');
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
      expect(data.error).toBe('Invalid snapshot ID');
    });

    it('应该返回 404 当快照不存在时', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getSnapshotById.mockResolvedValue(null);

      const request = createMockRequest({ body: updateData });
      const params = createMockParams('snapshot-nonexistent');
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Snapshot not found');
    });

    it('应该返回未授权错误当用户不是所有者时', async () => {
      mockGetUserId.mockResolvedValue('other-user');
      mockQueries.getSnapshotById.mockResolvedValue(mockSnapshot);

      const request = createMockRequest({ body: updateData });
      const params = createMockParams('snapshot-123');
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('应该返回错误当没有有效更新字段时', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getSnapshotById.mockResolvedValue(mockSnapshot);

      const request = createMockRequest({ body: {} });
      const params = createMockParams('snapshot-123');
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No valid fields to update');
    });

    it('应该处理无效的 JSON body', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getSnapshotById.mockResolvedValue(mockSnapshot);

      const request = {
        headers: new Headers(),
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as unknown as NextRequest;
      const params = createMockParams('snapshot-123');
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON body');
    });

    it('应该处理无效的 selected_oracles（超过最大数量）', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getSnapshotById.mockResolvedValue(mockSnapshot);

      const request = createMockRequest({
        body: {
          selected_oracles: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'],
        },
      });
      const params = createMockParams('snapshot-123');
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No valid fields to update');
    });

    it('应该处理过大的 price_data', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getSnapshotById.mockResolvedValue(mockSnapshot);

      const largePriceData = { data: 'x'.repeat(60000) };
      const request = createMockRequest({
        body: { price_data: largePriceData },
      });
      const params = createMockParams('snapshot-123');
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No valid fields to update');
    });

    it('应该处理过大的 stats', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getSnapshotById.mockResolvedValue(mockSnapshot);

      const largeStats = { data: 'x'.repeat(15000) };
      const request = createMockRequest({
        body: { stats: largeStats },
      });
      const params = createMockParams('snapshot-123');
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No valid fields to update');
    });

    it('应该处理更新失败情况', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getSnapshotById.mockResolvedValue(mockSnapshot);
      mockQueries.updateSnapshot.mockResolvedValue(null);

      const request = createMockRequest({ body: updateData });
      const params = createMockParams('snapshot-123');
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update snapshot');
    });

    it('应该处理异常情况', async () => {
      mockGetUserId.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({ body: updateData });
      const params = createMockParams('snapshot-123');
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('DELETE', () => {
    it('应该成功删除快照', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getSnapshotById.mockResolvedValue(mockSnapshot);
      mockQueries.deleteSnapshot.mockResolvedValue(true);

      const request = createMockRequest();
      const params = createMockParams('snapshot-123');
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Snapshot deleted successfully');
    });

    it('应该返回未授权错误当用户未登录时', async () => {
      mockGetUserId.mockResolvedValue(null);

      const request = createMockRequest();
      const params = createMockParams('snapshot-123');
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
      expect(data.error).toBe('Invalid snapshot ID');
    });

    it('应该返回 404 当快照不存在时', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getSnapshotById.mockResolvedValue(null);

      const request = createMockRequest();
      const params = createMockParams('snapshot-nonexistent');
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Snapshot not found');
    });

    it('应该返回未授权错误当用户不是所有者时', async () => {
      mockGetUserId.mockResolvedValue('other-user');
      mockQueries.getSnapshotById.mockResolvedValue(mockSnapshot);

      const request = createMockRequest();
      const params = createMockParams('snapshot-123');
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('应该处理删除失败情况', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockQueries.getSnapshotById.mockResolvedValue(mockSnapshot);
      mockQueries.deleteSnapshot.mockResolvedValue(false);

      const request = createMockRequest();
      const params = createMockParams('snapshot-123');
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete snapshot');
    });

    it('应该处理异常情况', async () => {
      mockGetUserId.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest();
      const params = createMockParams('snapshot-123');
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
      expect(data.error).toBe('Invalid snapshot ID');
    });

    it('应该处理特殊字符 ID', async () => {
      mockSanitizeUuid.mockReturnValue(null);

      const request = createMockRequest();
      const params = createMockParams('<script>alert(1)</script>');
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid snapshot ID');
    });
  });
});
