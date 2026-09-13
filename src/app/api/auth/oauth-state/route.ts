import { NextResponse } from 'next/server';

const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_TTL_SECONDS = 10 * 60;

export async function POST(request: Request) {
  const state = crypto.randomUUID();
  const response = NextResponse.json({ state });
  const requestProtocol = new URL(request.url).protocol;

  response.headers.set('Cache-Control', 'no-store');
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: requestProtocol === 'https:' || process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: OAUTH_STATE_TTL_SECONDS,
    path: '/',
  });

  return response;
}
