import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  isTelegramServiceRequest,
  readTelegramJson,
  telegramUserIdSchema,
} from '@/lib/telegram/serviceAuth';

export const runtime = 'nodejs';

const ASSESSMENT_REASONS = [
  'telegram_polymarket_assessment',
  'telegram_base_lending_assessment',
  'telegram_hyperliquid_perps_assessment',
  'telegram_dex_swap_assessment',
];
const MAX_USAGE_ROWS = 10;

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
      { success: false, message: 'Account usage is temporarily unavailable' },
      { status: 503 }
    );
  }
  if (!link?.user_id) {
    return NextResponse.json(
      { success: true, linked: false, assessments: [] },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const { data: rows, error } = await client
    .from('credit_ledger')
    .select('created_at, delta, meta')
    .eq('user_id', link.user_id)
    .eq('kind', 'usage')
    .in('reason', ASSESSMENT_REASONS)
    .order('created_at', { ascending: false })
    .limit(MAX_USAGE_ROWS);
  if (error) {
    return NextResponse.json(
      { success: false, message: 'Account usage is temporarily unavailable' },
      { status: 503 }
    );
  }

  const assessments = (rows ?? []).flatMap((row) => {
    const chargedCredits = -Number(row.delta);
    const createdAt = typeof row.created_at === 'string' ? row.created_at : null;
    const meta =
      row.meta !== null && typeof row.meta === 'object' && !Array.isArray(row.meta)
        ? (row.meta as Record<string, unknown>)
        : null;
    const verdict = meta?.verdict;
    if (
      !createdAt ||
      !Number.isFinite(Date.parse(createdAt)) ||
      !Number.isFinite(chargedCredits) ||
      chargedCredits <= 0
    ) {
      return [];
    }
    return [
      {
        assessedAt: createdAt,
        chargedCredits,
        ...(verdict === 'ALLOW' || verdict === 'CAUTION' || verdict === 'BLOCK' ? { verdict } : {}),
      },
    ];
  });

  return NextResponse.json(
    { success: true, linked: true, assessments },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
