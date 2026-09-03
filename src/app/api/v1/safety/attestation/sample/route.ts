/**
 * Fetchable signed sample receipt (the "sample receipt" half of the published
 * attestation surface).
 *
 * Returns a freshly EIP-712 signed OracleSafetyCheck (schema v3) for a
 * representative pre-trade request, so an integrator can drop it straight into
 * their verifier (the verify endpoint, or the .well-known key document) without
 * first standing up a full pre-trade call. The receipt is signed live on each
 * request and is valid for V3_VALID_FOR_SECONDS from `checkedAt`, mirroring a
 * real production attestation.
 *
 * GET /api/v1/safety/attestation/sample
 *
 * Signed by the DEDICATED sample signer (registry role "sample"), never the
 * production attester (Headless H8). If that key is unconfigured, returns 503
 * — fail-closed beats a mislabeled signature, and there is no fallback to the
 * production key and no unsigned "sample".
 *
 * Schema note (ZAP1 pilot 2026-09-03): this route serves the ACTIVE registry
 * contract. The registry head declares OracleSafetyCheck v3 (27 fields, domain
 * version 3) with the v2 alias retiredForSigning, so the sample signs v3. The
 * signed artifact binding this state to the registry hashes is published at
 * /.well-known/oracle-registry-status.json.
 */

import { type NextRequest, NextResponse } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  type ApiHandlerContext,
} from '@/lib/api/handler';
import { signAttestationV3 } from '@/lib/attestations/oracleSafetyAttestationV3';
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
    // H8: signed with the DEDICATED sample signer (registry role "sample"),
    // never the production attester; 503 when the sample key is unconfigured.
    const attestation = await signAttestationV3(buildSampleAttestationInput(Date.now()), {
      sample: true,
    });

    if (!attestation) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'attestation_unavailable',
          'Dedicated sample signer key is not configured on this instance; no signed sample can be produced. The production attester key never signs samples (Headless H8).'
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
          note: 'Freshly signed OracleSafetyCheck v3 (the active registry contract; v2 is retired for signing) for a representative ETH/USDC swap, signed by the dedicated SAMPLE signer (.well-known registry, role "sample"). Valid for V3_VALID_FOR_SECONDS from checkedAt. Verify it at the verify endpoint or against the .well-known key; never treat it as evidence of a real trade.',
          registryStatus: `${base}/.well-known/oracle-registry-status.json`,
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
  }
);
