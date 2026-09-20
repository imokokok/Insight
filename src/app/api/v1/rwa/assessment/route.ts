import { NextResponse, type NextRequest } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_PROTOCOL_TIER_MIDDLEWARES,
} from '@/lib/api/handler';
import { diagnoseRwa } from '@/lib/rwa/diagnostic';
import { RwaDiagnosticSchema } from '@/lib/rwa/schema';

import type { z } from 'zod';

export const OPTIONS = createOptionsHandler();
export const POST = createApiHandler(
  async (_request: NextRequest, context) => {
    const { input, policy } = context.validated!.body as z.infer<typeof RwaDiagnosticSchema>;
    return NextResponse.json(
      ApiResponseBuilder.success(diagnoseRwa(input, policy), { requestId: context.requestId }),
      { headers: { 'Cache-Control': 'no-store' } }
    );
  },
  { middlewares: V1_PROTOCOL_TIER_MIDDLEWARES, validation: { body: RwaDiagnosticSchema } }
);
