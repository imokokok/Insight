import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { x402ConfigForPaymentScope, X402_PAYMENT_SCOPE } from '@/lib/api/x402/capabilityPayment';
import { getX402Config } from '@/lib/api/x402/config';
import { handlePaidPreTradeRequest, hasAuthCredentials, isPaidRequest } from '@/lib/api/x402/guard';
import { buildOracleConfigSnapshotPack } from '@/lib/oracleConfigSnapshot/service';

export const maxDuration = 30;
export const OPTIONS = createOptionsHandler();

/**
 * `.strict()` is deliberate. A caller may name a configuration but must never
 * supply its own feed list, parameters, source claims or declared outcome.
 * Everything observable is read server-side from the live feed registry, the
 * Chainlink feed config and the reviewed-profile registry.
 */
const SnapshotBodySchema = z
  .object({
    chainId: z.number().int().positive().max(2_147_483_647),
    protocolId: z.string().min(1).max(120),
    assetSymbol: z.string().min(1).max(40),
  })
  .strict();

const ADVISORY_NOTICE =
  'Advisory record only. This document states observable configuration and independent-source state at a point in time. It is NOT a safety assessment, does not assert that a configuration is safe or unsafe, and does not recommend parameter changes. Derived analytics only.';

function errorResponse(
  code: string,
  message: string,
  requestId: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    ApiResponseBuilder.error(code, message, { requestId, ...(details ? { details } : {}) }),
    { status, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
  );
}

async function executeSnapshot(
  body: z.infer<typeof SnapshotBodySchema>,
  requestId: string
): Promise<NextResponse> {
  const pack = await buildOracleConfigSnapshotPack({
    chainId: body.chainId,
    protocolId: body.protocolId,
    assetSymbol: body.assetSymbol.toUpperCase(),
  });

  return NextResponse.json(
    ApiResponseBuilder.success(
      {
        snapshot: pack,
        attested: pack.attestation !== null,
        idempotent: true,
        advisory: true,
        rightsNotice: ADVISORY_NOTICE,
      },
      {
        requestId,
        meta: { gateResult: pack.payload.gateResult, configHash: pack.payload.configHash },
      }
    ),
    { headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
  );
}

function validationError(requestId: string, issues?: string[]): NextResponse {
  return errorResponse(
    'VALIDATION_ERROR',
    'Expected a strict JSON body: { "chainId": <int>, "protocolId": "<id>", "assetSymbol": "<symbol>" }. Caller-supplied configuration or source claims are rejected.',
    requestId,
    400,
    issues ? { issues } : undefined
  );
}

const legacyPost = createApiHandler(
  async (request, context) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError(context.requestId);
    }
    const parsed = SnapshotBodySchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        context.requestId,
        parsed.error.issues.map((issue) => issue.path.join('.'))
      );
    }
    return executeSnapshot(parsed.data, context.requestId);
  },
  { middlewares: V1_STANDARD_MIDDLEWARES }
);

/**
 * Paid, idempotent, on-demand oracle config snapshot. API-key callers keep the
 * standard v1 middleware path; keyless requests use the registered x402
 * resource. The record is chain-neutral (an observation, not an execution),
 * so it quotes the merchant-configured payment rail.
 */
export const POST = async (
  request: NextRequest,
  routeContext: { params: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const config = x402ConfigForPaymentScope(getX402Config(), X402_PAYMENT_SCOPE.configured);
  if (config && (isPaidRequest(request) || !hasAuthCredentials(request))) {
    return handlePaidPreTradeRequest(request, config, async (requestId) => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return validationError(requestId);
      }
      const parsed = SnapshotBodySchema.safeParse(body);
      if (!parsed.success) {
        return validationError(
          requestId,
          parsed.error.issues.map((issue) => issue.path.join('.'))
        );
      }
      return executeSnapshot(parsed.data, requestId);
    });
  }
  return legacyPost(request, routeContext);
};
