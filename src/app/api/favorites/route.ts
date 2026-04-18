import { type NextRequest, NextResponse } from 'next/server';

import { moderateRateLimit } from '@/lib/api/middleware/rateLimitMiddleware';
import { ApiResponseBuilder } from '@/lib/api/response';
import { getUserId } from '@/lib/api/utils';
import { sanitizeObject, sanitizeString } from '@/lib/security';
import { CreateFavoriteRequestSchema, validateAndSanitize } from '@/lib/security/validation';
import { type ConfigType } from '@/lib/supabase/database.types';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-favorites');

export async function GET(request: NextRequest) {
  const rateLimitResult = await moderateRateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const userId = await getUserId(request);
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const searchParams = request.nextUrl.searchParams;
    const configTypeRaw = searchParams.get('config_type');
    const configType = configTypeRaw
      ? (sanitizeString(configTypeRaw, { maxLength: 50 }) as unknown as ConfigType | null)
      : null;

    const validConfigTypes: ConfigType[] = ['oracle_config', 'symbol', 'chain_config'];
    const sanitizedConfigType =
      configType && validConfigTypes.includes(configType as ConfigType)
        ? (configType as ConfigType)
        : null;

    const queries = getServerQueries();

    let favorites;
    if (sanitizedConfigType) {
      favorites = await queries.getFavoritesByType(userId, sanitizedConfigType);
    } else {
      favorites = await queries.getFavorites(userId);
    }

    if (!favorites) {
      return ApiResponseBuilder.serverError('Failed to fetch favorites');
    }

    return NextResponse.json({
      favorites,
      count: favorites.length,
    });
  } catch (error) {
    logger.error(
      'Error fetching favorites',
      error instanceof Error ? error : new Error(String(error))
    );
    return ApiResponseBuilder.serverError();
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await moderateRateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const userId = await getUserId(request);
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return ApiResponseBuilder.badRequest('Invalid JSON in request body');
    }

    const validatedData = validateAndSanitize(CreateFavoriteRequestSchema, body);

    if (!validatedData) {
      return ApiResponseBuilder.badRequest(
        'Invalid request data. Check name, config_type, and config_data fields.'
      );
    }

    const sanitizedData = sanitizeObject(validatedData);
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
  } catch (error) {
    logger.error(
      'Error adding favorite',
      error instanceof Error ? error : new Error(String(error))
    );
    return ApiResponseBuilder.serverError();
  }
}
