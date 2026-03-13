import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      console.error('OAuth error:', error, errorDescription);
      const redirectUrl = new URL('/auth/error', request.url);
      redirectUrl.searchParams.set('error', error);
      if (errorDescription) {
        redirectUrl.searchParams.set('error_description', errorDescription);
      }
      return NextResponse.redirect(redirectUrl);
    }

    if (!code) {
      return NextResponse.redirect(new URL('/auth/error?error=missing_code', request.url));
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return NextResponse.redirect(new URL('/auth/error?error=server_error', request.url));
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data.session) {
      console.error('Failed to exchange code for session:', exchangeError);
      return NextResponse.redirect(new URL('/auth/error?error=auth_failed', request.url));
    }

    const { user, session } = data;

    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        display_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (profileError) {
      console.error('Failed to create/update user profile:', profileError);
    }

    const redirectPath = state || '/';
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
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(new URL('/auth/error?error=server_error', request.url));
  }
}
