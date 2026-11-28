import { NextResponse } from 'next/server';

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
  const { error, count } = await createServiceRoleClient()
    .from('telegram_account_links')
    .delete({ count: 'exact' })
    .eq('telegram_user_id', telegramUserId);
  if (error) {
    return NextResponse.json(
      { success: false, message: 'Could not unlink account' },
      { status: 503 }
    );
  }
  return NextResponse.json(
    { success: true, unlinked: (count ?? 0) > 0 },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
