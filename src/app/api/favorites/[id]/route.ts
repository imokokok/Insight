import { NextRequest, NextResponse } from 'next/server';
import { getServerQueries } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

async function getUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) {
    return null;
  }

  return user.id;
}

async function getFavoriteById(id: string, userId: string) {
  const queries = getServerQueries();
  const favorites = await queries.getFavorites(userId);
  if (!favorites) return null;
  return favorites.find(f => f.id === id) || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const favorite = await getFavoriteById(id, userId);

    if (!favorite) {
      return NextResponse.json(
        { error: 'Favorite not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ favorite });
  } catch (error) {
    console.error('Error fetching favorite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const existingFavorite = await getFavoriteById(id, userId);

    if (!existingFavorite) {
      return NextResponse.json(
        { error: 'Favorite not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, config_type, config_data } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (config_type !== undefined) updateData.config_type = config_type;
    if (config_data !== undefined) updateData.config_data = config_data;

    const queries = getServerQueries();
    const updatedFavorite = await queries.updateFavorite(id, updateData);

    if (!updatedFavorite) {
      return NextResponse.json(
        { error: 'Failed to update favorite' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      favorite: updatedFavorite,
      message: 'Favorite updated successfully',
    });
  } catch (error) {
    console.error('Error updating favorite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const existingFavorite = await getFavoriteById(id, userId);

    if (!existingFavorite) {
      return NextResponse.json(
        { error: 'Favorite not found' },
        { status: 404 }
      );
    }

    const queries = getServerQueries();
    const success = await queries.deleteFavorite(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete favorite' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Favorite deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting favorite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
