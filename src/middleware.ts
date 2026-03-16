import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { routing, getValidLocale } from '@/i18n/routing';

const protectedRoutes = ['/dashboard', '/settings', '/profile'];
const authRoutes = ['/login', '/register', '/forgot-password', '/auth'];

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 获取浏览器语言
  const acceptLanguage = request.headers.get('accept-language');
  const browserLocale = acceptLanguage?.split(',')[0]?.split('-')[0];
  
  // 根据浏览器语言决定目标语言：中文显示中文，其他显示英文
  const targetLocale = getValidLocale(browserLocale);
  
  // 检查当前路径是否已经有语言前缀
  const pathname = request.nextUrl.pathname;
  const hasLocalePrefix = /^\/(en|zh-CN)(\/|$)/.test(pathname);
  
  // 如果没有语言前缀，重定向到对应的语言版本
  if (!hasLocalePrefix) {
    const url = request.nextUrl.clone();
    url.pathname = `/${targetLocale}${pathname}`;
    return NextResponse.redirect(url);
  }
  
  // 先处理国际化路由
  const intlResponse = intlMiddleware(request);
  
  // 创建 Supabase 客户端
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 移除语言前缀进行路由检查
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

  return intlResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
