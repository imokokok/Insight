/**
 * @fileoverview Unified, schema-versioned verification router for pre-trade
 * oracle safety attestations (v1 / v2 / v3, plus their recheck variants).
 *
 * Extracted from the public safety verify route so it can be reused by the
 * execution trust layer (verify-pair) without importing a Next.js route module.
 * The function is pure crypto routing — no request/response or attester-key
 * policy lives here; the route applies key-window enforcement on top if
 * configured.
 */

import {
  verifyAttestation,
  ATTESTATION_DOMAIN,
  ATTESTATION_TYPES,
  ATTESTATION_PRIMARY_TYPE,
  ATTESTATION_SCHEMA_VERSION,
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

/** Loose envelope accepted by the router. v1 carries 11 fields, v2/v3 carry
 *  more; the crypto layer re-derives the hash from the schema constants and
 *  never trusts a client-supplied type layout, so a malformed attestation
 *  returns `valid: false` rather than throwing. */
export interface RoutableAttestation {
  uid: string;
  schemaVersion: number;
  attester: string;
  data: Record<string, unknown>;
  eip712?: { primaryType?: string };
  type?: string;
  [key: string]: unknown;
}

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

type CoreVerificationResult = {
  valid: boolean;
  attester: string;
  uid: string | null;
  checkedAt: number | null;
  expired: boolean;
  reason?: string;
};

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
  attestation: RoutableAttestation
): Promise<UnifiedVerificationResult> {
  const schemaVersion = attestation.schemaVersion;
  // `type` is the envelope discriminator (recheck sets it to 'OracleSafetyRecheck');
  // `primaryType` is the EIP-712 primary type. Either suffices to detect a recheck
  // — check both so a recheck routes correctly even if one is missing.
  const primaryType = attestation.eip712?.primaryType;
  const isRecheck = attestation.type === RECHECK_TYPE || primaryType === RECHECK_PRIMARY_TYPE;

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
    const validForSeconds = Number(attestation.validForSeconds ?? 0);
    return toUnified(v1, ATTESTATION_SCHEMA_VERSION, {
      validUntil: v1.checkedAt !== null ? v1.checkedAt + validForSeconds : null,
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

// Re-export the domain/type descriptors so consumers that imported them via the
// (now thin) route module keep working.
export {
  ATTESTATION_DOMAIN,
  ATTESTATION_TYPES,
  ATTESTATION_PRIMARY_TYPE,
  V2_DOMAIN,
  V2_TYPES,
  V2_PRIMARY_TYPE,
  V3_DOMAIN,
  V3_TYPES,
  V3_PRIMARY_TYPE,
  RECHECK_DOMAIN,
  RECHECK_TYPES,
  RECHECK_PRIMARY_TYPE,
  RECHECK_V3_DOMAIN,
  RECHECK_V3_TYPES,
  RECHECK_V3_PRIMARY_TYPE,
};
