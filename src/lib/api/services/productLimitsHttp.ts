import { NextResponse } from 'next/server';

import { ApiResponseBuilder } from '@/lib/api/handler';
import { CACHE_PRESETS } from '@/lib/api/utils';

import { type ProductLimitError, type ProductLimitScope } from './productLimits';

const MESSAGES: Record<ProductLimitScope, string> = {
  open_windows: 'This API key already holds the maximum number of open 24h monitored windows.',
  open_lifecycles: 'This API key already holds the maximum number of open 24h position lifecycles.',
  poll_rate: 'Poll rate limit exceeded for this monitored window.',
};

/**
 * Map a product-limit refusal onto HTTP 429.
 *
 * `Retry-After` is sent ONLY for `poll_rate`, where the counter really does
 * reset on a clock (the rolling minute). Concurrency refusals
 * (`open_windows` / `open_lifecycles`) carry no `Retry-After`: a slot frees
 * only when the caller closes a window/lifecycle or it expires after 24h, so a
 * timer-based header would be a false promise and would trigger a retry storm
 * of requests that are still guaranteed to fail.
 */
export function productLimitErrorResponse(
  error: ProductLimitError,
  requestId?: string
): NextResponse {
  const isRateLimit = error.scope === 'poll_rate';
  const response = NextResponse.json(
    ApiResponseBuilder.error(
      isRateLimit ? 'PRODUCT_RATE_LIMIT' : 'PRODUCT_CONCURRENCY_LIMIT',
      MESSAGES[error.scope],
      {
        requestId,
        retryable: true,
        details: {
          scope: error.scope,
          limit: error.limit,
          current: error.current,
          ...(isRateLimit
            ? {
                retryAfterSeconds: error.retryAfterSeconds,
                retryAfterBasis: error.retryAfterBasis,
                hint: 'Retry after the rolling minute resets.',
              }
            : {
                hint:
                  'Release a slot first: close an open window or lifecycle, or wait for its 24h expiry. ' +
                  'No Retry-After is sent because slots do not free on a timer.',
              }),
        },
      }
    ),
    { status: 429, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
  );
  if (isRateLimit && error.retryAfterSeconds !== null) {
    response.headers.set('Retry-After', String(error.retryAfterSeconds));
  }
  return response;
}
