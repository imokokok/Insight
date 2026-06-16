import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { PREFERENCE_CURRENCIES, PREFERENCE_TIME_RANGES } from '@/lib/constants';
import { type UserProfileUpdate } from '@/lib/supabase/queries';
import { getUserQueries } from '@/lib/supabase/server';
import { ORACLE_PROVIDER_VALUES } from '@/types/oracle';

const ChartSettingsSchema = z.object({
  show_confidence_interval: z.boolean().optional(),
  auto_refresh: z.boolean().optional(),
  refresh_interval: z.number().min(1000).max(300000).optional(),
});

const PreferencesSchema = z.object({
  default_oracle: z.enum(ORACLE_PROVIDER_VALUES as [string, ...string[]]).optional(),
  default_symbol: z.string().max(20).optional(),
  default_chain: z.string().max(30).optional(),
  default_time_range: z.enum(PREFERENCE_TIME_RANGES).optional(),
  default_currency: z.enum(PREFERENCE_CURRENCIES).optional(),
  auto_refresh_interval: z.number().min(0).max(300000).optional(),
  refresh_interval: z.number().min(1000).max(300000).optional(),
  notifications_enabled: z.boolean().optional(),
  chart_settings: ChartSettingsSchema.optional(),
});

const NotificationSettingsSchema = z.object({
  push_notifications: z.boolean().optional(),
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
    if (!userId || !context.auth?.accessToken) {
      return ApiResponseBuilder.unauthorized();
    }

    const queries = getUserQueries(context.auth.accessToken);
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
    if (!userId || !context.auth?.accessToken) {
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

    const queries = getUserQueries(context.auth.accessToken);
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
