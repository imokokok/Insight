import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { routing, getValidLocale } from '@/i18n/routing';

const protectedRoutes = ['/dashboard', '/settings', '/profile'];
const authRoutes = ['/login', '/register', '/forgot-password', '/auth'];

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const acceptLanguage = request.headers.get('accept-language');
  const browserLocale = acceptLanguage?.split(',')[0]?.split('-')[0];

  const targetLocale = getValidLocale(browserLocale);

  const pathname = request.nextUrl.pathname;
  const hasLocalePrefix = /^\/(en|zh-CN)(\/|$)/.test(pathname);

  if (!hasLocalePrefix) {
    const url = request.nextUrl.clone();
    url.pathname = `/${targetLocale}${pathname}`;
    return NextResponse.redirect(url);
  }

  const intlResponse = intlMiddleware(request);

  const cookiesToSet: Array<{ name: string; value: string; options?: any }> = [];

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

  const pathnameWithoutLocale = pathname.replace(/^\/(en|zh-CN)/, '') || '/';

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

  return intlResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};