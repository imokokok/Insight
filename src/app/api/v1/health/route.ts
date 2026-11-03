import { NextResponse } from 'next/server';

import { createApiHandler, createOptionsHandler } from '@/lib/api/handler';
import { ApiResponseBuilder } from '@/lib/api/response';

export const OPTIONS = createOptionsHandler();

// This liveness probe must remain available when Supabase is degraded. It is a
// constant public response, so it intentionally bypasses database-backed
// quota and rate-limit middleware; edge infrastructure remains the outer
// traffic control.
export const GET = createApiHandler(
  async () => {
    return NextResponse.json(
      ApiResponseBuilder.success({
        status: 'ok',
        version: 'v1',
        timestamp: Date.now(),
      })
    );
  },
  {
    middlewares: {
      logging: true,
      auth: false,
      cors: true,
    },
  }
);
