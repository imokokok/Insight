import { type NextRequest, NextResponse } from 'next/server';

import { enforceCapabilityRateLimit } from '@/lib/api/capabilityRateLimit';
import { ApiResponseBuilder, createOptionsHandler } from '@/lib/api/handler';
import {
  parseLimitedJson,
  RequestBodyTooLargeError,
  requestBodyTooLargeResponse,
} from '@/lib/api/requestLimits';
import {
  lifecycleErrorResponse,
  requireBearerToken,
} from '@/lib/api/services/positionLifecycleHttp';
import { issueBundledReceipt } from '@/lib/api/services/positionLifecycleService';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { ExecutionReceiptIssueBodySchema } from '@/lib/execution/issueSchema';

/**
 * Issue the bundled execution receipt, authenticated by the one-time lifecycle
 * token returned at purchase (`Authorization: Bearer plc_<hex>`). The body is
 * identical to the native /api/v1/execution/attestation/issue body — the
 * receipt binds to the caller's own pre-trade attestations exactly as it does
 * à la carte; the bundle only changes who pays. The single credit is consumed
 * only by a successfully recorded issuance.
 */

export const maxDuration = 60;
export const OPTIONS = createOptionsHandler();

/** Issue the bundled attested execution receipt (one per lifecycle). */
export const POST = async (
  request: NextRequest,
  routeContext: { params: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const requestId = request.headers.get('x-request-id') ?? undefined;
  const rateLimitResponse = await enforceCapabilityRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;
  const { lifecycleId } = await routeContext.params;
  try {
    const token = requireBearerToken(request);
    let body: unknown;
    try {
      body = await parseLimitedJson(request);
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        return requestBodyTooLargeResponse(undefined, requestId);
      }
      return NextResponse.json(
        ApiResponseBuilder.error(
          'VALIDATION_ERROR',
          'Expected the native execution-receipt issue body (see POST /api/v1/execution/attestation/issue)',
          { requestId }
        ),
        { status: 400, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
      );
    }
    const parsed = ExecutionReceiptIssueBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ApiResponseBuilder.error('VALIDATION_ERROR', 'Invalid execution-receipt issue body', {
          requestId,
          details: { issues: parsed.error.issues.map((issue) => issue.path.join('.')) },
        }),
        { status: 400, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
      );
    }
    const result = await issueBundledReceipt(lifecycleId, token, parsed.data);
    return NextResponse.json(
      ApiResponseBuilder.success(result, {
        requestId,
        meta: {
          receiptUid: result.receipt.uid,
          fillStatus: result.receipt.data.fillStatus,
        },
      }),
      { headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
    );
  } catch (error) {
    const mapped = lifecycleErrorResponse(error, requestId);
    if (mapped) return mapped;
    // Issuer failures carry their own caller-branchable code and status.
    const coded = error as { code?: string; status?: number; message?: string };
    if (typeof coded.code === 'string' && typeof coded.status === 'number') {
      return NextResponse.json(
        ApiResponseBuilder.error(coded.code, coded.message ?? 'Receipt issuance failed', {
          requestId,
        }),
        { status: coded.status, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
      );
    }
    throw error;
  }
};
