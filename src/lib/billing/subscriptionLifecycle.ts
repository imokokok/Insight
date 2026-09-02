/**
 * @fileoverview Shared subscription / credit-purchase lifecycle handlers.
 *
 * These were extracted from the NOWPayments webhook route so the same
 * "payment became confirmed / partially paid / expired / refunded" logic can
 * also be driven by the reconciliation endpoint (/api/billing/reconcile) — the
 * "I've paid" fallback for when an IPN is lost or delayed. Keeping a single
 * implementation guarantees the webhook and the manual-recheck path can never
 * drift apart.
 *
 * Idempotency:
 *   - Wallet top-ups key on the invoice id (`topup:<invoiceId>`), which is
 *     stable across confirmed/finished IPNs and across the reconcile path, so
 *     a payment is never credited twice.
 *   - Subscription grants key on the subscription row id (matching
 *     add_monthly_credits), so re-running activation is a no-op for the grant.
 *   - updateApiKeyPlanForUser is itself idempotent.
 */

import { updateApiKeyPlanForUser } from '@/lib/api/apiKey';
import { topUpCredits } from '@/lib/billing/creditWallet';
import { planCreditGrant, type Plan } from '@/lib/billing/plans';
import { type createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('subscription-lifecycle');

/** Loosely-typed NOWPayments IPN payload (or synthetic payload from reconcile). */
export type IpnData = Record<string, unknown>;

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

/** Safely extract a string field from loosely-typed IPN data. */
export function getString(data: IpnData, key: string): string | undefined {
  const value = data[key];
  return typeof value === 'string' ? value : undefined;
}

/** Safely extract a string field, trying snake_case then camelCase. */
export function getStringField(
  data: IpnData,
  snakeKey: string,
  camelKey: string
): string | undefined {
  return getString(data, snakeKey) ?? getString(data, camelKey);
}

/** Billing cycle length in days per interval. */
const PERIOD_DAYS: Record<'month' | 'year', number> = {
  month: 30,
  year: 365,
};

/**
 * Look up a subscription row by NOWPayments invoice_id (preferred) or
 * order_id (fallback — order_id is the subscriptions.id uuid we set at
 * checkout). Returns the row or null.
 */
export async function findSubscriptionByInvoice(
  client: ServiceClient,
  data: IpnData
): Promise<{
  id: string;
  user_id: string;
  plan: string;
  interval: string;
  status: string;
} | null> {
  const invoiceId = getStringField(data, 'invoice_id', 'invoiceId');
  const orderId = getStringField(data, 'order_id', 'orderId');

  if (invoiceId) {
    const { data: row } = await client
      .from('subscriptions')
      .select('id, user_id, plan, interval, status')
      .eq('nowpayments_invoice_id', invoiceId)
      .maybeSingle();
    if (row) return row;
  }

  if (orderId) {
    // order_id was set to subscriptions.id at checkout time.
    const { data: row } = await client
      .from('subscriptions')
      .select('id, user_id, plan, interval, status')
      .eq('id', orderId)
      .maybeSingle();
    if (row) return row;
  }

  return null;
}

/**
 * Look up a credit purchase row by NOWPayments invoice_id (preferred) or
 * order_id (the credit_purchases.id uuid set at checkout). For top-up IPNs.
 */
export async function findCreditPurchaseByInvoice(
  client: ServiceClient,
  data: IpnData
): Promise<{
  id: string;
  user_id: string;
  credits: number;
  status: string;
} | null> {
  const invoiceId = getStringField(data, 'invoice_id', 'invoiceId');
  const orderId = getStringField(data, 'order_id', 'orderId');

  if (invoiceId) {
    const { data: row } = await client
      .from('credit_purchases')
      .select('id, user_id, credits, status')
      .eq('nowpayments_invoice_id', invoiceId)
      .maybeSingle();
    if (row) return row;
  }

  if (orderId) {
    const { data: row } = await client
      .from('credit_purchases')
      .select('id, user_id, credits, status')
      .eq('id', orderId)
      .maybeSingle();
    if (row) return row;
  }

  return null;
}

/**
 * Handle confirmed/finished: credit the wallet for a top-up invoice, OR
 * upgrade the user's API keys to the subscribed plan (and grant the first
 * cycle's credit allowance) for a subscription invoice.
 */
export async function handlePaymentConfirmed(
  client: ServiceClient,
  data: IpnData,
  paymentId: string
) {
  const invoiceId = getStringField(data, 'invoice_id', 'invoiceId');

  // --- Top-up invoice: credit the wallet (idempotent on metering key). -----
  const purchase = await findCreditPurchaseByInvoice(client, data);
  if (purchase) {
    if (purchase.status === 'incomplete') {
      const newBalance = await topUpCredits({
        userId: purchase.user_id,
        amount: purchase.credits,
        // Key on the invoice id (fallback: payment id). The invoice id is
        // stable across confirmed/finished IPNs AND across the reconcile path,
        // so a payment can never be credited twice even if both paths run.
        meteringKey: `topup:${invoiceId ?? paymentId}`,
        kind: 'topup',
        ref: invoiceId ?? undefined,
      });

      await client
        .from('credit_purchases')
        .update({
          status: 'paid',
          nowpayments_payment_id: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchase.id);

      logger.info('Credit top-up confirmed — wallet credited', {
        userId: purchase.user_id,
        credits: purchase.credits,
        newBalance,
        paymentId,
        purchaseId: purchase.id,
      });
    }
    return;
  }

  // --- Subscription invoice. -------------------------------------------------
  const sub = await findSubscriptionByInvoice(client, data);
  if (!sub) {
    logger.warn('confirmed/finished: no subscription row found', {
      invoiceId,
      orderId: getStringField(data, 'order_id', 'orderId'),
    });
    return;
  }

  const interval = sub.interval === 'year' ? 'year' : 'month';
  const plan = sub.plan as Plan;
  const now = new Date();

  // A payment only (re)activates a row that is not yet active. Guarding on this
  // prevents a duplicate confirmed/finished IPN (or a reconcile re-run) from
  // silently resetting the billing period — period dates are set exactly once.
  const needsActivation = sub.status === 'incomplete' || sub.status === 'past_due';

  if (needsActivation) {
    // Cancel any OTHER active subscription for this user. Each checkout creates
    // a fresh subscriptions row (renewal / upgrade), so without this a user
    // could end up with two active rows and receive the monthly allowance
    // twice (add_monthly_credits grants per active row). The newly-paid row
    // supersedes all others.
    const { error: cancelError } = await client
      .from('subscriptions')
      .update({ status: 'canceled', updated_at: now.toISOString() })
      .eq('user_id', sub.user_id)
      .eq('status', 'active');
    if (cancelError) {
      logger.warn('Failed to cancel superseded active subscriptions', {
        userId: sub.user_id,
        error: cancelError.message,
      });
    } else {
      logger.info('Canceled superseded active subscriptions', {
        userId: sub.user_id,
        activeSubscriptionId: sub.id,
      });
    }

    const periodEnd = new Date(now.getTime() + PERIOD_DAYS[interval] * 24 * 60 * 60 * 1000);

    // Activate the row with fresh period dates.
    const { error: updateError } = await client
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        nowpayments_payment_id: paymentId,
        cancel_at_period_end: false,
        updated_at: now.toISOString(),
      })
      .eq('id', sub.id);

    if (updateError) {
      logger.error('Failed to activate subscription row', new Error(updateError.message), {
        subscriptionId: sub.id,
        paymentId,
      });
      // Continue to upgrade API keys anyway — the user paid.
    }

    // First cycle: credit the plan's monthly credit allowance so the user is
    // immediately spendable. The key matches add_monthly_credits (migration
    // 0041), so the cron's per-cycle / per-month grants are idempotent:
    //   - monthly: one allowance per billing cycle  -> grant:<user>:sub:<subId>
    //   - yearly:  one allowance per calendar month -> grant:<user>:sub:<subId>:<YYYY-MM>
    const grant = planCreditGrant(plan);
    if (grant > 0) {
      const grantKey =
        interval === 'year'
          ? `grant:${sub.user_id}:sub:${sub.id}:${now.toISOString().slice(0, 7)}`
          : `grant:${sub.user_id}:sub:${sub.id}`;
      await topUpCredits({
        userId: sub.user_id,
        amount: grant,
        meteringKey: grantKey,
        kind: 'grant',
        ref: `${sub.plan} first-cycle allowance`,
      });
      logger.info('Granted first-cycle credit allowance', {
        userId: sub.user_id,
        plan: sub.plan,
        grant,
        subscriptionId: sub.id,
        interval,
      });
    }
  }

  // Always ensure the user's keys are on the subscribed plan (idempotent).
  // Deliberately outside the needsActivation branch so a late duplicate
  // confirmed/finished event still re-applies the plan without resetting the
  // period dates.
  await updateApiKeyPlanForUser(sub.user_id, plan);

  logger.info('Payment confirmed — user upgraded', {
    userId: sub.user_id,
    plan: sub.plan,
    interval,
    paymentId,
    subscriptionId: sub.id,
    activated: needsActivation,
  });
}

/**
 * Handle partially_paid: mark the subscription past_due (awaiting top-up).
 * Do NOT upgrade — the user hasn't paid the full amount yet.
 */
export async function handlePartiallyPaid(client: ServiceClient, data: IpnData) {
  const sub = await findSubscriptionByInvoice(client, data);
  if (!sub) {
    logger.warn('partially_paid: no subscription row found', {
      invoiceId: getStringField(data, 'invoice_id', 'invoiceId'),
    });
    return;
  }

  const { error } = await client
    .from('subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('id', sub.id);

  if (error) {
    logger.warn('Failed to mark subscription past_due', {
      subscriptionId: sub.id,
      error: error.message,
    });
  } else {
    logger.info('Subscription marked past_due (partial payment)', {
      subscriptionId: sub.id,
    });
  }
}

/**
 * Handle expired/failed: mark the subscription canceled — BUT only if it is
 * still in 'incomplete' status. This is the critical out-of-order guard:
 * if a confirmed/finished IPN arrived first and activated the row, a late
 * expired IPN must NOT cancel it (the user already paid).
 */
export async function handlePaymentExpiredOrFailed(client: ServiceClient, data: IpnData) {
  // Credit-purchase invoice: mark canceled (no wallet change — it was never
  // credited). Guard on 'incomplete' so a late expired IPN can't touch a
  // purchase that was already paid.
  const purchase = await findCreditPurchaseByInvoice(client, data);
  if (purchase) {
    if (purchase.status === 'incomplete') {
      const { error } = await client
        .from('credit_purchases')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('id', purchase.id);
      if (error) {
        logger.warn('Failed to cancel expired/failed credit purchase', {
          purchaseId: purchase.id,
          error: error.message,
        });
      } else {
        logger.info('Credit purchase marked canceled (invoice expired/failed)', {
          purchaseId: purchase.id,
        });
      }
    } else {
      logger.info('expired/failed ignored — credit purchase not incomplete', {
        purchaseId: purchase.id,
        currentStatus: purchase.status,
      });
    }
    return;
  }

  const sub = await findSubscriptionByInvoice(client, data);
  if (!sub) {
    logger.warn('expired/failed: no subscription row found', {
      invoiceId: getStringField(data, 'invoice_id', 'invoiceId'),
    });
    return;
  }

  if (sub.status !== 'incomplete') {
    // Already active (or already canceled/past_due) — do not touch.
    logger.info('expired/failed ignored — subscription not in incomplete state', {
      subscriptionId: sub.id,
      currentStatus: sub.status,
    });
    return;
  }

  const { error } = await client
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('id', sub.id)
    .eq('status', 'incomplete'); // belt-and-suspenders: only update if still incomplete

  if (error) {
    logger.warn('Failed to mark subscription canceled', {
      subscriptionId: sub.id,
      error: error.message,
    });
  } else {
    logger.info('Subscription marked canceled (invoice expired/failed)', {
      subscriptionId: sub.id,
    });
  }
}

/**
 * Handle refunded: downgrade the user's API keys to the base (developer) tier
 * and mark the subscription canceled. The refund overrides any remaining period.
 */
export async function handlePaymentRefunded(client: ServiceClient, data: IpnData) {
  // Credit-purchase refund: claw back the granted credits. Spent credits
  // leave a negative balance, which is correct — the user owes them and must
  // top up before spending again. Idempotent on the refund metering key.
  const purchase = await findCreditPurchaseByInvoice(client, data);
  if (purchase) {
    if (purchase.status === 'paid') {
      const newBalance = await topUpCredits({
        userId: purchase.user_id,
        amount: -purchase.credits,
        meteringKey: `refund:${purchase.id}:${purchase.user_id}`,
        kind: 'refund',
        ref: `refund of ${purchase.credits} credit top-up`,
      });

      const { error } = await client
        .from('credit_purchases')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('id', purchase.id);

      if (error) {
        logger.warn('Failed to mark refunded credit purchase canceled', {
          purchaseId: purchase.id,
          error: error.message,
        });
      }
      logger.info('Credit purchase refunded — wallet debited', {
        userId: purchase.user_id,
        credits: purchase.credits,
        newBalance,
        purchaseId: purchase.id,
      });
    } else {
      logger.info('refunded ignored — credit purchase not in paid state', {
        purchaseId: purchase.id,
        currentStatus: purchase.status,
      });
    }
    return;
  }

  const sub = await findSubscriptionByInvoice(client, data);
  if (!sub) {
    logger.warn('refunded: no subscription row found', {
      invoiceId: getStringField(data, 'invoice_id', 'invoiceId'),
    });
    return;
  }

  // Downgrade all of the user's active API keys to the base (developer) tier.
  // Any remaining credit-wallet balance is untouched, so the user can keep
  // consuming on a pay-as-you-go basis.
  await updateApiKeyPlanForUser(sub.user_id, 'developer');

  const { error } = await client
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('id', sub.id);

  if (error) {
    logger.warn('Failed to mark refunded subscription canceled', {
      subscriptionId: sub.id,
      error: error.message,
    });
  } else {
    logger.info('Refund processed — user downgraded to developer', {
      userId: sub.user_id,
      subscriptionId: sub.id,
    });
  }
}
