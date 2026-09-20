import { NextResponse, type NextRequest } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_PROTOCOL_TIER_MIDDLEWARES,
} from '@/lib/api/handler';
import { assessCoverage } from '@/lib/coverage/service';
import { SafeSymbolSchema } from '@/lib/security/validation';

const querySchema = z.object({
  asset: SafeSymbolSchema,
  chainId: z.coerce.number().int().positive(),
  policyId: z.string().regex(/^0x[0-9a-f]{64}$/),
});
export const OPTIONS = createOptionsHandler();
export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const proof = await assessCoverage(context.validated!.query as z.infer<typeof querySchema>);
    return NextResponse.json(ApiResponseBuilder.success(proof, { requestId: context.requestId }), {
      headers: { 'Cache-Control': 'no-store' },
    });
  },
  { middlewares: V1_PROTOCOL_TIER_MIDDLEWARES, validation: { query: querySchema } }
);
