/**
 * @fileoverview Paid-route dispatch factory.
 *
 * Every guard route repeats the same three-part dispatch: resolve the paid
 * config from the canonical scope registry, route keyless/paid callers through
 * `handlePaidPreTradeRequest` (validate → execute → settle-after-result), and
 * leave credentialed API-key callers on the standard v1 middleware path. This
 * factory owns that dispatch so the per-route boilerplate — and the risk of a
 * route drifting from the scope registry (regression #405 class) — lives in
 * exactly one place.
 *
 * Routes with non-standard dispatch (dynamic per-request scope, bundled-token
 * auth, deliberately unpayable rails) intentionally do NOT use this factory.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { ApiResponseBuilder } from '@/lib/api/handler';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { x402ConfigForPaymentScope, type X402PaymentScope } from '@/lib/api/x402/capabilityPayment';
import { getX402Config } from '@/lib/api/x402/config';
import { handlePaidPreTradeRequest, hasAuthCredentials, isPaidRequest } from '@/lib/api/x402/guard';

import type { z } from 'zod';

/** Next.js App Router route context (params are always a promise in v15+). */
export type PaidRouteContext = { params: Promise<Record<string, string>> };
export type PaidRouteMethod = (
  request: NextRequest,
  routeContext: PaidRouteContext
) => Promise<NextResponse>;

interface PaidRouteMethodOptions<T> {
  /** Canonical payment scope; must match this path's X402_REST_PAYMENT_SCOPE_BY_PATH entry. */
  scope: X402PaymentScope;
  /** Where the caller-supplied input lives: query string (GET) or JSON body (POST). */
  source: 'query' | 'body';
  /** Zod schema applied before execution (same schema the legacy path validates with). */
  schema: z.ZodType<T>;
  /** Validation-error label, verbatim: `Invalid ${inputLabel}`. */
  inputLabel: string;
  /** Body-source only: message when the payload is not valid JSON. */
  bodyParseError?: string;
  /** The guard/decision execution. Runs inside the paid settlement window. */
  execute: (input: T, requestId: string) => Promise<NextResponse>;
  /** The standard v1 middleware handler serving credentialed API-key callers. */
  fallback: PaidRouteMethod;
}

/**
 * Build one paid-or-legacy route method. Paid/keyless requests are validated
 * and executed inside `handlePaidPreTradeRequest` (payment settles only after
 * a complete result); API-key callers fall through to the standard path.
 */
export function createPaidRouteMethod<T>(options: PaidRouteMethodOptions<T>): PaidRouteMethod {
  return async (request: NextRequest, routeContext: PaidRouteContext): Promise<NextResponse> => {
    const config = x402ConfigForPaymentScope(getX402Config(), options.scope);
    if (config && (isPaidRequest(request) || !hasAuthCredentials(request))) {
      return handlePaidPreTradeRequest(request, config, async (requestId) => {
        let raw: unknown;
        if (options.source === 'body') {
          try {
            raw = await request.json();
          } catch {
            return NextResponse.json(
              ApiResponseBuilder.error(
                'VALIDATION_ERROR',
                options.bodyParseError ?? 'Expected a JSON request body',
                { requestId }
              ),
              { status: 400, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
            );
          }
        } else {
          raw = Object.fromEntries(request.nextUrl.searchParams.entries());
        }
        const parsed = options.schema.safeParse(raw);
        if (!parsed.success) {
          return NextResponse.json(
            ApiResponseBuilder.error('VALIDATION_ERROR', `Invalid ${options.inputLabel}`, {
              requestId,
              details: { issues: parsed.error.issues.map((issue) => issue.path.join('.')) },
            }),
            { status: 400, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
          );
        }
        return options.execute(parsed.data, requestId);
      });
    }
    return options.fallback(request, routeContext);
  };
}
