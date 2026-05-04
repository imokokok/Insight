import { type NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS = [
  '/settings',
  '/alerts',
  '/favorites',
  '/snapshots',
  '/dashboard',
  '/profile',
];

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
  } catch {
    return false;
  }

  return true;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = hasValidSessionCookie(request);

  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p)) && !isAuthenticated) {
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
