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
 *   refunded                    → downgrade to developer + mark canceled
 *
 * The per-status handlers live in src/lib/billing/subscriptionLifecycle.ts so
 * the reconciliation endpoint (/api/billing/reconcile) can re-run the exact
 * same logic when an IPN is lost/delayed.
 *
 * IMPORTANT: This route does NOT use createApiHandler. NOWPayments requires
 * the raw request body for signature verification — `request.json()` would
 * re-serialize the body and break the signature. We read `request.text()`
 * and pass it to parseIpnEvent which re-sorts keys before HMAC verification
 * (this is NOWPayments' signing convention, different from Stripe/Creem).
 *
 * Idempotency: event_id = `${payment_id}:${payment_status}`. The same
 * payment sends multiple IPNs as status transitions; each (payment, status)
 * pair is processed exactly once. The lifecycle handlers themselves are also
 * idempotent (top-up/grant metering keys, updateApiKeyPlanForUser).
 *
 * Auth: NOWPayments IPN signature verification (not Bearer/CRON_SECRET).
 * The IPN secret (NOWPAYMENTS_IPN_SECRET) is configured in the NOWPayments
 * dashboard.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { getMaxRequestBytes, rejectOversizedRequest } from '@/lib/api/requestLimits';
import { parseIpnEvent } from '@/lib/billing/nowpayments';
import {
  getString,
  getStringField,
  handlePartiallyPaid,
  handlePaymentConfirmed,
  handlePaymentExpiredOrFailed,
  handlePaymentRefunded,
  type IpnData,
} from '@/lib/billing/subscriptionLifecycle';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('nowpayments-webhook');

export { getString, getStringField };

const WEBHOOK_PROVIDER = 'nowpayments';

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
  const oversizedResponse = rejectOversizedRequest(request);
  if (oversizedResponse) return oversizedResponse;

  const payload = await request.text();
  if (new TextEncoder().encode(payload).byteLength > getMaxRequestBytes()) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

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

// NOWPayments webhook routes must not be cached
export const dynamic = 'force-dynamic';
