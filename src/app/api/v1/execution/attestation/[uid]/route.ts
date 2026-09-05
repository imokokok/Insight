/** Retrieve the complete, immutable Execution Receipt envelope by its UID. */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler, createOptionsHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { createServiceRoleClient } from '@/lib/supabase/server';

const ParamsSchema = z.object({
  uid: z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'uid must be a 32-byte hex digest'),
});

const PUBLIC_READ_MIDDLEWARES = {
  logging: true,
  auth: false,
  rateLimit: { preset: 'lenient' as const },
  quota: false,
  cors: true,
};

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const uid = context.validated!.params!.uid;
    const { data, error } = await createServiceRoleClient()
      .from('execution_receipts')
      .select('receipt_payload')
      .eq('uid', uid)
      .maybeSingle();

    if (error) throw new Error(`execution receipt lookup failed: ${error.message}`);
    if (!data?.receipt_payload) {
      return NextResponse.json(
        ApiResponseBuilder.error('NOT_FOUND', 'Execution Receipt not found', {
          requestId: context.requestId,
        }),
        { status: 404 }
      );
    }

    return NextResponse.json(
      ApiResponseBuilder.success(
        { attestation: data.receipt_payload },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_READ_MIDDLEWARES,
    validation: { params: ParamsSchema },
  }
);
