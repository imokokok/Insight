/**
 * POST /api/billing/webhook
 *
 * Receives NOWPayments IPN (Instant Payment Notification) events and
 * synchronizes local subscription state.
 *
 * NOWPayments has no subscription concept — each invoice is a one-shot
 * payment. The IPN carries a `payment_status` that transitions through:
 *
 *   waiting → confirming → confirmed → finished   (success path)
 *                  ↘ partially_paid (awaiting top-up)
 *   (any) → expired / failed                       (abandoned/declined)
 *   (after finished) → refunded                    (manual merchant refund)
 *
 * Event mapping:
 *   waiting / confirming        → log only (stay incomplete)
 *   confirmed / finished        → upgrade plan + set active + compute period_end
 *   partially_paid              → mark past_due (awaiting top-up, no upgrade)
 *   expired / failed            → mark canceled (only if still incomplete —
 *                                 guards against out-of-order expired arriving
 *                                 after a confirmed/finished)
 *   refunded                    → downgrade to free + mark canceled
 *
 * IMPORTANT: This route does NOT use createApiHandler. NOWPayments requires
 * the raw request body for signature verification — `request.json()` would
 * re-serialize the body and break the signature. We read `request.text()`
 * and pass it to parseIpnEvent which re-sorts keys before HMAC verification
 * (this is NOWPayments' signing convention, different from Stripe/Creem).
 *
 * Idempotency: event_id = `${payment_id}:${payment_status}`. The same
 * payment sends multiple IPNs as status transitions; each (payment, status)
 * pair is processed exactly once. `updateApiKeyPlanForUser` is itself
 * idempotent, so duplicate confirmed/finished events are also safe.
 *
 * Auth: NOWPayments IPN signature verification (not Bearer/CRON_SECRET).
 * The IPN secret (NOWPAYMENTS_IPN_SECRET) is configured in the NOWPayments
 * dashboard.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { updateApiKeyPlanForUser } from '@/lib/api/apiKey';
import { topUpCredits } from '@/lib/billing/creditWallet';
import { parseIpnEvent } from '@/lib/billing/nowpayments';
import { planCreditGrant } from '@/lib/billing/plans';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('nowpayments-webhook');

/** Loosely-typed NOWPayments IPN payload. */
type IpnData = Record<string, unknown>;

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

const WEBHOOK_PROVIDER = 'nowpayments';

/** Billing cycle length in days per interval. */
const PERIOD_DAYS: Record<'month' | 'year', number> = {
  month: 30,
  year: 365,
};

/**
 * Ensure the event is tracked for idempotency.
 * Returns:
 *   - 'completed' if already successfully processed (caller should skip).
 *   - 'retry'     if pending/failed or newly inserted (caller should process).
 */
async function acquireWebhookEvent(
  client: ReturnType<typeof createServiceRoleClient>,
  event: { id: string; type: string },
  payload: string
): Promise<'completed' | 'retry'> {
  const { data: existing } = await client
    .from('processed_webhook_events')
    .select('status, attempts')
    .eq('provider', WEBHOOK_PROVIDER)
    .eq('event_id', event.id)
    .maybeSingle();

  if (existing?.status === 'completed') {
    logger.debug('Webhook event already processed, skipping', {
      eventId: event.id,
      eventType: event.type,
    });
    return 'completed';
  }

  if (existing) {
    // Pending or failed: increment attempts and allow retry.
    const { error: updateError } = await client
      .from('processed_webhook_events')
      .update({
        status: 'pending',
        attempts: existing.attempts + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('provider', WEBHOOK_PROVIDER)
      .eq('event_id', event.id);

    if (updateError) {
      logger.warn('Failed to update webhook event attempts', {
        eventId: event.id,
        error: updateError.message,
      });
    }
    return 'retry';
  }

  // payload is the raw IPN body (a JSON string). The column is jsonb, so parse
  // it into an object before insert — storing the raw string would save it as
  // a JSON string literal, making it impossible to query with `payload->>'...'`
  // later for debugging/audit.
  let parsedPayload: Record<string, unknown> = {};
  try {
    parsedPayload = JSON.parse(payload) as Record<string, unknown>;
  } catch {
    // parseIpnEvent (called earlier in POST) already validated the body is
    // valid JSON; reaching here means the body was mutated in flight. Keep
    // the empty object so we still record the event for idempotency.
    logger.warn('Failed to parse IPN payload for storage', { eventId: event.id });
  }

  const { error: insertError } = await client.from('processed_webhook_events').insert({
    provider: WEBHOOK_PROVIDER,
    event_id: event.id,
    event_type: event.type,
    status: 'pending',
    attempts: 1,
    payload: parsedPayload,
  });

  if (insertError) {
    // Race condition: another worker inserted it. Re-check status.
    if (insertError.code === '23505') {
      const { data: raceExisting } = await client
        .from('processed_webhook_events')
        .select('status')
        .eq('provider', WEBHOOK_PROVIDER)
        .eq('event_id', event.id)
        .single();
      return raceExisting?.status === 'completed' ? 'completed' : 'retry';
    }

    logger.warn('Failed to record webhook event, proceeding without idempotency', {
      eventId: event.id,
      error: insertError.message,
    });
  }

  return 'retry';
}

async function completeWebhookEvent(
  client: ReturnType<typeof createServiceRoleClient>,
  eventId: string
): Promise<void> {
  const { error } = await client
    .from('processed_webhook_events')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('provider', WEBHOOK_PROVIDER)
    .eq('event_id', eventId);

  if (error) {
    logger.warn('Failed to mark webhook event as completed', {
      eventId,
      error: error.message,
    });
  }
}

async function failWebhookEvent(
  client: ReturnType<typeof createServiceRoleClient>,
  eventId: string
): Promise<void> {
  const { error } = await client
    .from('processed_webhook_events')
    .update({ status: 'failed', updated_at: new Date().toISOString() })
    .eq('provider', WEBHOOK_PROVIDER)
    .eq('event_id', eventId);

  if (error) {
    logger.warn('Failed to mark webhook event as failed', {
      eventId,
      error: error.message,
    });
  }
}

export async function POST(request: NextRequest) {
  const payload = await request.text();

  const event = parseIpnEvent(payload, request.headers);
  if (!event) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Idempotency key: payment_id + payment_status. Same payment sends multiple
  // IPNs as status transitions; each (payment, status) pair is processed once.
  const eventId = `${event.id}:${event.type}`;

  const client = createServiceRoleClient();
  const data = event.data as IpnData;

  const acquireResult = await acquireWebhookEvent(
    client,
    { id: eventId, type: event.type },
    payload
  );
  if (acquireResult === 'completed') {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case 'waiting':
      case 'confirming': {
        // Payment initiated / awaiting block confirmations — no action yet.
        logger.debug('IPN: payment in progress', { paymentId: event.id, status: event.type });
        break;
      }
      case 'confirmed':
      case 'finished': {
        await handlePaymentConfirmed(client, data, event.id);
        break;
      }
      case 'partially_paid': {
        await handlePartiallyPaid(client, data);
        break;
      }
      case 'expired':
      case 'failed': {
        await handlePaymentExpiredOrFailed(client, data);
        break;
      }
      case 'refunded': {
        await handlePaymentRefunded(client, data);
        break;
      }
      default:
        logger.debug('Unhandled IPN event type', { type: event.type });
    }

    await completeWebhookEvent(client, eventId);
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Webhook handler failed', normalizeError(error), {
      eventType: event.type,
      eventId,
    });
    await failWebhookEvent(client, eventId);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/**
 * Look up a subscription row by NOWPayments invoice_id (preferred) or
 * order_id (fallback — order_id is the subscriptions.id uuid we set at
 * checkout). Returns the row or null.
 */
async function findSubscriptionByInvoice(
  client: ReturnType<typeof createServiceRoleClient>,
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
async function findCreditPurchaseByInvoice(
  client: ReturnType<typeof createServiceRoleClient>,
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
async function handlePaymentConfirmed(
  client: ReturnType<typeof createServiceRoleClient>,
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
        meteringKey: `topup:${paymentId}`,
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

  // --- Subscription invoice (existing flow). --------------------------------
  const sub = await findSubscriptionByInvoice(client, data);
  if (!sub) {
    logger.warn('confirmed/finished IPN: no subscription row found', {
      invoiceId,
      orderId: getStringField(data, 'order_id', 'orderId'),
    });
    return;
  }

  const wasIncomplete = sub.status === 'incomplete';
  const interval = sub.interval === 'year' ? 'year' : 'month';
  const now = new Date();
  const periodEnd = new Date(now.getTime() + PERIOD_DAYS[interval] * 24 * 60 * 60 * 1000);

  // Update the subscription row to active with fresh period dates.
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

  // Upgrade all of the user's active API keys to the paid plan.
  await updateApiKeyPlanForUser(sub.user_id, sub.plan as 'pro' | 'protocol');

  // First cycle: credit the plan's monthly credit allowance so the user is
  // immediately spendable. The key matches add_monthly_credits (migration
  // 0040), so the cron's per-cycle / per-month grants are idempotent:
  //   - monthly: one allowance per billing cycle  -> grant:<user>:sub:<subId>
  //   - yearly:  one allowance per calendar month -> grant:<user>:sub:<subId>:<YYYY-MM>
  if (wasIncomplete) {
    const grant = planCreditGrant(sub.plan as 'pro' | 'protocol');
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

  logger.info('Payment confirmed — user upgraded', {
    userId: sub.user_id,
    plan: sub.plan,
    interval,
    paymentId,
    subscriptionId: sub.id,
    periodEnd: periodEnd.toISOString(),
  });
}

/**
 * Handle partially_paid: mark the subscription past_due (awaiting top-up).
 * Do NOT upgrade — the user hasn't paid the full amount yet.
 */
async function handlePartiallyPaid(
  client: ReturnType<typeof createServiceRoleClient>,
  data: IpnData
) {
  const sub = await findSubscriptionByInvoice(client, data);
  if (!sub) {
    logger.warn('partially_paid IPN: no subscription row found', {
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
async function handlePaymentExpiredOrFailed(
  client: ReturnType<typeof createServiceRoleClient>,
  data: IpnData
) {
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
      logger.info('expired/failed IPN ignored — credit purchase not incomplete', {
        purchaseId: purchase.id,
        currentStatus: purchase.status,
      });
    }
    return;
  }

  const sub = await findSubscriptionByInvoice(client, data);
  if (!sub) {
    logger.warn('expired/failed IPN: no subscription row found', {
      invoiceId: getStringField(data, 'invoice_id', 'invoiceId'),
    });
    return;
  }

  if (sub.status !== 'incomplete') {
    // Already active (or already canceled/past_due) — do not touch.
    logger.info('expired/failed IPN ignored — subscription not in incomplete state', {
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
 * Handle refunded: downgrade the user's API keys to free immediately and
 * mark the subscription canceled. The refund overrides any remaining period.
 */
async function handlePaymentRefunded(
  client: ReturnType<typeof createServiceRoleClient>,
  data: IpnData
) {
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
      logger.info('refunded IPN ignored — credit purchase not in paid state', {
        purchaseId: purchase.id,
        currentStatus: purchase.status,
      });
    }
    return;
  }

  const sub = await findSubscriptionByInvoice(client, data);
  if (!sub) {
    logger.warn('refunded IPN: no subscription row found', {
      invoiceId: getStringField(data, 'invoice_id', 'invoiceId'),
    });
    return;
  }

  // Downgrade all of the user's active API keys back to free.
  await updateApiKeyPlanForUser(sub.user_id, 'free');

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
    logger.info('Refund processed — user downgraded to free', {
      userId: sub.user_id,
      subscriptionId: sub.id,
    });
  }
}

// NOWPayments webhook routes must not be cached
export const dynamic = 'force-dynamic';
