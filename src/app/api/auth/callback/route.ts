import { type NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-auth-callback');

const ALLOWED_REDIRECT_PATHS = [
  '/',
  '/dashboard',
  '/settings',
  '/profile',
  '/alerts',
  '/favorites',
  '/snapshots',
  '/price-query',
  '/cross-chain',
  '/cross-oracle',
];

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

  const { error: profileError } = await supabase.from('user_profiles').upsert(
    {
      id: user.id,
      display_name:
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        null,
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
  let redirectQuery = '';

  if (type === 'recovery') {
    redirectPath = '/auth/reset-password';
  } else if (type === 'signup' || type === 'email_change') {
    redirectPath = '/auth/verify-email';
    redirectQuery = `?code=${encodeURIComponent(code)}`;
  } else if (state && isValidRedirectPath(state)) {
    redirectPath = state;
  } else {
    redirectPath = '/';
  }

  const response = NextResponse.redirect(new URL(`${redirectPath}${redirectQuery}`, request.url));

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
