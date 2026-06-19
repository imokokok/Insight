import { type NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';

import { sanitizeString } from '@/lib/security/inputSanitizer';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-auth-callback');

const CALLBACK_RATE_LIMIT_WINDOW = 60_000;
const CALLBACK_RATE_LIMIT_MAX = 10;
const callbackAttempts = new Map<string, { count: number; resetAt: number }>();

// Lazy cleanup: prune expired entries on access instead of relying on a
// module-level setInterval, which would keep a serverless function alive and
// prevent it from being frozen/recycled.
function cleanupExpiredCallbackAttempts(): void {
  const now = Date.now();
  for (const [ip, entry] of callbackAttempts) {
    if (now > entry.resetAt) {
      callbackAttempts.delete(ip);
    }
  }
}

function checkCallbackRateLimit(ip: string): boolean {
  const now = Date.now();
  cleanupExpiredCallbackAttempts();

  const entry = callbackAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    callbackAttempts.set(ip, { count: 1, resetAt: now + CALLBACK_RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= CALLBACK_RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

const ALLOWED_REDIRECT_PATHS = ['/', '/settings', '/price-query', '/price-insight'];

function isValidRedirectPath(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }

  if (path.startsWith('//') || path.startsWith('http://') || path.startsWith('https://')) {
    return false;
  }

  return ALLOWED_REDIRECT_PATHS.some(
    (allowed) => path === allowed || path.startsWith(allowed + '/')
  );
}

export async function GET(request: NextRequest) {
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (!checkCallbackRateLimit(clientIp)) {
    logger.warn('Auth callback rate limit exceeded', { ip: clientIp });
    return NextResponse.redirect(new URL('/auth/verify-email?error=rate_limited', request.url));
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const errorCode = searchParams.get('error_code');
  const type = searchParams.get('type');

  if (error) {
    logger.error('Auth callback error', new Error(`${error}: ${errorDescription}`));
    const redirectUrl = new URL('/auth/verify-email', request.url);
    redirectUrl.searchParams.set('error', error);
    if (errorDescription) {
      redirectUrl.searchParams.set('error_description', errorDescription);
    }
    if (errorCode) {
      redirectUrl.searchParams.set('error_code', errorCode);
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    return NextResponse.redirect(new URL('/auth/verify-email?error=missing_code', request.url));
  }

  const oauthStateCookie = request.cookies.get('oauth_state')?.value;
  if (!oauthStateCookie || !state || oauthStateCookie !== state) {
    logger.warn('OAuth state validation failed', {
      hasCookie: !!oauthStateCookie,
      hasParam: !!state,
      mismatch: !!(oauthStateCookie && state && oauthStateCookie !== state),
    });
    return NextResponse.redirect(new URL('/auth/verify-email?error=invalid_state', request.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.error('Missing Supabase environment variables');
    return NextResponse.redirect(new URL('/auth/verify-email?error=server_error', request.url));
  }

  const cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }> =
    [];

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

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.session) {
    logger.error(
      'Failed to exchange code for session',
      exchangeError instanceof Error ? exchangeError : new Error(String(exchangeError))
    );
    return NextResponse.redirect(new URL('/auth/verify-email?error=auth_failed', request.url));
  }

  const { user } = data;

  const rawDisplayName =
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    null;
  // Sanitize the OAuth-provided display name before persisting to prevent
  // stored XSS (the value comes from an external identity provider).
  const displayName = rawDisplayName ? sanitizeString(rawDisplayName, { maxLength: 100 }) : null;

  const { error: profileError } = await supabase.from('user_profiles').upsert(
    {
      id: user.id,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'id',
    }
  );

  if (profileError) {
    logger.error(
      'Failed to create/update user profile',
      profileError instanceof Error ? profileError : new Error(String(profileError))
    );
    if (type !== 'recovery') {
      return NextResponse.redirect(
        new URL('/auth/verify-email?error=profile_creation_failed', request.url)
      );
    }
  }

  let redirectPath: string;

  if (type === 'recovery') {
    redirectPath = '/auth/reset-password';
  } else if (type === 'signup' || type === 'email_change') {
    redirectPath = '/auth/verify-email';
  } else if (state && isValidRedirectPath(state)) {
    redirectPath = state;
  } else {
    redirectPath = '/';
  }

  const response = NextResponse.redirect(new URL(redirectPath, request.url));

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  response.cookies.delete('oauth_state');

  return response;
}
