import { type NextRequest, NextResponse } from 'next/server';

import { getUserId } from '@/lib/api/utils';
import { type ConfigType } from '@/lib/supabase/database.types';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-favorites');

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const configType = searchParams.get('config_type') as ConfigType | null;

    const queries = getServerQueries();

    let favorites;
    if (configType) {
      favorites = await queries.getFavoritesByType(userId, configType);
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
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, config_type, config_data } = body;

    if (!name || !config_type || !config_data) {
      return NextResponse.json(
        { error: 'Missing required fields: name, config_type, config_data' },
        { status: 400 }
      );
    }

    const validConfigTypes: ConfigType[] = ['oracle_config', 'symbol', 'chain_config'];
    if (!validConfigTypes.includes(config_type)) {
      return NextResponse.json(
        { error: `Invalid config_type. Must be one of: ${validConfigTypes.join(', ')}` },
        { status: 400 }
      );
    }

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
