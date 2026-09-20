import { NextResponse } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { COVERAGE_POLICY_ID } from '@/lib/coverage/service';

import { STRICT_COVERAGE_POLICY } from '../../../../../../sdk/src/coverage';

export const OPTIONS = createOptionsHandler();
export const GET = createApiHandler(
  async (request, context) => {
    const requested = new URL(request.url).searchParams.get('policyId');
    if (requested !== null && requested !== COVERAGE_POLICY_ID)
      return NextResponse.json({ error: 'UNKNOWN_COVERAGE_POLICY' }, { status: 404 });
    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          policyId: COVERAGE_POLICY_ID,
          policy: STRICT_COVERAGE_POLICY,
          scope: 'Data readiness only; independently pin policy and signer before use.',
        },
        { requestId: context.requestId }
      ),
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  },
  { middlewares: V1_READ_ONLY_MIDDLEWARES }
);
