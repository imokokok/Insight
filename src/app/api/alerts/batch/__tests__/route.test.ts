import { type NextRequest } from 'next/server';

import type { PriceAlert } from '@/lib/supabase/queries';

import { POST } from '../route';

const mockGetUserId = jest.fn();
const mockGetServerQueries = jest.fn();
const mockValidateAndSanitize = jest.fn();
const mockSanitizeObject = jest.fn();

jest.mock('@/lib/api/utils', () => ({
  getUserId: () => mockGetUserId,
}));

jest.mock('@/lib/supabase/server', () => ({
  getServerQueries: () => mockGetServerQueries,
}));

jest.mock('@/lib/security', () => ({
  sanitizeObject: (obj: unknown) => mockSanitizeObject(obj),
}));

jest.mock('@/lib/security/validation', () => ({
  BatchOperationSchema: {},
  validateAndSanitize: (...args: unknown[]) => mockValidateAndSanitize(...args),
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const mockAlerts: PriceAlert[] = [
  {
    id: 'alert-1',
    user_id: 'user-123',
    name: 'Alert 1',
    symbol: 'BTC/USD',
    chain: 'ethereum',
    condition_type: 'above',
    target_value: 50000,
    provider: 'chainlink',
    is_active: true,
    last_triggered_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'alert-2',
    user_id: 'user-123',
    name: 'Alert 2',
    symbol: 'ETH/USD',
    chain: 'ethereum',
    condition_type: 'below',
    target_value: 3000,
    provider: 'pyth',
    is_active: false,
    last_triggered_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const createMockRequest = (
  options: { body?: unknown; headers?: Record<string, string> } = {}
): NextRequest => {
  return {
    headers: new Headers(options.headers || {}),
    json: async () => options.body,
  } as unknown as NextRequest;
};

describe('/api/alerts/batch', () => {
  let mockQueries: {
    getAlerts: jest.Mock;
    updateAlert: jest.Mock;
    deleteAlert: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueries = {
      getAlerts: jest.fn(),
      updateAlert: jest.fn(),
      deleteAlert: jest.fn(),
    };

    mockGetServerQueries.mockReturnValue(mockQueries);
    mockSanitizeObject.mockImplementation((obj: unknown) => obj);
  });

  describe('POST', () => {
    it('should successfully batch enable alerts', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockValidateAndSanitize.mockReturnValue({
        action: 'enable',
        alertIds: ['alert-1', 'alert-2'],
      });
      mockQueries.getAlerts.mockResolvedValue(mockAlerts);
      mockQueries.updateAlert.mockResolvedValue({ ...mockAlerts[0], is_active: true });

      const request = createMockRequest({
        body: { action: 'enable', alertIds: ['alert-1', 'alert-2'] },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Batch enable completed');
      expect(data.results.succeeded).toBe(2);
    });

    it('should successfully batch disable alerts', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockValidateAndSanitize.mockReturnValue({
        action: 'disable',
        alertIds: ['alert-1', 'alert-2'],
      });
      mockQueries.getAlerts.mockResolvedValue(mockAlerts);
      mockQueries.updateAlert.mockResolvedValue({ ...mockAlerts[0], is_active: false });

      const request = createMockRequest({
        body: { action: 'disable', alertIds: ['alert-1', 'alert-2'] },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Batch disable completed');
    });

    it('should successfully batch delete alerts', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockValidateAndSanitize.mockReturnValue({
        action: 'delete',
        alertIds: ['alert-1', 'alert-2'],
      });
      mockQueries.getAlerts.mockResolvedValue(mockAlerts);
      mockQueries.deleteAlert.mockResolvedValue(true);

      const request = createMockRequest({
        body: { action: 'delete', alertIds: ['alert-1', 'alert-2'] },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Batch delete completed');
    });

    it('should return unauthorized error when user is not logged in', async () => {
      mockGetUserId.mockResolvedValue(null);

      const request = createMockRequest({
        body: { action: 'enable', alertIds: ['alert-1'] },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return error when request data is invalid', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockValidateAndSanitize.mockReturnValue(null);

      const request = createMockRequest({
        body: { action: 'invalid', alertIds: [] },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data. Check action and alertIds fields.');
    });

    it('should handle user alert fetch failure', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockValidateAndSanitize.mockReturnValue({
        action: 'enable',
        alertIds: ['alert-1'],
      });
      mockQueries.getAlerts.mockResolvedValue(null);

      const request = createMockRequest({
        body: { action: 'enable', alertIds: ['alert-1'] },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch user alerts');
    });

    it('should handle partial success', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockValidateAndSanitize.mockReturnValue({
        action: 'enable',
        alertIds: ['alert-1', 'alert-2', 'alert-3'],
      });
      mockQueries.getAlerts.mockResolvedValue(mockAlerts);
      mockQueries.updateAlert
        .mockResolvedValueOnce({ ...mockAlerts[0], is_active: true })
        .mockResolvedValueOnce(null);

      const request = createMockRequest({
        body: { action: 'enable', alertIds: ['alert-1', 'alert-2', 'alert-3'] },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.failed).toBe(2);
    });

    it('should handle update failure', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockValidateAndSanitize.mockReturnValue({
        action: 'enable',
        alertIds: ['alert-1'],
      });
      mockQueries.getAlerts.mockResolvedValue(mockAlerts);
      mockQueries.updateAlert.mockResolvedValue(null);

      const request = createMockRequest({
        body: { action: 'enable', alertIds: ['alert-1'] },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.succeeded).toBe(0);
      expect(data.results.failed).toBe(1);
    });

    it('should handle delete failure', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockValidateAndSanitize.mockReturnValue({
        action: 'delete',
        alertIds: ['alert-1'],
      });
      mockQueries.getAlerts.mockResolvedValue(mockAlerts);
      mockQueries.deleteAlert.mockResolvedValue(false);

      const request = createMockRequest({
        body: { action: 'delete', alertIds: ['alert-1'] },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.succeeded).toBe(0);
      expect(data.results.failed).toBe(1);
    });

    it('should handle update exception', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockValidateAndSanitize.mockReturnValue({
        action: 'enable',
        alertIds: ['alert-1'],
      });
      mockQueries.getAlerts.mockResolvedValue(mockAlerts);
      mockQueries.updateAlert.mockRejectedValue(new Error('Update error'));

      const request = createMockRequest({
        body: { action: 'enable', alertIds: ['alert-1'] },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.failed).toBe(1);
    });

    it('shouldhandledeleteanomaly', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockValidateAndSanitize.mockReturnValue({
        action: 'delete',
        alertIds: ['alert-1'],
      });
      mockQueries.getAlerts.mockResolvedValue(mockAlerts);
      mockQueries.deleteAlert.mockRejectedValue(new Error('Delete error'));

      const request = createMockRequest({
        body: { action: 'delete', alertIds: ['alert-1'] },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.failed).toBe(1);
    });

    it('should handle exception', async () => {
      mockGetUserId.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({
        body: { action: 'enable', alertIds: ['alert-1'] },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('shouldfilternotcurrentuser ID', async () => {
      mockGetUserId.mockResolvedValue('user-123');
      mockValidateAndSanitize.mockReturnValue({
        action: 'enable',
        alertIds: ['alert-1', 'alert-other-user'],
      });
      mockQueries.getAlerts.mockResolvedValue(mockAlerts);
      mockQueries.updateAlert.mockResolvedValue({ ...mockAlerts[0], is_active: true });

      const request = createMockRequest({
        body: { action: 'enable', alertIds: ['alert-1', 'alert-other-user'] },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.failedIds).toContain('alert-other-user');
    });
  });
});
