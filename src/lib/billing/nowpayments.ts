/**
 * NOWPayments client wrapper for crypto billing (replaces creem.ts).
 *
 * NOWPayments is a crypto payment gateway — it creates invoices denominated
 * in USDC (1:1 with USD) that the payer can settle in any of 300+ supported
 * currencies at the invoice-time exchange rate. Unlike Creem/Stripe there is
 * NO subscription concept: each invoice is a one-shot payment for one
 * billing cycle. The application maintains subscription state in the
 * `subscriptions` table and computes `current_period_end` when the
 * `finished` IPN arrives.
 *
 * IPN signature verification differs critically from Stripe/Creem: the
 * `x-nowpayments-sig` header is HMAC-SHA512 of the **recursively key-sorted
 * JSON serialization** of the payload, NOT of the raw body. Verification
 * must re-serialize with the same sorting or it will always fail.
 *
 * All helpers gracefully degrade (return null / error) when NOWPayments env
 * is not configured, so the app runs in dev without credentials.
 *
 * Used by:
 *   - /api/billing/checkout   (createInvoice)
 *   - /api/billing/webhook    (parseIpnEvent)
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

import { NOWPAYMENTS_CONFIG } from '@/lib/config/serverEnv';
import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('nowpayments-billing');

/** Base URL for NOWPayments API (sandbox vs production). */
function getBaseUrl(): string {
  return NOWPAYMENTS_CONFIG.testMode
    ? 'https://api-sandbox.nowpayments.io/v1'
    : 'https://api.nowpayments.io/v1';
}

/** Get auth headers for NOWPayments API requests. */
function getAuthHeaders(): Record<string, string> {
  return {
    'x-api-key': NOWPAYMENTS_CONFIG.apiKey ?? '',
    'Content-Type': 'application/json',
  };
}

/**
 * Recursively sort object keys (deep). NOWPayments signs payloads by
 * serializing the key-sorted representation, so verification must reproduce
 * the exact same ordering. Arrays preserve order (only object keys sort).
 */
function sortObjectDeep<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectDeep) as unknown as T;
  }
  if (obj && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = sortObjectDeep((obj as Record<string, unknown>)[key]);
    }
    return sorted as unknown as T;
  }
  return obj;
}

/**
 * Create a NOWPayments invoice for subscribing to a paid plan.
 *
 * The invoice is denominated in USD (NOWPayments requires price_currency
 * to be a fiat code); the payer chooses the settlement currency on the
 * NOWPayments-hosted invoice page. The `orderId` should be
 * the uuid of the pre-created `subscriptions` row so the IPN callback can
 * reverse-look up the plan/interval/user without relying on metadata.
 *
 * Returns `{ invoiceId, invoiceUrl }` on success or `{ error }` on failure.
 */
export async function createInvoice(params: {
  priceAmount: number;
  priceCurrency?: string; // defaults to 'usd'
  orderId: string;
  description: string;
  ipnCallbackUrl: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ invoiceId: string; invoiceUrl: string } | { error: string }> {
  if (!NOWPAYMENTS_CONFIG.apiKey) return { error: 'NOWPayments is not configured' };

  const body = {
    price_amount: params.priceAmount,
    price_currency: params.priceCurrency ?? 'usd',
    // Intentionally omit pay_currency — let the payer choose on the invoice page.
    order_id: params.orderId,
    order_description: params.description,
    ipn_callback_url: params.ipnCallbackUrl,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  };

  try {
    const response = await fetch(`${getBaseUrl()}/invoice`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.error(
        'NOWPayments invoice API error',
        new Error(`HTTP ${response.status}: ${errorText}`),
        {
          orderId: params.orderId,
          priceAmount: params.priceAmount,
        }
      );
      return { error: `NOWPayments invoice failed: HTTP ${response.status}` };
    }

    const data = (await response.json()) as {
      id?: string | number;
      invoice_url?: string;
    };

    const invoiceId = data.id != null ? String(data.id) : undefined;
    const invoiceUrl = data.invoice_url;
    if (!invoiceId || !invoiceUrl) {
      logger.error('NOWPayments invoice response missing id or invoice_url', undefined, {
        orderId: params.orderId,
        responseKeys: Object.keys(data),
      });
      return { error: 'NOWPayments did not return a valid invoice' };
    }

    return { invoiceId, invoiceUrl };
  } catch (error) {
    logger.error('Failed to create NOWPayments invoice', normalizeError(error), {
      orderId: params.orderId,
    });
    return {
      error: error instanceof Error ? error.message : 'NOWPayments invoice failed',
    };
  }
}

/**
 * Verify a NOWPayments IPN signature.
 *
 * NOWPayments computes `x-nowpayments-sig` as HMAC-SHA512 of the
 * recursively key-sorted JSON serialization of the payload (no whitespace).
 * We must reproduce that exact serialization to verify.
 *
 * Returns true if the signature matches, false otherwise (or if the IPN
 * secret is not configured).
 */
export function verifyIpnSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!NOWPAYMENTS_CONFIG.ipnSecret || !signatureHeader) return false;

  try {
    const parsed = JSON.parse(rawBody);
    const sorted = sortObjectDeep(parsed);
    // JSON.stringify with no whitespace — matches NOWPayments' signing format.
    const sortedJson = JSON.stringify(sorted);

    const expected = createHmac('sha512', NOWPAYMENTS_CONFIG.ipnSecret)
      .update(sortedJson)
      .digest('hex');

    // Constant-time comparison to avoid timing attacks on signature checks.
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signatureHeader, 'hex');
    if (a.length !== b.length || a.length === 0) {
      return false;
    }
    return timingSafeEqual(a, b);
  } catch (error) {
    logger.error('IPN signature verification failed', normalizeError(error));
    return false;
  }
}

/**
 * Parse and verify a NOWPayments IPN event from the raw request body.
 *
 * Returns `{ id, type, data }` where:
 *   - `id`    = payment_id (used for idempotency; combined with status by caller)
 *   - `type`  = payment_status (waiting / confirming / confirmed / finished /
 *               partially_paid / expired / failed / refunded)
 *   - `data`  = the full parsed payload
 *
 * Returns null on verification failure or malformed payload.
 */
export function parseIpnEvent(
  rawBody: string,
  headers: Headers
): { id: string; type: string; data: Record<string, unknown> } | null {
  const signatureHeader = headers.get('x-nowpayments-sig');
  if (!verifyIpnSignature(rawBody, signatureHeader)) {
    logger.warn('IPN signature verification failed — rejecting event');
    return null;
  }

  try {
    const data = JSON.parse(rawBody) as Record<string, unknown>;
    const paymentId =
      typeof data.payment_id === 'string'
        ? data.payment_id
        : data.payment_id != null
          ? String(data.payment_id)
          : undefined;
    const paymentStatus = typeof data.payment_status === 'string' ? data.payment_status : undefined;

    if (!paymentId || !paymentStatus) {
      logger.warn('IPN event missing payment_id or payment_status', { data });
      return null;
    }

    return { id: paymentId, type: paymentStatus, data };
  } catch (error) {
    logger.error('Failed to parse IPN payload', normalizeError(error));
    return null;
  }
}

/**
 * Retrieve an invoice from NOWPayments by ID. Used for the "I've paid" button
 * fallback when an IPN is lost/delayed — the frontend polls this via a
 * billing endpoint to confirm payment status.
 */
export async function getInvoice(invoiceId: string): Promise<{
  id: string;
  status: string;
  priceAmount?: number;
  priceCurrency?: string;
  payAmount?: number;
  payCurrency?: string;
  orderId?: string;
} | null> {
  if (!NOWPAYMENTS_CONFIG.apiKey) return null;

  try {
    const response = await fetch(`${getBaseUrl()}/invoice/${encodeURIComponent(invoiceId)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      logger.error(
        'Failed to retrieve invoice from NOWPayments',
        new Error(`HTTP ${response.status}`),
        { invoiceId }
      );
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    return {
      id: String(data.id ?? invoiceId),
      status: String(data.status ?? 'unknown'),
      priceAmount: typeof data.price_amount === 'number' ? data.price_amount : undefined,
      priceCurrency: typeof data.price_currency === 'string' ? data.price_currency : undefined,
      payAmount: typeof data.pay_amount === 'number' ? data.pay_amount : undefined,
      payCurrency: typeof data.pay_currency === 'string' ? data.pay_currency : undefined,
      orderId: typeof data.order_id === 'string' ? data.order_id : undefined,
    };
  } catch (error) {
    logger.error('Failed to retrieve invoice from NOWPayments', normalizeError(error), {
      invoiceId,
    });
    return null;
  }
}

/**
 * Retrieve a payment's status from NOWPayments by payment ID. Used alongside
 * getInvoice for the IPN-loss fallback path.
 */
export async function getPaymentStatus(
  paymentId: string
): Promise<{ id: string; status: string } | null> {
  if (!NOWPAYMENTS_CONFIG.apiKey) return null;

  try {
    const response = await fetch(`${getBaseUrl()}/payment/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      logger.error(
        'Failed to retrieve payment from NOWPayments',
        new Error(`HTTP ${response.status}`),
        { paymentId }
      );
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    return {
      id: String(data.id ?? paymentId),
      status: String(data.payment_status ?? 'unknown'),
    };
  } catch (error) {
    logger.error('Failed to retrieve payment from NOWPayments', normalizeError(error), {
      paymentId,
    });
    return null;
  }
}
