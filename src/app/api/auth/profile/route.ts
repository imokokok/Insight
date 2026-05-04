import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { sanitizeObject, sanitizeString } from '@/lib/security';
import { type UserProfileUpdate } from '@/lib/supabase/queries';
import { getServerQueries } from '@/lib/supabase/server';

const MAX_DISPLAY_NAME_LENGTH = 100;
const VALID_ORACLES = ['chainlink', 'pyth', 'api3', 'redstone', 'dia', 'winklink'] as const;
const VALID_NOTIFICATION_KEYS = [
  'email_alerts',
  'push_notifications',
  'alert_frequency',
  'price_alerts',
  'market_updates',
] as const;
const VALID_ALERT_FREQUENCIES = ['immediate', 'hourly', 'daily'] as const;

function validateNotificationSettings(settings: unknown): Record<string, unknown> | undefined {
  if (!settings || typeof settings !== 'object') {
    return undefined;
  }

  const raw = settings as Record<string, unknown>;
  const validated: Record<string, unknown> = {};

  for (const key of Object.keys(raw)) {
    if (!VALID_NOTIFICATION_KEYS.includes(key as (typeof VALID_NOTIFICATION_KEYS)[number])) {
      continue;
    }

    const value = raw[key];

    if (key === 'alert_frequency') {
      if (
        typeof value === 'string' &&
        VALID_ALERT_FREQUENCIES.includes(value as (typeof VALID_ALERT_FREQUENCIES)[number])
      ) {
        validated[key] = value;
      }
    } else if (typeof value === 'boolean') {
      validated[key] = value;
    }
  }

  return Object.keys(validated).length > 0 ? validated : undefined;
}

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

  if (prefs.default_chain !== undefined) {
    if (typeof prefs.default_chain === 'string') {
      sanitized.default_chain = sanitizeString(prefs.default_chain, { maxLength: 30 });
    }
  }

  if (prefs.refresh_interval !== undefined) {
    if (
      typeof prefs.refresh_interval === 'number' &&
      prefs.refresh_interval >= 1000 &&
      prefs.refresh_interval <= 300000
    ) {
      sanitized.refresh_interval = prefs.refresh_interval;
    }
  }

  if (prefs.notifications_enabled !== undefined) {
    if (typeof prefs.notifications_enabled === 'boolean') {
      sanitized.notifications_enabled = prefs.notifications_enabled;
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
    const { display_name, preferences, notification_settings } = sanitizedBody;

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
      } else {
        return ApiResponseBuilder.badRequest('Invalid preferences data');
      }
    }

    if (notification_settings !== undefined) {
      const validatedNotifications = validateNotificationSettings(notification_settings);
      if (validatedNotifications) {
        updateData.notification_settings = validatedNotifications;
      } else {
        return ApiResponseBuilder.badRequest('Invalid notification_settings format');
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
