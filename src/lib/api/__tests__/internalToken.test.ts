/**
 * @jest-environment node
 */
import { generateInternalToken, verifyInternalToken } from '@/lib/api/internalToken';

// Regression coverage for the production auth break: `getSecret()` used to
// throw whenever INTERNAL_API_SECRET was unset, even though the thrown error
// message documented CSRF_SECRET / JWT_SECRET as acceptable fallbacks. On
// Vercel with only CSRF_SECRET configured (no INTERNAL_API_SECRET), the
// middleware could not sign the internal cookie, so the safety-check internal
// API fell through to the auth gate and returned 401. These tests encode the
// exact scenarios the fix must satisfy.

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function setProdEnv(overrides: Record<string, string | undefined>) {
  process.env.NODE_ENV = 'production';
  delete process.env.INTERNAL_API_SECRET;
  delete process.env.CSRF_SECRET;
  delete process.env.JWT_SECRET;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe('internalToken — production secret resolution', () => {
  it('prod with only CSRF_SECRET set: token generates & verifies (the Vercel 401 fix)', async () => {
    setProdEnv({ CSRF_SECRET: 'csrf-configured-on-vercel' });

    // Before the fix this threw:
    //   "INTERNAL_API_SECRET (or CSRF_SECRET / JWT_SECRET) must be set in production"
    const token = await generateInternalToken();
    expect(typeof token).toBe('string');
    expect(token.split(':')).toHaveLength(2);

    // The HMAC-signed token must verify so the middleware can issue it and the
    // API route accepts it — i.e. the safety-check internal API works in prod.
    expect(await verifyInternalToken(token)).toBe(true);
  });

  it('prod with only JWT_SECRET set: also works', async () => {
    setProdEnv({ JWT_SECRET: 'jwt-configured-on-vercel' });

    const token = await generateInternalToken();
    expect(await verifyInternalToken(token)).toBe(true);
  });

  it('prod with INTERNAL_API_SECRET set: works (and is preferred)', async () => {
    setProdEnv({
      INTERNAL_API_SECRET: 'dedicated-secret',
      CSRF_SECRET: 'csrf',
      JWT_SECRET: 'jwt',
    });

    const token = await generateInternalToken();
    expect(await verifyInternalToken(token)).toBe(true);
  });

  it('prod with NONE of the three set: still throws (security guard preserved)', async () => {
    setProdEnv({});

    await expect(generateInternalToken()).rejects.toThrow(
      /INTERNAL_API_SECRET \(or CSRF_SECRET \/ JWT_SECRET\) must be set in production/
    );
  });
});
