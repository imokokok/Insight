import { NextResponse } from 'next/server';

import { revokeApiKey, setApiKeyBudget } from '@/lib/api/apiKey';
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

/**
 * PATCH /api/user/api-keys/:id — set the key's optional monthly credit budget.
 *
 * Body: { budgetMonthly: number | null }
 *   number > 0 → hard cap on credits this key may consume per calendar month.
 *   null       → clear the cap (rely on wallet balance only).
 * Enforced in the credit precheck/consume RPCs. Scoped to the user's own key.
 */
export const PATCH = createApiHandler(
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

    let body: { budgetMonthly?: number | null } = {};
    try {
      body = await _request.json();
    } catch {
      return NextResponse.json(ApiResponseBuilder.error('BAD_REQUEST', 'Invalid JSON body'), {
        status: 400,
      });
    }

    let amount: number | null;
    const raw = body.budgetMonthly;
    if (raw === null || raw === undefined) {
      amount = null;
    } else if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
      amount = raw;
    } else {
      return NextResponse.json(
        ApiResponseBuilder.error('BAD_REQUEST', 'budgetMonthly must be a positive number or null'),
        { status: 400 }
      );
    }

    await setApiKeyBudget(keyId, userId, amount);

    return NextResponse.json(ApiResponseBuilder.success({ budgetMonthly: amount }));
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
