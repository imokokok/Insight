/**
 * Public verification endpoint for signed decision-input assessments.
 *
 * POST body: { "assessment": <decisionInputAssessment from the pre-trade response> }
 * The verifier removes the nested signature envelope, recomputes the digest
 * from the remaining assessment JSON, and verifies the frozen EIP-712 schema.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  type ApiHandlerContext,
} from '@/lib/api/handler';
import { getAttesterAddress } from '@/lib/attestations/attesterAccount';
import {
  DECISION_INPUT_ATTESTATION_META,
  isPublishedDecisionInputAttester,
  verifyDecisionInputAssessment,
} from '@/lib/decisionInputTrust/attestation';
import { nowInSeconds } from '@/lib/utils/time';

const VerifyBodySchema = z
  .object({
    assessment: z.record(z.string(), z.any()),
  })
  .strict();

type VerifyBody = z.infer<typeof VerifyBodySchema>;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

const PUBLIC_MIDDLEWARES = {
  logging: true,
  auth: false,
  rateLimit: { preset: 'lenient' as const },
  quota: true,
  cors: true,
};

export const OPTIONS = createOptionsHandler();

export const POST = createApiHandler<
  Awaited<ReturnType<typeof verifyDecisionInputAssessment>>,
  VerifyBody,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context: ApiHandlerContext<VerifyBody>) => {
    const result = await verifyDecisionInputAssessment(context.validated!.body!.assessment);
    return NextResponse.json(
      ApiResponseBuilder.success(result, {
        requestId: context.requestId,
        meta: {
          valid: result.valid,
          expired: result.expired,
          schemaVersion: DECISION_INPUT_ATTESTATION_META.schemaVersion,
        },
      }),
      { headers: NO_STORE_HEADERS }
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
    validation: { body: VerifyBodySchema },
  }
);

export const GET = createApiHandler<
  {
    attester: string | null;
    attestationEnabled: boolean;
    attestationStatus: 'UNCONFIGURED' | 'READY' | 'UNTRUSTED_SIGNER';
    descriptor: typeof DECISION_INPUT_ATTESTATION_META;
  },
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request, context) => {
    const attester = await getAttesterAddress();
    const attestationEnabled =
      attester !== null && (await isPublishedDecisionInputAttester(attester, nowInSeconds()));
    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          attester,
          attestationEnabled,
          attestationStatus:
            attester === null ? 'UNCONFIGURED' : attestationEnabled ? 'READY' : 'UNTRUSTED_SIGNER',
          descriptor: DECISION_INPUT_ATTESTATION_META,
        },
        { requestId: context.requestId }
      ),
      { headers: NO_STORE_HEADERS }
    );
  },
  { middlewares: PUBLIC_MIDDLEWARES }
);
