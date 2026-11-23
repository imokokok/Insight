import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { PREFERENCE_CURRENCIES, PREFERENCE_TIME_RANGES } from '@/lib/constants';
import { type UserProfileUpdate, UserProfileStoreUnavailableError } from '@/lib/supabase/queries';
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
  chart_settings: ChartSettingsSchema.optional(),
});

const UpdateProfileSchema = z
  .object({
    display_name: z.string().max(100).optional(),
    preferences: PreferencesSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No valid fields to update',
  });

function profileStoreUnavailableResponse(requestId?: string): NextResponse {
  return NextResponse.json(
    ApiResponseBuilder.error(
      'USER_PROFILE_STORE_UNAVAILABLE',
      'Profile settings are temporarily unavailable. Retry shortly.',
      { retryable: true, requestId }
    ),
    { status: 503, headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' } }
  );
}

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const userId = context.auth?.userId;
    if (!userId || !context.auth?.accessToken) {
      return ApiResponseBuilder.unauthorized();
    }

    let profile: Awaited<ReturnType<ReturnType<typeof getUserQueries>['getUserProfile']>>;
    try {
      profile = await getUserQueries(context.auth.accessToken).getUserProfile(userId);
    } catch (error) {
      if (!(error instanceof UserProfileStoreUnavailableError)) throw error;
      return profileStoreUnavailableResponse(context.requestId);
    }

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

    let updatedProfile: Awaited<ReturnType<ReturnType<typeof getUserQueries>['upsertUserProfile']>>;
    try {
      updatedProfile = await getUserQueries(context.auth.accessToken).upsertUserProfile(
        userId,
        updateData
      );
    } catch (error) {
      if (!(error instanceof UserProfileStoreUnavailableError)) throw error;
      return profileStoreUnavailableResponse(context.requestId);
    }

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
