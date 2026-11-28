import { NextResponse } from 'next/server';

import { ApiResponseBuilder, createApiHandler } from '@/lib/api/handler';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { readTelegramJson, sha256Hex } from '@/lib/telegram/serviceAuth';

export const runtime = 'nodejs';

export const POST = createApiHandler(
  async (request, context) => {
    const userId = context.auth?.userId;
    if (!userId) return ApiResponseBuilder.unauthorized();
    const value = await readTelegramJson(request);
    if (!value) {
      return NextResponse.json(
        ApiResponseBuilder.error('VALIDATION_ERROR', 'Invalid request body'),
        { status: 400 }
      );
    }
    const challenge = value.challenge;
    if (typeof challenge !== 'string' || !/^[A-Za-z0-9_-]{40,60}$/.test(challenge)) {
      return NextResponse.json(
        ApiResponseBuilder.error('VALIDATION_ERROR', 'Invalid or expired link request'),
        { status: 400 }
      );
    }

    const challengeHash = await sha256Hex(challenge);
    const { data, error } = await createServiceRoleClient().rpc('claim_telegram_account_link', {
      p_challenge_hash: challengeHash,
      p_user_id: userId,
    });
    if (error) {
      return NextResponse.json(
        ApiResponseBuilder.error('INTERNAL_ERROR', 'Could not link Telegram account'),
        { status: 503 }
      );
    }
    if (typeof data !== 'string') {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'LINK_UNAVAILABLE',
          'This link expired or an account is already linked'
        ),
        { status: 409 }
      );
    }
    return NextResponse.json(ApiResponseBuilder.success({ linked: true }));
  },
  {
    middlewares: {
      logging: true,
      auth: { required: true, allowApiKey: false },
      rateLimit: { preset: 'strict' },
      cors: true,
    },
  }
);
