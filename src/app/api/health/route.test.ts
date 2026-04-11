/**
 * @fileoverview Tests for /api/health route
 */

import { getSupabaseClient } from '@/lib/supabase/client';

import { GET } from './route';

jest.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: jest.fn(),
}));

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  });

  it('should return healthy status when all checks pass', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };

    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

    const originalMemoryUsage = process.memoryUsage;
    process.memoryUsage = jest.fn().mockReturnValue({
      heapUsed: 100 * 1024 * 1024,
      heapTotal: 1000 * 1024 * 1024,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.checks.database).toBe('ok');
    expect(data.checks.environment).toBe('ok');
    expect(data.checks.memory).toBe('ok');
    expect(data.timestamp).toBeDefined();

    process.memoryUsage = originalMemoryUsage;
  });

  it('should return unhealthy status when database check fails', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: { message: 'Connection failed' } }),
        }),
      }),
    };

    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.checks.database).toBe('error');
  });

  it('should return unhealthy status when environment check fails', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };

    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.checks.environment).toBe('error');
  });

  it('should return degraded status when memory usage is high', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };

    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

    const originalMemoryUsage = process.memoryUsage;
    process.memoryUsage = jest.fn().mockReturnValue({
      heapUsed: 850 * 1024 * 1024,
      heapTotal: 1000 * 1024 * 1024,
    });

    const response = await GET();
    const data = await response.json();

    expect(data.status).toBe('degraded');
    expect(data.checks.memory).toBe('warning');

    process.memoryUsage = originalMemoryUsage;
  });

  it('should handle database check exceptions', async () => {
    (getSupabaseClient as jest.Mock).mockImplementation(() => {
      throw new Error('Database connection error');
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.checks.database).toBe('error');
  });

  it('should return correct memory status', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };

    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

    const response = await GET();
    const data = await response.json();

    expect(['ok', 'warning', 'error']).toContain(data.checks.memory);
  });
});
