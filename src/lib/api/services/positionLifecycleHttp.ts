/**
 * @fileoverview HTTP plumbing shared by the token-authed position-lifecycle
 * subresource routes (guard, receipt, close).
 *
 * These routes are deliberately NOT part of the v1 API-key middleware stack:
 * the lifecycle itself is the pre-paid entitlement, so bundled calls are free
 * until the budgets are exhausted, and a keyless x402 buyer has no API key to
 * present. Unknown id and wrong token answer identically (401) so lifecycleIds
 * are not enumerable.
 */

import { NextResponse } from 'next/server';

import { z } from 'zod';

import { ApiResponseBuilder } from '@/lib/api/handler';
import { PositionLifecycleError } from '@/lib/api/services/positionLifecycleService';
import { ProductLimitError } from '@/lib/api/services/productLimits';
import { productLimitErrorResponse } from '@/lib/api/services/productLimitsHttp';
import { CACHE_PRESETS } from '@/lib/api/utils';

function bearerToken(request: Request): string {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() ?? '';
}

/** Parse the lifecycle token out of the Authorization header, or fail closed. */
export function requireBearerToken(request: Request): string {
  const token = bearerToken(request);
  if (!token) throw new PositionLifecycleError('INVALID_TOKEN');
  return token;
}

/**
 * Map a lifecycle failure (or a bundled-assessment schema error) onto its HTTP
 * status. Budget refusals carry Retry-After hints consistent with the
 * monitored-window routes.
 */
export function lifecycleErrorResponse(error: unknown, requestId?: string): NextResponse | null {
  if (error instanceof ProductLimitError) {
    return productLimitErrorResponse(error, requestId);
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      ApiResponseBuilder.error(
        'VALIDATION_ERROR',
        'Bundled call body does not match the selected guard family schema',
        {
          requestId,
          details: { issues: error.issues.map((issue) => issue.path.join('.')) },
        }
      ),
      { status: 400, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
    );
  }
  if (error instanceof PositionLifecycleError) {
    const status =
      error.code === 'INVALID_TOKEN'
        ? 401
        : error.code === 'NOT_FOUND'
          ? 404
          : error.code === 'LIFECYCLE_CLOSED' || error.code === 'LIFECYCLE_EXPIRED'
            ? 410
            : error.code === 'RECEIPT_UNAVAILABLE'
              ? 409
              : 429; // GUARD_BUDGET_REACHED

    const messages: Record<PositionLifecycleError['code'], string> = {
      NOT_FOUND: 'Position lifecycle not found.',
      INVALID_TOKEN: 'Invalid or missing lifecycle token.',
      LIFECYCLE_CLOSED: 'This position lifecycle is already closed.',
      LIFECYCLE_EXPIRED: 'This position lifecycle has expired.',
      GUARD_BUDGET_REACHED: 'This position lifecycle has exhausted its guard budget.',
      RECEIPT_UNAVAILABLE: 'The bundled execution receipt was already issued.',
    };

    const response = NextResponse.json(
      ApiResponseBuilder.error(error.code, messages[error.code], {
        requestId,
        details: { code: error.code, retryable: status === 429 },
      }),
      { status, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
    );
    if (status === 429) response.headers.set('Retry-After', '300');
    return response;
  }
  return null;
}
