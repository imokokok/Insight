/**
 * Fetchable signed sample receipt (the "sample receipt" half of the published
 * attestation surface).
 *
 * Returns a freshly EIP-712 signed OracleSafetyCheck (schema v2) for a
 * representative pre-trade request, so an integrator can drop it straight into
 * their verifier (the verify endpoint, or the .well-known key document) without
 * first standing up a full pre-trade call. The receipt is signed live on each
 * request and is valid for V2_VALID_FOR_SECONDS from `checkedAt`, mirroring a
 * real production attestation.
 *
 * GET /api/v1/safety/attestation/sample
 *
 * If the platform attester key is unconfigured (e.g. local dev without
 * ATTESTATION_SIGNER_PRIVATE_KEY), returns 503 — there is no key to sign with,
 * and we never fabricate an unsigned "sample".
 */

import { type NextRequest, NextResponse } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  type ApiHandlerContext,
} from '@/lib/api/handler';
import { signAttestationV2 } from '@/lib/attestations/oracleSafetyAttestationV2';
import { buildSampleAttestationInput } from '@/lib/attestations/sampleOracleSafetyInput';

const PUBLIC_MIDDLEWARES = {
  logging: true,
  auth: false,
  rateLimit: { preset: 'lenient' as const },
  quota: true,
  cors: true,
};

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler<
  unknown,
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context: ApiHandlerContext<Record<string, unknown>>) => {
    const attestation = await signAttestationV2(buildSampleAttestationInput(Date.now()));

    if (!attestation) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'attestation_unavailable',
          'Insight attester key is not configured on this instance; no signed sample can be produced.'
        ),
        { status: 503 }
      );
    }

    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://www.oracleinsight.xyz'
        : 'http://localhost:3000');

    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          attestation,
          wellKnown: `${base}/.well-known/oracle-keys.json`,
          verify: `${base}/api/v1/safety/attestation/verify`,
          note: 'Freshly signed OracleSafetyCheck v2 for a representative ETH/USDC swap. Valid for V2_VALID_FOR_SECONDS from checkedAt. Verify it at the verify endpoint or against the .well-known key.',
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
  }
);
