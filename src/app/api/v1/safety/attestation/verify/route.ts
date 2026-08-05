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
 * body: { "attestation": OracleSafetyAttestation | OracleSafetyAttestationV2 }
 *
 * The endpoint routes by the attestation's top-level `schemaVersion`:
 *   - v1 (schemaVersion=1) → v1 domain/types (11 signed fields)
 *   - v2 (schemaVersion=2) → v2 domain/types (26 signed fields, CAIP-19 pair
 *     binding, requestHash, providerObservationsHash, quorum gate)
 * v1 and v2 use different EIP-712 domain `version` strings ('1' vs '2'), so
 * selecting the wrong domain would fail signature recovery. The attestation's
 * own `schemaVersion` is the authoritative router — the embedded `eip712`
 * block is informational only (the crypto layer re-derives from the schema
 * constants, never trusts the client-supplied domain).
 *
 * GET  /api/v1/safety/attestation/verify  → returns the attester identity + both schemas
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
  CANONICAL_REQUEST_DOMAIN,
  CANONICAL_REQUEST_TYPES,
  CANONICAL_REQUEST_PRIMARY_TYPE,
} from '@/lib/attestations/canonicalRequestHash';
import {
  verifyAttestation,
  getAttesterAddress,
  ATTESTATION_DOMAIN,
  ATTESTATION_TYPES,
  ATTESTATION_PRIMARY_TYPE,
  ATTESTATION_SCHEMA_VERSION,
  ATTESTER_LABEL,
  type OracleSafetyAttestation,
} from '@/lib/attestations/oracleSafetyAttestation';
import {
  verifyAttestationV2,
  V2_DOMAIN,
  V2_TYPES,
  V2_PRIMARY_TYPE,
  V2_SCHEMA_VERSION,
  type OracleSafetyAttestationV2,
} from '@/lib/attestations/oracleSafetyAttestationV2';

/** Ethereum address (0x + 40 hex). Validated lightly here; the EIP-712 crypto
 *  layer is the real authority on whether the signature is genuine. */
const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

/**
 * Permissive body schema: the attestation is an opaque, signed object, so we
 * only enforce the top-level envelope shape and leave signature/EIP-712
 * verification to the crypto layer. `data` is intentionally a loose record —
 * v1 carries 11 number fields, v2 carries 26 (numbers + 0x-prefixed hash
 * strings), and the crypto layer re-derives the hash from the schema constants
 * rather than trusting a client-supplied type layout. A malformed attestation
 * returns `valid: false`, not a 400, so callers can distinguish "bad
 * signature" from "bad request".
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
      /** v2 carries an explicit top-level validity deadline; v1 derives it
       *  from checkedAt + validForSeconds. Optional so v1 attestations pass. */
      validUntil: z.number().optional(),
    })
    .passthrough(),
});

type VerifyBody = z.infer<typeof VerifyBodySchema>;

/**
 * Unified verification result — a superset of the v1 and v2 verifier outputs
 * so callers get one stable shape regardless of schemaVersion. `schemaVersion`
 * tells them which domain/types were used; `ageSeconds` is v1-only,
 * `validUntil` is v2-only (null on the other branch).
 */
export interface UnifiedVerificationResult {
  valid: boolean;
  attester: string;
  uid: string | null;
  checkedAt: number | null;
  /** v2 explicit deadline (checkedAt + validForSeconds). null for v1. */
  validUntil: number | null;
  /** v1 age-since-checkedAt. null for v2. */
  ageSeconds: number | null;
  expired: boolean;
  schemaVersion: number;
  reason?: string;
}

/**
 * Route an attestation to its schema-versioned verifier. v1 → v1 domain/types,
 * v2 → v2 domain/types. Extracted as a pure, exported helper so the routing
 * decision (and the v1/v2 result normalization) is unit-testable without the
 * API middleware stack.
 *
 * Unknown schema versions return an invalid result rather than throwing, so
 * the public endpoint can respond with a structured `valid: false` payload.
 */
export async function verifyAttestationBySchema(
  attestation: VerifyBody['attestation']
): Promise<UnifiedVerificationResult> {
  const schemaVersion = attestation.schemaVersion;

  if (schemaVersion === V2_SCHEMA_VERSION) {
    const v2 = await verifyAttestationV2(attestation as unknown as OracleSafetyAttestationV2);
    return {
      valid: v2.valid,
      attester: v2.attester,
      uid: v2.uid,
      checkedAt: v2.checkedAt,
      validUntil: v2.validUntil,
      ageSeconds: null,
      expired: v2.expired,
      schemaVersion: V2_SCHEMA_VERSION,
      reason: v2.reason,
    };
  }

  if (schemaVersion === ATTESTATION_SCHEMA_VERSION) {
    const v1 = await verifyAttestation(attestation as unknown as OracleSafetyAttestation);
    return {
      valid: v1.valid,
      attester: v1.attester,
      uid: v1.uid,
      checkedAt: v1.checkedAt,
      // v1 has no explicit validUntil field; derive it for the unified shape.
      validUntil: v1.checkedAt !== null ? v1.checkedAt + attestation.validForSeconds : null,
      ageSeconds: v1.ageSeconds,
      expired: v1.expired,
      schemaVersion: ATTESTATION_SCHEMA_VERSION,
      reason: v1.reason,
    };
  }

  return {
    valid: false,
    attester: attestation.attester,
    uid: attestation.uid ?? null,
    checkedAt: null,
    validUntil: null,
    ageSeconds: null,
    expired: false,
    schemaVersion,
    reason: `Unsupported schemaVersion ${schemaVersion}; supported: 1 (v1), 2 (v2).`,
  };
}

/** Loose EIP-712 domain/type shape for the informational GET response. v1 and
 *  v2 domains differ only in the `version` literal ('1' vs '2'); widening to
 *  string avoids friction between the two `as const` literal types while
 *  remaining accurate for a JSON schema descriptor. */
interface Eip712Descriptor {
  domain: { name: string; version: string; chainId: number };
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
}

interface SchemaDescriptor {
  schemaVersion: number;
  eip712: Eip712Descriptor;
}

interface AttestationStatus {
  attester: string | null;
  attesterLabel: string;
  attestationEnabled: boolean;
  /** Latest schema version this endpoint can verify (currently v2). */
  latestSchemaVersion: number;
  /** Top-level fields mirror v1 for backward compatibility with consumers
   *  that hit GET before v2 shipped. New consumers should read `schemas`. */
  schemaVersion: number;
  eip712: Eip712Descriptor;
  /** Per-version schema descriptors — lets verifiers pick the right domain +
   *  type layout for the attestation they hold. */
  schemas: {
    1: SchemaDescriptor;
    2: SchemaDescriptor & {
      canonicalRequest: Eip712Descriptor;
    };
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
  UnifiedVerificationResult,
  VerifyBody,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context: ApiHandlerContext<VerifyBody>) => {
    const body = context.validated!.body!;
    // `passthrough()` + JSON round-trip yields a plain object; the routing
    // helper casts through unknown to the typed v1/v2 shape. The crypto layer
    // re-derives the EIP-712 hash from the schema constants and verifies the
    // signature, so a structurally-invalid payload can't forge a valid
    // attestation — it just returns valid:false.
    const verification = await verifyAttestationBySchema(body.attestation);

    return NextResponse.json(
      ApiResponseBuilder.success(verification, {
        requestId: context.requestId,
        meta: {
          valid: verification.valid,
          expired: verification.expired,
          schemaVersion: verification.schemaVersion,
        },
      })
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
    validation: { body: VerifyBodySchema },
  }
);

// GET returns the attester identity + both schema descriptors, so verifiers
// know which address to trust and which domain/types to use for each version.
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
          latestSchemaVersion: V2_SCHEMA_VERSION,
          // Backward-compat top-level fields (v1). New consumers use `schemas`.
          schemaVersion: ATTESTATION_SCHEMA_VERSION,
          eip712: {
            domain: ATTESTATION_DOMAIN,
            types: ATTESTATION_TYPES,
            primaryType: ATTESTATION_PRIMARY_TYPE,
          },
          schemas: {
            1: {
              schemaVersion: ATTESTATION_SCHEMA_VERSION,
              eip712: {
                domain: ATTESTATION_DOMAIN,
                types: ATTESTATION_TYPES,
                primaryType: ATTESTATION_PRIMARY_TYPE,
              },
            },
            2: {
              schemaVersion: V2_SCHEMA_VERSION,
              eip712: {
                domain: V2_DOMAIN,
                types: V2_TYPES,
                primaryType: V2_PRIMARY_TYPE,
              },
              canonicalRequest: {
                domain: CANONICAL_REQUEST_DOMAIN,
                types: CANONICAL_REQUEST_TYPES,
                primaryType: CANONICAL_REQUEST_PRIMARY_TYPE,
              },
            },
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
