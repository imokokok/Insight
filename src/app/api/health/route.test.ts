/**
 * @fileoverview Tests for /api/health route
 */

import { GET } from './route';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: jest.fn(),
}));

import { getSupabaseClient } from '@/lib/supabase/client';

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

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.checks.database.status).toBe('ok');
    expect(data.checks.environment.status).toBe('ok');
    expect(data.checks.memory.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
    expect(data.version).toBeDefined();
    expect(data.uptime).toBeDefined();
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
    expect(data.checks.database.status).toBe('error');
    expect(data.checks.database.error).toBe('Connection failed');
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
    expect(data.checks.environment.status).toBe('error');
    expect(data.checks.environment.hasRequiredEnvVars).toBe(false);
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

    // Mock high memory usage
    const originalMemoryUsage = process.memoryUsage;
    process.memoryUsage = jest.fn().mockReturnValue({
      heapUsed: 850 * 1024 * 1024,
      heapTotal: 1000 * 1024 * 1024,
    });

    const response = await GET();
    const data = await response.json();

    expect(data.status).toBe('degraded');
    expect(data.checks.memory.status).toBe('warning');
    expect(data.checks.memory.percentage).toBeGreaterThan(75);

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
    expect(data.checks.database.status).toBe('error');
    expect(data.checks.database.error).toBe('Database connection error');
  });

  it('should include database latency when check passes', async () => {
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

    expect(data.checks.database.latency).toBeDefined();
    expect(typeof data.checks.database.latency).toBe('number');
  });

  it('should return correct memory usage details', async () => {
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

    expect(data.checks.memory.used).toBeDefined();
    expect(data.checks.memory.total).toBeDefined();
    expect(data.checks.memory.percentage).toBeDefined();
    expect(typeof data.checks.memory.used).toBe('number');
    expect(typeof data.checks.memory.total).toBe('number');
    expect(typeof data.checks.memory.percentage).toBe('number');
  });
});
