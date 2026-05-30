import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { type UserProfileUpdate } from '@/lib/supabase/queries';
import { getServerQueries } from '@/lib/supabase/server';

const VALID_ORACLES = ['chainlink', 'pyth', 'api3', 'redstone', 'dia', 'winklink'] as const;
const VALID_ALERT_FREQUENCIES = ['immediate', 'hourly', 'daily', 'off'] as const;
const VALID_TIME_RANGES = ['1h', '6h', '24h', '7d', '30d'] as const;
const VALID_CURRENCIES = ['USD', 'CNY', 'EUR', 'JPY', 'GBP'] as const;

const ChartSettingsSchema = z.object({
  show_confidence_interval: z.boolean().optional(),
  auto_refresh: z.boolean().optional(),
  refresh_interval: z.number().min(1000).max(300000).optional(),
});

const PreferencesSchema = z.object({
  default_oracle: z.enum(VALID_ORACLES).optional(),
  default_symbol: z.string().max(20).optional(),
  default_chain: z.string().max(30).optional(),
  default_time_range: z.enum(VALID_TIME_RANGES).optional(),
  default_currency: z.enum(VALID_CURRENCIES).optional(),
  auto_refresh_interval: z.number().min(0).max(300000).optional(),
  refresh_interval: z.number().min(1000).max(300000).optional(),
  notifications_enabled: z.boolean().optional(),
  chart_settings: ChartSettingsSchema.optional(),
});

const NotificationSettingsSchema = z.object({
  email_alerts: z.boolean().optional(),
  push_notifications: z.boolean().optional(),
  alert_frequency: z.enum(VALID_ALERT_FREQUENCIES).optional(),
  price_alerts: z.boolean().optional(),
  market_updates: z.boolean().optional(),
  price_change_enabled: z.boolean().optional(),
  price_change_threshold: z.number().min(1).max(20).optional(),
});

const UpdateProfileSchema = z
  .object({
    display_name: z.string().max(100).optional(),
    preferences: PreferencesSchema.optional(),
    notification_settings: NotificationSettingsSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No valid fields to update',
  });

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

    let body;
    try {
      body = await request.json();
    } catch {
      return ApiResponseBuilder.badRequest('Invalid JSON body');
    }

    const result = UpdateProfileSchema.safeParse(body);

    if (!result.success) {
      return ApiResponseBuilder.badRequest(
        result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
      );
    }

    const updateData: UserProfileUpdate = result.data as UserProfileUpdate;

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
