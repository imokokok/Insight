import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { sanitizeObject, sanitizeString, sanitizeUuid } from '@/lib/security';
import { getServerQueries } from '@/lib/supabase/server';

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
    if (typeof sanitizedBody.config_data === 'object' && sanitizedBody.config_data !== null) {
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

export const PUT = createApiHandler(
  async (request: NextRequest, context) => {
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
