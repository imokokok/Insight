/**
 * Public attestation verification endpoint.
 *
 * Anyone can POST a pre-trade safety attestation here to verify the EIP-712
 * signature is genuine and was issued by Insight's attester, and that the
 * attestation is still within its validity window. This is intentionally
 * UNAUTHENTICATED (Tier 0) — verification must be open so third parties
 * (protocols, explorers, users, other agents) can independently confirm an
 * agent's "I ran the oracle immune-system check" claim.
 *
 * POST /api/v1/safety/attestation/verify
 * body: { "attestation": OracleSafetyAttestation }
 *
 * GET  /api/v1/safety/attestation/verify  → returns the attester identity + schema
 */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  type ApiHandlerContext,
} from '@/lib/api/handler';
import {
  verifyAttestation,
  getAttesterAddress,
  ATTESTATION_DOMAIN,
  ATTESTATION_TYPES,
  ATTESTATION_PRIMARY_TYPE,
  ATTESTATION_SCHEMA_VERSION,
  ATTESTER_LABEL,
  type OracleSafetyAttestation,
  type VerificationResult,
} from '@/lib/attestations/oracleSafetyAttestation';

/** Ethereum address (0x + 40 hex). Validated lightly here; the EIP-712 crypto
 *  layer is the real authority on whether the signature is genuine. */
const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

/**
 * Permissive body schema: the attestation is an opaque, signed object, so we
 * only enforce the top-level shape and leave signature/EIP-712 verification to
 * the crypto layer. A malformed attestation returns `valid: false`, not a 400,
 * so callers can distinguish "bad signature" from "bad request".
 */
const VerifyBodySchema = z.object({
  attestation: z
    .object({
      uid: z.string(),
      schemaVersion: z.number(),
      attester: AddressSchema,
      attesterLabel: z.string(),
      signedAt: z.string(),
      validForSeconds: z.number(),
      data: z.object({
        verdict: z.string(),
        asset: z.string(),
        chainId: z.number(),
        action: z.string(),
        tradeAmountUsd: z.number(),
        consensusPrice: z.number(),
        maxDeviationBps: z.number(),
        manipulationRiskBps: z.number(),
        participantCount: z.number(),
        checkedAt: z.number(),
        schemaVersion: z.number(),
      }),
      eip712: z.object({
        domain: z.record(z.string(), z.any()),
        types: z.record(z.string(), z.any()),
        primaryType: z.string(),
      }),
      signature: z.string(),
      verifyUrl: z.string().optional(),
    })
    .passthrough(),
});

type VerifyBody = z.infer<typeof VerifyBodySchema>;

interface AttestationStatus {
  attester: string | null;
  attesterLabel: string;
  attestationEnabled: boolean;
  schemaVersion: number;
  eip712: {
    domain: typeof ATTESTATION_DOMAIN;
    types: typeof ATTESTATION_TYPES;
    primaryType: typeof ATTESTATION_PRIMARY_TYPE;
  };
}

const PUBLIC_MIDDLEWARES = {
  logging: true,
  auth: false,
  rateLimit: { preset: 'lenient' as const },
  quota: true,
  cors: true,
};

export const OPTIONS = createOptionsHandler();

export const POST = createApiHandler<
  VerificationResult,
  VerifyBody,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context: ApiHandlerContext<VerifyBody>) => {
    const body = context.validated!.body!;
    // `passthrough()` + JSON round-trip yields a plain object; cast through
    // unknown to the typed shape. The crypto layer re-derives the EIP-712 hash
    // and verifies the signature, so a structurally-invalid payload can't forge
    // a valid attestation — it just returns valid:false.
    const attestation = body.attestation as unknown as OracleSafetyAttestation;

    const verification = await verifyAttestation(attestation);

    return NextResponse.json(
      ApiResponseBuilder.success(verification, {
        requestId: context.requestId,
        meta: { valid: verification.valid, expired: verification.expired },
      })
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
    validation: { body: VerifyBodySchema },
  }
);

// GET returns the attester identity + schema, so verifiers know which address to
// trust and what the attestation looks like. Useful for explorers / docs.
export const GET = createApiHandler<
  AttestationStatus,
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
          attesterLabel: ATTESTER_LABEL,
          attestationEnabled: attester !== null,
          schemaVersion: ATTESTATION_SCHEMA_VERSION,
          eip712: {
            domain: ATTESTATION_DOMAIN,
            types: ATTESTATION_TYPES,
            primaryType: ATTESTATION_PRIMARY_TYPE,
          },
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
  }
);
