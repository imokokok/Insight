const mockSingle = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({ from: mockFrom }),
}));

jest.mock('@/lib/utils/logger', () => ({
  normalizeError: (error: unknown) => (error instanceof Error ? error : new Error(String(error))),
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

describe('validateApiKey expiration cache boundary', () => {
  const originalCrypto = globalThis.crypto;

  beforeEach(() => {
    jest.resetModules();
    mockSingle.mockReset();
    mockFrom.mockReset();
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: mockSingle,
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        subtle: {
          digest: jest.fn(async () => new Uint8Array(32).buffer),
        },
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: originalCrypto });
  });

  it('does not serve a cached key after expires_at', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-18T00:00:00.000Z'));
    const validRow = {
      id: 'key-1',
      user_id: 'user-1',
      plan: 'developer',
      rate_limit: 60,
      is_active: true,
      expires_at: '2026-11-18T00:00:01.000Z',
    };
    mockSingle
      .mockResolvedValueOnce({ data: validRow, error: null })
      .mockResolvedValueOnce({ data: validRow, error: null });
    const { validateApiKey } = await import('../apiKey');

    await expect(validateApiKey('ins_test-key')).resolves.toMatchObject({ keyId: 'key-1' });
    await expect(validateApiKey('ins_test-key')).resolves.toMatchObject({ keyId: 'key-1' });
    expect(mockSingle).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1_001);
    await expect(validateApiKey('ins_test-key')).resolves.toBeNull();
    expect(mockSingle).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
