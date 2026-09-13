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
 *   refunded                    → cancel that row + recalculate the user's
 *                                 effective plan from remaining subscriptions
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
 * payment sends multiple IPNs as status transitions. A database lease ensures
 * only one worker processes a given (payment, status) pair at a time; expired
 * leases and failed attempts remain retryable. The lifecycle handlers are also
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
  handlePartiallyPaid,
  handlePaymentConfirmed,
  handlePaymentExpiredOrFailed,
  handlePaymentRefunded,
  type IpnData,
} from '@/lib/billing/subscriptionLifecycle';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('nowpayments-webhook');

const WEBHOOK_PROVIDER = 'nowpayments';
const WEBHOOK_LEASE_SECONDS = 5 * 60;

type WebhookClaim =
  | { outcome: 'acquired'; leaseId: string }
  | { outcome: 'completed' | 'busy'; leaseId: null };

/**
 * Atomically claim this event in Postgres. A plain SELECT followed by UPDATE
 * is not sufficient: two deliveries can observe the same pending row and both
 * continue. The RPC inserts or conditionally replaces an expired/failed lease
 * in one transaction and returns a unique lease id to the winning worker.
 */
async function acquireWebhookEvent(
  client: ReturnType<typeof createServiceRoleClient>,
  event: { id: string; type: string },
  payload: string
): Promise<WebhookClaim> {
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

  const { data, error } = await client.rpc('claim_webhook_event', {
    p_provider: WEBHOOK_PROVIDER,
    p_event_id: event.id,
    p_event_type: event.type,
    p_payload: parsedPayload,
    p_lease_seconds: WEBHOOK_LEASE_SECONDS,
  });

  if (error) {
    throw new Error(`Failed to claim webhook event: ${error.message}`);
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Webhook claim RPC returned an invalid response');
  }

  const result = data as { outcome?: unknown; leaseId?: unknown };
  if (result.outcome === 'acquired' && typeof result.leaseId === 'string') {
    return { outcome: 'acquired', leaseId: result.leaseId };
  }
  if (result.outcome === 'completed' || result.outcome === 'busy') {
    return { outcome: result.outcome, leaseId: null };
  }

  throw new Error('Webhook claim RPC returned an unknown outcome');
}

async function completeWebhookEvent(
  client: ReturnType<typeof createServiceRoleClient>,
  eventId: string,
  leaseId: string
): Promise<void> {
  const { data, error } = await client.rpc('finish_webhook_event', {
    p_provider: WEBHOOK_PROVIDER,
    p_event_id: eventId,
    p_lease_id: leaseId,
    p_succeeded: true,
  });

  if (error) {
    throw new Error(`Failed to mark webhook event completed: ${error.message}`);
  }
  if (data !== true) {
    throw new Error('Webhook lease was lost before completion');
  }
}

async function failWebhookEvent(
  client: ReturnType<typeof createServiceRoleClient>,
  eventId: string,
  leaseId: string
): Promise<void> {
  const { data, error } = await client.rpc('finish_webhook_event', {
    p_provider: WEBHOOK_PROVIDER,
    p_event_id: eventId,
    p_lease_id: leaseId,
    p_succeeded: false,
  });

  if (error || data !== true) {
    logger.warn('Failed to mark webhook event as failed', {
      eventId,
      error: error?.message ?? 'lease no longer owned by this worker',
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

  let claim: WebhookClaim;
  try {
    claim = await acquireWebhookEvent(client, { id: eventId, type: event.type }, payload);
  } catch (error) {
    logger.error('Webhook idempotency ledger unavailable', normalizeError(error), {
      eventType: event.type,
      eventId,
    });
    return NextResponse.json({ error: 'Webhook ledger unavailable' }, { status: 500 });
  }
  if (claim.outcome === 'completed') {
    logger.debug('Webhook event already processed, skipping', {
      eventId,
      eventType: event.type,
    });
    return NextResponse.json({ received: true });
  }
  if (claim.outcome === 'busy') {
    return NextResponse.json(
      { error: 'Webhook event is already processing' },
      { status: 503, headers: { 'Retry-After': '5' } }
    );
  }
  if (claim.outcome !== 'acquired') {
    throw new Error('Unhandled webhook claim outcome');
  }

  const leaseId = claim.leaseId;

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

    await completeWebhookEvent(client, eventId, leaseId);
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Webhook handler failed', normalizeError(error), {
      eventType: event.type,
      eventId,
    });
    await failWebhookEvent(client, eventId, leaseId);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

// NOWPayments webhook routes must not be cached
export const dynamic = 'force-dynamic';
