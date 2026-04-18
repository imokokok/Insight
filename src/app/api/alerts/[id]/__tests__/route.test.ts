import { type NextRequest } from 'next/server';

import type { PriceAlert } from '@/lib/supabase/queries';

import { GET, PUT, DELETE } from '../route';

const mockGetUserId = jest.fn;
const mockGetServerQueries = jest.fn;
const mockSanitizeUuid = jest.fn;
const mockSanitizeString = jest.fn;
const mockSanitizeObject = jest.fn;

jest.mock('@/lib/api/utils',  => ({
 getUserId:  => mockGetUserId,
}));

jest.mock('@/lib/supabase/server',  => ({
 getServerQueries:  => mockGetServerQueries,
}));

jest.mock('@/lib/security',  => ({
 sanitizeString: (str: string, _options?: unknown) => mockSanitizeString(str, _options),
 sanitizeObject: (obj: unknown) => mockSanitizeObject(obj),
 sanitizeUuid: (id: string) => mockSanitizeUuid(id),
}));

jest.mock('@/lib/utils/logger',  => ({
 createLogger: jest.fn( => ({
 info: jest.fn,
 warn: jest.fn,
 error: jest.fn,
 debug: jest.fn,
 })),
}));

const mockAlert: PriceAlert = {
 id: 'alert-123',
 user_id: 'user-123',
 name: 'BTC Price Alert',
 symbol: 'BTC/USD',
 chain: 'ethereum',
 condition_type: 'above',
 target_value: 50000,
 provider: 'chainlink',
 is_active: true,
 last_triggered_at: null,
 created_at: '2024-01-01T00:00:00Z',
 updated_at: '2024-01-01T00:00:00Z',
};

const createMockRequest = (
 options: { body?: unknown; headers?: Record<string, string> } = {}
): NextRequest => {
 return {
 headers: new Headers(options.headers || {}),
 json: async  => options.body,
 } as unknown as NextRequest;
};

const createMockParams = (id: string): Promise<{ id: string }> => {
 return Promise.resolve({ id });
};

describe('/api/alerts/[id]',  => {
 let mockQueries: {
 getAlerts: jest.Mock;
 updateAlert: jest.Mock;
 deleteAlert: jest.Mock;
 };

 beforeEach( => {
 jest.clearAllMocks;

 mockQueries = {
 getAlerts: jest.fn,
 updateAlert: jest.fn,
 deleteAlert: jest.fn,
 };

 mockGetServerQueries.mockReturnValue(mockQueries);
 mockSanitizeUuid.mockImplementation((id: string) => id);
 mockSanitizeString.mockImplementation((str: string) => str);
 mockSanitizeObject.mockImplementation((obj: unknown) => obj);
 });

 describe('GET',  => {
 it('should return specified alert', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getAlerts.mockResolvedValue([mockAlert]);

 const request = createMockRequest;
 const params = createMockParams('alert-123');
 const response = await GET(request, { params });
 const data = await response.json;

 expect(response.status).toBe(200);
 expect(data.alert).toEqual(mockAlert);
 });

 it('should return unauthorized error when user is not logged in', async  => {
 mockGetUserId.mockResolvedValue(null);

 const request = createMockRequest;
 const params = createMockParams('alert-123');
 const response = await GET(request, { params });
 const data = await response.json;

 expect(response.status).toBe(401);
 expect(data.error).toBe('Unauthorized');
 });

 it('should return error when ID is invalid', async  => {
 mockSanitizeUuid.mockReturnValue(null);

 const request = createMockRequest;
 const params = createMockParams('invalid-id');
 const response = await GET(request, { params });
 const data = await response.json;

 expect(response.status).toBe(400);
 expect(data.error).toBe('Invalid alert ID');
 });

 it('should return 404 when alert does not exist', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getAlerts.mockResolvedValue([]);

 const request = createMockRequest;
 const params = createMockParams('alert-nonexistent');
 const response = await GET(request, { params });
 const data = await response.json;

 expect(response.status).toBe(404);
 expect(data.error).toBe('Alert not found');
 });

 it('should only return current user's alerts', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 const otherUserAlert = { ...mockAlert, id: 'alert-other', user_id: 'other-user' };
 mockQueries.getAlerts.mockResolvedValue([otherUserAlert]);

 const request = createMockRequest;
 const params = createMockParams('alert-123');
 const response = await GET(request, { params });
 const data = await response.json;

 expect(response.status).toBe(404);
 expect(data.error).toBe('Alert not found');
 });

 it('should handle exception', async  => {
 mockGetUserId.mockRejectedValue(new Error('Database error'));

 const request = createMockRequest;
 const params = createMockParams('alert-123');
 const response = await GET(request, { params });
 const data = await response.json;

 expect(response.status).toBe(500);
 expect(data.error).toBe('Internal server error');
 });
 });

 describe('PUT',  => {
 const updateData = {
 name: 'Updated Alert',
 target_value: 60000,
 is_active: false,
 };

 it('should successfully update alert', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getAlerts.mockResolvedValue([mockAlert]);
 mockQueries.updateAlert.mockResolvedValue({
 ...mockAlert,
 ...updateData,
 });

 const request = createMockRequest({ body: updateData });
 const params = createMockParams('alert-123');
 const response = await PUT(request, { params });
 const data = await response.json;

 expect(response.status).toBe(200);
 expect(data.alert.name).toBe('Updated Alert');
 expect(data.message).toBe('Alert updated successfully');
 });

 it('should return unauthorized error when user is not logged in', async  => {
 mockGetUserId.mockResolvedValue(null);

 const request = createMockRequest({ body: updateData });
 const params = createMockParams('alert-123');
 const response = await PUT(request, { params });
 const data = await response.json;

 expect(response.status).toBe(401);
 expect(data.error).toBe('Unauthorized');
 });

 it('should return error when ID is invalid', async  => {
 mockSanitizeUuid.mockReturnValue(null);

 const request = createMockRequest({ body: updateData });
 const params = createMockParams('invalid-id');
 const response = await PUT(request, { params });
 const data = await response.json;

 expect(response.status).toBe(400);
 expect(data.error).toBe('Invalid alert ID');
 });

 it('should return 404 when alert does not exist', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getAlerts.mockResolvedValue([]);

 const request = createMockRequest({ body: updateData });
 const params = createMockParams('alert-nonexistent');
 const response = await PUT(request, { params });
 const data = await response.json;

 expect(response.status).toBe(404);
 expect(data.error).toBe('Alert not found');
 });

 it('should return error when no valid update fields', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getAlerts.mockResolvedValue([mockAlert]);

 const request = createMockRequest({ body: {} });
 const params = createMockParams('alert-123');
 const response = await PUT(request, { params });
 const data = await response.json;

 expect(response.status).toBe(400);
 expect(data.error).toBe('No valid fields to update');
 });

 it('should handle invalid JSON body', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getAlerts.mockResolvedValue([mockAlert]);

 const request = {
 headers: new Headers,
 json: async  => {
 throw new Error('Invalid JSON');
 },
 } as unknown as NextRequest;
 const params = createMockParams('alert-123');
 const response = await PUT(request, { params });
 const data = await response.json;

 expect(response.status).toBe(400);
 expect(data.error).toBe('Invalid JSON body');
 });

 it('shouldhandleinvalid condition_type', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getAlerts.mockResolvedValue([mockAlert]);

 const request = createMockRequest({ body: { condition_type: 'invalid' } });
 const params = createMockParams('alert-123');
 const response = await PUT(request, { params });
 const data = await response.json;

 expect(response.status).toBe(400);
 expect(data.error).toBe('No valid fields to update');
 });

 it('shouldhandleinvalid target_value', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getAlerts.mockResolvedValue([mockAlert]);

 const request = createMockRequest({ body: { target_value: 'not-a-number' } });
 const params = createMockParams('alert-123');
 const response = await PUT(request, { params });
 const data = await response.json;

 expect(response.status).toBe(400);
 expect(data.error).toBe('No valid fields to update');
 });

 it('shouldhandleupdatefailure', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getAlerts.mockResolvedValue([mockAlert]);
 mockQueries.updateAlert.mockResolvedValue(null);

 const request = createMockRequest({ body: updateData });
 const params = createMockParams('alert-123');
 const response = await PUT(request, { params });
 const data = await response.json;

 expect(response.status).toBe(500);
 expect(data.error).toBe('Failed to update alert');
 });

 it('should handle exception', async  => {
 mockGetUserId.mockRejectedValue(new Error('Database error'));

 const request = createMockRequest({ body: updateData });
 const params = createMockParams('alert-123');
 const response = await PUT(request, { params });
 const data = await response.json;

 expect(response.status).toBe(500);
 expect(data.error).toBe('Internal server error');
 });
 });

 describe('DELETE',  => {
 it('should successfully delete alert', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getAlerts.mockResolvedValue([mockAlert]);
 mockQueries.deleteAlert.mockResolvedValue(true);

 const request = createMockRequest;
 const params = createMockParams('alert-123');
 const response = await DELETE(request, { params });
 const data = await response.json;

 expect(response.status).toBe(200);
 expect(data.message).toBe('Alert deleted successfully');
 });

 it('should return unauthorized error when user is not logged in', async  => {
 mockGetUserId.mockResolvedValue(null);

 const request = createMockRequest;
 const params = createMockParams('alert-123');
 const response = await DELETE(request, { params });
 const data = await response.json;

 expect(response.status).toBe(401);
 expect(data.error).toBe('Unauthorized');
 });

 it('should return error when ID is invalid', async  => {
 mockSanitizeUuid.mockReturnValue(null);

 const request = createMockRequest;
 const params = createMockParams('invalid-id');
 const response = await DELETE(request, { params });
 const data = await response.json;

 expect(response.status).toBe(400);
 expect(data.error).toBe('Invalid alert ID');
 });

 it('should return 404 when alert does not exist', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getAlerts.mockResolvedValue([]);

 const request = createMockRequest;
 const params = createMockParams('alert-nonexistent');
 const response = await DELETE(request, { params });
 const data = await response.json;

 expect(response.status).toBe(404);
 expect(data.error).toBe('Alert not found');
 });

 it('shouldhandledeletefailure', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getAlerts.mockResolvedValue([mockAlert]);
 mockQueries.deleteAlert.mockResolvedValue(false);

 const request = createMockRequest;
 const params = createMockParams('alert-123');
 const response = await DELETE(request, { params });
 const data = await response.json;

 expect(response.status).toBe(500);
 expect(data.error).toBe('Failed to delete alert');
 });

 it('should handle exception', async  => {
 mockGetUserId.mockRejectedValue(new Error('Database error'));

 const request = createMockRequest;
 const params = createMockParams('alert-123');
 const response = await DELETE(request, { params });
 const data = await response.json;

 expect(response.status).toBe(500);
 expect(data.error).toBe('Internal server error');
 });
 });

 describe('Edge cases',  => {
 it('shouldhandleemptystring ID', async  => {
 mockSanitizeUuid.mockReturnValue(null);

 const request = createMockRequest;
 const params = createMockParams('');
 const response = await GET(request, { params });
 const data = await response.json;

 expect(response.status).toBe(400);
 expect(data.error).toBe('Invalid alert ID');
 });

 it('shouldhandle ID', async  => {
 mockSanitizeUuid.mockReturnValue(null);

 const request = createMockRequest;
 const params = createMockParams('<script>alert(1)</script>');
 const response = await GET(request, { params });
 const data = await response.json;

 expect(response.status).toBe(400);
 expect(data.error).toBe('Invalid alert ID');
 });
 });
});
