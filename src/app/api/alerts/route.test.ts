/**
 * @fileoverview Tests for /api/alerts route
 */

import { type NextRequest } from 'next/server';

import { GET, POST } from './route';

jest.mock('@/lib/supabase/server', () => ({
  getServerQueries: jest.fn(),
}));

jest.mock('@/lib/api/utils', () => ({
  getUserId: jest.fn(),
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('@/lib/security', () => ({
  sanitizeObject: jest.fn((obj) => obj),
}));

import { getUserId } from '@/lib/api/utils';
import { getServerQueries } from '@/lib/supabase/server';

function createMockRequest(url: string, options?: { method?: string; body?: unknown }): NextRequest {
  const bodyData = options?.body || {};
  const request = {
    url,
    method: options?.method || 'GET',
    headers: new Headers(),
    json: async () => bodyData,
    clone: function () {
      const self = this;
      return {
        url: self.url,
        method: self.method,
        headers: self.headers,
        json: async () => bodyData,
      } as unknown as NextRequest;
    },
  } as unknown as NextRequest;
  return request;
}

describe('/api/alerts', () => {
  const mockQueries = {
    getAlerts: jest.fn(),
    createAlert: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerQueries as jest.Mock).mockReturnValue(mockQueries);
  });

  describe('GET', () => {
    it('should return alerts for authenticated user', async () => {
      const now = '2024-01-01T00:00:00.000Z';
      const mockAlerts = [
        { 
          id: '123e4567-e89b-12d3-a456-426614174000', 
          name: 'BTC Alert', 
          symbol: 'BTC', 
          condition_type: 'above' as const,
          target_value: 70000,
          is_active: true,
          user_id: '123e4567-e89b-12d3-a456-426614174001',
          created_at: now,
        },
        { 
          id: '123e4567-e89b-12d3-a456-426614174002', 
          name: 'ETH Alert', 
          symbol: 'ETH', 
          condition_type: 'below' as const,
          target_value: 3000,
          is_active: true,
          user_id: '123e4567-e89b-12d3-a456-426614174001',
          created_at: now,
        },
      ];

      (getUserId as jest.Mock).mockResolvedValue('user-123');
      mockQueries.getAlerts.mockResolvedValue(mockAlerts);

      const request = createMockRequest('http://localhost:3000/api/alerts');
      const response = await GET(request);
      const data = await response.json();
      
      if (response.status !== 200) {
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(data, null, 2));
      }
      
      expect(response.status).toBe(200);
      expect(data.alerts).toEqual(mockAlerts);
      expect(data.count).toBe(2);
      expect(mockQueries.getAlerts).toHaveBeenCalledWith('user-123');
    });

    it('should return 401 for unauthenticated user', async () => {
      (getUserId as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/alerts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 500 when database query fails', async () => {
      (getUserId as jest.Mock).mockResolvedValue('user-123');
      mockQueries.getAlerts.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/alerts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch alerts');
    });

    it('should handle unexpected errors', async () => {
      (getUserId as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('http://localhost:3000/api/alerts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('POST', () => {
    it('should create alert successfully', async () => {
      const newAlert = {
        name: 'BTC Above 70k',
        symbol: 'BTC',
        chain: 'ethereum',
        condition_type: 'above' as const,
        target_value: 70000,
        provider: 'chainlink',
        is_active: true,
      };

      const createdAlert = {
        id: 'alert-123',
        ...newAlert,
        user_id: 'user-123',
        created_at: new Date().toISOString(),
      };

      (getUserId as jest.Mock).mockResolvedValue('user-123');
      mockQueries.createAlert.mockResolvedValue(createdAlert);

      const request = createMockRequest('http://localhost:3000/api/alerts', {
        method: 'POST',
        body: newAlert,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.alert).toEqual(createdAlert);
      expect(data.message).toBe('Alert created successfully');
    });

    it('should return 401 for unauthenticated user', async () => {
      (getUserId as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/alerts', {
        method: 'POST',
        body: { name: 'Test Alert' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for missing required fields', async () => {
      (getUserId as jest.Mock).mockResolvedValue('user-123');

      const request = createMockRequest('http://localhost:3000/api/alerts', {
        method: 'POST',
        body: { name: 'Test Alert' },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid condition_type', async () => {
      (getUserId as jest.Mock).mockResolvedValue('user-123');

      const request = createMockRequest('http://localhost:3000/api/alerts', {
        method: 'POST',
        body: {
          name: 'Test Alert',
          symbol: 'BTC',
          condition_type: 'invalid_type',
          target_value: 70000,
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should use default values for optional fields', async () => {
      const newAlert = {
        name: 'BTC Alert',
        symbol: 'BTC',
        condition_type: 'above' as const,
        target_value: 70000,
      };

      const createdAlert = {
        id: 'alert-123',
        ...newAlert,
        chain: null,
        provider: null,
        is_active: true,
        user_id: 'user-123',
        created_at: new Date().toISOString(),
      };

      (getUserId as jest.Mock).mockResolvedValue('user-123');
      mockQueries.createAlert.mockResolvedValue(createdAlert);

      const request = createMockRequest('http://localhost:3000/api/alerts', {
        method: 'POST',
        body: newAlert,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it('should return 500 when database insert fails', async () => {
      const newAlert = {
        name: 'BTC Alert',
        symbol: 'BTC',
        condition_type: 'above' as const,
        target_value: 70000,
      };

      (getUserId as jest.Mock).mockResolvedValue('user-123');
      mockQueries.createAlert.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/alerts', {
        method: 'POST',
        body: newAlert,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create alert');
    });

    it('should handle unexpected errors', async () => {
      (getUserId as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('http://localhost:3000/api/alerts', {
        method: 'POST',
        body: {
          name: 'Test Alert',
          symbol: 'BTC',
          condition_type: 'above',
          target_value: 70000,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
