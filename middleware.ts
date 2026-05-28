import { type NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';

const PROTECTED_PATHS = ['/settings', '/alerts', '/snapshots', '/dashboard', '/profile'];

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return false;
  }

  try {
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

    return session !== null;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = await isAuthenticated(request);

  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p)) && !authenticated) {
    const loginUrl = new URL('/login', request.url);
    const safeRedirect = pathname.startsWith('/') && !pathname.startsWith('//') ? pathname : '/';
    loginUrl.searchParams.set('redirect', safeRedirect);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/settings/:path*',
    '/alerts/:path*',
    '/snapshots/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
  ],
};
