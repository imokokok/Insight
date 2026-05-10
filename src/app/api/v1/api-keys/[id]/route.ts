import { type NextRequest, NextResponse } from 'next/server';

import { createApiKeyService } from '@/lib/api/apiKeyService';
import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { type ApiKeyPlan } from '@/lib/api/middleware/apiKeyMiddleware';
import { createServerClient } from '@/lib/supabase/server';

export const GET = createApiHandler(
  async (request: NextRequest, context) => {
    const userId = context.auth?.userId;
    if (!userId) {
      return NextResponse.json(
        ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required'),
        { status: 401 }
      );
    }

    const pathSegments = request.nextUrl.pathname.split('/');
    const keyId = pathSegments[pathSegments.length - 1];

    const client = createServerClient();
    const service = createApiKeyService(client);
    const key = await service.getApiKey(keyId, userId);

    if (!key) {
      return NextResponse.json(ApiResponseBuilder.error('NOT_FOUND', 'API key not found'), {
        status: 404,
      });
    }

    const usage = await service.getApiKeyUsage(keyId);

    return NextResponse.json(
      ApiResponseBuilder.success({
        ...key,
        usage: usage || { last24h: 0, last7d: 0 },
      })
    );
  },
  {
    middlewares: {
      logging: true,
      auth: { required: true },
    },
  }
);

export const PATCH = createApiHandler(
  async (request: NextRequest, context) => {
    const userId = context.auth?.userId;
    if (!userId) {
      return NextResponse.json(
        ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required'),
        { status: 401 }
      );
    }

    const pathSegments = request.nextUrl.pathname.split('/');
    const keyId = pathSegments[pathSegments.length - 1];

    let body: { name?: string; plan?: ApiKeyPlan };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        ApiResponseBuilder.error('INVALID_BODY', 'Request body must be valid JSON'),
        { status: 400 }
      );
    }

    const client = createServerClient();
    const service = createApiKeyService(client);

    const existing = await service.getApiKey(keyId, userId);
    if (!existing) {
      return NextResponse.json(ApiResponseBuilder.error('NOT_FOUND', 'API key not found'), {
        status: 404,
      });
    }

    const result = await service.updateApiKey(keyId, userId, body);

    if (!result) {
      return NextResponse.json(
        ApiResponseBuilder.error('UPDATE_FAILED', 'Failed to update API key'),
        { status: 500 }
      );
    }

    return NextResponse.json(ApiResponseBuilder.success(result));
  },
  {
    middlewares: {
      logging: true,
      auth: { required: true },
    },
  }
);

export const DELETE = createApiHandler(
  async (request: NextRequest, context) => {
    const userId = context.auth?.userId;
    if (!userId) {
      return NextResponse.json(
        ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required'),
        { status: 401 }
      );
    }

    const pathSegments = request.nextUrl.pathname.split('/');
    const keyId = pathSegments[pathSegments.length - 1];

    const client = createServerClient();
    const service = createApiKeyService(client);

    const existing = await service.getApiKey(keyId, userId);
    if (!existing) {
      return NextResponse.json(ApiResponseBuilder.error('NOT_FOUND', 'API key not found'), {
        status: 404,
      });
    }

    const success = await service.deleteApiKey(keyId, userId);

    if (!success) {
      return NextResponse.json(
        ApiResponseBuilder.error('DELETE_FAILED', 'Failed to delete API key'),
        { status: 500 }
      );
    }

    return NextResponse.json(ApiResponseBuilder.success({ deleted: true, keyId }));
  },
  {
    middlewares: {
      logging: true,
      auth: { required: true },
    },
  }
);
