import { POST } from '../route';

describe('POST /api/auth/oauth-state', () => {
  it('creates a short-lived, server-managed OAuth state cookie', async () => {
    const response = await POST(
      new Request('https://www.oracleinsight.xyz/api/auth/oauth-state', { method: 'POST' })
    );
    const body = (await response.json()) as { state: string };

    expect(body.state).toMatch(/^[0-9a-f-]{36}$/i);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.cookies.get('oauth_state')?.value).toBe(body.state);

    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=lax');
    expect(setCookie).toContain('Max-Age=600');
    expect(setCookie).toContain('Path=/');
  });
});
