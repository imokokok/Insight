import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { isOpsOwner } from '@/lib/ops/auth';

/**
 * UX-only owner status for the client navigation.
 *
 * This endpoint deliberately returns only a boolean. The owner allowlist stays
 * server-side, and /ops continues to enforce requireOpsOwner() independently.
 */
export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const userId = context.auth?.userId;
    if (!userId) return ApiResponseBuilder.unauthorized();

    return NextResponse.json(
      { isOpsOwner: isOpsOwner(userId) },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: true },
    },
  }
);
