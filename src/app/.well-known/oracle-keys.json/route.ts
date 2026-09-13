/**
 * Public oracle-keys document (RFC 8615 `.well-known`).
 *
 * Mirrors the convention Headless Oracle / LembaGang uses for its SMA receipts
 * (`.well-known/oracle-keys.json`): a stable, fetchable, unauthenticated
 * location where a verifier learns (a) which issuer address to trust and
 * (b) the EIP-712 domain/types needed to verify a signed receipt.
 *
 * This endpoint is the "verification key at a well-known path" half of the
 * published attestation surface. The schema half already ships at
 * GET /api/v1/safety/attestation/verify; we surface the same descriptors here
 * so a single well-known URL is enough to both verify and fetch a live sample.
 *
 * GET /.well-known/oracle-keys.json
 */

import { type NextRequest, NextResponse } from 'next/server';

import { getAttesterAddress, getSampleAttesterAddress } from '@/lib/attestations/attesterAccount';
import {
  CANONICAL_REQUEST_DOMAIN,
  CANONICAL_REQUEST_TYPES,
  CANONICAL_REQUEST_PRIMARY_TYPE,
} from '@/lib/attestations/canonicalRequestHash';
import { EXECUTION_PROFILE_V1_ID } from '@/lib/attestations/executionProfiles';
import {
  EXECUTION_DOMAIN,
  EXECUTION_PRIMARY_TYPE,
  EXECUTION_SCHEMA_VERSION,
  EXECUTION_SCHEMA_VERSION_V2,
  EXECUTION_SCHEMA_VERSION_V3,
  EXECUTION_SCHEMA_VERSION_V4,
  EXECUTION_SCHEMA_VERSION_V5,
  EXECUTION_TYPES_V1,
  EXECUTION_TYPES_V2,
  EXECUTION_TYPES_V3,
  EXECUTION_TYPES_V4,
  EXECUTION_TYPES_V5,
  EXECUTION_VALID_FOR_SECONDS,
  EXECUTION_DEFAULT_MAX_SLIPPAGE_BPS,
  EXECUTION_REQUIRED_PARTICIPANT_COUNT,
  EXECUTION_REQUIRED_SOURCE_GROUP_COUNT,
} from '@/lib/attestations/executionReceipt';
import { buildKeyRegistryConfig } from '@/lib/attestations/keyRegistryConfig';
import {
  CURRENT_ORACLE_REGISTRY_RELEASE,
  CURRENT_ORACLE_REGISTRY_RELEASE_ID,
} from '@/lib/attestations/oracleRegistryRelease';
import {
  ATTESTATION_DOMAIN,
  ATTESTATION_TYPES,
  ATTESTATION_PRIMARY_TYPE,
  ATTESTATION_SCHEMA_VERSION,
} from '@/lib/attestations/oracleSafetyAttestation';
import {
  V2_DOMAIN,
  V2_TYPES,
  V2_PRIMARY_TYPE,
  V2_SCHEMA_VERSION,
  V2_ATTESTER_LABEL,
} from '@/lib/attestations/oracleSafetyAttestationV2';
import {
  V3_DOMAIN,
  V3_TYPES,
  V3_PRIMARY_TYPE,
  V3_SCHEMA_VERSION,
} from '@/lib/attestations/oracleSafetyAttestationV3';
import {
  RECHECK_DOMAIN,
  RECHECK_TYPES,
  RECHECK_PRIMARY_TYPE,
} from '@/lib/attestations/oracleSafetyRecheck';
import {
  CURRENT_WATCH_SCHEMA_VERSION,
  WATCH_DOMAIN,
  WATCH_PRIMARY_TYPE,
  WATCH_SCHEMA_VERSION,
  WATCH_TYPES,
  WATCH_TYPES_V2,
  WATCH_VALID_FOR_SECONDS,
  WATCH_REQUIRED_PARTICIPANT_COUNT,
  WATCH_REQUIRED_SOURCE_GROUP_COUNT,
} from '@/lib/attestations/oracleWatchAttestation';
import { PROVIDER_OBSERVATIONS_HASH_CANONICALIZATION } from '@/lib/attestations/providerObservationsHash';
import {
  CURRENT_MAINLINE_PROTOCOL_PROMOTION,
  CURRENT_MAINLINE_PROTOCOL_PROMOTION_ID,
} from '@/lib/protocol/mainlinePromotionRegistry';

/** Loose EIP-712 descriptor shape for JSON (domain version widened to string;
 *  `environment` appears on domains that structurally separate deployments). */
interface Eip712Descriptor {
  domain: { name: string; version: string; chainId: number; environment?: string };
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
}

function descriptor(
  domain: { name: string; version: string; chainId: number; environment?: string },
  types: Record<string, Array<{ name: string; type: string }>>,
  primaryType: string
): Eip712Descriptor {
  return { domain, types, primaryType };
}

/** Resolve the canonical issuer origin for cross-references. Prefers an
 *  explicit env override, then a production default, then the request origin
 *  (works for both NextRequest.nextUrl and a plain Request via URL parsing). */
function resolveOrigin(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NODE_ENV === 'production') return 'https://www.oracleinsight.xyz';
  try {
    return new URL(request.url).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export async function GET(request: NextRequest) {
  const origin = resolveOrigin(request);

  const attester = await getAttesterAddress();
  // Dedicated SAMPLE signer (Headless H8, 2026-09-02): published alongside the
  // attester keys with role "sample", so the synthetic/real distinction is
  // checkable from the signature's signer plus this document alone.
  const sampleAttester = await getSampleAttesterAddress();

  // Key-lifecycle windows (added 2026-08-26 in response to the VERITAS
  // collaboration). Anchoring fixes the retroactive-forgery gap, but only a
  // published validity window lets a verifier say "trust this key up to a
  // given date". validUntil: null = no scheduled expiry until the first
  // rotation; revoked flips on compromise. The key list is config-driven
  // (ATTESTATION_KEYS_CONFIG) so rotation can publish a second key with its
  // own window without a code change (see key-rotation-procedure.md §5.1).
  const registry = buildKeyRegistryConfig(attester, sampleAttester);

  const body = {
    issuer: origin,
    mic: V2_ATTESTER_LABEL,
    /** Publication metadata changes only during an explicit protocol release.
     *  Ordinary partner/product deploys keep pointing to the same immutable
     *  release, so a verifier can distinguish code deployment from protocol
     *  publication. */
    registryRevision: CURRENT_ORACLE_REGISTRY_RELEASE.registryRevision,
    effectiveFrom: CURRENT_ORACLE_REGISTRY_RELEASE.effectiveFrom,
    registryRelease: {
      releaseId: CURRENT_ORACLE_REGISTRY_RELEASE_ID,
      current: `${origin}/.well-known/oracle-registry/current.json`,
      immutable: `${origin}/.well-known/oracle-registry/releases/${CURRENT_ORACLE_REGISTRY_RELEASE_ID}`,
    },
    protocolPromotion: {
      promotionId: CURRENT_MAINLINE_PROTOCOL_PROMOTION_ID,
      promotionVersion: CURRENT_MAINLINE_PROTOCOL_PROMOTION.promotionVersion,
      immutable: `${origin}/.well-known/oracle-registry/promotions/${CURRENT_MAINLINE_PROTOCOL_PROMOTION_ID}`,
    },
    /** Partner code may coexist on main without changing any integration.
     *  Verifiers select an immutable policy id; only the activation set maps a
     *  partner to a policy, and each mapping advances independently. */
    partnerIntegrations: {
      activationSetId: CURRENT_ORACLE_REGISTRY_RELEASE.mainlineIntegrationIsolation.activationSetId,
      current: `${origin}${CURRENT_ORACLE_REGISTRY_RELEASE.mainlineIntegrationIsolation.currentPath}`,
      immutableSet: `${origin}${CURRENT_ORACLE_REGISTRY_RELEASE.mainlineIntegrationIsolation.immutableSetPath}`,
      immutablePolicyTemplate: `${origin}${CURRENT_ORACLE_REGISTRY_RELEASE.mainlineIntegrationIsolation.immutablePolicyPathTemplate}`,
      activationRule: CURRENT_ORACLE_REGISTRY_RELEASE.mainlineIntegrationIsolation.activationRule,
      registryReleasePolicy: {
        rule: CURRENT_ORACLE_REGISTRY_RELEASE.mainlineIntegrationIsolation.registryReleasePinRule,
        description:
          CURRENT_ORACLE_REGISTRY_RELEASE.mainlineIntegrationIsolation
            .registryReleasePinRuleDescription,
      },
      runtime: {
        executionVerifyTemplate: `${origin}/api/v1/partners/{partnerId}/execution/attestation/verify`,
        executionVerifyPairTemplate: `${origin}/api/v1/partners/{partnerId}/execution/attestation/verify-pair`,
        requiredBodyField: 'policyId',
        rule: 'partner runtime requests must use the partner path and exact active immutable policy; the public verifier remains policy-optional only for generic and historical verification',
      },
    },
    /** The EIP-712 attestation is signed by a secp256k1 key; the recovered
     *  signer address IS the public verification key. Trust a receipt only if
     *  its `attester` field equals one of these addresses AND it verifies
     *  against the schema below AND (when enforced) its `checkedAt` falls
     *  inside the key's [validFrom, validUntil) window and it is not revoked. */
    public_keys: registry.keys,
    revoked_keys: registry.revoked,
    attestation_enabled: attester !== null,
    /** Commitment rules shared by OracleSafetyCheck and OracleWatchCheck.
     *  N15: list every ABI type explicitly so an independent verifier never
     *  has to infer uint256/int256 from positive example bytes. */
    commitments: {
      providerObservationsHash: {
        ...PROVIDER_OBSERVATIONS_HASH_CANONICALIZATION,
        vector: `${origin}/.well-known/provider-observations-hash-vector-v1.json`,
      },
    },
    schemas: {
      /**
       * Pre-trade Oracle Safety Check. v3 is the current signing layout: 27
       * fields (v2's 26 plus the signed `requiredSourceGroupCount` threshold,
       * VERITAS), under domain version 3. Published alongside the v1/v2
       * layouts below so a stranger who holds a gate of ANY version can rebuild
       * its EIP-712 struct from this document alone (Headless H6).
       */
      OracleSafetyCheck: {
        schemaVersion: V3_SCHEMA_VERSION,
        eip712: descriptor(V3_DOMAIN, V3_TYPES as never, V3_PRIMARY_TYPE),
      },
      /** v2 layout (26 fields, domain version 2): superseded by v3 but kept so
       *  v2 gates already handed out keep verifying. */
      OracleSafetyCheckV2: {
        schemaVersion: V2_SCHEMA_VERSION,
        retiredForSigning: true,
        eip712: descriptor(V2_DOMAIN, V2_TYPES as never, V2_PRIMARY_TYPE),
      },
      /** v1 layout (11 fields, domain version 1): the original pre-trade line. */
      OracleSafetyCheckV1: {
        schemaVersion: ATTESTATION_SCHEMA_VERSION,
        retiredForSigning: true,
        eip712: descriptor(
          ATTESTATION_DOMAIN,
          ATTESTATION_TYPES as never,
          ATTESTATION_PRIMARY_TYPE
        ),
      },
      OracleSafetyRecheck: {
        schemaVersion: V2_SCHEMA_VERSION,
        eip712: descriptor(RECHECK_DOMAIN, RECHECK_TYPES as never, RECHECK_PRIMARY_TYPE),
      },
      CanonicalPreTradeRequest: {
        eip712: descriptor(
          CANONICAL_REQUEST_DOMAIN,
          CANONICAL_REQUEST_TYPES as never,
          CANONICAL_REQUEST_PRIMARY_TYPE
        ),
      },
      /**
       * Oracle Watch — the always-on cross-oracle trust signal. v2 is the
       * current signing layout and carries the independence gate
       * (`sourceGroupCount` / `requiredSourceGroupCount` / `independenceSatisfied`)
       * plus `reasonCodesHash`, so a receipt explains WHY a feed was called
       * DANGER without the holder needing our source code.
       */
      OracleWatchCheck: {
        schemaVersion: CURRENT_WATCH_SCHEMA_VERSION,
        eip712: descriptor(WATCH_DOMAIN, WATCH_TYPES_V2 as never, WATCH_PRIMARY_TYPE),
        validForSeconds: WATCH_VALID_FOR_SECONDS,
        /** Gate thresholds signed into every receipt alongside the observed
         *  values — a receipt is self-contained by construction. */
        gates: {
          requiredParticipantCount: WATCH_REQUIRED_PARTICIPANT_COUNT,
          requiredSourceGroupCount: WATCH_REQUIRED_SOURCE_GROUP_COUNT,
        },
        verify: `${origin}/api/v1/oracle-watch/attestation/verify`,
        sample: `${origin}/api/v1/oracle-watch/attestation/sample`,
      },
      /** v1 Watch layout: RETIRED FOR SIGNING, but kept published so receipts
       *  already handed to counterparties keep verifying after the upgrade. */
      OracleWatchCheckV1: {
        schemaVersion: WATCH_SCHEMA_VERSION,
        retiredForSigning: true,
        eip712: descriptor(WATCH_DOMAIN, WATCH_TYPES as never, WATCH_PRIMARY_TYPE),
        verify: `${origin}/api/v1/oracle-watch/attestation/verify`,
      },
      /**
       * Execution Receipt — the "did the agent actually fill at the certified
       * price" half of the trust layer. Its EIP-712 domain is distinct from both
       * pre-trade and Watch (chainId=1 separator, name "Insight Execution") so a
       * receipt can never be replayed across surfaces. The gate thresholds are
       * signed NEXT TO the observed counts so a receipt is self-checking, exactly
       * as with Watch. Its independence gate is the agent's own pre-trade basis,
       * carried forward — not an independent re-proof of oracle independence.
       *
       * v5 (45 fields) is current. It appends a signed `profileId` to v4. That
       * content address selects immutable commitment/sentinel/verdict semantics,
       * so mutable registry prose can no longer reinterpret a signed receipt.
       * v1-v4 remain published as retired layouts.
       */
      ExecutionReceipt: {
        schemaVersion: EXECUTION_SCHEMA_VERSION_V5,
        eip712: descriptor(EXECUTION_DOMAIN, EXECUTION_TYPES_V5 as never, EXECUTION_PRIMARY_TYPE),
        validForSeconds: EXECUTION_VALID_FOR_SECONDS,
        gates: {
          requiredParticipantCount: EXECUTION_REQUIRED_PARTICIPANT_COUNT,
          requiredSourceGroupCount: EXECUTION_REQUIRED_SOURCE_GROUP_COUNT,
          /** Fallback bound a receipt used when no tighter per-action bound was
           *  supplied; the binding value is always the one signed in the receipt. */
          defaultMaxSlippageBps: EXECUTION_DEFAULT_MAX_SLIPPAGE_BPS,
        },
        semanticProfile: {
          profileId: EXECUTION_PROFILE_V1_ID,
          immutable: `${origin}/.well-known/oracle-registry/profiles/${EXECUTION_PROFILE_V1_ID}`,
          signedField: 'profileId',
        },
        /** Sample receipts are signed by the key below with role "sample" —
         *  a synthetic demo receipt is distinguishable from a real one by its
         *  signer alone (Headless H8). */
        sampleSigningKeyRole: 'sample',
        verify: `${origin}/api/v1/execution/attestation/verify`,
        sample: `${origin}/api/v1/execution/attestation/sample`,
      },
      /** v4 receipt (44 fields): frozen legacy layout. It signs environment but
       *  not a semantic profile, so historical verifiers must use a registry
       *  snapshot pinned alongside the receipt. */
      ExecutionReceiptV4: {
        schemaVersion: EXECUTION_SCHEMA_VERSION_V4,
        retiredForSigning: true,
        eip712: descriptor(EXECUTION_DOMAIN, EXECUTION_TYPES_V4 as never, EXECUTION_PRIMARY_TYPE),
        semanticProfile: {
          profileId: EXECUTION_PROFILE_V1_ID,
          immutable: `${origin}/.well-known/oracle-registry/profiles/${EXECUTION_PROFILE_V1_ID}`,
          signedField: null,
          warning:
            'profileId was not signed in v4; this describes current issuer behaviour, while historical verification still requires the registry snapshot pinned with the receipt',
        },
        verify: `${origin}/api/v1/execution/attestation/verify`,
      },
      /**
       * v3 receipt (43 fields): superseded by v4 (whose first change is the
       * signed `environment` message field) but kept published so receipts
       * already handed to counterparties keep verifying. Its declared
       * domain-`environment` never entered the digest, so the descriptor below
       * carries the three-field domain the bytes really commit to (H7).
       */
      ExecutionReceiptV3: {
        schemaVersion: EXECUTION_SCHEMA_VERSION_V3,
        retiredForSigning: true,
        eip712: descriptor(EXECUTION_DOMAIN, EXECUTION_TYPES_V3 as never, EXECUTION_PRIMARY_TYPE),
        validForSeconds: EXECUTION_VALID_FOR_SECONDS,
        verify: `${origin}/api/v1/execution/attestation/verify`,
      },
      /** v2 receipt (32 fields): superseded by v3 but kept published so receipts
       *  already handed to counterparties keep verifying. Same domain as v1. */
      ExecutionReceiptV2: {
        schemaVersion: EXECUTION_SCHEMA_VERSION_V2,
        retiredForSigning: true,
        eip712: descriptor(EXECUTION_DOMAIN, EXECUTION_TYPES_V2 as never, EXECUTION_PRIMARY_TYPE),
        validForSeconds: EXECUTION_VALID_FOR_SECONDS,
        verify: `${origin}/api/v1/execution/attestation/verify`,
      },
      /** v1 receipt (30 fields): the original execution line. */
      ExecutionReceiptV1: {
        schemaVersion: EXECUTION_SCHEMA_VERSION,
        retiredForSigning: true,
        eip712: descriptor(EXECUTION_DOMAIN, EXECUTION_TYPES_V1 as never, EXECUTION_PRIMARY_TYPE),
        validForSeconds: EXECUTION_VALID_FOR_SECONDS,
        verify: `${origin}/api/v1/execution/attestation/verify`,
      },
    },
    verify: `${origin}/api/v1/safety/attestation/verify`,
    sample: `${origin}/api/v1/safety/attestation/sample`,
    /** Oracle Watch's verification half, kept separate from the pre-trade pair
     *  above: the two surfaces have different EIP-712 domains and different
     *  gate semantics, so a verifier must not be able to cross-replay them. */
    watch_verify: `${origin}/api/v1/oracle-watch/attestation/verify`,
    watch_sample: `${origin}/api/v1/oracle-watch/attestation/sample`,
    /** Execution Receipt's verification half: a third distinct domain, kept
     *  separate so a verifier cannot conflate pre-trade / watch / execution. */
    execution_verify: `${origin}/api/v1/execution/attestation/verify`,
    execution_sample: `${origin}/api/v1/execution/attestation/sample`,
    /** Rotation contract (added 2026-08-26). Target cadence: annual, or
     *  immediately on compromise (ROTATION_TARGET_CADENCE_DAYS). To rotate:
     *  generate a new key, publish it with validFrom = activation time, retain
     *  the prior key with validUntil for the overlap window, and set
     *  revoked = true on compromise. Compromised-or-expired keys move to
     *  `revoked_keys` (each with revoked_at + reason) so historical receipts
     *  keep a verifiable trust boundary. The key list is config-driven
     *  (ATTESTATION_KEYS_CONFIG / ATTESTATION_REVOKED_KEYS_CONFIG). */
    key_rotation_policy:
      'config-driven multi-key; rotate by publishing new key_id with validFrom, retaining prior key with validUntil for overlap; revoke on compromise (annual target or immediate)',
  };

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
