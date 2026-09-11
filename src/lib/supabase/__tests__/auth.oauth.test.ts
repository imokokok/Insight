import { signInWithOAuth } from '../auth';
import { supabase } from '../client';

jest.mock('../client', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
    },
  },
}));

describe('signInWithOAuth', () => {
  const originalFetch = global.fetch;
  const oauthSignIn = supabase.auth.signInWithOAuth as jest.Mock;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('gets server-managed state before redirecting to Supabase', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ state: 'server-generated-state' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    oauthSignIn.mockResolvedValue({ error: null });

    const result = await signInWithOAuth('google');

    expect(global.fetch).toHaveBeenCalledWith('/api/auth/oauth-state', {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    expect(oauthSignIn).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: { state: 'server-generated-state' },
      },
    });
    expect(result.error).toBeNull();
  });

  it('does not start OAuth when state initialization fails', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await signInWithOAuth('github');

    expect(oauthSignIn).not.toHaveBeenCalled();
    expect(result.error?.code).toBe('oauth_state_init_failed');
    expect(result.error?.status).toBe(503);
  });
});
