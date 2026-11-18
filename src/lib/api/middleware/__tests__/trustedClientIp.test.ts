import { extractTrustedClientIp } from '../../trustedClientIp';

describe('extractTrustedClientIp', () => {
  const originalVercel = process.env.VERCEL;

  afterEach(() => {
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
  });

  it('ignores caller supplied forwarded headers outside Vercel', () => {
    delete process.env.VERCEL;
    const headers = new Headers({
      'x-forwarded-for': '198.51.100.9',
      'x-real-ip': '198.51.100.10',
      'x-vercel-forwarded-for': '198.51.100.11',
    });

    expect(extractTrustedClientIp({ headers } as never)).toBe('unknown');
  });

  it('uses the platform forwarded client IP on Vercel', () => {
    process.env.VERCEL = '1';
    const headers = new Headers({ 'x-vercel-forwarded-for': '198.51.100.9, 10.0.0.1' });

    expect(extractTrustedClientIp({ headers } as never)).toBe('198.51.100.9');
  });
});
