/**
 * POST /api/billing/trial
 *
 * Claims the 7-day Pro Trial. Creates a new API key with plan='pro' and
 * trial_ends_at = now + 7 days. Marks user_profiles.trial_claimed_at so the
 * user can only claim once.
 *
 * No NOWPayments invoice is created — the trial is free. When trial_ends_at
 * passes, the billing cron downgrades the key back to free.
 *
 * Uses Bearer session auth. No request body.
 *
 * Response: { success: true, data: { key, plainKey, trialEndsAt } }
 *           { success: false, error: { code, message } }
 *             409 TRIAL_ALREADY_CLAIMED if trial_claimed_at is not null
 */

import { NextResponse } from 'next/server';

import { createApiKeyForUser } from '@/lib/api/apiKey';
import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { TRIAL_DURATION_DAYS } from '@/lib/billing/plans';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('billing-trial');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const POST = createApiHandler(
  async (_request, context) => {
    const userId = context.auth?.userId;
    if (!userId) {
      return NextResponse.json(ApiResponseBuilder.error('UNAUTHORIZED', 'User not found'), {
        status: 401,
      });
    }

    const client = createServiceRoleClient();

    // 1. Check if the user has already claimed a trial (one per user)
    const { data: profile, error: profileError } = await client
      .from('user_profiles')
      .select('trial_claimed_at')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = no rows found (profile not created yet) — treat as not claimed
      logger.warn('Failed to check trial_claimed_at', { userId, error: profileError.message });
      return NextResponse.json(
        ApiResponseBuilder.error('INTERNAL_ERROR', 'Failed to check trial eligibility'),
        { status: 500 }
      );
    }

    if (profile?.trial_claimed_at) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'TRIAL_ALREADY_CLAIMED',
          'You have already claimed your 7-day Pro trial. Each user may only claim once.',
          { retryable: false }
        ),
        { status: 409 }
      );
    }

    // 2. Mark trial_claimed_at FIRST to prevent double-claim race conditions.
    //    Uses a conditional update (WHERE trial_claimed_at IS NULL) so that
    //    if two requests arrive concurrently, only one succeeds.
    const now = new Date().toISOString();
    const { data: updatedProfile, error: updateError } = await client
      .from('user_profiles')
      .update({ trial_claimed_at: now })
      .eq('id', userId)
      .is('trial_claimed_at', null)
      .select('id')
      .single();

    if (updateError || !updatedProfile) {
      // Either the profile doesn't exist, or trial_claimed_at was already set
      // (concurrent request won the race). Treat as already claimed.
      logger.warn('Trial claim race — trial_claimed_at already set or profile missing', {
        userId,
        updateError: updateError?.message,
      });
      return NextResponse.json(
        ApiResponseBuilder.error(
          'TRIAL_ALREADY_CLAIMED',
          'You have already claimed your 7-day Pro trial. Each user may only claim once.',
          { retryable: false }
        ),
        { status: 409 }
      );
    }

    // 3. Create a Pro trial API key with trial_ends_at set
    const trialEndsAt = new Date(Date.now() + TRIAL_DURATION_DAYS * MS_PER_DAY).toISOString();

    let result;
    try {
      result = await createApiKeyForUser(userId, 'Pro Trial Key', {
        plan: 'pro',
        trialEndsAt,
      });
    } catch (error) {
      logger.error(
        'Failed to create trial API key',
        error instanceof Error ? error : new Error(String(error)),
        { userId }
      );
      // Note: trial_claimed_at was already set, but the key creation failed.
      // The user won't be able to claim again. Admin intervention may be needed
      // to reset trial_claimed_at manually — this is a rare edge case.
      return NextResponse.json(
        ApiResponseBuilder.error('INTERNAL_ERROR', 'Failed to create trial API key'),
        { status: 500 }
      );
    }

    logger.info('Pro trial claimed', { userId, trialEndsAt, keyId: result.record.id });

    return NextResponse.json(
      ApiResponseBuilder.success({
        key: {
          id: result.record.id,
          name: result.record.name,
          prefix: result.record.key_prefix,
          plan: result.record.plan,
          rateLimit: result.record.rate_limit,
          trialEndsAt,
        },
        plainKey: result.plainKey,
        trialEndsAt,
      }),
      { status: 201 }
    );
  },
  {
    middlewares: {
      logging: true,
      auth: { required: true, allowApiKey: false },
      rateLimit: { preset: 'strict' },
      cors: true,
    },
  }
);
