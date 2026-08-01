import { type NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';

import {
  generateInternalToken,
  INTERNAL_COOKIE_NAME,
  INTERNAL_COOKIE_OPTIONS,
} from '@/lib/api/internalToken';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('middleware');

const PROTECTED_PATHS = ['/settings'];

// How long (in seconds) non-sensitive HTML pages may be cached by shared
// edge caches (Vercel Edge / CDN). Browser always revalidates (max-age=0).
// Set PAGE_CACHE_S_MAXAGE=0 to restore the previous no-store behavior.
const PAGE_CACHE_S_MAXAGE = Number(process.env.PAGE_CACHE_S_MAXAGE ?? 15);

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

  // Set or refresh the HttpOnly internal-token cookie on PAGE requests
  // only.  The browser stores the cookie and sends it automatically on
  // subsequent same-origin API calls.  We intentionally do NOT set the
  // cookie on API route responses — otherwise an external API caller
  // (curl -c, Postman) could extract it from the Set-Cookie header and
  // use it to bypass rate-limiting on later requests.
  if (!isApiRoute) {
    try {
      const token = await generateInternalToken();
      response.cookies.set(INTERNAL_COOKIE_NAME, token, INTERNAL_COOKIE_OPTIONS);

      // Protected pages and emergency rollback (PAGE_CACHE_S_MAXAGE=0) must
      // never be cached, so the middleware always runs and the auth check
      // above is enforced.
      if (isProtectedPage || PAGE_CACHE_S_MAXAGE <= 0) {
        response.headers.set(
          'Cache-Control',
          'private, no-store, no-cache, must-revalidate, max-age=0'
        );
      } else {
        // Public, edge-cacheable pages: shared caches may serve the HTML for
        // PAGE_CACHE_S_MAXAGE seconds. The browser still revalidates every
        // time (max-age=0), so the __internal cookie is refreshed on each
        // browser request. The cookie itself is a HMAC-signed UI-origin
        // marker (no user data), so sharing a cached response for a short
        // window does not weaken the security model.
        response.headers.set(
          'Cache-Control',
          `public, s-maxage=${PAGE_CACHE_S_MAXAGE}, max-age=0, stale-while-revalidate=${PAGE_CACHE_S_MAXAGE}`
        );
      }
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

// NOTE: matcher must be a static array (Next.js requirement).
// Match all routes so the internal cookie can be set on page requests
// and verified on API requests.  Static assets (_next/static, images,
// etc.) are excluded by the matcher pattern.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)).*)',
  ],
};
