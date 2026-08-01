import { NextResponse } from 'next/server';

import { revokeApiKey } from '@/lib/api/apiKey';
import { createApiHandler } from '@/lib/api/handler';
import { ApiResponseBuilder } from '@/lib/api/response';

export const DELETE = createApiHandler(
  async (_request, context) => {
    const userId = context.auth?.userId;
    if (!userId) {
      return NextResponse.json(ApiResponseBuilder.error('UNAUTHORIZED', 'User not found'), {
        status: 401,
      });
    }

    const keyId = context.validated?.params?.id;
    if (!keyId) {
      return NextResponse.json(ApiResponseBuilder.error('BAD_REQUEST', 'Missing API key ID'), {
        status: 400,
      });
    }

    await revokeApiKey(keyId, userId);

    return NextResponse.json(ApiResponseBuilder.success({ revoked: true }));
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
