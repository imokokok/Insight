import { NextResponse, type NextRequest } from 'next/server';

import { createServerClient } from '@supabase/ssr';
import createMiddleware from 'next-intl/middleware';

import { routing, getValidLocale } from '@/i18n/routing';
import { generateCSRFToken, setCSRFCookie, CSRF_TOKEN_HEADER } from '@/lib/security/csrf';

const protectedRoutes = ['/dashboard', '/settings', '/profile'];
const authRoutes = ['/login', '/register', '/forgot-password', '/auth'];

const intlMiddleware = createMiddleware(routing);

const localePattern = new RegExp(`^/(${routing.locales.join('|')})(/|$)`);
const localeReplacePattern = new RegExp(`^/(${routing.locales.join('|')})`);

export async function middleware(request: NextRequest) {
  const acceptLanguage = request.headers.get('accept-language');
  const browserLocale = acceptLanguage?.split(',')[0]?.split('-')[0];

  const targetLocale = getValidLocale(browserLocale);

  const pathname = request.nextUrl.pathname;
  const hasLocalePrefix = localePattern.test(pathname);

  if (!hasLocalePrefix) {
    const url = request.nextUrl.clone();
    url.pathname = `/${targetLocale}${pathname}`;
    return NextResponse.redirect(url);
  }

  const intlResponse = intlMiddleware(request);

  const cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }> =
    [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          cookies.forEach((cookie) => cookiesToSet.push(cookie));
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathnameWithoutLocale = pathname.replace(localeReplacePattern, '') || '/';

  const isProtectedRoute = protectedRoutes.some((route) => pathnameWithoutLocale.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathnameWithoutLocale.startsWith(route));

  if (isProtectedRoute && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathnameWithoutLocale);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && session) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  cookiesToSet.forEach(({ name, value, options }) => {
    intlResponse.cookies.set(name, value, options);
  });

  intlResponse.headers.set('X-Frame-Options', 'DENY');
  intlResponse.headers.set('X-Content-Type-Options', 'nosniff');
  intlResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  intlResponse.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
  );
  intlResponse.headers.set('X-DNS-Prefetch-Control', 'on');
  intlResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  intlResponse.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.vercel-scripts.com https://*.sentry.io; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self'; " +
      "connect-src 'self' https: wss: https://*.supabase.co https://*.sentry.io; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
  );
  intlResponse.headers.set('X-XSS-Protection', '1; mode=block');

  const csrfToken = request.cookies.get('csrf-token')?.value || generateCSRFToken();
  setCSRFCookie(intlResponse, csrfToken);
  intlResponse.headers.set(CSRF_TOKEN_HEADER, csrfToken);

  return intlResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
