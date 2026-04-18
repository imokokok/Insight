import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { sanitizeObject, sanitizeString } from '@/lib/security';
import { type UserProfileUpdate } from '@/lib/supabase/queries';
import { getServerQueries } from '@/lib/supabase/server';

const MAX_DISPLAY_NAME_LENGTH = 100;
const VALID_ORACLES = ['chainlink', 'pyth', 'api3', 'redstone', 'dia', 'winklink'] as const;

function validatePreferences(preferences: unknown): Record<string, unknown> | undefined {
  if (!preferences || typeof preferences !== 'object') {
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};
  const prefs = preferences as Record<string, unknown>;

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

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const userId = context.auth?.userId;
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
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
          },
        },
      });
    }

    return NextResponse.json({ profile });
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
    const userId = context.auth?.userId;
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return ApiResponseBuilder.badRequest('Invalid JSON body');
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
        return ApiResponseBuilder.badRequest('Invalid display_name format');
      }
    }

    if (preferences !== undefined) {
      const validatedPrefs = validatePreferences(preferences);
      if (validatedPrefs) {
        updateData.preferences = validatedPrefs;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return ApiResponseBuilder.badRequest('No valid fields to update');
    }

    const queries = getServerQueries();
    const updatedProfile = await queries.upsertUserProfile(userId, updateData);

    if (!updatedProfile) {
      return ApiResponseBuilder.serverError('Failed to update profile');
    }

    return NextResponse.json({
      profile: updatedProfile,
      message: 'Profile updated successfully',
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
