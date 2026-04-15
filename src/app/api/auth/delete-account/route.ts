import { type NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { strictRateLimit } from '@/lib/api/middleware/rateLimitMiddleware';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-auth-delete-account');

export async function POST(request: NextRequest) {
  const rateLimitResult = await strictRateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const accessToken = request.cookies.get('sb-access-token')?.value;
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error('Missing Supabase configuration');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseUser = createClient(supabaseUrl, accessToken, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user },
    } = await supabaseUser.auth.getUser(accessToken);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: favoritesError } = await supabaseAdmin
      .from('favorites')
      .delete()
      .eq('user_id', user.id);
    if (favoritesError) {
      logger.error('Failed to delete user favorites', favoritesError as Error);
    }

    const { error: alertsError } = await supabaseAdmin
      .from('alerts')
      .delete()
      .eq('user_id', user.id);
    if (alertsError) {
      logger.error('Failed to delete user alerts', alertsError as Error);
    }

    const { error: snapshotsError } = await supabaseAdmin
      .from('snapshots')
      .delete()
      .eq('user_id', user.id);
    if (snapshotsError) {
      logger.error('Failed to delete user snapshots', snapshotsError as Error);
    }

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', user.id);
    if (profileError) {
      logger.error('Failed to delete user profile', profileError as Error);
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      logger.error('Failed to delete user account', deleteError as Error);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    const response = NextResponse.json({ success: true });

    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');

    return response;
  } catch (error) {
    logger.error(
      'Error in delete account',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
