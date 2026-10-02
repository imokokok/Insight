/**
 * POST /api/billing/reconcile
 *
 * The "I've paid" fallback: re-checks a pending payment against NOWPayments
 * and applies the same lifecycle logic the webhook would have run.
 *
 * NOWPayments IPNs are not guaranteed to be delivered. If a user paid but the
 * IPN was lost/delayed, their subscription / top-up stays 'incomplete' forever
 * with no way to reconcile. This endpoint lets the billing UI poll the real
 * payment status and re-run the (idempotent) activation logic when the payment
 * has actually settled — closing that gap without a manual support ticket.
 *
 * Body:   { type: 'subscription' | 'topup', id: <uuid>, paymentId?: <provider ID> }
 * Auth:   Bearer session (the user reconciles their own order).
 *
 * The lifecycle handlers are idempotent (metering-keyed wallet credits, grants
 * keyed on the subscription row), so running this alongside a late-arriving
 * IPN can never double-credit or double-activate.
 */

import { NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { getPaymentStatus } from '@/lib/billing/nowpayments';
import {
  handlePartiallyPaid,
  handlePaymentConfirmed,
  handlePaymentExpiredOrFailed,
  recordPaymentReference,
  type IpnData,
} from '@/lib/billing/subscriptionLifecycle';
import { createServiceRoleClient, createUserClient } from '@/lib/supabase/server';

const ReconcileBodySchema = z.object({
  type: z.enum(['subscription', 'topup']),
  id: z.string().uuid(),
  paymentId: z
    .string()
    .regex(/^\d{1,30}$/)
    .optional(),
});

const TERMINAL_STATUSES: Record<'subscription' | 'topup', string[]> = {
  subscription: ['active', 'canceled'],
  topup: ['paid', 'canceled'],
};

export const POST = createApiHandler(
  async (_request, context) => {
    const userId = context.auth?.userId;
    const accessToken = context.auth?.accessToken;
    if (!userId || !accessToken) {
      return NextResponse.json(ApiResponseBuilder.error('UNAUTHORIZED', 'User not found'), {
        status: 401,
      });
    }

    const { type, id, paymentId: suppliedPaymentId } = context.validated!.body!;

    // Look up the row scoped to the caller (user-scoped client → RLS).
    const userClient = createUserClient(accessToken);
    const table = type === 'subscription' ? 'subscriptions' : 'credit_purchases';
    const { data: row } = await userClient
      .from(table)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!row) {
      return NextResponse.json(
        ApiResponseBuilder.error('NOT_FOUND', 'No such order for this user'),
        { status: 404 }
      );
    }

    const status = row.status as string;
    if (TERMINAL_STATUSES[type].includes(status)) {
      // Nothing to reconcile — already settled (active/paid/canceled).
      return NextResponse.json(ApiResponseBuilder.success({ status, reconciled: false }));
    }

    // Still pending (incomplete / past_due): ask NOWPayments for the truth.
    if (!row.nowpayments_invoice_id) {
      return NextResponse.json(
        ApiResponseBuilder.error('NO_INVOICE', 'This order has no payment invoice yet'),
        { status: 409 }
      );
    }

    const paymentId = suppliedPaymentId ?? row.nowpayments_payment_id;
    if (!paymentId) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'PAYMENT_ID_REQUIRED',
          'Enter the Payment ID shown on your NOWPayments receipt'
        ),
        { status: 409 }
      );
    }

    const payment = await getPaymentStatus(paymentId);
    if (!payment) {
      return NextResponse.json(
        ApiResponseBuilder.error('PROVIDER_ERROR', 'Unable to reach the payment provider'),
        { status: 502 }
      );
    }

    // A user may supply any payment ID. Bind the provider response to this
    // specific order before applying any state change or credit.
    if (
      (payment.invoiceId && payment.invoiceId !== row.nowpayments_invoice_id) ||
      (payment.orderId && payment.orderId !== row.id) ||
      (!payment.invoiceId && !payment.orderId)
    ) {
      return NextResponse.json(
        ApiResponseBuilder.error('PAYMENT_MISMATCH', 'Payment does not belong to this order'),
        { status: 409 }
      );
    }

    // Synthetic IPN payload mirroring the fields the webhook would carry.
    const data: IpnData = {
      invoice_id: row.nowpayments_invoice_id,
      order_id: payment.orderId ?? row.id,
      payment_status: payment.status,
      price_amount: payment.priceAmount,
      price_currency: payment.priceCurrency,
    };

    const serviceClient = createServiceRoleClient();
    await recordPaymentReference(serviceClient, data, paymentId);
    switch (payment.status) {
      case 'finished': {
        await handlePaymentConfirmed(serviceClient, data, paymentId);
        break;
      }
      case 'partially_paid': {
        await handlePartiallyPaid(serviceClient, data);
        break;
      }
      case 'expired':
      case 'failed': {
        await handlePaymentExpiredOrFailed(serviceClient, data);
        break;
      }
      case 'waiting':
      case 'confirming':
      default:
        // Still in progress — leave the row as-is.
        break;
    }

    // Re-read the row to report the reconciled status.
    const { data: updated } = await userClient
      .from(table)
      .select('status')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    return NextResponse.json(
      ApiResponseBuilder.success({
        status: (updated?.status as string | undefined) ?? status,
        reconciled: true,
        providerStatus: payment.status,
      })
    );
  },
  {
    validation: { body: ReconcileBodySchema },
    middlewares: {
      logging: true,
      auth: { required: true, allowApiKey: false },
      rateLimit: { preset: 'strict' },
      cors: true,
    },
  }
);

export const dynamic = 'force-dynamic';
