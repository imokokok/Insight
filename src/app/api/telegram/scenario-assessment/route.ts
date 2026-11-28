import { NextResponse } from 'next/server';

import { getWalletBalance } from '@/lib/billing/creditWallet';
import { getEndpointCreditCost } from '@/lib/billing/productPricing';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  createTelegramScenarioAssessment,
  TelegramScenarioInputSchema,
} from '@/lib/telegram/scenario-assessment';
import {
  isTelegramServiceRequest,
  readTelegramJson,
  sha256Hex,
  telegramAssessmentMeteringKey,
  telegramUserIdSchema,
} from '@/lib/telegram/serviceAuth';

export const runtime = 'nodejs';
export const maxDuration = 30;
const COST = getEndpointCreditCost('/api/v1/safety/prediction-guard/attestation');

export async function POST(request: Request) {
  if (!isTelegramServiceRequest(request))
    return NextResponse.json({ success: false, code: 'UNAUTHORIZED' }, { status: 401 });
  const body = await readTelegramJson(request);
  if (
    !body ||
    !telegramUserIdSchema(body.telegramUserId) ||
    typeof body.updateId !== 'number' ||
    !Number.isSafeInteger(body.updateId) ||
    body.updateId < 0
  ) {
    return NextResponse.json({ success: false, code: 'INVALID_REQUEST' }, { status: 400 });
  }
  const parsed = TelegramScenarioInputSchema.safeParse(body.request);
  if (!parsed.success)
    return NextResponse.json({ success: false, code: 'INVALID_SCENARIO_INPUT' }, { status: 400 });

  const client = createServiceRoleClient();
  const { data: link, error: linkError } = await client
    .from('telegram_account_links')
    .select('user_id')
    .eq('telegram_user_id', body.telegramUserId)
    .maybeSingle();
  if (linkError)
    return NextResponse.json({ success: false, code: 'ACCOUNT_UNAVAILABLE' }, { status: 503 });
  if (!link?.user_id)
    return NextResponse.json(
      { success: false, code: 'TELEGRAM_ACCOUNT_NOT_LINKED' },
      { status: 403 }
    );
  const wallet = await getWalletBalance(link.user_id);
  if (
    !wallet ||
    !Number.isSafeInteger(wallet.balance) ||
    !Number.isSafeInteger(wallet.frozen) ||
    wallet.frozen > wallet.balance
  ) {
    return NextResponse.json({ success: false, code: 'BILLING_UNAVAILABLE' }, { status: 503 });
  }
  if (wallet.balance - wallet.frozen < COST)
    return NextResponse.json(
      {
        success: false,
        code: 'CREDIT_EXHAUSTED',
        costCredits: COST,
        availableCredits: wallet.balance - wallet.frozen,
      },
      { status: 402 }
    );

  let decision: Awaited<ReturnType<typeof createTelegramScenarioAssessment>>;
  try {
    decision = await createTelegramScenarioAssessment(parsed.data);
  } catch (error) {
    const code =
      error instanceof Error && /^SCENARIO_[A-Z_]+$/.test(error.message)
        ? error.message
        : 'SCENARIO_SOURCE_UNAVAILABLE';
    console.error(
      JSON.stringify({
        event: 'telegram_scenario_assessment_failed',
        code,
        scenario: parsed.data.scenario,
      })
    );
    return NextResponse.json(
      {
        success: false,
        code,
        message: 'A trusted assessment could not be produced. No credits were charged.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const requestId = `tg-${(await sha256Hex(String(body.updateId))).slice(0, 20)}`;
  const meteringKey = await telegramAssessmentMeteringKey(body.telegramUserId, body.updateId);
  const { data: charge, error: chargeError } = await client.rpc('consume_telegram_credits', {
    p_telegram_user_id: body.telegramUserId,
    p_cost: COST,
    p_metering_key: meteringKey,
    p_request_id: requestId,
    p_meta: {
      channel: 'telegram',
      product: parsed.data.scenario,
      verdict: decision.assessment.verdict,
    },
  });
  if (chargeError || !charge || typeof charge !== 'object' || typeof charge.ok !== 'boolean')
    return NextResponse.json({ success: false, code: 'BILLING_UNAVAILABLE' }, { status: 503 });
  if (!charge.ok)
    return NextResponse.json(
      {
        success: false,
        code:
          charge.reason === 'ACCOUNT_NOT_LINKED'
            ? 'TELEGRAM_ACCOUNT_NOT_LINKED'
            : 'CREDIT_EXHAUSTED',
      },
      { status: 402 }
    );

  return NextResponse.json(
    {
      success: true,
      data: decision,
      billing: {
        chargedCredits: COST,
        balanceAfter: typeof charge.balance === 'number' ? charge.balance : wallet.balance - COST,
        chargeConfirmed: true,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
