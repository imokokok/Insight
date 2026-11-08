/**
 * @fileoverview Unified, schema-versioned verification router for pre-trade
 * oracle safety attestations (v1 / v2 / v3 / v4, plus their recheck variants).
 *
 * Extracted from the public safety verify route so it can be reused by the
 * execution trust layer (verify-pair) without importing a Next.js route module.
 * The function is pure crypto routing — no request/response or attester-key
 * policy lives here; public routes always apply the published key registry on
 * top, while internal callers can compose their own trust policy.
 */

import type { AssetProxyRelationData } from '@/lib/attestations/assetProxyRelation';
import {
  verifyAttestation,
  ATTESTATION_DOMAIN,
  ATTESTATION_TYPES,
  ATTESTATION_PRIMARY_TYPE,
  ATTESTATION_SCHEMA_VERSION,
  ATTESTATION_VALID_FOR_SECONDS,
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
  verifyAttestationV4,
  V4_DOMAIN,
  V4_TYPES,
  V4_PRIMARY_TYPE,
  V4_SCHEMA_VERSION,
  type OracleSafetyAttestationV4,
} from '@/lib/attestations/oracleSafetyAttestationV4';
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
import {
  verifyRecheckV4,
  RECHECK_V4_DOMAIN,
  RECHECK_V4_TYPES,
  RECHECK_V4_PRIMARY_TYPE,
  type OracleSafetyRecheckV4,
} from '@/lib/attestations/oracleSafetyRecheckV4';
import { verifyTestAttestation, TEST_PRIMARY_TYPE } from '@/lib/testing/oracleScenario/attestation';

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
  /** v4 only: the signed source-asset proxy relationship, echoed verbatim so
   *  callers can see UNKNOWN instead of having to infer a default. */
  assetProxy?: AssetProxyRelationData;
  /** Non-fatal, verifier-visible gaps (e.g. `asset_proxy_unknown`). */
  warnings?: string[];
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
  overrides: {
    validUntil: number | null;
    ageSeconds: number | null;
    assetProxy?: AssetProxyRelationData;
    warnings?: string[];
  }
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
    ...(overrides.assetProxy ? { assetProxy: overrides.assetProxy } : {}),
    ...(overrides.warnings?.length ? { warnings: overrides.warnings } : {}),
  };
}

/** v4: an UNKNOWN proxy record is a signed, non-fatal gap. Surface it so a
 *  caller that requires a known relationship can refuse, but never turn it into
 *  a silent pass or a default 1:1. NOT_APPLICABLE (native asset) is not a gap. */
function assetProxyWarnings(proxy: AssetProxyRelationData): string[] | undefined {
  return proxy.status === 'UNKNOWN' ? ['asset_proxy_unknown'] : undefined;
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
 *   - v4 OracleSafetyCheck (schemaVersion=4, primaryType 'OracleSafetyCheck')
 *                                          → v4 domain/types (31 fields = v3's 27
 *                                           + 4 signed asset-proxy fields)
 *   - v4 OracleSafetyRecheck (schemaVersion=4, primaryType 'OracleSafetyRecheck')
 *                                          → v4 recheck domain/types (33 fields)
 *   - OracleScenarioRun (schemaVersion=1, primaryType 'OracleScenarioRun')
 *                                          → test domain/types (13 fields); the
 *                                            scenario-testing harness line. It
 *                                            shares schemaVersion=1 with plain v1,
 *                                            so it is routed by primaryType FIRST.
 *
 * The recheck carries schemaVersion=2 (v2 family) but a distinct primaryType,
 * so it MUST be routed before the plain-v2 branch — otherwise it would be
 * verified against the 26-field type (ignoring originalUid + originalRequestHash)
 * and always fail UID recovery. Extracted as a pure, exported helper so the
 * routing decision is unit-testable without the API middleware stack.
 *
 * The same ordering constraint applies to OracleScenarioRun v1, with the added
 * complication that its schemaVersion collides with the plain v1 pre-trade
 * receipt. primaryType is the only thing separating them.
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
  const isRecheck =
    attestation.type === RECHECK_TYPE ||
    primaryType === RECHECK_PRIMARY_TYPE ||
    primaryType === RECHECK_V3_PRIMARY_TYPE ||
    primaryType === RECHECK_V4_PRIMARY_TYPE;
  // A scenario-test receipt also carries schemaVersion=1, colliding with the
  // plain v1 pre-trade receipt. Its primaryType is the only reliable
  // discriminator, so it must be routed BEFORE the v1 branch below.
  const isTestRun = attestation.type === TEST_PRIMARY_TYPE || primaryType === TEST_PRIMARY_TYPE;

  if (isTestRun) {
    const t = await verifyTestAttestation(attestation as never);
    // A scenario-test receipt anchors its start time with `ranAt`, not
    // `checkedAt`; the unified shape keeps the same field name so callers do
    // not need a per-schema branch.
    const ranAt = typeof attestation.data?.ranAt === 'number' ? attestation.data.ranAt : null;
    const testValidUntil =
      typeof attestation.data?.validUntil === 'number' ? attestation.data.validUntil : null;
    return toUnified(
      {
        valid: t.valid,
        attester: t.attester,
        uid: t.uid ?? null,
        checkedAt: ranAt,
        expired: t.expired,
        reason: t.reason,
      },
      1,
      { validUntil: testValidUntil, ageSeconds: null }
    );
  }

  if (schemaVersion === V4_SCHEMA_VERSION && isRecheck) {
    const rc = await verifyRecheckV4(attestation as unknown as OracleSafetyRecheckV4);
    return toUnified(rc, V4_SCHEMA_VERSION, {
      validUntil: rc.validUntil,
      ageSeconds: null,
      assetProxy: rc.assetProxy,
      warnings: assetProxyWarnings(rc.assetProxy),
    });
  }

  if (schemaVersion === V4_SCHEMA_VERSION) {
    const v4 = await verifyAttestationV4(attestation as unknown as OracleSafetyAttestationV4);
    return toUnified(v4, V4_SCHEMA_VERSION, {
      validUntil: v4.validUntil,
      ageSeconds: null,
      assetProxy: v4.assetProxy,
      warnings: assetProxyWarnings(v4.assetProxy),
    });
  }

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
    return toUnified(v1, ATTESTATION_SCHEMA_VERSION, {
      validUntil: v1.checkedAt !== null ? v1.checkedAt + ATTESTATION_VALID_FOR_SECONDS : null,
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
    reason: `Unsupported schemaVersion ${schemaVersion}; supported: 1 (v1), 2 (v2), 3 (v3), 4 (v4). OracleScenarioRun v1 is routed by primaryType, not by this number.`,
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
  V4_DOMAIN,
  V4_TYPES,
  V4_PRIMARY_TYPE,
  RECHECK_V4_DOMAIN,
  RECHECK_V4_TYPES,
  RECHECK_V4_PRIMARY_TYPE,
};
