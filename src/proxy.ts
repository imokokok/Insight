import { NextResponse, type NextRequest } from 'next/server';

import { createServerClient } from '@supabase/ssr';

import { generateCSRFToken, setCSRFCookie, CSRF_TOKEN_HEADER } from '@/lib/security/csrf';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('proxy');

const protectedRoutes = ['/settings', '/alerts', '/favorites'];
const authRoutes = ['/login', '/register', '/forgot-password', '/auth'];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }> =
    [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.error('Missing Supabase environment variables');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        cookies.forEach((cookie) => cookiesToSet.push(cookie));
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  const response = NextResponse.next();

  if (isProtectedRoute && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && session) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  let csrfToken = request.cookies.get('csrf-token')?.value;
  if (!csrfToken) {
    csrfToken = generateCSRFToken();
    setCSRFCookie(response, csrfToken);
  }
  response.headers.set(CSRF_TOKEN_HEADER, csrfToken);

  return response;
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
