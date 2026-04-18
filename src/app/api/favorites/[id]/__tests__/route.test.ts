import { type NextRequest } from 'next/server';

import type { UserFavorite } from '@/lib/supabase/queries';

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
 json: async  => options.body,
 } as unknown as NextRequest;
};

const createMockParams = (id: string): Promise<{ id: string }> => {
 return Promise.resolve({ id });
};

describe('/api/favorites/[id]',  => {
 let mockQueries: {
 getFavorites: jest.Mock;
 updateFavorite: jest.Mock;
 deleteFavorite: jest.Mock;
 };

 beforeEach( => {
 jest.clearAllMocks;

 mockQueries = {
 getFavorites: jest.fn,
 updateFavorite: jest.fn,
 deleteFavorite: jest.fn,
 };

 mockGetServerQueries.mockReturnValue(mockQueries);
 mockSanitizeUuid.mockImplementation((id: string) => id);
 mockSanitizeString.mockImplementation((str: string) => str);
 mockSanitizeObject.mockImplementation((obj: unknown) => obj);
 });

 describe('GET',  => {
 it('should return specified favorite', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getFavorites.mockResolvedValue([mockFavorite]);

 const request = createMockRequest;
 const params = createMockParams('fav-123');
 const response = await GET(request, { params });
 const data = await response.json;

 expect(response.status).toBe(200);
 expect(data.favorite).toEqual(mockFavorite);
 });

 it('should return unauthorized error when user is not logged in', async  => {
 mockGetUserId.mockResolvedValue(null);

 const request = createMockRequest;
 const params = createMockParams('fav-123');
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
 expect(data.error).toBe('Invalid favorite ID');
 });

 it('should return 404 when favorite does not exist', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getFavorites.mockResolvedValue([]);

 const request = createMockRequest;
 const params = createMockParams('fav-nonexistent');
 const response = await GET(request, { params });
 const data = await response.json;

 expect(response.status).toBe(404);
 expect(data.error).toBe('Favorite not found');
 });

 it('should only return current user's favorites', async  => {
 mockGetUserId.mockResolvedValue('user-123');

 mockQueries.getFavorites.mockResolvedValue([]);

 const request = createMockRequest;
 const params = createMockParams('fav-456');
 const response = await GET(request, { params });
 const data = await response.json;

 expect(response.status).toBe(404);
 expect(data.error).toBe('Favorite not found');
 });

 it('should handle exception', async  => {
 mockGetUserId.mockRejectedValue(new Error('Database error'));

 const request = createMockRequest;
 const params = createMockParams('fav-123');
 const response = await GET(request, { params });
 const data = await response.json;

 expect(response.status).toBe(500);
 expect(data.error).toBe('Internal server error');
 });
 });

 describe('PUT',  => {
 const updateData = {
 name: 'Updated Name',
 config_data: { selectedOracles: ['chainlink'] },
 };

 it('should successfully update favorite', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getFavorites.mockResolvedValue([mockFavorite]);
 mockQueries.updateFavorite.mockResolvedValue({
 ...mockFavorite,
 ...updateData,
 });

 const request = createMockRequest({ body: updateData });
 const params = createMockParams('fav-123');
 const response = await PUT(request, { params });
 const data = await response.json;

 expect(response.status).toBe(200);
 expect(data.favorite.name).toBe('Updated Name');
 expect(data.message).toBe('Favorite updated successfully');
 });

 it('should return unauthorized error when user is not logged in', async  => {
 mockGetUserId.mockResolvedValue(null);

 const request = createMockRequest({ body: updateData });
 const params = createMockParams('fav-123');
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
 expect(data.error).toBe('Invalid favorite ID');
 });

 it('should return 404 when favorite does not exist', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getFavorites.mockResolvedValue([]);

 const request = createMockRequest({ body: updateData });
 const params = createMockParams('fav-nonexistent');
 const response = await PUT(request, { params });
 const data = await response.json;

 expect(response.status).toBe(404);
 expect(data.error).toBe('Favorite not found');
 });

 it('should return error when no valid update fields', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getFavorites.mockResolvedValue([mockFavorite]);

 const request = createMockRequest({ body: {} });
 const params = createMockParams('fav-123');
 const response = await PUT(request, { params });
 const data = await response.json;

 expect(response.status).toBe(400);
 expect(data.error).toBe('No valid fields to update');
 });

 it('should handle invalid JSON body', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getFavorites.mockResolvedValue([mockFavorite]);

 const request = {
 headers: new Headers,
 json: async  => {
 throw new Error('Invalid JSON');
 },
 } as unknown as NextRequest;
 const params = createMockParams('fav-123');
 const response = await PUT(request, { params });
 const data = await response.json;

 expect(response.status).toBe(400);
 expect(data.error).toBe('Invalid JSON body');
 });

 it('shouldhandleupdatefailure', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getFavorites.mockResolvedValue([mockFavorite]);
 mockQueries.updateFavorite.mockResolvedValue(null);

 const request = createMockRequest({ body: updateData });
 const params = createMockParams('fav-123');
 const response = await PUT(request, { params });
 const data = await response.json;

 expect(response.status).toBe(500);
 expect(data.error).toBe('Failed to update favorite');
 });

 it('should handle exception', async  => {
 mockGetUserId.mockRejectedValue(new Error('Database error'));

 const request = createMockRequest({ body: updateData });
 const params = createMockParams('fav-123');
 const response = await PUT(request, { params });
 const data = await response.json;

 expect(response.status).toBe(500);
 expect(data.error).toBe('Internal server error');
 });
 });

 describe('DELETE',  => {
 it('shouldsuccessdeleteFavorites', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getFavorites.mockResolvedValue([mockFavorite]);
 mockQueries.deleteFavorite.mockResolvedValue(true);

 const request = createMockRequest;
 const params = createMockParams('fav-123');
 const response = await DELETE(request, { params });
 const data = await response.json;

 expect(response.status).toBe(200);
 expect(data.message).toBe('Favorite deleted successfully');
 });

 it('should return unauthorized error when user is not logged in', async  => {
 mockGetUserId.mockResolvedValue(null);

 const request = createMockRequest;
 const params = createMockParams('fav-123');
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
 expect(data.error).toBe('Invalid favorite ID');
 });

 it('should return 404 when favorite does not exist', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getFavorites.mockResolvedValue([]);

 const request = createMockRequest;
 const params = createMockParams('fav-nonexistent');
 const response = await DELETE(request, { params });
 const data = await response.json;

 expect(response.status).toBe(404);
 expect(data.error).toBe('Favorite not found');
 });

 it('shouldhandledeletefailure', async  => {
 mockGetUserId.mockResolvedValue('user-123');
 mockQueries.getFavorites.mockResolvedValue([mockFavorite]);
 mockQueries.deleteFavorite.mockResolvedValue(false);

 const request = createMockRequest;
 const params = createMockParams('fav-123');
 const response = await DELETE(request, { params });
 const data = await response.json;

 expect(response.status).toBe(500);
 expect(data.error).toBe('Failed to delete favorite');
 });

 it('should handle exception', async  => {
 mockGetUserId.mockRejectedValue(new Error('Database error'));

 const request = createMockRequest;
 const params = createMockParams('fav-123');
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
 expect(data.error).toBe('Invalid favorite ID');
 });

 it('shouldhandle ID', async  => {
 mockSanitizeUuid.mockReturnValue(null);

 const request = createMockRequest;
 const params = createMockParams('<script>alert(1)</script>');
 const response = await GET(request, { params });
 const data = await response.json;

 expect(response.status).toBe(400);
 expect(data.error).toBe('Invalid favorite ID');
 });
 });
});
