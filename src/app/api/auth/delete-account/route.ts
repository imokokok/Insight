import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { createServerClient, getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-auth-delete-account');

export const POST = createApiHandler(
  async (_request: NextRequest, context) => {
    const userId = context.auth?.userId;

    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const queries = getServerQueries();
    const supabaseAdmin = createServerClient();

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

    const cookieNames = _request.cookies.getAll().map((c) => c.name);
    for (const name of cookieNames) {
      if (name.startsWith('sb-') || name.includes('supabase')) {
        response.cookies.delete(name);
      }
    }

    return response;
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'strict' },
      auth: { required: true },
    },
  }
);
