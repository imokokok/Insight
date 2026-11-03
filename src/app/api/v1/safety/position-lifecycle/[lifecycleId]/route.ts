import { type NextRequest, NextResponse } from 'next/server';

import { ApiResponseBuilder, createOptionsHandler } from '@/lib/api/handler';
import {
  lifecycleErrorResponse,
  requireBearerToken,
} from '@/lib/api/services/positionLifecycleHttp';
import { closePositionLifecycle } from '@/lib/api/services/positionLifecycleService';
import { CACHE_PRESETS } from '@/lib/api/utils';

/**
 * Close the lifecycle (idempotent) and return the combined summary: guard and
 * receipt usage plus the embedded monitored window's coverage summary. Also
 * works on an expired lifecycle — the summary is the record of what the
 * lifecycle covered.
 */

export const OPTIONS = createOptionsHandler();

/** Close the position lifecycle and return its combined summary. */
export const POST = async (
  request: NextRequest,
  routeContext: { params: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const requestId = request.headers.get('x-request-id') ?? undefined;
  const { lifecycleId } = await routeContext.params;
  try {
    const token = requireBearerToken(request);
    const summary = await closePositionLifecycle(lifecycleId, token);
    return NextResponse.json(
      ApiResponseBuilder.success(summary, {
        requestId,
        meta: {
          lifecycleId: summary.lifecycleId,
          haltCount: summary.watch.haltCount,
          guardUsed: summary.guardUsed,
          receiptState: summary.receiptState,
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
