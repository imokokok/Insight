import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { sanitizeUuid } from '@/lib/security';
import { getServerQueries } from '@/lib/supabase/server';

function validateFavoriteId(id: string): string | null {
  return sanitizeUuid(id) || null;
}

async function getFavoriteById(id: string, userId: string) {
  const queries = getServerQueries();
  return queries.getFavoriteById(id, userId);
}

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const params = context.validated?.params as { id: string } | undefined;
    const id = params?.id;

    if (!id) {
      return ApiResponseBuilder.badRequest('Missing favorite ID');
    }

    const validatedId = validateFavoriteId(id);

    if (!validatedId) {
      return ApiResponseBuilder.badRequest('Invalid favorite ID');
    }

    const userId = context.auth?.userId;
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const favorite = await getFavoriteById(validatedId, userId);

    if (!favorite) {
      return ApiResponseBuilder.notFound('Favorite not found');
    }

    return NextResponse.json(ApiResponseBuilder.success(favorite));
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: true },
    },
  }
);

export const DELETE = createApiHandler(
  async (_request: NextRequest, context) => {
    const params = context.validated?.params as { id: string } | undefined;
    const id = params?.id;

    if (!id) {
      return ApiResponseBuilder.badRequest('Missing favorite ID');
    }

    const validatedId = validateFavoriteId(id);

    if (!validatedId) {
      return ApiResponseBuilder.badRequest('Invalid favorite ID');
    }

    const userId = context.auth?.userId;
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const existingFavorite = await getFavoriteById(validatedId, userId);

    if (!existingFavorite) {
      return ApiResponseBuilder.notFound('Favorite not found');
    }

    const queries = getServerQueries();
    const success = await queries.deleteFavorite(validatedId, userId);

    if (!success) {
      return ApiResponseBuilder.serverError('Failed to delete favorite');
    }

    return NextResponse.json(ApiResponseBuilder.success({ deleted: true }));
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: true },
    },
  }
);
