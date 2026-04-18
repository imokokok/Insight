import { type NextRequest, NextResponse } from 'next/server';

import { strictRateLimit } from '@/lib/api/middleware/rateLimitMiddleware';
import { ApiResponseBuilder } from '@/lib/api/response';
import { getUserId } from '@/lib/api/utils';
import { createServerClient, getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-auth-delete-account');

export async function POST(request: NextRequest) {
  const rateLimitResult = await strictRateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const userId = await getUserId(request);

    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const queries = getServerQueries();

    const favSuccess = await queries.deleteAllFavorites(userId);
    if (!favSuccess) {
      logger.error('Failed to delete user favorites');
    }

    const alertSuccess = await queries.deleteAllAlerts(userId);
    if (!alertSuccess) {
      logger.error('Failed to delete user alerts');
    }

    const snapshotSuccess = await queries.deleteAllSnapshots(userId);
    if (!snapshotSuccess) {
      logger.error('Failed to delete user snapshots');
    }

    const supabaseAdmin = createServerClient();
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', userId);
    if (profileError) {
      logger.error('Failed to delete user profile', profileError as Error);
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      logger.error('Failed to delete user account', deleteError as Error);
      return ApiResponseBuilder.serverError('Failed to delete account');
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
    return ApiResponseBuilder.serverError();
  }
}
