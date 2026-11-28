import { NextResponse } from 'next/server';

import { getWalletBalance } from '@/lib/billing/creditWallet';
import { getEndpointCreditCost } from '@/lib/billing/productPricing';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  isTelegramServiceRequest,
  readTelegramJson,
  telegramUserIdSchema,
} from '@/lib/telegram/serviceAuth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isTelegramServiceRequest(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  const body = await readTelegramJson(request);
  const telegramUserId = body?.telegramUserId;
  if (!telegramUserIdSchema(telegramUserId)) {
    return NextResponse.json(
      { success: false, message: 'Invalid Telegram account' },
      { status: 400 }
    );
  }

  const client = createServiceRoleClient();
  const { data: link, error: linkError } = await client
    .from('telegram_account_links')
    .select('user_id')
    .eq('telegram_user_id', telegramUserId)
    .maybeSingle();
  if (linkError) {
    return NextResponse.json(
      { success: false, message: 'Account status unavailable' },
      { status: 503 }
    );
  }
  if (!link?.user_id) {
    return NextResponse.json(
      {
        success: true,
        linked: false,
        assessmentCostCredits: getEndpointCreditCost('/api/v1/safety/prediction-guard/attestation'),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const wallet = await getWalletBalance(link.user_id);
  if (
    !wallet ||
    !Number.isSafeInteger(wallet.balance) ||
    wallet.balance < 0 ||
    !Number.isSafeInteger(wallet.frozen) ||
    wallet.frozen < 0 ||
    wallet.frozen > wallet.balance
  ) {
    return NextResponse.json(
      { success: false, message: 'Account balance temporarily unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  return NextResponse.json(
    {
      success: true,
      linked: true,
      ready: true,
      balance: wallet.balance,
      frozen: wallet.frozen,
      assessmentCostCredits: getEndpointCreditCost('/api/v1/safety/prediction-guard/attestation'),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
