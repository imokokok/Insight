import { type NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

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
  try {
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

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error('Missing Supabase configuration');
      return NextResponse.redirect(new URL('/auth/verify-email?error=server_error', request.url));
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
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

    const { user, session } = data;

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

    response.cookies.set('sb-access-token', session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: session.expires_in,
      path: '/',
    });

    response.cookies.set('sb-refresh-token', session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error(
      'Error in auth callback',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.redirect(new URL('/auth/verify-email?error=server_error', request.url));
  }
}
