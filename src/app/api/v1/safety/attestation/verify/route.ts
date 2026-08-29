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
  buildKeyRegistryConfig,
  isAttestationKeyValid,
} from '@/lib/attestations/keyRegistryConfig';
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
import {
  verifyAttestationV3,
  V3_DOMAIN,
  V3_TYPES,
  V3_PRIMARY_TYPE,
  V3_SCHEMA_VERSION,
  type OracleSafetyAttestationV3,
} from '@/lib/attestations/oracleSafetyAttestationV3';
import {
  verifyRecheck,
  RECHECK_DOMAIN,
  RECHECK_TYPES,
  RECHECK_PRIMARY_TYPE,
  RECHECK_TYPE,
  type OracleSafetyRecheck,
} from '@/lib/attestations/oracleSafetyRecheck';
import {
  verifyRecheckV3,
  RECHECK_V3_DOMAIN,
  RECHECK_V3_TYPES,
  RECHECK_V3_PRIMARY_TYPE,
  type OracleSafetyRecheckV3,
} from '@/lib/attestations/oracleSafetyRecheckV3';

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
 * Core fields shared by every verifier's result (v1 / v2 / recheck). Each
 * verifier returns this 6-key core plus ONE schema-specific field: v1 carries
 * `ageSeconds`, v2 + recheck carry `validUntil`. {@link toUnified} folds that
 * into the 9-key {@link UnifiedVerificationResult} so the three branches in
 * `verifyAttestationBySchema` stay byte-identical while the shape lives in one
 * place (category B — collapse repetition).
 */
type CoreVerificationResult = {
  valid: boolean;
  attester: string;
  uid: string | null;
  checkedAt: number | null;
  expired: boolean;
  reason?: string;
};

/**
 * Map a verifier's raw result + schema version into the unified shape. The one
 * field each verifier doesn't natively carry is passed via `overrides`:
 *   - v1          → validUntil derived from checkedAt + validForSeconds, ageSeconds from result
 *   - v2 / recheck → validUntil from result, ageSeconds forced to null
 * Public signature of `verifyAttestationBySchema` is unchanged; this is a pure
 * internal mapper — no behavior shift, only one literal to maintain.
 */
function toUnified(
  result: CoreVerificationResult,
  schemaVersion: number,
  overrides: { validUntil: number | null; ageSeconds: number | null }
): UnifiedVerificationResult {
  return {
    valid: result.valid,
    attester: result.attester,
    uid: result.uid,
    checkedAt: result.checkedAt,
    validUntil: overrides.validUntil,
    ageSeconds: overrides.ageSeconds,
    expired: result.expired,
    schemaVersion,
    reason: result.reason,
  };
}

/**
 * Route an attestation to its schema-versioned verifier:
 *   - v1 (schemaVersion=1)                 → v1 domain/types (11 fields)
 *   - v2 OracleSafetyCheck (schemaVersion=2, primaryType 'OracleSafetyCheck')
 *                                          → v2 domain/types (26 fields)
 *   - v2 OracleSafetyRecheck (schemaVersion=2, primaryType 'OracleSafetyRecheck')
 *                                          → recheck domain/types (28 fields)
 *   - v3 OracleSafetyCheck (schemaVersion=3, primaryType 'OracleSafetyCheck')
 *                                          → v3 domain/types (27 fields = v2's
 *                                            26 + the signed independence
 *                                            threshold)
 *   - v3 OracleSafetyRecheck (schemaVersion=3, primaryType 'OracleSafetyRecheck')
 *                                          → v3 recheck domain/types (29 fields)
 *
 * The recheck carries schemaVersion=2 (v2 family) but a distinct primaryType,
 * so it MUST be routed before the plain-v2 branch — otherwise it would be
 * verified against the 26-field type (ignoring originalUid + originalRequestHash)
 * and always fail UID recovery. Extracted as a pure, exported helper so the
 * routing decision is unit-testable without the API middleware stack.
 *
 * Unknown schema versions / primaryTypes return an invalid result rather than
 * throwing, so the public endpoint can respond with a structured `valid: false`.
 */
export async function verifyAttestationBySchema(
  attestation: VerifyBody['attestation']
): Promise<UnifiedVerificationResult> {
  const schemaVersion = attestation.schemaVersion;
  // `type` is the envelope discriminator (recheck sets it to 'OracleSafetyRecheck');
  // `primaryType` is the EIP-712 primary type. Either suffices to detect a recheck
  // — check both so a recheck routes correctly even if one is missing.
  const primaryType = attestation.eip712?.primaryType;
  const isRecheck =
    (attestation as { type?: string }).type === RECHECK_TYPE ||
    primaryType === RECHECK_PRIMARY_TYPE;

  // Recheck branches: the recheck types are distinct from the plain types and
  // carry the same primaryType across v2 and v3, so the schemaVersion decides
  // which layout (28 vs 29 fields) applies. Must come BEFORE the plain branches.
  if (schemaVersion === V3_SCHEMA_VERSION && isRecheck) {
    const rc = await verifyRecheckV3(attestation as unknown as OracleSafetyRecheckV3);
    return toUnified(rc, V3_SCHEMA_VERSION, { validUntil: rc.validUntil, ageSeconds: null });
  }

  if (schemaVersion === V2_SCHEMA_VERSION && isRecheck) {
    const rc = await verifyRecheck(attestation as unknown as OracleSafetyRecheck);
    return toUnified(rc, V2_SCHEMA_VERSION, { validUntil: rc.validUntil, ageSeconds: null });
  }

  if (schemaVersion === V3_SCHEMA_VERSION) {
    const v3 = await verifyAttestationV3(attestation as unknown as OracleSafetyAttestationV3);
    return toUnified(v3, V3_SCHEMA_VERSION, { validUntil: v3.validUntil, ageSeconds: null });
  }

  if (schemaVersion === V2_SCHEMA_VERSION) {
    const v2 = await verifyAttestationV2(attestation as unknown as OracleSafetyAttestationV2);
    return toUnified(v2, V2_SCHEMA_VERSION, { validUntil: v2.validUntil, ageSeconds: null });
  }

  if (schemaVersion === ATTESTATION_SCHEMA_VERSION) {
    const v1 = await verifyAttestation(attestation as unknown as OracleSafetyAttestation);
    // v1 has no explicit validUntil field; derive it for the unified shape.
    return toUnified(v1, ATTESTATION_SCHEMA_VERSION, {
      validUntil: v1.checkedAt !== null ? v1.checkedAt + attestation.validForSeconds : null,
      ageSeconds: v1.ageSeconds,
    });
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
    reason: `Unsupported schemaVersion ${schemaVersion}; supported: 1 (v1), 2 (v2), 3 (v3).`,
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
      /** Recheck type (v2 family, 28 fields = v2's 26 + originalUid +
       *  originalRequestHash). Distinct primaryType 'OracleSafetyRecheck'. */
      recheck: SchemaDescriptor;
    };
    3: SchemaDescriptor & {
      canonicalRequest: Eip712Descriptor;
      /** Recheck type (v3 family, 29 fields = v3's 27 + originalUid +
       *  originalRequestHash, both bytes32). Distinct primaryType
       *  'OracleSafetyRecheck'. */
      recheck: SchemaDescriptor;
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

    // Optional server-side key-window enforcement (key-rotation-procedure.md
    // §5 gap 4). OFF by default: the registry validity window is primarily a
    // verifier-side rule, and enabling it is a registration-time decision.
    // When ATTESTATION_ENFORCE_KEY_WINDOW=true we additionally reject
    // attestations whose attester key is revoked or whose `checkedAt` falls
    // outside the published [validFrom, validUntil) window. The crypto check
    // above already proved the signature is genuine; this adds the trust-window
    // gate on top.
    if (
      process.env.ATTESTATION_ENFORCE_KEY_WINDOW === 'true' &&
      verification.valid &&
      verification.attester
    ) {
      const attester = await getAttesterAddress();
      const config = buildKeyRegistryConfig(attester);
      if (!isAttestationKeyValid(verification.attester, verification.checkedAt, config)) {
        verification.valid = false;
        verification.expired = true;
        verification.reason =
          'attester key is revoked or its checkedAt is outside the published validity window';
      }
    }

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
          latestSchemaVersion: V3_SCHEMA_VERSION,
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
              recheck: {
                schemaVersion: V2_SCHEMA_VERSION,
                eip712: {
                  domain: RECHECK_DOMAIN,
                  types: RECHECK_TYPES,
                  primaryType: RECHECK_PRIMARY_TYPE,
                },
              },
            },
            3: {
              schemaVersion: V3_SCHEMA_VERSION,
              eip712: {
                domain: V3_DOMAIN,
                types: V3_TYPES,
                primaryType: V3_PRIMARY_TYPE,
              },
              canonicalRequest: {
                domain: CANONICAL_REQUEST_DOMAIN,
                types: CANONICAL_REQUEST_TYPES,
                primaryType: CANONICAL_REQUEST_PRIMARY_TYPE,
              },
              recheck: {
                schemaVersion: V3_SCHEMA_VERSION,
                eip712: {
                  domain: RECHECK_V3_DOMAIN,
                  types: RECHECK_V3_TYPES,
                  primaryType: RECHECK_V3_PRIMARY_TYPE,
                },
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
