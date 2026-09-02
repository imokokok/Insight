import { NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiKeyForUser, listApiKeysForUser } from '@/lib/api/apiKey';
import { createApiHandler, createOptionsHandler } from '@/lib/api/handler';
import { ApiResponseBuilder } from '@/lib/api/response';
import { validateBodySchema } from '@/lib/validation';

const CreateApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request, context) => {
    const userId = context.auth?.userId;
    if (!userId) {
      return NextResponse.json(ApiResponseBuilder.error('UNAUTHORIZED', 'User not found'), {
        status: 401,
      });
    }

    const keys = await listApiKeysForUser(userId);
    return NextResponse.json(
      ApiResponseBuilder.success({
        keys: keys.map((key) => ({
          id: key.id,
          name: key.name,
          prefix: key.key_prefix,
          plan: key.plan,
          rateLimit: key.rate_limit,
          lastUsedAt: key.last_used_at,
          createdAt: key.created_at,
        })),
      })
    );
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

export const POST = createApiHandler(
  async (request, context) => {
    const userId = context.auth?.userId;
    if (!userId) {
      return NextResponse.json(ApiResponseBuilder.error('UNAUTHORIZED', 'User not found'), {
        status: 401,
      });
    }

    const validation = await validateBodySchema(CreateApiKeySchema)(request);
    if (!validation.success) {
      return validation.response!;
    }

    const { record, plainKey } = await createApiKeyForUser(userId, validation.data!.body!.name);

    return NextResponse.json(
      ApiResponseBuilder.success({
        key: {
          id: record.id,
          name: record.name,
          prefix: record.key_prefix,
          plan: record.plan,
          rateLimit: record.rate_limit,
          createdAt: record.created_at,
        },
        plainKey,
      }),
      { status: 201 }
    );
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
