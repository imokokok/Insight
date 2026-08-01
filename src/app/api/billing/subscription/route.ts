/**
 * GET /api/billing/subscription
 *
 * Returns the current user's subscription state for the BillingPanel:
 *   - Most recent subscription record (or null if none)
 *   - All active API keys with their plan + quota usage
 *   - Whether the 7-day Pro trial has been claimed (user_profiles.trial_claimed_at)
 *
 * Uses Bearer session auth. The subscription query goes through the
 * user-scoped client (RLS-enforced); the API keys + profile query go through
 * the service role client because those tables don't have user SELECT
 * policies for all columns (quota usage is service-role-only).
 */

import { NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { createServiceRoleClient, createUserClient } from '@/lib/supabase/server';

export const GET = createApiHandler(
  async (_request, context) => {
    const userId = context.auth?.userId;
    const accessToken = context.auth?.accessToken;
    if (!userId || !accessToken) {
      return NextResponse.json(ApiResponseBuilder.error('UNAUTHORIZED', 'User not found'), {
        status: 401,
      });
    }

    // 1. Fetch the user's most recent subscription (RLS-enforced via user client)
    const userClient = createUserClient(accessToken);
    const { data: subscription, error: subError } = await userClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Fetch all active API keys with quota info (service role — quota columns
    //    are not exposed via RLS to avoid users reading other users' usage)
    const serviceClient = createServiceRoleClient();
    const { data: apiKeys, error: keysError } = await serviceClient
      .from('api_keys')
      .select(
        'id, name, plan, rate_limit, monthly_quota_used, quota_reset_at, trial_ends_at, is_active'
      )
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // 3. Check if trial has been claimed
    const { data: profile, error: profileError } = await serviceClient
      .from('user_profiles')
      .select('trial_claimed_at')
      .eq('id', userId)
      .single();

    if (subError) {
      // Subscription query error is non-fatal — we just return null
    }
    if (keysError) {
      return NextResponse.json(
        ApiResponseBuilder.error('INTERNAL_ERROR', 'Failed to fetch API keys'),
        { status: 500 }
      );
    }
    if (profileError) {
      // Profile may not exist yet for new users — treat as trial not claimed
    }

    return NextResponse.json(
      ApiResponseBuilder.success({
        subscription: subscription ?? null,
        apiKeys: (apiKeys ?? []).map((key) => ({
          id: key.id,
          name: key.name,
          plan: key.plan,
          rateLimit: key.rate_limit,
          monthlyQuotaUsed: key.monthly_quota_used,
          quotaResetAt: key.quota_reset_at,
          trialEndsAt: key.trial_ends_at,
        })),
        trialClaimedAt: profile?.trial_claimed_at ?? null,
      })
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
