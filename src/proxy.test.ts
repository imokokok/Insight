import { type NextRequest } from 'next/server';

import { createServerClient } from '@supabase/ssr';

import { proxy } from './proxy';

jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }));
jest.mock('@/lib/api/internalToken', () => ({
  INTERNAL_COOKIE_NAME: '__internal',
  INTERNAL_COOKIE_OPTIONS: { httpOnly: true, sameSite: 'strict', path: '/' },
  generateInternalToken: jest.fn().mockResolvedValue('signed:1'),
  verifyInternalToken: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

describe('proxy authentication gate', () => {
  function createRequest(input: string): NextRequest {
    const url = new URL(input);
    return {
      url: url.toString(),
      method: 'GET',
      headers: new Headers(),
      nextUrl: url,
      cookies: {
        get: jest.fn().mockReturnValue(undefined),
        getAll: jest.fn().mockReturnValue([]),
      },
    } as unknown as NextRequest;
  }

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('uses verified claims and allows a protected page', async () => {
    (createServerClient as jest.Mock).mockReturnValue({
      auth: {
        getClaims: jest
          .fn()
          .mockResolvedValue({ data: { claims: { sub: 'user-1' } }, error: null }),
      },
    });

    const response = await proxy(createRequest('http://localhost/settings'));
    expect(response.status).toBe(200);
  });

  it('redirects when claims cannot be verified', async () => {
    (createServerClient as jest.Mock).mockReturnValue({
      auth: { getClaims: jest.fn().mockResolvedValue({ data: null, error: new Error('invalid') }) },
    });

    const response = await proxy(createRequest('http://localhost/settings?tab=billing'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('redirect=%2Fsettings%3Ftab%3Dbilling');
  });
});
