import { NextRequest, NextResponse } from 'next/server';
import { getServerQueries } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { UserPreferences } from '@/lib/supabase/database.types';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-auth-profile');

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

  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);
  if (error || !user) {
    return null;
  }

  return user.id;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const queries = getServerQueries();
    const profile = await queries.getUserProfile(userId);

    if (!profile) {
      return NextResponse.json({
        profile: {
          id: userId,
          display_name: null,
          preferences: {
            default_oracle: 'chainlink',
            default_symbol: 'BTC/USD',
            theme: 'system',
          },
        },
      });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    logger.error(
      'Error fetching profile',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { display_name, preferences } = body;

    const updateData: { display_name?: string; preferences?: UserPreferences } = {};
    if (display_name !== undefined) updateData.display_name = display_name;
    if (preferences !== undefined) updateData.preferences = preferences;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const queries = getServerQueries();
    const updatedProfile = await queries.upsertUserProfile(userId, updateData);

    if (!updatedProfile) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({
      profile: updatedProfile,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    logger.error(
      'Error updating profile',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
