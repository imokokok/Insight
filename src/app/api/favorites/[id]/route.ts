import { type NextRequest, NextResponse } from 'next/server';

import { moderateRateLimit } from '@/lib/api/middleware/rateLimitMiddleware';
import { ApiResponseBuilder } from '@/lib/api/response';
import { getUserId } from '@/lib/api/utils';
import { sanitizeObject, sanitizeString, sanitizeUuid } from '@/lib/security';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-favorites-id');

const VALID_CONFIG_TYPES = ['oracle_config', 'symbol', 'chain_config'] as const;
const MAX_NAME_LENGTH = 100;
const MAX_CONFIG_DATA_SIZE = 20000;

function validateFavoriteId(id: string): string | null {
  return sanitizeUuid(id) || null;
}

function validateFavoriteUpdate(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const sanitizedBody = sanitizeObject(body as Record<string, unknown>);
  const updateData: Record<string, unknown> = {};

  if (sanitizedBody.name !== undefined) {
    if (typeof sanitizedBody.name === 'string') {
      updateData.name = sanitizeString(sanitizedBody.name, { maxLength: MAX_NAME_LENGTH });
    } else {
      return null;
    }
  }

  if (sanitizedBody.config_type !== undefined) {
    if (
      typeof sanitizedBody.config_type === 'string' &&
      VALID_CONFIG_TYPES.includes(sanitizedBody.config_type as (typeof VALID_CONFIG_TYPES)[number])
    ) {
      updateData.config_type = sanitizedBody.config_type;
    } else {
      return null;
    }
  }

  if (sanitizedBody.config_data !== undefined) {
    if (typeof sanitizedBody.config_data === 'object') {
      const configStr = JSON.stringify(sanitizedBody.config_data);
      if (configStr.length > MAX_CONFIG_DATA_SIZE) {
        return null;
      }
      updateData.config_data = sanitizedBody.config_data;
    } else {
      return null;
    }
  }

  return updateData;
}

async function getFavoriteById(id: string, userId: string) {
  const queries = getServerQueries();
  return queries.getFavoriteById(id, userId);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResult = await moderateRateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const { id } = await params;
    const validatedId = validateFavoriteId(id);

    if (!validatedId) {
      return ApiResponseBuilder.badRequest('Invalid favorite ID');
    }

    const userId = await getUserId(request);

    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const favorite = await getFavoriteById(validatedId, userId);

    if (!favorite) {
      return ApiResponseBuilder.notFound('Favorite not found');
    }

    return NextResponse.json(ApiResponseBuilder.success(favorite));
  } catch (error) {
    logger.error(
      'Error fetching favorite',
      error instanceof Error ? error : new Error(String(error))
    );
    return ApiResponseBuilder.serverError();
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResult = await moderateRateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const { id } = await params;
    const validatedId = validateFavoriteId(id);

    if (!validatedId) {
      return ApiResponseBuilder.badRequest('Invalid favorite ID');
    }

    const userId = await getUserId(request);

    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const existingFavorite = await getFavoriteById(validatedId, userId);

    if (!existingFavorite) {
      return ApiResponseBuilder.notFound('Favorite not found');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return ApiResponseBuilder.badRequest('Invalid JSON body');
    }

    const updateData = validateFavoriteUpdate(body);

    if (!updateData || Object.keys(updateData).length === 0) {
      return ApiResponseBuilder.badRequest('No valid fields to update');
    }

    const queries = getServerQueries();
    const updatedFavorite = await queries.updateFavorite(validatedId, updateData);

    if (!updatedFavorite) {
      return ApiResponseBuilder.serverError('Failed to update favorite');
    }

    return NextResponse.json(ApiResponseBuilder.success(updatedFavorite));
  } catch (error) {
    logger.error(
      'Error updating favorite',
      error instanceof Error ? error : new Error(String(error))
    );
    return ApiResponseBuilder.serverError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResult = await moderateRateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const { id } = await params;
    const validatedId = validateFavoriteId(id);

    if (!validatedId) {
      return ApiResponseBuilder.badRequest('Invalid favorite ID');
    }

    const userId = await getUserId(request);

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
  } catch (error) {
    logger.error(
      'Error deleting favorite',
      error instanceof Error ? error : new Error(String(error))
    );
    return ApiResponseBuilder.serverError();
  }
}
