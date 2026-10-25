const mockAbortSignal = jest.fn();
const mockRpc = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(() => ({ rpc: mockRpc })),
}));

jest.mock('@/lib/utils/logger', () => ({
  normalizeError: (error: unknown) =>
    error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error'),
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('Supabase rate-limit outage fallback', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalStore = process.env.RATE_LIMIT_STORE;

  beforeEach(() => {
    jest.resetModules();
    mockAbortSignal.mockReset();
    mockRpc.mockReset();
    process.env.NODE_ENV = 'production';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    delete process.env.RATE_LIMIT_STORE;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
    if (originalStore === undefined) delete process.env.RATE_LIMIT_STORE;
    else process.env.RATE_LIMIT_STORE = originalStore;
  });

  it('opens a five-minute local circuit after a failed, time-bounded RPC', async () => {
    mockAbortSignal.mockResolvedValue({ error: new Error('PostgREST unavailable') });
    mockRpc.mockReturnValue({ abortSignal: mockAbortSignal });

    const { rateLimitStore } = await import('../rateLimitStore');

    await expect(rateLimitStore.increment('ip:192.0.2.1', 60_000)).resolves.toMatchObject({
      count: 1,
    });
    await expect(rateLimitStore.increment('ip:192.0.2.1', 60_000)).resolves.toMatchObject({
      count: 2,
    });

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockAbortSignal).toHaveBeenCalledTimes(1);
  });
});
