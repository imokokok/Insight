import { extractTrustedClientIp } from '../../trustedClientIp';

describe('extractTrustedClientIp', () => {
  const originalRuntime = process.env.INSIGHT_RUNTIME;

  afterEach(() => {
    if (originalRuntime === undefined) delete process.env.INSIGHT_RUNTIME;
    else process.env.INSIGHT_RUNTIME = originalRuntime;
  });

  it('ignores caller supplied forwarded headers outside Cloudflare Workers', () => {
    delete process.env.INSIGHT_RUNTIME;
    const headers = new Headers({
      'x-forwarded-for': '198.51.100.9',
      'x-real-ip': '198.51.100.10',
      'cf-connecting-ip': '198.51.100.11',
    });

    expect(extractTrustedClientIp({ headers } as never)).toBe('unknown');
  });

  it('uses the edge client IP on Cloudflare Workers', () => {
    process.env.INSIGHT_RUNTIME = 'cloudflare';
    const headers = new Headers({ 'cf-connecting-ip': '198.51.100.9' });

    expect(extractTrustedClientIp({ headers } as never)).toBe('198.51.100.9');
  });
});
