/**
 * POST /api/billing/reconcile
 *
 * The "I've paid" fallback: re-checks a pending payment against NOWPayments
 * and applies the same lifecycle logic the webhook would have run.
 *
 * NOWPayments IPNs are not guaranteed to be delivered. If a user paid but the
 * IPN was lost/delayed, their subscription / top-up stays 'incomplete' forever
 * with no way to reconcile. This endpoint lets the billing UI poll the real
 * invoice status and re-run the (idempotent) activation logic when the payment
 * has actually settled — closing that gap without a manual support ticket.
 *
 * Body:   { type: 'subscription' | 'topup', id: <uuid> }
 * Auth:   Bearer session (the user reconciles their own order).
 *
 * The lifecycle handlers are idempotent (metering-keyed wallet credits, grants
 * keyed on the subscription row), so running this alongside a late-arriving
 * IPN can never double-credit or double-activate.
 */

import { NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { getInvoice } from '@/lib/billing/nowpayments';
import {
  handlePartiallyPaid,
  handlePaymentConfirmed,
  handlePaymentExpiredOrFailed,
  type IpnData,
} from '@/lib/billing/subscriptionLifecycle';
import { createServiceRoleClient, createUserClient } from '@/lib/supabase/server';

const ReconcileBodySchema = z.object({
  type: z.enum(['subscription', 'topup']),
  id: z.string().uuid(),
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

    const { type, id } = context.validated!.body!;

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

    const invoice = await getInvoice(row.nowpayments_invoice_id);
    if (!invoice) {
      return NextResponse.json(
        ApiResponseBuilder.error('PROVIDER_ERROR', 'Unable to reach the payment provider'),
        { status: 502 }
      );
    }

    // Synthetic IPN payload mirroring the fields the webhook would carry.
    const data: IpnData = {
      invoice_id: row.nowpayments_invoice_id,
      order_id: row.id,
      payment_status: invoice.status,
    };

    const serviceClient = createServiceRoleClient();
    switch (invoice.status) {
      case 'confirmed':
      case 'finished': {
        await handlePaymentConfirmed(serviceClient, data, String(invoice.id));
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
        providerStatus: invoice.status,
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
