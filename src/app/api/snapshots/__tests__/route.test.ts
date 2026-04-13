import { GET, POST } from '../route';

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({ data, status: init?.status || 200 })),
  },
}));

jest.mock('@/lib/api/utils', () => ({
  getUserId: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  getServerQueries: jest.fn(() => ({
    getSnapshots: jest.fn().mockResolvedValue([]),
    saveSnapshot: jest.fn().mockResolvedValue({ id: 'snapshot-1' }),
  })),
}));

jest.mock('@/lib/security', () => ({
  sanitizeObject: jest.fn((data) => data),
}));

jest.mock('@/lib/security/validation', () => ({
  CreateSnapshotRequestSchema: {},
  validateAndSanitize: jest.fn((schema, data) => data),
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockGetUserId = require('@/lib/api/utils').getUserId;

describe('/api/snapshots', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetUserId.mockResolvedValue(null);

      const request = new Request('http://localhost/api/snapshots');
      const response = await GET(request);

      expect(response.status).toBe(401);
      expect(response.data.error).toBe('Unauthorized');
    });

    it('should return snapshots for authenticated user', async () => {
      mockGetUserId.mockResolvedValue('user-1');

      const request = new Request('http://localhost/api/snapshots');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('snapshots');
      expect(response.data).toHaveProperty('count');
    });
  });

  describe('POST', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetUserId.mockResolvedValue(null);

      const request = new Request('http://localhost/api/snapshots', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(response.data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid data', async () => {
      mockGetUserId.mockResolvedValue('user-1');
      const { validateAndSanitize } = require('@/lib/security/validation');
      validateAndSanitize.mockReturnValue(null);

      const request = new Request('http://localhost/api/snapshots', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });

    it('should create snapshot successfully', async () => {
      mockGetUserId.mockResolvedValue('user-1');
      const { validateAndSanitize } = require('@/lib/security/validation');
      validateAndSanitize.mockReturnValue({
        name: 'Test Snapshot',
        symbol: 'BTC',
        selected_oracles: ['chainlink'],
        price_data: {},
        stats: {},
      });

      const request = new Request('http://localhost/api/snapshots', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Snapshot',
          symbol: 'BTC',
          selected_oracles: ['chainlink'],
          price_data: {},
          stats: {},
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('snapshot');
      expect(response.data.message).toBe('Snapshot created successfully');
    });
  });
});
