import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { createServerClient, getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-auth-delete-account');

export const POST = createApiHandler(
  async (request: NextRequest, context) => {
    const userId = context.auth?.userId;
    const userEmail = context.auth?.email;

    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return ApiResponseBuilder.badRequest('Invalid request body');
    }

    const { confirmation } = body;

    if (!confirmation || typeof confirmation !== 'string') {
      return ApiResponseBuilder.badRequest('Confirmation phrase is required to delete account');
    }

    const expectedConfirmation = `DELETE ${userEmail ?? userId}`;
    if (confirmation !== expectedConfirmation) {
      return ApiResponseBuilder.badRequest(
        'Confirmation phrase does not match. Please type "DELETE <your-email>" to confirm.'
      );
    }

    const queries = getServerQueries();
    const supabaseAdmin = createServerClient();

    const deletionErrors: string[] = [];

    const favSuccess = await queries.deleteAllFavorites(userId);
    if (!favSuccess) {
      deletionErrors.push('favorites');
      logger.error('Failed to delete user favorites');
    }

    const alertSuccess = await queries.deleteAllAlerts(userId);
    if (!alertSuccess) {
      deletionErrors.push('alerts');
      logger.error('Failed to delete user alerts');
    }

    const snapshotSuccess = await queries.deleteAllSnapshots(userId);
    if (!snapshotSuccess) {
      deletionErrors.push('snapshots');
      logger.error('Failed to delete user snapshots');
    }

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', userId);
    if (profileError) {
      deletionErrors.push('profile');
      logger.error('Failed to delete user profile', new Error(String(profileError)));
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      logger.error('Failed to delete user account', new Error(String(deleteError)));
      return ApiResponseBuilder.serverError(
        deletionErrors.length > 0
          ? `Failed to delete account. Partial deletion occurred for: ${deletionErrors.join(', ')}`
          : 'Failed to delete account'
      );
    }

    const response = NextResponse.json({
      success: true,
      ...(deletionErrors.length > 0 && { partialFailures: deletionErrors }),
    });

    const cookieNames = request.cookies.getAll().map((c) => c.name);
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
