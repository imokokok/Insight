/**
 * GET /api/billing/subscription
 *
 * Returns the current user's subscription state for the BillingPanel:
 *   - Most recent subscription record (or null if none)
 *   - All active API keys with their plan + credit budget
 *
 * Uses Bearer session auth. The subscription query goes through the
 * user-scoped client (RLS-enforced); the API keys query goes through the
 * service role client because that table doesn't have user SELECT policies
 * for all columns.
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

    // 1. Fetch the user's recent subscriptions (RLS-enforced via user client).
    //    Prefer the most recent row that is actually active (or past_due) so an
    //    abandoned/duplicate 'incomplete' checkout cannot mask the user's real
    //    subscription. Fall back to the latest row of any status.
    const userClient = createUserClient(accessToken);
    const { data: recentSubs, error: subError } = await userClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const subscription = Array.isArray(recentSubs)
      ? (recentSubs.find((s) => s.status === 'active' || s.status === 'past_due') ?? recentSubs[0])
      : null;

    // 2. Fetch all active API keys (service role — key rows are not exposed
    //    via user RLS)
    const serviceClient = createServiceRoleClient();
    const { data: apiKeys, error: keysError } = await serviceClient
      .from('api_keys')
      .select('id, name, plan, rate_limit, budget_monthly, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (subError) {
      // Subscription query error is non-fatal — we just return null
    }
    if (keysError) {
      return NextResponse.json(
        ApiResponseBuilder.error('INTERNAL_ERROR', 'Failed to fetch API keys'),
        { status: 500 }
      );
    }

    return NextResponse.json(
      ApiResponseBuilder.success({
        subscription: subscription ?? null,
        apiKeys: (apiKeys ?? []).map((key) => ({
          id: key.id,
          name: key.name,
          plan: key.plan,
          rateLimit: key.rate_limit,
          budgetMonthly: key.budget_monthly,
        })),
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
