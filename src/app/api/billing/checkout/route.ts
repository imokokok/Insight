/**
 * POST /api/billing/checkout
 *
 * Initiates a NOWPayments crypto invoice for subscribing to a paid plan.
 * Uses Bearer session auth (not API Key) — this is a user action, not API
 * consumption.
 *
 * Flow:
 *   1. Generate an `order_id` (uuid) for the future subscriptions row.
 *   2. Call NOWPayments POST /v1/invoice (USDC-denominated, payer chooses
 *      settlement currency on the invoice page).
 *   3. On success, insert a `subscriptions` row with status='incomplete'
 *      and the returned `nowpayments_invoice_id`. The IPN callback will
 *      reverse-look up this row by invoice_id to read plan/interval/user.
 *   4. Return the invoice URL for the frontend to redirect to.
 *
 * Request body: { plan: 'pro' | 'protocol', interval: 'month' | 'year' }
 * Response:     { success: true, data: { url: string } }
 *               { success: false, error: { code, message } }
 *
 * NOTE: There is no auto-renewal. Each checkout = one billing cycle. The
 * user must manually renew (via the "Renew" button in BillingPanel) before
 * `current_period_end` to keep their plan.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { createInvoice } from '@/lib/billing/nowpayments';
import { CREDIT_PACKS, PLANS, type BillingInterval, type Plan } from '@/lib/billing/plans';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAppUrl } from '@/lib/utils/appUrl';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('billing-checkout');

const CheckoutSchema = z.object({
  // 'subscription': renew/upgrade to a paid plan (existing flow).
  // 'topup':        buy a prepaid credit pack, added to the wallet.
  type: z.enum(['subscription', 'topup']).default('subscription'),
  plan: z.enum(['pro', 'protocol']).optional(),
  interval: z.enum(['month', 'year']).optional(),
  pack: z.enum(['starter', 'builder', 'agent']).optional(),
});

/** Billing cycle length in days for each interval. */
const PERIOD_DAYS: Record<BillingInterval, number> = {
  month: 30,
  year: 365,
};

export const POST = createApiHandler(
  async (request: NextRequest, context) => {
    const userId = context.auth?.userId;
    if (!userId) {
      return NextResponse.json(ApiResponseBuilder.error('UNAUTHORIZED', 'User not found'), {
        status: 401,
      });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(ApiResponseBuilder.error('BAD_REQUEST', 'Invalid JSON body'), {
        status: 400,
      });
    }

    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ApiResponseBuilder.error('BAD_REQUEST', 'Invalid request body', {
          details: parsed.error.flatten(),
        }),
        { status: 400 }
      );
    }

    const { type } = parsed.data;

    const origin = getAppUrl() || request.nextUrl.origin;

    // ----- Top-up: buy a prepaid credit pack -------------------------------
    if (type === 'topup') {
      const pack = parsed.data.pack;
      if (!pack) {
        return NextResponse.json(
          ApiResponseBuilder.error('BAD_REQUEST', 'A credit pack is required for a top-up'),
          { status: 400 }
        );
      }

      // Credit packs are layered ON TOP of a paid plan. A free user's wallet
      // is unspendable: planGuard still blocks Tier 2/3, and the free monthly
      // counter caps Tier 1 regardless of balance — buying a pack would just
      // be a donation. Require an active subscription or an active Pro trial.
      const serviceClient = createServiceRoleClient();
      const nowIso = new Date().toISOString();
      const [{ data: activeSub }, { data: activeTrialKey }] = await Promise.all([
        serviceClient
          .from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .gte('current_period_end', nowIso)
          .limit(1)
          .maybeSingle(),
        serviceClient
          .from('api_keys')
          .select('id')
          .eq('user_id', userId)
          .gt('trial_ends_at', nowIso)
          .limit(1)
          .maybeSingle(),
      ]);

      if (!activeSub && !activeTrialKey) {
        return NextResponse.json(
          ApiResponseBuilder.error(
            'PAID_PLAN_REQUIRED',
            'Credit top-ups require an active paid subscription or Pro trial. Upgrade first at /api#pricing.',
            { retryable: false }
          ),
          { status: 403 }
        );
      }

      const packConfig = CREDIT_PACKS[pack];

      const orderId = crypto.randomUUID();
      const description = `Insight ${packConfig.name} — ${packConfig.credits.toLocaleString()} credits`;

      const invoiceResult = await createInvoice({
        priceAmount: packConfig.priceUsd,
        priceCurrency: 'usd',
        orderId,
        description,
        ipnCallbackUrl: `${origin}/api/billing/webhook`,
        successUrl: `${origin}/settings?tab=billing&status=success`,
        cancelUrl: `${origin}/settings?tab=billing&status=cancel`,
      });

      if ('error' in invoiceResult) {
        return NextResponse.json(
          ApiResponseBuilder.error('PAYMENT_ERROR', invoiceResult.error, { retryable: false }),
          { status: 502 }
        );
      }

      // Record a pending credit purchase so the IPN can credit the wallet.
      const { error: insertError } = await serviceClient.from('credit_purchases').insert({
        id: orderId,
        user_id: userId,
        credits: packConfig.credits,
        price_usd: packConfig.priceUsd,
        nowpayments_invoice_id: invoiceResult.invoiceId,
        status: 'incomplete',
      });

      if (insertError) {
        logger.error(
          'Failed to pre-create credit purchase row after invoice creation',
          new Error(insertError.message),
          { userId, pack, invoiceId: invoiceResult.invoiceId }
        );
        return NextResponse.json(
          ApiResponseBuilder.error(
            'INTERNAL_ERROR',
            'Created invoice but failed to record credit purchase — please contact support'
          ),
          { status: 500 }
        );
      }

      logger.info('Credit top-up invoice created', {
        userId,
        pack,
        credits: packConfig.credits,
        invoiceId: invoiceResult.invoiceId,
        orderId,
      });

      return NextResponse.json(ApiResponseBuilder.success({ url: invoiceResult.invoiceUrl }));
    }

    const { plan, interval } = parsed.data;
    const planConfig = PLANS[plan as Plan];
    const priceAmount = interval === 'year' ? planConfig.priceYearly : planConfig.priceMonthly;

    if (!priceAmount || priceAmount <= 0) {
      return NextResponse.json(
        ApiResponseBuilder.error('BAD_REQUEST', `Plan "${plan}" is not a paid plan`),
        { status: 400 }
      );
    }

    const orderId = crypto.randomUUID();
    const description = `Insight ${planConfig.name} plan — ${interval}ly subscription`;

    // 2. Create the NOWPayments invoice.
    const invoiceResult = await createInvoice({
      priceAmount,
      priceCurrency: 'usd',
      orderId,
      description,
      ipnCallbackUrl: `${origin}/api/billing/webhook`,
      successUrl: `${origin}/settings?tab=billing&status=success`,
      cancelUrl: `${origin}/settings?tab=billing&status=cancel`,
    });

    if ('error' in invoiceResult) {
      return NextResponse.json(
        ApiResponseBuilder.error('PAYMENT_ERROR', invoiceResult.error, { retryable: false }),
        { status: 502 }
      );
    }

    // 3. Pre-create the subscriptions row with status='incomplete'.
    //    current_period_end is a placeholder — the webhook will overwrite it
    //    with `now + period` when the `finished` IPN arrives (so the cycle
    //    starts from payment confirmation, not from checkout initiation).
    const now = new Date();
    const placeholderPeriodEnd = new Date(
      now.getTime() + PERIOD_DAYS[interval as BillingInterval] * 24 * 60 * 60 * 1000
    );

    const serviceClient = createServiceRoleClient();
    const { error: insertError } = await serviceClient.from('subscriptions').insert({
      id: orderId,
      user_id: userId,
      // Legacy stripe_* columns are now nullable — leave NULL for new rows.
      stripe_customer_id: null,
      stripe_subscription_id: null,
      nowpayments_invoice_id: invoiceResult.invoiceId,
      plan,
      status: 'incomplete',
      interval,
      current_period_start: now.toISOString(),
      current_period_end: placeholderPeriodEnd.toISOString(),
      cancel_at_period_end: false,
      payment_provider: 'nowpayments',
    });

    if (insertError) {
      logger.error(
        'Failed to pre-create subscription row after invoice creation',
        new Error(insertError.message),
        { userId, plan, interval, invoiceId: invoiceResult.invoiceId }
      );
      // The invoice exists on NOWPayments but we have no local record. The
      // user will still be able to pay, but the IPN won't find a row to
      // upgrade. Return an error so the user retries; the zombie invoice
      // will expire on NOWPayments' side.
      return NextResponse.json(
        ApiResponseBuilder.error(
          'INTERNAL_ERROR',
          'Created invoice but failed to record subscription — please contact support'
        ),
        { status: 500 }
      );
    }

    logger.info('Checkout invoice created', {
      userId,
      plan,
      interval,
      invoiceId: invoiceResult.invoiceId,
      orderId,
    });

    return NextResponse.json(ApiResponseBuilder.success({ url: invoiceResult.invoiceUrl }));
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
