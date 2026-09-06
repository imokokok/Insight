import { type NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';

import {
  generateInternalToken,
  INTERNAL_COOKIE_NAME,
  INTERNAL_COOKIE_OPTIONS,
  verifyInternalToken,
} from '@/lib/api/internalToken';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('proxy');

const PROTECTED_PATHS = ['/settings', '/ops'];

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

    // Cookie-backed getSession() does not verify that the token was signed by
    // Supabase. getClaims() verifies the JWT locally against the cached JWKS
    // (or falls back to the Auth server for symmetric projects).
    const { data, error } = await supabase.auth.getClaims();
    return !error && data?.claims != null;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith('/api/');
  const isProtectedPage = !isApiRoute && PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  // Only check auth for protected pages (avoids unnecessary Supabase RPC
  // on every API request now that the matcher covers all routes).
  if (isProtectedPage) {
    const authenticated = await isAuthenticated(request);
    if (!authenticated) {
      const loginUrl = new URL('/login', request.url);
      // Preserve query params (e.g. ?tab=billing) so the user lands back on the
      // correct settings tab after authentication.
      const redirectPath = request.nextUrl.pathname + request.nextUrl.search;
      const safeRedirect =
        redirectPath.startsWith('/') && !redirectPath.startsWith('//') ? redirectPath : '/';
      loginUrl.searchParams.set('redirect', safeRedirect);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();

  // L2 hardening: tell crawlers (and any proxy that respects it) not to index
  // internal /ops & /settings pages. Belt-and-suspenders alongside the
  // <meta name="robots"> tag emitted by the /ops layout's metadata.
  if (isProtectedPage) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  // This proxy only runs for protected pages and product demos whose paid API
  // equivalents intentionally remain free in the website UI. Public marketing
  // and content pages bypass it completely, allowing their HTML to be cached at
  // the edge without a Set-Cookie header.
  if (!isApiRoute) {
    try {
      const existingToken = request.cookies.get(INTERNAL_COOKIE_NAME)?.value;
      const hasValidToken = existingToken ? await verifyInternalToken(existingToken) : false;
      if (!hasValidToken) {
        const token = await generateInternalToken();
        response.cookies.set(INTERNAL_COOKIE_NAME, token, INTERNAL_COOKIE_OPTIONS);
      }

      // Every matched page is either authenticated or mints the UI token, so
      // it must not be stored in a shared cache.
      response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    } catch (error) {
      // Non-fatal: if token generation fails (e.g. crypto unavailable),
      // the API routes will simply not recognize the request as internal.
      // Log it so production issues are visible, but do not break the page.
      logger.warn('Failed to generate internal token', {
        error: error instanceof Error ? error.message : String(error),
        pathname,
      });
    }
  }

  return response;
}

// Keep the edge proxy off public marketing/content routes. These are the only
// UI surfaces that need authentication or the signed free-product token.
export const config = {
  matcher: [
    '/settings/:path*',
    '/ops/:path*',
    '/price-insight/:path*',
    '/safety-check/:path*',
    '/stablecoin-depeg/:path*',
    '/ai/:path*',
  ],
};
