import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler, createOptionsHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { getIncidentAggregation } from '@/lib/api/services/incidentService';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { SafeProviderSchema } from '@/lib/security/validation';
import { get7dAgoUtc, getTodayUtc } from '@/lib/utils/date';

/**
 * Public-tier limits for anonymous callers. Incident aggregation is the
 * storefront of Oracle Evidence: when an industry oracle incident happens,
 * researchers, affected protocols and journalists look for "what actually
 * happened to the feed" first, and that is exactly when credibility is won.
 * Gating the aggregate behind a paying key would lock the credit engine's
 * own storefront during its highest-visibility hours. Deeper reads (long
 * windows, deep paging) keep the authenticated path so the free tier cannot
 * become a free data-warehouse.
 */
const PUBLIC_TIER_MAX_WINDOW_DAYS = 30;
const PUBLIC_TIER_MAX_LIMIT = 50;
const PUBLIC_TIER_MAX_OFFSET = 200;

/** Presence of a credential header opts the caller into the full query space.
 *  Validation of the credential itself is the auth middleware's job; this gate
 *  only separates anonymous discovery from metered depth. */
function hasApiCredential(request: NextRequest): boolean {
  return Boolean(request.headers.get('x-api-key') ?? request.headers.get('authorization'));
}

const IncidentsQuerySchema = z.object({
  provider: SafeProviderSchema.optional(),
  minSeverity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

/** Machine-readable pointers from an aggregate to the verifiable inputs
 *  behind it. Aggregates are derived observations, not conclusions: the
 *  response deliberately carries no attribution or root-cause claim. */
function evidenceBlock() {
  return {
    disclosure:
      'These aggregates are derived from Insight observation records (feed health and provider deviation telemetry). They describe what was observed, not why it happened.',
    corpus: {
      repository: 'https://github.com/imokokok/oracle-incident-corpus',
      verification:
        'Clone the repository and run `node verify-corpus.mjs`: an Ed25519 attestation pins the exact bytes of the incident corpus (any later change invalidates it by design; corpus changes require re-signing).',
      trustRoot:
        'Self-issued attestation. The bundled issuer-public.pem is the trust root: the signature proves the corpus is unchanged since signing, not who the signer is.',
    },
    settlementEvidence: {
      endpoint: '/api/v1/markets/settlement-evidence',
      note: 'Signed settlement-evidence packs (EIP-712, verifiable against the published attester) for prediction-market resolution windows.',
    },
    attestation: {
      endpoint: '/api/v1/execution/attestation/verify',
      note: 'Cryptographic verification for signed decision-input attestations.',
    },
  };
}

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (request: NextRequest, context) => {
    const { provider, minSeverity, from, to, limit, offset } = context.validated!.query!;

    // Public tier: anonymous callers get a 30-day window, compact pages and
    // shallow paging; deeper reads require a credential.
    if (!hasApiCredential(request)) {
      const windowDays = Math.round(
        (Date.parse(`${to ?? getTodayUtc()}T00:00:00Z`) -
          Date.parse(`${from ?? get7dAgoUtc()}T00:00:00Z`)) /
          86_400_000
      );
      if (
        windowDays > PUBLIC_TIER_MAX_WINDOW_DAYS ||
        limit > PUBLIC_TIER_MAX_LIMIT ||
        offset > PUBLIC_TIER_MAX_OFFSET
      ) {
        return NextResponse.json(
          ApiResponseBuilder.error(
            'UNAUTHORIZED',
            `Anonymous access is capped at a ${PUBLIC_TIER_MAX_WINDOW_DAYS}-day window, ${PUBLIC_TIER_MAX_LIMIT} results and offset ${PUBLIC_TIER_MAX_OFFSET}. Provide an API key for full-depth incident queries.`,
            {
              details: {
                publicTierLimits: {
                  windowDays: PUBLIC_TIER_MAX_WINDOW_DAYS,
                  limit: PUBLIC_TIER_MAX_LIMIT,
                  offset: PUBLIC_TIER_MAX_OFFSET,
                },
                upgradeHint:
                  'Provide an API key (x-api-key header) for windows up to any range and pages up to 200.',
                requested: { windowDays, limit, offset },
              },
            }
          ),
          { status: 401 }
        );
      }
    }

    const result = await getIncidentAggregation({
      from: from ?? get7dAgoUtc(),
      to: to ?? getTodayUtc(),
      provider,
      minSeverity,
      limit,
      offset,
    });

    return createCachedJsonResponse(
      ApiResponseBuilder.success(
        { ...result, evidence: evidenceBlock() },
        {
          requestId: context.requestId,
        }
      ),
      { preset: 'semiStatic' }
    );
  },
  {
    // Aggregation over our own observation records is the public discovery
    // surface of Oracle Evidence; long windows and deep paging stay
    // credential-gated above.
    middlewares: {
      logging: true,
      auth: { required: false },
      rateLimit: { preset: 'moderate' },
      cors: true,
    },
    validation: { query: IncidentsQuerySchema },
  }
);
