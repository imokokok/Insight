import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { ApiResponseBuilder, createOptionsHandler } from '@/lib/api/handler';
import { isLifecycleGuardFamily } from '@/lib/api/services/positionLifecycleGuards';
import {
  lifecycleErrorResponse,
  requireBearerToken,
} from '@/lib/api/services/positionLifecycleHttp';
import { runBundledGuard } from '@/lib/api/services/positionLifecycleService';
import { CACHE_PRESETS } from '@/lib/api/utils';

/**
 * One bundled guard assessment, authenticated by the one-time lifecycle token
 * returned at purchase (`Authorization: Bearer plc_<hex>`). The family is
 * chosen per call; params are validated against that family's native schema
 * inside the dispatch. A BLOCK verdict is a complete, charged decision — it
 * consumes a budget slot; a schema or assessor technical failure does not.
 */

export const maxDuration = 60;
export const OPTIONS = createOptionsHandler();

const GuardBodySchema = z.object({
  family: z
    .string()
    .describe(
      'Guard family to assess with: base_perp, hyperliquid_perp, base_lending, monad_lending, multichain_evm_lending, or solana_lending'
    ),
  params: z
    .unknown()
    .describe(
      'The native guard input for the chosen family (same schema as the family REST route)'
    ),
  transaction: z
    .unknown()
    .optional()
    .describe(
      'Required for solana_lending: the exact unsigned Solana lending transaction the guard evaluates and simulates'
    ),
});

function validationError(message: string, requestId?: string): NextResponse {
  return NextResponse.json(ApiResponseBuilder.error('VALIDATION_ERROR', message, { requestId }), {
    status: 400,
    headers: { 'Cache-Control': CACHE_PRESETS.noStore },
  });
}

/** Run one bundled guard assessment inside an open lifecycle (free, budgeted). */
export const POST = async (
  request: NextRequest,
  routeContext: { params: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const requestId = request.headers.get('x-request-id') ?? undefined;
  const { lifecycleId } = await routeContext.params;
  try {
    const token = requireBearerToken(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError(
        'Expected a JSON guard body: { family, params, transaction? }',
        requestId
      );
    }
    const parsed = GuardBodySchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        'Expected a JSON guard body: { family, params, transaction? }',
        requestId
      );
    }
    if (!isLifecycleGuardFamily(parsed.data.family)) {
      return validationError(`Unknown guard family '${parsed.data.family}'`, requestId);
    }
    const result = await runBundledGuard(
      lifecycleId,
      token,
      parsed.data.family,
      parsed.data.params,
      parsed.data.transaction
    );
    return NextResponse.json(
      ApiResponseBuilder.success(result, {
        requestId,
        meta: {
          family: result.family,
          guardUsed: result.guard.used,
          guardBudget: result.guard.budget,
        },
      }),
      { headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
    );
  } catch (error) {
    const mapped = lifecycleErrorResponse(error, requestId);
    if (mapped) return mapped;
    throw error;
  }
};
