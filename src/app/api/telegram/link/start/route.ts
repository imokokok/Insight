import { NextResponse } from 'next/server';

import { randomBytes, createHash } from 'node:crypto';

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

  const token = randomBytes(32).toString('base64url');
  const challengeHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1_000).toISOString();
  const client = createServiceRoleClient();
  const { count, error: rateError } = await client
    .from('telegram_link_challenges')
    .select('challenge_hash', { count: 'exact', head: true })
    .eq('telegram_user_id', telegramUserId)
    .gt('created_at', new Date(Date.now() - 60 * 60 * 1_000).toISOString());
  if (rateError) {
    return NextResponse.json(
      { success: false, message: 'Could not start account linking' },
      { status: 503 }
    );
  }
  if ((count ?? 0) >= 5) {
    return NextResponse.json(
      { success: false, message: 'Too many link requests; wait before retrying' },
      { status: 429 }
    );
  }
  await client.from('telegram_link_challenges').delete().lt('expires_at', new Date().toISOString());
  const { error } = await client.from('telegram_link_challenges').insert({
    challenge_hash: challengeHash,
    telegram_user_id: telegramUserId,
    expires_at: expiresAt,
  });
  if (error) {
    return NextResponse.json(
      { success: false, message: 'Could not start account linking' },
      { status: 503 }
    );
  }

  const link = new URL('/telegram-link', 'https://www.oracleinsight.xyz');
  link.searchParams.set('challenge', token);
  return NextResponse.json(
    { success: true, link: link.toString(), expiresAt },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
