import { type NextRequest, NextResponse } from 'next/server';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { getEvidencePack, listEvidencePacks } from '@/lib/settlementEvidence/repository';

export const OPTIONS = createOptionsHandler();

/**
 * Signed prediction-market settlement evidence.
 *
 * `GET /api/v1/markets/settlement-evidence?slug=<market-slug>` returns one
 * pack; without `slug` it returns the most recent packs. Every pack carries
 * derived analytics only — the raw settlement-window candles stay internal
 * because their source (Kraken) is vendor-licensed derived-analytics-only.
 * A pack's `attestation` block contains the EIP-712 domain, primary type and
 * signature needed to verify it against Insight's published attester.
 */
export const GET = createApiHandler(
  async (request: NextRequest, context) => {
    const slug = request.nextUrl.searchParams.get('slug')?.trim();
    try {
      if (slug) {
        const pack = await getEvidencePack(slug);
        if (!pack) {
          return NextResponse.json(
            ApiResponseBuilder.error(
              'EVIDENCE_NOT_FOUND',
              `No settlement-evidence pack exists for this market. Packs are produced after a market resolves.`
            ),
            { status: 404 }
          );
        }
        return createCachedJsonResponse(
          ApiResponseBuilder.success(
            {
              pack,
              rightsNotice:
                'Derived analytics only. Settlement-window venue data is vendor-licensed for Insight’s internal analysis and is not redistributed.',
              requestId: context.requestId,
            },
            { requestId: context.requestId }
          ),
          { preset: 'realtime' }
        );
      }

      const limit = Number(request.nextUrl.searchParams.get('limit') ?? '20');
      const packs = await listEvidencePacks(Number.isFinite(limit) ? limit : 20);
      return createCachedJsonResponse(
        ApiResponseBuilder.success(
          {
            packs,
            count: packs.length,
            rightsNotice:
              'Derived analytics only. Settlement-window venue data is vendor-licensed for Insight’s internal analysis and is not redistributed.',
            requestId: context.requestId,
          },
          { requestId: context.requestId }
        ),
        { preset: 'realtime' }
      );
    } catch {
      // A missing Turso config or an unavailable database is an infrastructure
      // state, not an empty result — fail closed with 503.
      return NextResponse.json(
        ApiResponseBuilder.error(
          'SETTLEMENT_EVIDENCE_UNAVAILABLE',
          'Settlement evidence is temporarily unavailable.',
          { retryable: true, requestId: context.requestId }
        ),
        { status: 503 }
      );
    }
  },
  { middlewares: V1_READ_ONLY_MIDDLEWARES }
);
