import { NextResponse } from 'next/server';

import { topUpCredits } from '@/lib/billing/creditWallet';
import { getEndpointCreditCost } from '@/lib/billing/productPricing';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  isTelegramServiceRequest,
  readTelegramJson,
  telegramAssessmentMeteringKey,
  telegramUserIdSchema,
} from '@/lib/telegram/serviceAuth';

export const runtime = 'nodejs';
const ASSESSMENT_COST = getEndpointCreditCost('/api/v1/safety/prediction-guard/attestation');

/** Compensate an idempotently charged assessment when Telegram could not deliver its result. */
export async function POST(request: Request) {
  if (!isTelegramServiceRequest(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  const body = await readTelegramJson(request);
  if (
    !body ||
    !telegramUserIdSchema(body.telegramUserId) ||
    typeof body.updateId !== 'number' ||
    !Number.isSafeInteger(body.updateId) ||
    body.updateId < 0
  ) {
    return NextResponse.json(
      { success: false, message: 'Invalid refund request' },
      { status: 400 }
    );
  }

  const meteringKey = await telegramAssessmentMeteringKey(body.telegramUserId, body.updateId);
  const client = createServiceRoleClient();
  const { data: charge, error } = await client
    .from('credit_ledger')
    .select('user_id, delta, kind, reason')
    .eq('metering_key', meteringKey)
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { success: false, message: 'Charge lookup unavailable' },
      { status: 503 }
    );
  if (!charge) return NextResponse.json({ success: true, refunded: false, reason: 'NOT_CHARGED' });
  if (
    charge.kind !== 'usage' ||
    Number(charge.delta) !== -ASSESSMENT_COST ||
    charge.reason !== 'telegram_polymarket_assessment'
  ) {
    return NextResponse.json(
      { success: false, message: 'Assessment charge did not match refund policy' },
      { status: 409 }
    );
  }

  const balance = await topUpCredits({
    userId: charge.user_id,
    amount: ASSESSMENT_COST,
    meteringKey: `refund:${meteringKey}`,
    kind: 'refund',
    ref: meteringKey,
    source: 'wallet',
    reason: 'telegram_delivery_failed',
    requestId: `tg-refund-${body.updateId}`,
    meta: { channel: 'telegram', product: 'polymarket_assessment', reason: 'delivery_failed' },
  });
  if (balance === null) {
    return NextResponse.json(
      { success: false, message: 'Refund could not be confirmed' },
      { status: 503 }
    );
  }
  return NextResponse.json(
    { success: true, refunded: true, balance },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
