import { NextResponse, type NextRequest } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { getCoverageSlo } from '@/lib/coverage/collector';

const query = z.object({
  hours: z.coerce
    .number()
    .pipe(z.union([z.literal(24), z.literal(168), z.literal(672)]))
    .default(24),
});
export const OPTIONS = createOptionsHandler();
export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { hours } = context.validated!.query as z.infer<typeof query>;
    const data = await getCoverageSlo(hours);
    return NextResponse.json(ApiResponseBuilder.success(data, { requestId: context.requestId }), {
      headers: { 'Cache-Control': 'no-store' },
    });
  },
  { middlewares: V1_READ_ONLY_MIDDLEWARES, validation: { query } }
);
