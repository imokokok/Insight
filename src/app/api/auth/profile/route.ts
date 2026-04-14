import { type NextRequest, NextResponse } from 'next/server';

import { getUserId } from '@/lib/api/utils';
import { moderateRateLimit } from '@/lib/api/middleware/rateLimitMiddleware';
import { sanitizeObject, sanitizeString } from '@/lib/security';
import { type UserProfileUpdate } from '@/lib/supabase/queries';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-auth-profile');

const MAX_DISPLAY_NAME_LENGTH = 100;
const VALID_THEMES = ['light', 'dark', 'system'] as const;
const VALID_ORACLES = ['chainlink', 'pyth', 'api3', 'redstone', 'dia', 'winklink'] as const;

function validatePreferences(preferences: unknown): Record<string, unknown> | undefined {
  if (!preferences || typeof preferences !== 'object') {
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};
  const prefs = preferences as Record<string, unknown>;

  if (prefs.theme !== undefined) {
    if (
      typeof prefs.theme === 'string' &&
      VALID_THEMES.includes(prefs.theme as (typeof VALID_THEMES)[number])
    ) {
      sanitized.theme = prefs.theme;
    }
  }

  if (prefs.default_oracle !== undefined) {
    if (
      typeof prefs.default_oracle === 'string' &&
      VALID_ORACLES.includes(prefs.default_oracle as (typeof VALID_ORACLES)[number])
    ) {
      sanitized.default_oracle = prefs.default_oracle;
    }
  }

  if (prefs.default_symbol !== undefined) {
    if (typeof prefs.default_symbol === 'string') {
      sanitized.default_symbol = sanitizeString(prefs.default_symbol, { maxLength: 20 });
    }
  }

  if (prefs.defaultChain !== undefined) {
    if (typeof prefs.defaultChain === 'string') {
      sanitized.defaultChain = sanitizeString(prefs.defaultChain, { maxLength: 30 });
    }
  }

  if (prefs.refreshInterval !== undefined) {
    if (
      typeof prefs.refreshInterval === 'number' &&
      prefs.refreshInterval >= 1000 &&
      prefs.refreshInterval <= 300000
    ) {
      sanitized.refreshInterval = prefs.refreshInterval;
    }
  }

  if (prefs.notificationsEnabled !== undefined) {
    if (typeof prefs.notificationsEnabled === 'boolean') {
      sanitized.notificationsEnabled = prefs.notificationsEnabled;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

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
  const rateLimitResult = await moderateRateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const sanitizedBody = sanitizeObject(body);
    const { display_name, preferences } = sanitizedBody;

    const updateData: UserProfileUpdate = {};

    if (display_name !== undefined) {
      if (typeof display_name === 'string') {
        updateData.display_name = sanitizeString(display_name, {
          maxLength: MAX_DISPLAY_NAME_LENGTH,
        });
      } else {
        return NextResponse.json({ error: 'Invalid display_name format' }, { status: 400 });
      }
    }

    if (preferences !== undefined) {
      const validatedPrefs = validatePreferences(preferences);
      if (validatedPrefs) {
        updateData.preferences = validatedPrefs;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
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
