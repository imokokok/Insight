import { NextResponse } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { COVERAGE_POLICY_ID, getCoveragePolicy } from '@/lib/coverage/service';

import { coveragePolicyId } from '../../../../../../sdk/src/coverage';

export const OPTIONS = createOptionsHandler();
export const GET = createApiHandler(
  async (request, context) => {
    const requested = new URL(request.url).searchParams.get('policyId');
    const policy = getCoveragePolicy(requested ?? COVERAGE_POLICY_ID);
    if (!policy) return NextResponse.json({ error: 'UNKNOWN_COVERAGE_POLICY' }, { status: 404 });
    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          policyId: coveragePolicyId(policy),
          policy,
          scope: 'Data readiness only; independently pin policy and signer before use.',
        },
        { requestId: context.requestId }
      ),
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  },
  { middlewares: V1_READ_ONLY_MIDDLEWARES }
);
