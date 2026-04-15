import { NextResponse, type NextRequest } from 'next/server';

import { createServerClient } from '@supabase/ssr';
import createMiddleware from 'next-intl/middleware';

import { routing } from '@/i18n/routing';
import { generateCSRFToken, setCSRFCookie, CSRF_TOKEN_HEADER } from '@/lib/security/csrf';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('middleware');

const protectedRoutes = ['/settings', '/alerts', '/favorites'];
const authRoutes = ['/login', '/register', '/forgot-password', '/auth'];

const intlMiddleware = createMiddleware(routing);

const localeReplacePattern = new RegExp(`^/(${routing.locales.join('|')})`);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 跳过 API 路由的重定向
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 使用 next-intl 处理国际化（包括自动检测和重定向）
  const intlResponse = intlMiddleware(request);

  const cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }> =
    [];

  // 检查环境变量
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

  const pathnameWithoutLocale = pathname.replace(localeReplacePattern, '') || '/';

  const isProtectedRoute = protectedRoutes.some((route) => pathnameWithoutLocale.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathnameWithoutLocale.startsWith(route));

  if (isProtectedRoute && !session) {
    const url = request.nextUrl.clone();
    const locale = pathname.match(localeReplacePattern)?.[1] || routing.defaultLocale;
    url.pathname = `/${locale}/login`;
    url.searchParams.set('redirect', pathnameWithoutLocale);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && session) {
    const url = request.nextUrl.clone();
    const locale = pathname.match(localeReplacePattern)?.[1] || routing.defaultLocale;
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  cookiesToSet.forEach(({ name, value, options }) => {
    intlResponse.cookies.set(name, value, options);
  });

  // 只在 cookie 不存在时才生成新的 CSRF token
  let csrfToken = request.cookies.get('csrf-token')?.value;
  if (!csrfToken) {
    csrfToken = generateCSRFToken();
    setCSRFCookie(intlResponse, csrfToken);
  }
  intlResponse.headers.set(CSRF_TOKEN_HEADER, csrfToken);

  return intlResponse;
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
