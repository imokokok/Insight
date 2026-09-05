/**
 * POST /api/billing/signup-grant
 *
 * One-time trial credit grant for new users (100 credits) so they can sample
 * the API before paying. Requirements:
 *
 *   - Email-verified account only (anti-farming; OAuth signups are verified).
 *   - Exactly once per user, never refreshed. The grant is keyed on the
 *     deterministic metering_key `signup:<userId>`: `top_up_credits` is
 *     idempotent on that key, so re-running (re-login, duplicate request) is
 *     a no-op and the allowance is never issued a second time.
 *
 * The client calls this after a successful login; failure is non-fatal (the
 * user can still pay and use the API), so it is fire-and-forget from the UI.
 */

import { NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { topUpCredits } from '@/lib/billing/creditWallet';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('billing-signup-grant');

/** Trial credits granted once per user. Enough for five complete Guard
 *  workflows (2x C3 + 1x C4), while remaining a bounded one-time grant. */
export const TRIAL_CREDITS = 100;

export const POST = createApiHandler(
  async (_request, context) => {
    const userId = context.auth?.userId;
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const serviceClient = createServiceRoleClient();

    // Email verification gate — the only real anti-abuse lever for a
    // one-time grant. OAuth providers report email_confirmed_at too.
    const { data: adminUser, error: userError } =
      await serviceClient.auth.admin.getUserById(userId);
    if (userError || !adminUser?.user) {
      logger.error('Failed to look up user for signup grant', normalizeError(userError));
      return ApiResponseBuilder.serverError('Failed to verify account');
    }
    if (!adminUser.user.email_confirmed_at) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'EMAIL_NOT_VERIFIED',
          'Verify your email before claiming the trial credit'
        ),
        { status: 403 }
      );
    }

    const meteringKey = `signup:${userId}`;

    // Informational: distinguish first-time grant from an idempotent no-op.
    const { data: existing } = await serviceClient
      .from('credit_ledger')
      .select('id')
      .eq('metering_key', meteringKey)
      .maybeSingle();

    const balance = await topUpCredits({
      userId,
      amount: TRIAL_CREDITS,
      meteringKey,
      kind: 'grant',
      ref: 'signup',
    });

    if (balance === null) {
      return ApiResponseBuilder.serverError('Failed to issue trial credit');
    }

    return NextResponse.json(
      ApiResponseBuilder.success({
        granted: !existing,
        balance,
      })
    );
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'strict' },
      auth: { required: true },
    },
  }
);
