import { type NextRequest, NextResponse } from 'next/server';

import { getUserId } from '@/lib/api/utils';
import { getServerQueries } from '@/lib/supabase/server';

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

function createMockRequest(
  url: string,
  options?: { method?: string; body?: unknown; headers?: Record<string, string> }
): NextRequest {
  const bodyData = options?.body || {};
  const request = {
    url,
    method: options?.method || 'GET',
    headers: new Headers(options?.headers || {}),
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
    updateAlert: jest.fn(),
    deleteAlert: jest.fn(),
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

  describe('CRUD Operations Tests', () => {
    describe('Create Alert', () => {
      it('should create alert with minimal required fields', async () => {
        const newAlert = {
          name: 'Minimal Alert',
          symbol: 'BTC',
          condition_type: 'above' as const,
          target_value: 50000,
        };

        const createdAlert = {
          id: 'alert-minimal',
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
        expect(data.alert.name).toBe('Minimal Alert');
        expect(data.alert.is_active).toBe(true);
      });

      it('should create alert with all fields', async () => {
        const fullAlert = {
          name: 'Full Alert',
          symbol: 'ETH',
          chain: 'ethereum',
          condition_type: 'below' as const,
          target_value: 2000,
          provider: 'chainlink',
          is_active: false,
        };

        const createdAlert = {
          id: 'alert-full',
          ...fullAlert,
          user_id: 'user-123',
          created_at: new Date().toISOString(),
        };

        (getUserId as jest.Mock).mockResolvedValue('user-123');
        mockQueries.createAlert.mockResolvedValue(createdAlert);

        const request = createMockRequest('http://localhost:3000/api/alerts', {
          method: 'POST',
          body: fullAlert,
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.alert.chain).toBe('ethereum');
        expect(data.alert.provider).toBe('chainlink');
        expect(data.alert.is_active).toBe(false);
      });

      it('should create alert with change_percent condition', async () => {
        const changeAlert = {
          name: 'Price Change Alert',
          symbol: 'BTC',
          condition_type: 'change_percent' as const,
          target_value: 5,
        };

        const createdAlert = {
          id: 'alert-change',
          ...changeAlert,
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
          body: changeAlert,
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.alert.condition_type).toBe('change_percent');
      });
    });

    describe('Read Alerts', () => {
      it('should return empty array when user has no alerts', async () => {
        (getUserId as jest.Mock).mockResolvedValue('user-123');
        mockQueries.getAlerts.mockResolvedValue([]);

        const request = createMockRequest('http://localhost:3000/api/alerts');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.alerts).toEqual([]);
        expect(data.count).toBe(0);
      });

      it('should return multiple alerts for user', async () => {
        const mockAlerts = [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            name: 'Alert 1',
            symbol: 'BTC',
            condition_type: 'above' as const,
            target_value: 50000,
            is_active: true,
            user_id: '123e4567-e89b-12d3-a456-426614174000',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            name: 'Alert 2',
            symbol: 'ETH',
            condition_type: 'below' as const,
            target_value: 3000,
            is_active: false,
            user_id: '123e4567-e89b-12d3-a456-426614174000',
            created_at: '2024-01-02T00:00:00.000Z',
            updated_at: '2024-01-02T00:00:00.000Z',
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174003',
            name: 'Alert 3',
            symbol: 'SOL',
            condition_type: 'change_percent' as const,
            target_value: 10,
            is_active: true,
            user_id: '123e4567-e89b-12d3-a456-426614174000',
            created_at: '2024-01-03T00:00:00.000Z',
            updated_at: '2024-01-03T00:00:00.000Z',
          },
        ];

        (getUserId as jest.Mock).mockResolvedValue('123e4567-e89b-12d3-a456-426614174000');
        mockQueries.getAlerts.mockResolvedValue(mockAlerts);

        const request = createMockRequest('http://localhost:3000/api/alerts');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.alerts).toHaveLength(3);
        expect(data.count).toBe(3);
      });

      it('should only return alerts for authenticated user', async () => {
        const userAlerts = [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            name: 'User Alert',
            symbol: 'BTC',
            condition_type: 'above' as const,
            target_value: 50000,
            is_active: true,
            user_id: '123e4567-e89b-12d3-a456-426614174000',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        ];

        (getUserId as jest.Mock).mockResolvedValue('123e4567-e89b-12d3-a456-426614174000');
        mockQueries.getAlerts.mockResolvedValue(userAlerts);

        const request = createMockRequest('http://localhost:3000/api/alerts');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(mockQueries.getAlerts).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
        expect(
          data.alerts.every(
            (a: { user_id: string }) => a.user_id === '123e4567-e89b-12d3-a456-426614174000'
          )
        ).toBe(true);
      });
    });

    describe('Pagination Support', () => {
      it('should handle large number of alerts', async () => {
        const manyAlerts = Array.from({ length: 100 }, (_, i) => ({
          id: `123e4567-e89b-12d3-a456-${i.toString().padStart(12, '0')}`,
          name: `Alert ${i}`,
          symbol: 'BTC',
          condition_type: 'above' as const,
          target_value: 50000 + i * 100,
          is_active: true,
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          created_at: new Date(2024, 0, 1 + i).toISOString(),
          updated_at: new Date(2024, 0, 1 + i).toISOString(),
        }));

        (getUserId as jest.Mock).mockResolvedValue('123e4567-e89b-12d3-a456-426614174000');
        mockQueries.getAlerts.mockResolvedValue(manyAlerts);

        const request = createMockRequest('http://localhost:3000/api/alerts');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.alerts).toHaveLength(100);
        expect(data.count).toBe(100);
      });
    });
  });

  describe('Permission Validation Tests', () => {
    describe('Unauthorized Access Rejection', () => {
      it('should reject GET request without authentication', async () => {
        (getUserId as jest.Mock).mockResolvedValue(null);

        const request = createMockRequest('http://localhost:3000/api/alerts');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });

      it('should reject POST request without authentication', async () => {
        (getUserId as jest.Mock).mockResolvedValue(null);

        const request = createMockRequest('http://localhost:3000/api/alerts', {
          method: 'POST',
          body: { name: 'Test', symbol: 'BTC', condition_type: 'above', target_value: 100 },
        });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });
    });

    describe('Invalid Token Handling', () => {
      it('should handle invalid token gracefully', async () => {
        (getUserId as jest.Mock).mockResolvedValue(null);

        const request = createMockRequest('http://localhost:3000/api/alerts', {
          headers: { Authorization: 'Bearer invalid-token' },
        });
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });

      it('should handle malformed authorization header', async () => {
        (getUserId as jest.Mock).mockResolvedValue(null);

        const request = createMockRequest('http://localhost:3000/api/alerts', {
          headers: { Authorization: 'InvalidFormat token' },
        });
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });
    });

    describe('Expired Token Handling', () => {
      it('should handle expired token', async () => {
        (getUserId as jest.Mock).mockResolvedValue(null);

        const request = createMockRequest('http://localhost:3000/api/alerts', {
          headers: { Authorization: 'Bearer expired-token' },
        });
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });
    });

    describe('Cross-User Access Prevention', () => {
      it('should only return alerts belonging to the authenticated user', async () => {
        const userAlerts = [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            name: 'User Alert',
            symbol: 'BTC',
            condition_type: 'above' as const,
            target_value: 50000,
            is_active: true,
            user_id: '123e4567-e89b-12d3-a456-426614174000',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        ];

        (getUserId as jest.Mock).mockResolvedValue('123e4567-e89b-12d3-a456-426614174000');
        mockQueries.getAlerts.mockResolvedValue(userAlerts);

        const request = createMockRequest('http://localhost:3000/api/alerts');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(
          data.alerts.every(
            (a: { user_id: string }) => a.user_id === '123e4567-e89b-12d3-a456-426614174000'
          )
        ).toBe(true);
      });

      it('should not allow creating alert for another user', async () => {
        const newAlert = {
          name: 'Test Alert',
          symbol: 'BTC',
          condition_type: 'above' as const,
          target_value: 50000,
        };

        const createdAlert = {
          id: 'alert-new',
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

        await POST(request);

        expect(mockQueries.createAlert).toHaveBeenCalledWith('user-123', expect.any(Object));
      });
    });
  });

  describe('Data Validation Tests', () => {
    describe('Required Field Validation', () => {
      it('should reject alert without name', async () => {
        (getUserId as jest.Mock).mockResolvedValue('user-123');

        const request = createMockRequest('http://localhost:3000/api/alerts', {
          method: 'POST',
          body: { symbol: 'BTC', condition_type: 'above', target_value: 50000 },
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
      });

      it('should reject alert without symbol', async () => {
        (getUserId as jest.Mock).mockResolvedValue('user-123');

        const request = createMockRequest('http://localhost:3000/api/alerts', {
          method: 'POST',
          body: { name: 'Test', condition_type: 'above', target_value: 50000 },
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
      });

      it('should reject alert without condition_type', async () => {
        (getUserId as jest.Mock).mockResolvedValue('user-123');

        const request = createMockRequest('http://localhost:3000/api/alerts', {
          method: 'POST',
          body: { name: 'Test', symbol: 'BTC', target_value: 50000 },
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
      });

      it('should reject alert without target_value', async () => {
        (getUserId as jest.Mock).mockResolvedValue('user-123');

        const request = createMockRequest('http://localhost:3000/api/alerts', {
          method: 'POST',
          body: { name: 'Test', symbol: 'BTC', condition_type: 'above' },
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
      });

      it('should reject alert with empty name', async () => {
        (getUserId as jest.Mock).mockResolvedValue('user-123');

        const request = createMockRequest('http://localhost:3000/api/alerts', {
          method: 'POST',
          body: { name: '', symbol: 'BTC', condition_type: 'above', target_value: 50000 },
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
      });

      it('should reject alert with empty symbol', async () => {
        (getUserId as jest.Mock).mockResolvedValue('user-123');

        const request = createMockRequest('http://localhost:3000/api/alerts', {
          method: 'POST',
          body: { name: 'Test', symbol: '', condition_type: 'above', target_value: 50000 },
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
      });
    });

    describe('Field Type Validation', () => {
      it('should reject alert with non-string name', async () => {
        (getUserId as jest.Mock).mockResolvedValue('user-123');

        const request = createMockRequest('http://localhost:3000/api/alerts', {
          method: 'POST',
          body: { name: 123, symbol: 'BTC', condition_type: 'above', target_value: 50000 },
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
      });

      it('should reject alert with non-string symbol', async () => {
        (getUserId as jest.Mock).mockResolvedValue('user-123');

        const request = createMockRequest('http://localhost:3000/api/alerts', {
          method: 'POST',
          body: { name: 'Test', symbol: 123, condition_type: 'above', target_value: 50000 },
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
      });

      it('should reject alert with non-number target_value', async () => {
        (getUserId as jest.Mock).mockResolvedValue('user-123');

        const request = createMockRequest('http://localhost:3000/api/alerts', {
          method: 'POST',
          body: { name: 'Test', symbol: 'BTC', condition_type: 'above', target_value: '50000' },
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
      });

      it('should reject alert with non-boolean is_active', async () => {
        (getUserId as jest.Mock).mockResolvedValue('user-123');

        const request = createMockRequest('http://localhost:3000/api/alerts', {
          method: 'POST',
          body: {
            name: 'Test',
            symbol: 'BTC',
            condition_type: 'above',
            target_value: 50000,
            is_active: 'true',
          },
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
      });
    });

    describe('Value Range Validation', () => {
      it('should accept zero target_value', async () => {
        const newAlert = {
          name: 'Zero Alert',
          symbol: 'BTC',
          condition_type: 'above' as const,
          target_value: 0,
        };

        const createdAlert = {
          id: 'alert-zero',
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

        expect(response.status).toBe(201);
      });

      it('should accept negative target_value for below condition', async () => {
        const newAlert = {
          name: 'Negative Alert',
          symbol: 'BTC',
          condition_type: 'below' as const,
          target_value: -100,
        };

        const createdAlert = {
          id: 'alert-negative',
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

        expect(response.status).toBe(201);
      });

      it('should accept very large target_value', async () => {
        const newAlert = {
          name: 'Large Alert',
          symbol: 'BTC',
          condition_type: 'above' as const,
          target_value: 999999999999,
        };

        const createdAlert = {
          id: 'alert-large',
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

        expect(response.status).toBe(201);
      });
    });

    describe('Symbol Validation', () => {
      it('should accept valid symbol formats', async () => {
        const symbols = ['BTC', 'ETH', 'BTC/USD', 'ETH-USD', 'SOL_USDT'];

        for (const symbol of symbols) {
          const newAlert = {
            name: `${symbol} Alert`,
            symbol,
            condition_type: 'above' as const,
            target_value: 100,
          };

          const createdAlert = {
            id: `alert-${symbol}`,
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
          expect(response.status).toBe(201);
        }
      });
    });

    describe('Chain Validation', () => {
      it('should accept valid chain values', async () => {
        const chains = ['ethereum', 'arbitrum', 'optimism', 'polygon', 'solana'];

        for (const chain of chains) {
          const newAlert = {
            name: `${chain} Alert`,
            symbol: 'BTC',
            chain,
            condition_type: 'above' as const,
            target_value: 100,
          };

          const createdAlert = {
            id: `alert-${chain}`,
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
          expect(response.status).toBe(201);
        }
      });

      it('should reject invalid chain value', async () => {
        (getUserId as jest.Mock).mockResolvedValue('user-123');

        const request = createMockRequest('http://localhost:3000/api/alerts', {
          method: 'POST',
          body: {
            name: 'Test',
            symbol: 'BTC',
            chain: 'invalid-chain',
            condition_type: 'above',
            target_value: 100,
          },
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
      });
    });

    describe('Condition Type Validation', () => {
      it('should accept valid condition types', async () => {
        const conditionTypes = ['above', 'below', 'change_percent'];

        for (const condition_type of conditionTypes) {
          const newAlert = {
            name: `${condition_type} Alert`,
            symbol: 'BTC',
            condition_type: condition_type as 'above' | 'below' | 'change_percent',
            target_value: 100,
          };

          const createdAlert = {
            id: `alert-${condition_type}`,
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
          expect(response.status).toBe(201);
        }
      });

      it('should reject invalid condition type', async () => {
        (getUserId as jest.Mock).mockResolvedValue('user-123');

        const request = createMockRequest('http://localhost:3000/api/alerts', {
          method: 'POST',
          body: {
            name: 'Test',
            symbol: 'BTC',
            condition_type: 'invalid',
            target_value: 100,
          },
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
      });
    });

    describe('Provider Validation', () => {
      it('should accept valid provider values', async () => {
        const providers = ['chainlink', 'pyth', 'api3', 'redstone', 'dia'];

        for (const provider of providers) {
          const newAlert = {
            name: `${provider} Alert`,
            symbol: 'BTC',
            provider,
            condition_type: 'above' as const,
            target_value: 100,
          };

          const createdAlert = {
            id: `alert-${provider}`,
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
          expect(response.status).toBe(201);
        }
      });

      it('should reject invalid provider value', async () => {
        (getUserId as jest.Mock).mockResolvedValue('user-123');

        const request = createMockRequest('http://localhost:3000/api/alerts', {
          method: 'POST',
          body: {
            name: 'Test',
            symbol: 'BTC',
            provider: 'invalid-provider',
            condition_type: 'above',
            target_value: 100,
          },
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
      });
    });
  });

  describe('Error Response Format Tests', () => {
    describe('Consistent Error Structure', () => {
      it('should return consistent error format for 401', async () => {
        (getUserId as jest.Mock).mockResolvedValue(null);

        const request = createMockRequest('http://localhost:3000/api/alerts');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toHaveProperty('error');
        expect(typeof data.error).toBe('string');
      });

      it('should return consistent error format for 500', async () => {
        (getUserId as jest.Mock).mockResolvedValue('user-123');
        mockQueries.getAlerts.mockResolvedValue(null);

        const request = createMockRequest('http://localhost:3000/api/alerts');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toHaveProperty('error');
        expect(typeof data.error).toBe('string');
      });

      it('should return consistent error format for 400', async () => {
        (getUserId as jest.Mock).mockResolvedValue('user-123');

        const request = createMockRequest('http://localhost:3000/api/alerts', {
          method: 'POST',
          body: { name: '' },
        });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toHaveProperty('error');
      });
    });

    describe('Error Message Clarity', () => {
      it('should provide clear error message for unauthorized', async () => {
        (getUserId as jest.Mock).mockResolvedValue(null);

        const request = createMockRequest('http://localhost:3000/api/alerts');
        const response = await GET(request);
        const data = await response.json();

        expect(data.error).toBe('Unauthorized');
      });

      it('should provide clear error message for database failure', async () => {
        (getUserId as jest.Mock).mockResolvedValue('user-123');
        mockQueries.getAlerts.mockResolvedValue(null);

        const request = createMockRequest('http://localhost:3000/api/alerts');
        const response = await GET(request);
        const data = await response.json();

        expect(data.error).toBe('Failed to fetch alerts');
      });

      it('should provide clear error message for internal error', async () => {
        (getUserId as jest.Mock).mockRejectedValue(new Error('Unexpected error'));

        const request = createMockRequest('http://localhost:3000/api/alerts');
        const response = await GET(request);
        const data = await response.json();

        expect(data.error).toBe('Internal server error');
      });
    });

    describe('Stack Trace Hiding in Production', () => {
      const originalEnv = process.env.NODE_ENV;

      afterEach(() => {
        process.env.NODE_ENV = originalEnv;
      });

      it('should not expose stack trace in production', async () => {
        process.env.NODE_ENV = 'production';
        (getUserId as jest.Mock).mockRejectedValue(new Error('Internal error'));

        const request = createMockRequest('http://localhost:3000/api/alerts');
        const response = await GET(request);
        const data = await response.json();

        expect(data).not.toHaveProperty('stack');
        expect(data).not.toHaveProperty('trace');
      });

      it('should not expose internal error details in production', async () => {
        process.env.NODE_ENV = 'production';
        (getUserId as jest.Mock).mockRejectedValue(
          new Error('Database connection failed at line 123')
        );

        const request = createMockRequest('http://localhost:3000/api/alerts');
        const response = await GET(request);
        const data = await response.json();

        expect(data.error).toBe('Internal server error');
        expect(data.error).not.toContain('Database connection');
      });
    });
  });

  describe('Performance Tests', () => {
    describe('Response Time', () => {
      it('should respond within acceptable time for GET', async () => {
        (getUserId as jest.Mock).mockResolvedValue('user-123');
        mockQueries.getAlerts.mockResolvedValue([]);

        const start = Date.now();
        const request = createMockRequest('http://localhost:3000/api/alerts');
        await GET(request);
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(1000);
      });

      it('should respond within acceptable time for POST', async () => {
        const newAlert = {
          name: 'Performance Test',
          symbol: 'BTC',
          condition_type: 'above' as const,
          target_value: 50000,
        };

        const createdAlert = {
          id: 'alert-perf',
          ...newAlert,
          user_id: 'user-123',
          created_at: new Date().toISOString(),
        };

        (getUserId as jest.Mock).mockResolvedValue('user-123');
        mockQueries.createAlert.mockResolvedValue(createdAlert);

        const start = Date.now();
        const request = createMockRequest('http://localhost:3000/api/alerts', {
          method: 'POST',
          body: newAlert,
        });
        await POST(request);
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(1000);
      });
    });

    describe('Large Dataset Handling', () => {
      it('should handle large alert list efficiently', async () => {
        const largeAlertList = Array.from({ length: 1000 }, (_, i) => ({
          id: `123e4567-e89b-12d3-a456-${i.toString().padStart(12, '0')}`,
          name: `Alert ${i}`,
          symbol: 'BTC',
          condition_type: 'above' as const,
          target_value: 50000 + i,
          is_active: true,
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        (getUserId as jest.Mock).mockResolvedValue('123e4567-e89b-12d3-a456-426614174000');
        mockQueries.getAlerts.mockResolvedValue(largeAlertList);

        const start = Date.now();
        const request = createMockRequest('http://localhost:3000/api/alerts');
        const response = await GET(request);
        const duration = Date.now() - start;

        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(2000);
      });
    });

    describe('Concurrent Request Handling', () => {
      it('should handle multiple concurrent GET requests', async () => {
        (getUserId as jest.Mock).mockResolvedValue('user-123');
        mockQueries.getAlerts.mockResolvedValue([]);

        const requests = Array.from({ length: 10 }, () => {
          const request = createMockRequest('http://localhost:3000/api/alerts');
          return GET(request);
        });

        const responses = await Promise.all(requests);

        responses.forEach((response) => {
          expect(response.status).toBe(200);
        });
      });

      it('should handle concurrent POST requests', async () => {
        const createdAlert = {
          id: 'alert-concurrent',
          name: 'Concurrent Alert',
          symbol: 'BTC',
          condition_type: 'above' as const,
          target_value: 50000,
          user_id: 'user-123',
          created_at: new Date().toISOString(),
        };

        (getUserId as jest.Mock).mockResolvedValue('user-123');
        mockQueries.createAlert.mockResolvedValue(createdAlert);

        const requests = Array.from({ length: 5 }, (_, i) => {
          const request = createMockRequest('http://localhost:3000/api/alerts', {
            method: 'POST',
            body: {
              name: `Concurrent Alert ${i}`,
              symbol: 'BTC',
              condition_type: 'above',
              target_value: 50000,
            },
          });
          return POST(request);
        });

        const responses = await Promise.all(requests);

        responses.forEach((response) => {
          expect(response.status).toBe(201);
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in alert name', async () => {
      const newAlert = {
        name: 'Alert with special chars: <>&"\'',
        symbol: 'BTC',
        condition_type: 'above' as const,
        target_value: 50000,
      };

      const createdAlert = {
        id: 'alert-special',
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
      expect(data.alert.name).toBe(newAlert.name);
    });

    it('should handle unicode characters in alert name', async () => {
      const newAlert = {
        name: '价格提醒 🚀 BTC Alert 中文',
        symbol: 'BTC',
        condition_type: 'above' as const,
        target_value: 50000,
      };

      const createdAlert = {
        id: 'alert-unicode',
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
      expect(data.alert.name).toBe(newAlert.name);
    });

    it('should handle very long alert name', async () => {
      const longName = 'A'.repeat(500);
      const newAlert = {
        name: longName,
        symbol: 'BTC',
        condition_type: 'above' as const,
        target_value: 50000,
      };

      const createdAlert = {
        id: 'alert-long',
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

      expect(response.status).toBe(201);
    });

    it('should handle floating point target_value', async () => {
      const newAlert = {
        name: 'Float Alert',
        symbol: 'BTC',
        condition_type: 'above' as const,
        target_value: 50000.123456789,
      };

      const createdAlert = {
        id: 'alert-float',
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
      expect(data.alert.target_value).toBe(50000.123456789);
    });

    it('should handle null optional fields', async () => {
      const newAlert = {
        name: 'Null Fields Alert',
        symbol: 'BTC',
        condition_type: 'above' as const,
        target_value: 50000,
      };

      const createdAlert = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Null Fields Alert',
        symbol: 'BTC',
        condition_type: 'above',
        target_value: 50000,
        chain: null,
        provider: null,
        is_active: true,
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (getUserId as jest.Mock).mockResolvedValue('123e4567-e89b-12d3-a456-426614174001');
      mockQueries.createAlert.mockResolvedValue(createdAlert);

      const request = createMockRequest('http://localhost:3000/api/alerts', {
        method: 'POST',
        body: newAlert,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.alert.chain).toBeNull();
      expect(data.alert.provider).toBeNull();
    });
  });

  describe('Response Headers', () => {
    it('should return JSON response for GET', async () => {
      (getUserId as jest.Mock).mockResolvedValue('user-123');
      mockQueries.getAlerts.mockResolvedValue([]);

      const request = createMockRequest('http://localhost:3000/api/alerts');
      const response = await GET(request);

      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should return JSON response for POST', async () => {
      const newAlert = {
        name: 'Header Test',
        symbol: 'BTC',
        condition_type: 'above' as const,
        target_value: 50000,
      };

      const createdAlert = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...newAlert,
        user_id: 'user-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (getUserId as jest.Mock).mockResolvedValue('user-123');
      mockQueries.createAlert.mockResolvedValue(createdAlert);

      const request = createMockRequest('http://localhost:3000/api/alerts', {
        method: 'POST',
        body: newAlert,
      });

      const response = await POST(request);

      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });
  });
});
