import { createCdpAuthHeaders } from '../cdpAuth';

describe('createCdpAuthHeaders', () => {
  const KEY = {
    apiKeyId: 'c816b095-0102-4b4e-ad90-a522a4175df5',
    apiKeySecret:
      'K/O3RFw1POGllQqgTW1Ho3uHdAwxFi2GYMKT6n8+7fVPCa8eem2HmC+O5lWEEA75Snh6xo6lpBRvxr88ju+lJQ==',
  };

  it('returns path-keyed Bearer headers for verify/settle/supported', async () => {
    const build = createCdpAuthHeaders(KEY);
    const headers = await build();

    expect(Object.keys(headers).sort()).toEqual(['settle', 'supported', 'verify']);
    for (const entry of [headers.verify, headers.settle, headers.supported]) {
      expect(entry).toBeDefined();
      expect(entry!.Authorization).toMatch(
        /^Bearer ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/
      );
    }
  });

  it('produces a fresh JWT on every invocation (no stale token reuse)', async () => {
    const build = createCdpAuthHeaders(KEY);
    const first = await build();
    const second = await build();
    // JWTs embed an iat/exp timestamp and a random nonce, so two consecutive
    // generations must differ.
    expect(first.verify!.Authorization).not.toBe(second.verify!.Authorization);
  });
});
