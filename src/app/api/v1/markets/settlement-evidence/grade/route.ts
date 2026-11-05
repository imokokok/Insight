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
import { buildOrFetchEvidencePackForSlug } from '@/lib/settlementEvidence/collector';

/** Fetching stored candles, consensus observations, and signing can take seconds. */
export const maxDuration = 30;
export const OPTIONS = createOptionsHandler();

const GradeBodySchema = z.object({
  slug: z.string().min(1).max(200),
});

/**
 * The declared outcome is NEVER accepted from the caller. A paid grade must
 * compare against Insight's own watch list — otherwise anyone could submit an
 * arbitrary declaration and buy a signature that "verifies" it. The caller
 * names the market; the declared side of the comparison is always
 * server-authoritative.
 */
const RIGHTS_NOTICE =
  'Derived analytics only. Settlement-window venue data is vendor-licensed for Insight’s internal analysis and is not redistributed.';

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

async function executeGrade(slug: string, requestId: string): Promise<NextResponse> {
  const result = await buildOrFetchEvidencePackForSlug(slug);

  if (result.status === 'not_found') {
    return errorResponse(
      'WATCH_MARKET_NOT_FOUND',
      'No watched market exists for this slug. Markets enter the watch list from the Polymarket price-contract pipeline before their window closes.',
      requestId,
      404
    );
  }
  if (result.status === 'too_early') {
    return errorResponse(
      'WINDOW_NOT_RESOLVED',
      'The market window has ended but the resolution grace period has not elapsed yet. Retry after the window has had time to resolve.',
      requestId,
      409
    );
  }
  if (result.status === 'unresolved') {
    return errorResponse(
      'MARKET_UNRESOLVED',
      'The market has no declared outcome yet; there is nothing to compare an independent outcome against.',
      requestId,
      409
    );
  }
  if (result.status === 'too_old') {
    return errorResponse(
      'WINDOW_TOO_OLD',
      'The settlement window is older than the candle source retains (~720 minutes); an on-demand pack can no longer be built without downgrading evidence quality.',
      requestId,
      410
    );
  }

  const cached = result.status === 'cached';
  return NextResponse.json(
    ApiResponseBuilder.success(
      {
        pack: result.pack,
        grade: cached ? result.pack.payload.grade : result.grade,
        attested: cached ? result.pack.attestation !== null : result.signed,
        cached,
        rightsNotice: RIGHTS_NOTICE,
      },
      { requestId, meta: { grade: cached ? result.pack.payload.grade : result.grade } }
    ),
    { headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
  );
}

const legacyPost = createApiHandler(
  async (request, context) => {
    const parsed = GradeBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Expected a JSON body: { "slug": "<market-slug>" }',
        context.requestId,
        400,
        { issues: parsed.error.issues.map((issue) => issue.path.join('.')) }
      );
    }
    return executeGrade(parsed.data.slug, context.requestId);
  },
  { middlewares: V1_STANDARD_MIDDLEWARES }
);

/**
 * Paid, idempotent, on-demand settlement evidence. API-key callers keep the
 * standard v1 middleware path; keyless requests use the registered x402
 * resource. The grade itself is chain-neutral (a prediction-market outcome),
 * so it quotes the merchant-configured payment rail rather than a chain-bound
 * realm — same treatment as the prediction guard.
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
        return errorResponse(
          'VALIDATION_ERROR',
          'Expected a JSON body: { "slug": "<market-slug>" }',
          requestId,
          400
        );
      }
      const parsed = GradeBodySchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(
          'VALIDATION_ERROR',
          'Expected a JSON body: { "slug": "<market-slug>" }',
          requestId,
          400,
          { issues: parsed.error.issues.map((issue) => issue.path.join('.')) }
        );
      }
      return executeGrade(parsed.data.slug, requestId);
    });
  }
  return legacyPost(request, routeContext);
};
