import { verifyCronSecret } from '@/lib/api/cronAuth';

jest.mock('@/lib/utils/logger', () => ({
  normalizeError: (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

function createRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/cron/test', { headers });
}

describe('verifyCronSecret', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CRON_SECRET: 'super-secret-cron-token' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns null when the Bearer token matches CRON_SECRET', () => {
    const result = verifyCronSecret(
      createRequest({ authorization: 'Bearer super-secret-cron-token' })
    );
    expect(result).toBeNull();
  });

  it('returns a 401 response when the token is wrong', () => {
    const result = verifyCronSecret(createRequest({ authorization: 'Bearer wrong-token' }));
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('returns a 401 response when the Authorization header is missing', () => {
    const result = verifyCronSecret(createRequest());
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('fails closed (401) when CRON_SECRET is not configured', () => {
    delete process.env.CRON_SECRET;
    const result = verifyCronSecret(
      createRequest({ authorization: 'Bearer super-secret-cron-token' })
    );
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('rejects a token with the correct prefix but wrong remainder', () => {
    // A naive `startsWith('Bearer ')` check would wrongly pass here — guard
    // against regressions where the comparison is weakened.
    const result = verifyCronSecret(
      createRequest({ authorization: 'Bearer super-secret-cron-token-extra' })
    );
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('rejects an empty Bearer value', () => {
    const result = verifyCronSecret(createRequest({ authorization: 'Bearer ' }));
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('rejects a non-Bearer scheme even if the token matches', () => {
    const result = verifyCronSecret(
      createRequest({ authorization: `Basic super-secret-cron-token` })
    );
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('returns a JSON error body on failure', async () => {
    const result = verifyCronSecret(createRequest({ authorization: 'Bearer wrong' }));
    const body = await result!.json();
    // Some jest/Response polyfills return the body pre-stringified; normalise.
    const parsed = typeof body === 'string' ? JSON.parse(body) : body;
    expect(parsed).toEqual({ error: 'Unauthorized' });
  });
});
