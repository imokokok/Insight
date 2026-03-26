/**
 * @fileoverview Tests for /api/alerts route
 */

import { NextRequest } from 'next/server';

import { getUserId } from '@/lib/api/utils';
import { getServerQueries } from '@/lib/supabase/server';

import { GET, POST } from './route';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  getServerQueries: jest.fn(),
}));

jest.mock('@/lib/api/utils', () => ({
  getUserId: jest.fn(),
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
  })),
}));

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
      const mockAlerts = [
        { id: '1', name: 'BTC Alert', symbol: 'BTC', condition_type: 'above' },
        { id: '2', name: 'ETH Alert', symbol: 'ETH', condition_type: 'below' },
      ];

      (getUserId as jest.Mock).mockResolvedValue('user-123');
      mockQueries.getAlerts.mockResolvedValue(mockAlerts);

      const request = new NextRequest('http://localhost:3000/api/alerts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.alerts).toEqual(mockAlerts);
      expect(data.count).toBe(2);
      expect(mockQueries.getAlerts).toHaveBeenCalledWith('user-123');
    });

    it('should return 401 for unauthenticated user', async () => {
      (getUserId as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/alerts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 500 when database query fails', async () => {
      (getUserId as jest.Mock).mockResolvedValue('user-123');
      mockQueries.getAlerts.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/alerts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch alerts');
    });

    it('should handle unexpected errors', async () => {
      (getUserId as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/alerts');
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
        condition_type: 'above',
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

      const request = new NextRequest('http://localhost:3000/api/alerts', {
        method: 'POST',
        body: JSON.stringify(newAlert),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.alert).toEqual(createdAlert);
      expect(data.message).toBe('Alert created successfully');
      expect(mockQueries.createAlert).toHaveBeenCalledWith('user-123', {
        name: newAlert.name,
        symbol: newAlert.symbol,
        chain: newAlert.chain,
        condition_type: newAlert.condition_type,
        target_value: newAlert.target_value,
        provider: newAlert.provider,
        is_active: newAlert.is_active,
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      (getUserId as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/alerts', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Alert' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for missing required fields', async () => {
      (getUserId as jest.Mock).mockResolvedValue('user-123');

      const request = new NextRequest('http://localhost:3000/api/alerts', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Alert' }), // missing symbol, condition_type, target_value
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid condition_type', async () => {
      (getUserId as jest.Mock).mockResolvedValue('user-123');

      const request = new NextRequest('http://localhost:3000/api/alerts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Alert',
          symbol: 'BTC',
          condition_type: 'invalid_type',
          target_value: 70000,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid condition_type');
    });

    it('should use default values for optional fields', async () => {
      const newAlert = {
        name: 'BTC Alert',
        symbol: 'BTC',
        condition_type: 'above',
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

      const request = new NextRequest('http://localhost:3000/api/alerts', {
        method: 'POST',
        body: JSON.stringify(newAlert),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(mockQueries.createAlert).toHaveBeenCalledWith('user-123', {
        name: newAlert.name,
        symbol: newAlert.symbol,
        chain: null,
        condition_type: newAlert.condition_type,
        target_value: newAlert.target_value,
        provider: null,
        is_active: true,
      });
    });

    it('should return 500 when database insert fails', async () => {
      const newAlert = {
        name: 'BTC Alert',
        symbol: 'BTC',
        condition_type: 'above',
        target_value: 70000,
      };

      (getUserId as jest.Mock).mockResolvedValue('user-123');
      mockQueries.createAlert.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/alerts', {
        method: 'POST',
        body: JSON.stringify(newAlert),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create alert');
    });

    it('should handle unexpected errors', async () => {
      (getUserId as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/alerts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Alert',
          symbol: 'BTC',
          condition_type: 'above',
          target_value: 70000,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
