import { NextResponse } from 'next/server';

import { getWalletBalance } from '@/lib/billing/creditWallet';
import { getEndpointCreditCost } from '@/lib/billing/productPricing';
import {
  PolymarketGuardInputSchema,
  assessPolymarketGuard,
} from '@/lib/prediction/polymarketGuard';
import { attestPolymarketGuardResult } from '@/lib/prediction/polymarketGuardAttestation';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  isTelegramServiceRequest,
  readTelegramJson,
  sha256Hex,
  telegramAssessmentMeteringKey,
  telegramUserIdSchema,
} from '@/lib/telegram/serviceAuth';

export const runtime = 'nodejs';
export const maxDuration = 30;
const ASSESSMENT_COST = getEndpointCreditCost('/api/v1/safety/prediction-guard/attestation');

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
      { success: false, message: 'Invalid Telegram assessment request' },
      { status: 400 }
    );
  }
  const input = PolymarketGuardInputSchema.safeParse(body.input);
  if (!input.success) {
    return NextResponse.json(
      { success: false, message: 'Invalid Polymarket assessment input' },
      { status: 400 }
    );
  }

  const client = createServiceRoleClient();
  const { data: link, error: linkError } = await client
    .from('telegram_account_links')
    .select('user_id')
    .eq('telegram_user_id', body.telegramUserId)
    .maybeSingle();
  if (linkError) {
    return NextResponse.json(
      { success: false, message: 'Linked account is temporarily unavailable' },
      { status: 503 }
    );
  }
  if (!link?.user_id) {
    return NextResponse.json(
      {
        success: false,
        code: 'TELEGRAM_ACCOUNT_NOT_LINKED',
        message: 'Link your Insight account to use your credits in Telegram.',
      },
      { status: 403 }
    );
  }

  const wallet = await getWalletBalance(link.user_id);
  if (!wallet) {
    return NextResponse.json(
      { success: false, message: 'Account billing is temporarily unavailable' },
      { status: 503 }
    );
  }
  if (wallet.balance - wallet.frozen < ASSESSMENT_COST) {
    return NextResponse.json(
      {
        success: false,
        code: 'CREDIT_EXHAUSTED',
        message: `This assessment needs ${ASSESSMENT_COST} Insight credits; available balance is ${Math.max(0, wallet.balance - wallet.frozen)}.`,
        costCredits: ASSESSMENT_COST,
        balance: Math.max(0, wallet.balance - wallet.frozen),
      },
      { status: 402, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  let decision;
  try {
    const guard = await assessPolymarketGuard(input.data);
    decision = await attestPolymarketGuardResult(guard);
  } catch {
    decision = null;
  }
  if (!decision) {
    return NextResponse.json(
      {
        success: false,
        code: 'ASSESSMENT_UNAVAILABLE',
        message: 'No trusted assessment was produced. No credits were charged.',
      },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }

  const updateHash = await sha256Hex(String(body.updateId));
  const requestId = `tg-${updateHash.slice(0, 20)}`;
  const meteringKey = await telegramAssessmentMeteringKey(body.telegramUserId, body.updateId);
  const { data: charge, error: chargeError } = await client.rpc('consume_telegram_credits', {
    p_telegram_user_id: body.telegramUserId,
    p_cost: ASSESSMENT_COST,
    p_metering_key: meteringKey,
    p_request_id: requestId,
    p_meta: {
      channel: 'telegram',
      product: 'polymarket_assessment',
      verdict: decision.guard.verdict,
    },
  });
  if (chargeError || !charge || typeof charge !== 'object' || typeof charge.ok !== 'boolean') {
    return NextResponse.json(
      {
        success: false,
        code: 'BILLING_UNAVAILABLE',
        message:
          'The assessment could not be delivered because the credit charge could not be confirmed.',
      },
      { status: 503 }
    );
  }
  if (!charge.ok) {
    return NextResponse.json(
      {
        success: false,
        code:
          charge.reason === 'ACCOUNT_NOT_LINKED'
            ? 'TELEGRAM_ACCOUNT_NOT_LINKED'
            : 'CREDIT_EXHAUSTED',
        message:
          'The assessment was not delivered because the credit balance changed. No assessment was charged.',
        balance: typeof charge.balance === 'number' ? charge.balance : 0,
      },
      { status: 402, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: decision,
      billing: {
        chargedCredits: ASSESSMENT_COST,
        balanceAfter:
          typeof charge.balance === 'number' ? charge.balance : wallet.balance - ASSESSMENT_COST,
        chargeConfirmed: true,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
