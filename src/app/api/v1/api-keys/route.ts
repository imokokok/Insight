import { type NextRequest, NextResponse } from 'next/server';

import { createApiKeyService } from '@/lib/api/apiKeyService';
import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { type ApiKeyPlan } from '@/lib/api/middleware/apiKeyMiddleware';
import { createServerClient } from '@/lib/supabase/server';

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const userId = context.auth?.userId;
    if (!userId) {
      return NextResponse.json(
        ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required to manage API keys'),
        { status: 401 }
      );
    }

    const client = createServerClient();
    const service = createApiKeyService(client);
    const keys = await service.listApiKeys(userId);

    const keysWithUsage = await Promise.all(
      keys.map(async (key) => {
        const usage = await service.getApiKeyUsage(key.id);
        return { ...key, usage: usage || { last24h: 0, last7d: 0 } };
      })
    );

    return NextResponse.json(
      ApiResponseBuilder.success({
        keys: keysWithUsage,
        count: keysWithUsage.length,
      })
    );
  },
  {
    middlewares: {
      logging: true,
      auth: { required: true },
      cors: true,
    },
  }
);

export const POST = createApiHandler(
  async (request: NextRequest, context) => {
    const userId = context.auth?.userId;
    if (!userId) {
      return NextResponse.json(
        ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required to create API keys'),
        { status: 401 }
      );
    }

    let body: { name?: string; plan?: ApiKeyPlan; expiresAt?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        ApiResponseBuilder.error('INVALID_BODY', 'Request body must be valid JSON'),
        { status: 400 }
      );
    }

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        ApiResponseBuilder.error('MISSING_NAME', 'API key name is required'),
        { status: 400 }
      );
    }

    if (body.name.length > 100) {
      return NextResponse.json(
        ApiResponseBuilder.error('NAME_TOO_LONG', 'API key name must be 100 characters or less'),
        { status: 400 }
      );
    }

    const validPlans: ApiKeyPlan[] = ['free', 'pro', 'enterprise'];
    if (body.plan && !validPlans.includes(body.plan)) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'INVALID_PLAN',
          `Invalid plan. Valid plans: ${validPlans.join(', ')}`,
          {
            details: { validPlans },
          }
        ),
        { status: 400 }
      );
    }

    const client = createServerClient();
    const service = createApiKeyService(client);

    const existingKeys = await service.listApiKeys(userId);
    const activeKeys = existingKeys.filter((k) => k.is_active);
    if (activeKeys.length >= 5) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'KEY_LIMIT_REACHED',
          'Maximum of 5 active API keys allowed. Revoke an existing key first.',
          {
            details: { maxKeys: 5, activeKeys: activeKeys.length },
          }
        ),
        { status: 403 }
      );
    }

    const result = await service.createApiKey(userId, {
      name: body.name.trim(),
      plan: body.plan || 'free',
      expiresAt: body.expiresAt,
    });

    if (!result) {
      return NextResponse.json(
        ApiResponseBuilder.error('CREATE_FAILED', 'Failed to create API key'),
        { status: 500 }
      );
    }

    return NextResponse.json(
      ApiResponseBuilder.success({
        id: result.id,
        name: result.name,
        key: result.key,
        keyPrefix: result.key_prefix,
        plan: result.plan,
        rateLimit: result.rate_limit,
        createdAt: result.created_at,
        expiresAt: result.expires_at,
        warning: 'Store this API key securely. It will not be shown again.',
      }),
      { status: 201 }
    );
  },
  {
    middlewares: {
      logging: true,
      auth: { required: true },
      cors: true,
    },
  }
);
