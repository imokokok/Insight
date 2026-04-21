import { type NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS = ['/settings', '/alerts', '/favorites', '/snapshots'];
const AUTH_PATHS = ['/login', '/register'];

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (c) =>
        (c.name.startsWith('sb-') && c.name.includes('-auth-token')) ||
        c.name.includes('supabase-auth-token')
    );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = hasSessionCookie(request);

  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p)) && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (AUTH_PATHS.some((p) => pathname === p) && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/settings/:path*',
    '/alerts/:path*',
    '/favorites/:path*',
    '/snapshots/:path*',
    '/login',
    '/register',
  ],
};
