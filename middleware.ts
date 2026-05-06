import { type NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';

const PROTECTED_PATHS = [
  '/settings',
  '/alerts',
  '/favorites',
  '/snapshots',
  '/dashboard',
  '/profile',
];

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return hasValidSessionCookie(request);
  }

  try {
    let hasSession = false;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    hasSession = session !== null;
    return hasSession;
  } catch {
    return hasValidSessionCookie(request);
  }
}

function hasValidSessionCookie(request: NextRequest): boolean {
  const cookies = request.cookies.getAll();
  const sessionCookie = cookies.find(
    (c) =>
      (c.name.startsWith('sb-') && c.name.includes('-auth-token')) ||
      c.name.includes('supabase-auth-token')
  );

  if (!sessionCookie) return false;

  const value = sessionCookie.value;
  if (
    !value ||
    value.trim() === '' ||
    value === 'null' ||
    value === 'undefined' ||
    value === '{}'
  ) {
    return false;
  }

  try {
    const decoded = decodeURIComponent(value);
    if (!decoded || decoded.length < 10) return false;

    const parts = decoded.split('.');
    if (parts.length < 2) return false;

    for (const part of parts) {
      try {
        const payload = JSON.parse(atob(part));
        if (typeof payload === 'object' && payload !== null) {
          if (payload.exp && typeof payload.exp === 'number') {
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) return false;
          }
          return true;
        }
      } catch {
        continue;
      }
    }

    return false;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = await isAuthenticated(request);

  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p)) && !authenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/settings/:path*',
    '/alerts/:path*',
    '/favorites/:path*',
    '/snapshots/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
  ],
};
