import { type NextRequest, NextResponse } from 'next/server';

import { getUserId } from '@/lib/api/utils';
import { moderateRateLimit } from '@/lib/api/middleware/rateLimitMiddleware';
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const configTypeRaw = searchParams.get('config_type');
    const configType = configTypeRaw
      ? (sanitizeString(configTypeRaw, { maxLength: 50 }) as ConfigType | null)
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
      return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const validatedData = validateAndSanitize(CreateFavoriteRequestSchema, body);

    if (!validatedData) {
      return NextResponse.json(
        { error: 'Invalid request data. Check name, config_type, and config_data fields.' },
        { status: 400 }
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
      return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
