/**
 * Explicit, append-only protocol releases for the public oracle registry.
 *
 * Normal product and partner work may deploy without changing this module.
 * A protocol publication is a separate operation: append a release, pin its
 * content hash, retain every predecessor, then move CURRENT_ORACLE_REGISTRY_RELEASE_ID.
 * The content-addressed endpoint remains stable even after the current pointer
 * advances.
 */

import { keccak256, toBytes } from 'viem';

import {
  CURRENT_PARTNER_ACTIVATION_SET_ID,
  ORACLE_REGISTRY_RELEASE_PIN_RULE,
  ORACLE_REGISTRY_RELEASE_PIN_RULE_DESCRIPTION,
  PARTNER_ACTIVATION_SET_V1_ID,
} from '../protocol/partnerIntegrationRegistry';

import {
  CANONICAL_REQUEST_DOMAIN,
  CANONICAL_REQUEST_PRIMARY_TYPE,
  CANONICAL_REQUEST_TYPES,
} from './canonicalRequestHash';
import { EXECUTION_PROFILE_V1_ID } from './executionProfiles';
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
  EXECUTION_DEFAULT_MAX_SLIPPAGE_BPS,
  EXECUTION_REQUIRED_PARTICIPANT_COUNT,
  EXECUTION_REQUIRED_SOURCE_GROUP_COUNT,
} from './executionReceipt';
import {
  ATTESTATION_DOMAIN,
  ATTESTATION_PRIMARY_TYPE,
  ATTESTATION_SCHEMA_VERSION,
  ATTESTATION_TYPES,
} from './oracleSafetyAttestation';
import {
  V2_DOMAIN,
  V2_PRIMARY_TYPE,
  V2_SCHEMA_VERSION,
  V2_TYPES,
} from './oracleSafetyAttestationV2';
import {
  V3_DOMAIN,
  V3_PRIMARY_TYPE,
  V3_SCHEMA_VERSION,
  V3_TYPES,
} from './oracleSafetyAttestationV3';
import { RECHECK_DOMAIN, RECHECK_PRIMARY_TYPE, RECHECK_TYPES } from './oracleSafetyRecheck';
import {
  CURRENT_WATCH_SCHEMA_VERSION,
  WATCH_DOMAIN,
  WATCH_PRIMARY_TYPE,
  WATCH_REQUIRED_PARTICIPANT_COUNT,
  WATCH_REQUIRED_SOURCE_GROUP_COUNT,
  WATCH_SCHEMA_VERSION,
  WATCH_TYPES,
  WATCH_TYPES_V2,
} from './oracleWatchAttestation';

export const ORACLE_REGISTRY_RELEASE_2026_09_08_1 = {
  kind: 'OracleRegistryProtocolRelease',
  registryRevision: '2026-09-08.1',
  effectiveFrom: '2026-09-08',
  predecessorSnapshots: [
    {
      label: '5 Sep copy reported by Headless',
      digestPrefix: '7cc00b95',
      bytes: 17958,
    },
    {
      label: '8 Sep copy reported by Headless',
      digestPrefix: 'a45b5d0a',
      bytes: 18003,
    },
  ],
  changes: [
    'ExecutionReceipt v5 appends a signed bytes32 profileId.',
    'Commitment, sentinel, scale and verdict semantics resolve through an immutable content-addressed profile.',
    'schemaVersion continues to identify only the EIP-712 field layout.',
    'v1-v4 remain published and verifiable as frozen legacy layouts.',
  ],
  schemaCatalog: {
    OracleSafetyCheck: {
      schemaVersion: V3_SCHEMA_VERSION,
      domain: V3_DOMAIN,
      types: V3_TYPES,
      primaryType: V3_PRIMARY_TYPE,
    },
    OracleSafetyCheckV2: {
      schemaVersion: V2_SCHEMA_VERSION,
      domain: V2_DOMAIN,
      types: V2_TYPES,
      primaryType: V2_PRIMARY_TYPE,
    },
    OracleSafetyCheckV1: {
      schemaVersion: ATTESTATION_SCHEMA_VERSION,
      domain: ATTESTATION_DOMAIN,
      types: ATTESTATION_TYPES,
      primaryType: ATTESTATION_PRIMARY_TYPE,
    },
    OracleSafetyRecheck: {
      schemaVersion: V2_SCHEMA_VERSION,
      domain: RECHECK_DOMAIN,
      types: RECHECK_TYPES,
      primaryType: RECHECK_PRIMARY_TYPE,
    },
    CanonicalPreTradeRequest: {
      domain: CANONICAL_REQUEST_DOMAIN,
      types: CANONICAL_REQUEST_TYPES,
      primaryType: CANONICAL_REQUEST_PRIMARY_TYPE,
    },
    OracleWatchCheck: {
      schemaVersion: CURRENT_WATCH_SCHEMA_VERSION,
      domain: WATCH_DOMAIN,
      types: WATCH_TYPES_V2,
      primaryType: WATCH_PRIMARY_TYPE,
      gates: {
        requiredParticipantCount: WATCH_REQUIRED_PARTICIPANT_COUNT,
        requiredSourceGroupCount: WATCH_REQUIRED_SOURCE_GROUP_COUNT,
      },
    },
    OracleWatchCheckV1: {
      schemaVersion: WATCH_SCHEMA_VERSION,
      domain: WATCH_DOMAIN,
      types: WATCH_TYPES,
      primaryType: WATCH_PRIMARY_TYPE,
    },
    ExecutionReceipt: {
      schemaVersion: EXECUTION_SCHEMA_VERSION_V5,
      domain: EXECUTION_DOMAIN,
      types: EXECUTION_TYPES_V5,
      primaryType: EXECUTION_PRIMARY_TYPE,
      gates: {
        requiredParticipantCount: EXECUTION_REQUIRED_PARTICIPANT_COUNT,
        requiredSourceGroupCount: EXECUTION_REQUIRED_SOURCE_GROUP_COUNT,
        defaultMaxSlippageBps: EXECUTION_DEFAULT_MAX_SLIPPAGE_BPS,
      },
      profileId: EXECUTION_PROFILE_V1_ID,
    },
    ExecutionReceiptV4: {
      schemaVersion: EXECUTION_SCHEMA_VERSION_V4,
      domain: EXECUTION_DOMAIN,
      types: EXECUTION_TYPES_V4,
      primaryType: EXECUTION_PRIMARY_TYPE,
      retiredForSigning: true,
    },
    ExecutionReceiptV3: {
      schemaVersion: EXECUTION_SCHEMA_VERSION_V3,
      domain: EXECUTION_DOMAIN,
      types: EXECUTION_TYPES_V3,
      primaryType: EXECUTION_PRIMARY_TYPE,
      retiredForSigning: true,
    },
    ExecutionReceiptV2: {
      schemaVersion: EXECUTION_SCHEMA_VERSION_V2,
      domain: EXECUTION_DOMAIN,
      types: EXECUTION_TYPES_V2,
      primaryType: EXECUTION_PRIMARY_TYPE,
      retiredForSigning: true,
    },
    ExecutionReceiptV1: {
      schemaVersion: EXECUTION_SCHEMA_VERSION,
      domain: EXECUTION_DOMAIN,
      types: EXECUTION_TYPES_V1,
      primaryType: EXECUTION_PRIMARY_TYPE,
      retiredForSigning: true,
    },
  },
  executionReceipt: {
    currentSchemaVersion: EXECUTION_SCHEMA_VERSION_V5,
    supportedSchemaVersions: [
      EXECUTION_SCHEMA_VERSION,
      EXECUTION_SCHEMA_VERSION_V2,
      EXECUTION_SCHEMA_VERSION_V3,
      EXECUTION_SCHEMA_VERSION_V4,
      EXECUTION_SCHEMA_VERSION_V5,
    ],
    currentProfileId: EXECUTION_PROFILE_V1_ID,
    profilePath: `/.well-known/oracle-registry/profiles/${EXECUTION_PROFILE_V1_ID}`,
    legacyProfileResolution: {
      schemaVersions: [1, 2, 3, 4],
      currentIssuerProfileId: EXECUTION_PROFILE_V1_ID,
      rule: 'use the registry snapshot pinned by the verifier; these layouts did not sign profileId',
    },
    eip712: {
      domain: EXECUTION_DOMAIN,
      types: EXECUTION_TYPES_V5,
      primaryType: EXECUTION_PRIMARY_TYPE,
    },
  },
} as const;

/** First main-only governance release. It changes no receipt layout or semantic
 * profile. Every existing partner remains pinned to its prior immutable policy;
 * this release only publishes the independently addressable activation layer. */
export const ORACLE_REGISTRY_RELEASE_2026_09_09_1 = {
  ...ORACLE_REGISTRY_RELEASE_2026_09_08_1,
  registryRevision: '2026-09-09.1',
  effectiveFrom: '2026-09-09',
  predecessorReleaseId: '0xd240af8f16adb282cbbbb9feb695f5bfb8cccde074af046fb7d4ca4c2d4c5c2e',
  changes: [
    'Partner development may coexist on main but is unreachable until an immutable partner policy is explicitly activated.',
    'Each partner activation resolves independently; changing one policy pointer cannot advance another partner.',
    'Shared protocol changes require a standalone promotion record and a complete compatibility matrix.',
    'ExecutionReceipt v5 layout and semantic profile remain unchanged from the predecessor release.',
  ],
  mainlineIntegrationIsolation: {
    activationSetId: PARTNER_ACTIVATION_SET_V1_ID,
    currentPath: '/.well-known/oracle-registry/integrations/current.json',
    immutableSetPath: `/.well-known/oracle-registry/integration-sets/${PARTNER_ACTIVATION_SET_V1_ID}`,
    immutablePolicyPathTemplate: '/.well-known/oracle-registry/integrations/{policyId}',
    activationRule: 'repository presence never activates an integration; only its policy id does',
  },
} as const;

/** Headless legacy-resolution closure. Production admission is v5-only; old
 * layouts remain available for historical cryptographic inspection, but their
 * semantic verdict is explicitly scoped to the exact registry bytes named by
 * the verifier and is never globally canonical. */
export const ORACLE_REGISTRY_RELEASE_2026_09_10_1 = {
  ...ORACLE_REGISTRY_RELEASE_2026_09_09_1,
  registryRevision: '2026-09-10.1',
  effectiveFrom: '2026-09-10',
  predecessorReleaseId: '0xf45d4c0272300f8132dba75c49b337557cf6fd7975b32fd14a8b4e13f430a8f7',
  changes: [
    'Headless production admission is v5-only and requires the signed immutable profileId.',
    'ExecutionReceipt v1-v4 remain available only for historical cryptographic verification and are retired for all new production signing.',
    'A v1-v4 semantic verdict is snapshot-relative, must name the exact registry bytes by full SHA-256 and byte length, and is never a globally canonical verdict.',
    'A missing or mismatched legacy snapshot fails closed; a verifier must not substitute the current registry.',
  ],
  executionReceipt: {
    ...ORACLE_REGISTRY_RELEASE_2026_09_09_1.executionReceipt,
    legacyProfileResolution: {
      schemaVersions: [1, 2, 3, 4],
      signingStatus: 'retired',
      productionAdmission: 'forbidden',
      resultScope: 'relative-to-exact-registry-snapshot',
      globallyCanonicalVerdict: false,
      requiredEvidence: ['registrySnapshotUtf8Bytes', 'sha256', 'byteLength'],
      rule: 'preserve and verify the exact registry snapshot bytes; report its full SHA-256 and byte length with every verdict; fail closed if absent or mismatched; never substitute current.json or the current registry',
    },
  },
  mainlineIntegrationIsolation: {
    ...ORACLE_REGISTRY_RELEASE_2026_09_09_1.mainlineIntegrationIsolation,
    activationSetId: CURRENT_PARTNER_ACTIVATION_SET_ID,
    immutableSetPath: `/.well-known/oracle-registry/integration-sets/${CURRENT_PARTNER_ACTIVATION_SET_ID}`,
  },
} as const;

/** Makes the policy release pin semantics executable and exposes immutable
 * promotion records without changing receipt wire data or partner activation. */
export const ORACLE_REGISTRY_RELEASE_2026_09_11_1 = {
  ...ORACLE_REGISTRY_RELEASE_2026_09_10_1,
  registryRevision: '2026-09-11.1',
  effectiveFrom: '2026-09-11',
  predecessorReleaseId: '0x96d1f62460d53e68b34cb7812e8ef736cce8332754dc1284cfb7df1b2b575e2c',
  changes: [
    'Partner policy oracleRegistryReleaseIds are lineage floors: a candidate release must equal a pin or descend from one through predecessorReleaseId.',
    'Unknown releases, predecessor cycles and releases outside every policy-pinned lineage fail closed.',
    'Mainline promotion records are available from an immutable content-addressed HTTP path whose promotionId is keccak256 over RFC 8785 canonical bytes excluding promotionId.',
    'Receipt layout, ExecutionReceipt semantic profile and active partner policy ids remain unchanged.',
  ],
  mainlineIntegrationIsolation: {
    ...ORACLE_REGISTRY_RELEASE_2026_09_10_1.mainlineIntegrationIsolation,
    registryReleasePinRule: ORACLE_REGISTRY_RELEASE_PIN_RULE,
    registryReleasePinRuleDescription: ORACLE_REGISTRY_RELEASE_PIN_RULE_DESCRIPTION,
  },
  promotionAddressing: {
    immutablePathTemplate: '/.well-known/oracle-registry/promotions/{promotionId}',
    contentId: {
      algorithm: 'keccak256',
      canonicalization: 'RFC 8785 JSON Canonicalization Scheme',
      scope: 'promotion object excluding promotionId',
    },
  },
} as const;

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalJson(entryValue)}`);
    return `{${entries.join(',')}}`;
  }
  throw new Error('Oracle registry release is not JCS-serializable');
}

function releaseDigest(body: unknown): `0x${string}` {
  return keccak256(toBytes(canonicalJson(body)));
}

export const ORACLE_REGISTRY_RELEASE_2026_09_08_1_ID =
  '0xd240af8f16adb282cbbbb9feb695f5bfb8cccde074af046fb7d4ca4c2d4c5c2e' as const;

const computedReleaseId = releaseDigest(ORACLE_REGISTRY_RELEASE_2026_09_08_1);
if (computedReleaseId !== ORACLE_REGISTRY_RELEASE_2026_09_08_1_ID) {
  throw new Error(
    `Oracle registry release is immutable: expected ${ORACLE_REGISTRY_RELEASE_2026_09_08_1_ID}, computed ${computedReleaseId}`
  );
}

export const ORACLE_REGISTRY_RELEASE_2026_09_09_1_ID =
  '0xf45d4c0272300f8132dba75c49b337557cf6fd7975b32fd14a8b4e13f430a8f7' as const;

const computedMainlineReleaseId = releaseDigest(ORACLE_REGISTRY_RELEASE_2026_09_09_1);
if (computedMainlineReleaseId !== ORACLE_REGISTRY_RELEASE_2026_09_09_1_ID) {
  throw new Error(
    `Oracle registry release is immutable: expected ${ORACLE_REGISTRY_RELEASE_2026_09_09_1_ID}, computed ${computedMainlineReleaseId}`
  );
}

export const ORACLE_REGISTRY_RELEASE_2026_09_10_1_ID =
  '0x96d1f62460d53e68b34cb7812e8ef736cce8332754dc1284cfb7df1b2b575e2c' as const;

const computedLegacyResolutionReleaseId = releaseDigest(ORACLE_REGISTRY_RELEASE_2026_09_10_1);
if (computedLegacyResolutionReleaseId !== ORACLE_REGISTRY_RELEASE_2026_09_10_1_ID) {
  throw new Error(
    `Oracle registry release is immutable: expected ${ORACLE_REGISTRY_RELEASE_2026_09_10_1_ID}, computed ${computedLegacyResolutionReleaseId}`
  );
}

export const ORACLE_REGISTRY_RELEASE_2026_09_11_1_ID =
  '0x6e3bd18c541cc80e326754a7743f05050df348257102b93f9a13bc82c7e69f6b' as const;

const computedReleaseLineageId = releaseDigest(ORACLE_REGISTRY_RELEASE_2026_09_11_1);
if (computedReleaseLineageId !== ORACLE_REGISTRY_RELEASE_2026_09_11_1_ID) {
  throw new Error(
    `Oracle registry release is immutable: expected ${ORACLE_REGISTRY_RELEASE_2026_09_11_1_ID}, computed ${computedReleaseLineageId}`
  );
}

export const ORACLE_REGISTRY_RELEASES = Object.freeze({
  [ORACLE_REGISTRY_RELEASE_2026_09_08_1_ID]: ORACLE_REGISTRY_RELEASE_2026_09_08_1,
  [ORACLE_REGISTRY_RELEASE_2026_09_09_1_ID]: ORACLE_REGISTRY_RELEASE_2026_09_09_1,
  [ORACLE_REGISTRY_RELEASE_2026_09_10_1_ID]: ORACLE_REGISTRY_RELEASE_2026_09_10_1,
  [ORACLE_REGISTRY_RELEASE_2026_09_11_1_ID]: ORACLE_REGISTRY_RELEASE_2026_09_11_1,
});

/** The only pointer edited during an explicit protocol promotion. */
export const CURRENT_ORACLE_REGISTRY_RELEASE_ID = ORACLE_REGISTRY_RELEASE_2026_09_11_1_ID;
export const CURRENT_ORACLE_REGISTRY_RELEASE =
  ORACLE_REGISTRY_RELEASES[CURRENT_ORACLE_REGISTRY_RELEASE_ID];

export function oracleRegistryReleaseById(releaseId: string) {
  return (
    ORACLE_REGISTRY_RELEASES[releaseId.toLowerCase() as keyof typeof ORACLE_REGISTRY_RELEASES] ??
    null
  );
}
