import { NextResponse } from 'next/server';

import { createApiHandler, createOptionsHandler } from '@/lib/api/handler';
import { ApiResponseBuilder } from '@/lib/api/response';

export const OPTIONS = createOptionsHandler();

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
      rateLimit: { preset: 'lenient' },
      quota: true,
      cors: true,
    },
  }
);
