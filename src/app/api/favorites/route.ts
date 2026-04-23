import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { sanitizeObject, sanitizeString } from '@/lib/security';
import { CreateFavoriteRequestSchema, validateAndSanitize } from '@/lib/security/validation';
import { type ConfigType } from '@/lib/supabase/database.types';
import { getServerQueries } from '@/lib/supabase/server';

const VALID_CONFIG_TYPES: ConfigType[] = ['oracle_config', 'symbol', 'chain_config'];

export const GET = createApiHandler(
  async (request: NextRequest, context) => {
    const userId = context.auth?.userId;
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const searchParams = request.nextUrl.searchParams;
    const configTypeRaw = searchParams.get('config_type');
    const configType = configTypeRaw
      ? (sanitizeString(configTypeRaw, { maxLength: 50 }) as unknown as ConfigType | null)
      : null;

    const sanitizedConfigType =
      configType && VALID_CONFIG_TYPES.includes(configType as ConfigType)
        ? (configType as ConfigType)
        : null;

    const queries = getServerQueries();

    const favorites = sanitizedConfigType
      ? await queries.getFavoritesByType(userId, sanitizedConfigType)
      : await queries.getFavorites(userId);

    if (!favorites) {
      return ApiResponseBuilder.serverError('Failed to fetch favorites');
    }

    return NextResponse.json({
      favorites,
      count: favorites.length,
    });
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: true },
    },
  }
);

export const POST = createApiHandler(
  async (request: NextRequest, context) => {
    const userId = context.auth?.userId;
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return ApiResponseBuilder.badRequest('Invalid JSON in request body');
    }

    const validationResult = validateAndSanitize(CreateFavoriteRequestSchema, body);

    if (!validationResult.data) {
      return ApiResponseBuilder.badRequest(
        'Invalid request data. Check name, config_type, and config_data fields.'
      );
    }

    const sanitizedData = sanitizeObject(validationResult.data);
    const { name, config_type, config_data } = sanitizedData;

    const queries = getServerQueries();
    const favorite = await queries.addFavorite(userId, {
      name,
      config_type,
      config_data,
    });

    if (!favorite) {
      return ApiResponseBuilder.serverError('Failed to add favorite');
    }

    return NextResponse.json(
      {
        favorite,
        message: 'Favorite added successfully',
      },
      { status: 201 }
    );
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: true },
    },
  }
);
