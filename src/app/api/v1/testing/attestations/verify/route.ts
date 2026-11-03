/**
 * Public verification endpoint for Oracle Test Attestations.
 *
 * POST /api/v1/testing/attestations/verify
 * body: { "attestation": OracleTestAttestation }
 *   → recomputes the UID from the frozen v1 schema constants, recovers the
 *     signer, and checks the validity window. Unauthenticated by design —
 *     verification must be open so third parties can independently confirm an
 *     "Insight ran this scenario and got this verdict" claim.
 *
 * GET → the attester identity + schema descriptor, so verifiers know which
 *       address to trust and which domain/types to use.
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
  verifyTestAttestation,
  TEST_SCHEMA_VERSION,
  HARNESS_META,
} from '@/lib/testing/oracleScenario/attestation';
import type { OracleTestAttestation } from '@/lib/testing/oracleScenario/attestation';

const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

/** Permissive envelope: the attestation is an opaque signed object; the crypto
 *  layer re-derives the EIP-712 hash from the schema constants rather than
 *  trusting a client-supplied type layout. */
const VerifyBodySchema = z.object({
  attestation: z
    .object({
      uid: z.string(),
      schemaVersion: z.number(),
      attester: AddressSchema,
      attesterLabel: z.string(),
      signedAt: z.string(),
      validForSeconds: z.number(),
      data: z.record(z.string(), z.any()),
      eip712: z
        .object({
          domain: z.record(z.string(), z.any()),
          types: z.record(z.string(), z.any()),
          primaryType: z.string(),
        })
        .passthrough(),
      signature: z.string(),
      verifyUrl: z.string().optional(),
    })
    .passthrough(),
});

type VerifyBody = z.infer<typeof VerifyBodySchema>;

const PUBLIC_MIDDLEWARES = {
  logging: true,
  auth: false,
  rateLimit: { preset: 'lenient' as const },
  quota: true,
  cors: true,
};

export const OPTIONS = createOptionsHandler();

export const POST = createApiHandler<
  Awaited<ReturnType<typeof verifyTestAttestation>>,
  VerifyBody,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context: ApiHandlerContext<VerifyBody>) => {
    const body = context.validated!.body!;
    const verification = await verifyTestAttestation(
      body.attestation as unknown as OracleTestAttestation
    );

    // Cryptographic self-consistency is not issuer authenticity: require the
    // recovered signer to be Insight's published attester.
    if (verification.valid && verification.attester) {
      const attester = await getAttesterAddress();
      if (!attester || attester.toLowerCase() !== verification.attester.toLowerCase()) {
        return NextResponse.json(
          ApiResponseBuilder.success(
            {
              ...verification,
              valid: false,
              reason: 'untrusted_attester: signer is not Insight\u2019s published attester',
            },
            {
              requestId: context.requestId,
              meta: { valid: false, expired: verification.expired },
            }
          )
        );
      }
    }

    return NextResponse.json(
      ApiResponseBuilder.success(verification, {
        requestId: context.requestId,
        meta: {
          valid: verification.valid,
          expired: verification.expired,
          schemaVersion: TEST_SCHEMA_VERSION,
        },
      })
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
    validation: { body: VerifyBodySchema },
  }
);

export const GET = createApiHandler<
  { attester: string | null; attestationEnabled: boolean; harness: typeof HARNESS_META },
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context) => {
    const attester = await getAttesterAddress();
    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          attester,
          attestationEnabled: attester !== null,
          harness: HARNESS_META,
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
  }
);
