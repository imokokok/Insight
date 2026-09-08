/**
 * Immutable, content-addressed semantic profiles for ExecutionReceipt.
 *
 * `schemaVersion` identifies the EIP-712 field layout. It cannot, by itself,
 * identify rules that live behind bytes32 commitments. Starting with
 * ExecutionReceipt v5, `profileId` is a signed message field and identifies the
 * exact commitment, sentinel, scale and verdict semantics used by the issuer.
 *
 * Profiles are append-only. Never edit an existing profile body: add a new
 * body and id, keep the old entry in EXECUTION_PROFILES, and explicitly promote
 * the new id in a registry release. The pinned digest below makes an accidental
 * in-place edit fail closed during module initialisation and in CI.
 */

import { keccak256, toBytes } from 'viem';

export const EXECUTION_PROFILE_V1_BODY = {
  kind: 'ExecutionReceiptSemanticProfile',
  profileVersion: 1,
  receipt: {
    primaryType: 'ExecutionReceipt',
    profileIdSignedInSchemaVersions: [5],
    legacyImplicitSchemaVersions: [3, 4],
  },
  commitments: {
    preTradeUidsHash: {
      algorithm: 'keccak256',
      inclusion: 'omit entries equal to zero bytes32',
      ordering: 'route order, source first',
      encoding: 'concatenate each retained uid as 32 raw bytes without separators',
      emptyInput: 'keccak256 of empty bytes',
    },
    measuredFieldsHash: {
      algorithm: 'keccak256',
      universe: ['actualFeeUsd', 'executedAmountUsd', 'mevRiskBps', 'quotedAmountUsd'],
      normalization: 'deduplicate, sort lexicographically, then join with comma',
      encoding: 'UTF-8 bytes of the normalized string',
      emptyInput: 'keccak256 of empty bytes',
    },
    reasonCodesHash: {
      algorithm: 'keccak256',
      normalization: 'deduplicate and sort lexicographically',
      encoding: 'ABI encode the sorted values as string[]',
      emptyInput: 'keccak256 of ABI-encoded empty string[]',
    },
  },
  sentinels: {
    destinationPreTradeUid: {
      value: `0x${'0'.repeat(64)}`,
      meaning: 'no destination pre-trade gate; omitted from preTradeUidsHash',
    },
    attestationAgeAtExecSeconds: {
      value: 4294967295,
      meaning: 'paired pre-trade attestation did not exist at execution time',
    },
  },
  scales: {
    quotedPrice: 8,
    executedPrice: 8,
    quotedAmountUsd: 6,
    executedAmountUsd: 6,
    actualFeeUsd: 6,
    priceDeltaBps: 4,
    maxSlippageBps: 0,
    mevRiskBps: 4,
  },
  enumerations: {
    environment: ['production', 'nonproduction'],
    bindingMode: ['VERIFIED', 'SELF_REPORTED'],
    fillStatus: ['FULL', 'PARTIAL', 'REVERTED', 'FAILED'],
    priceExecutionStatus: ['FAITHFUL', 'DEVIATED', 'NOT_EXECUTED', 'UNDETERMINED'],
  },
  verdictRules: [
    'NOT_EXECUTED when fillStatus is REVERTED or FAILED',
    'UNDETERMINED when quotedPrice or executedPrice is not positive',
    'DEVIATED when slippageSatisfied is false',
    'DEVIATED when independenceSatisfied is false',
    'DEVIATED when fillStatus is PARTIAL',
    'UNDETERMINED when preTradeSignedAt is absent, non-positive, or after executedAt',
    'UNDETERMINED when executedAt is after a supplied preTradeValidUntil',
    'UNDETERMINED when bindingMode is not VERIFIED',
    'FAITHFUL otherwise',
  ],
} as const;

function profileDigest(body: unknown): `0x${string}` {
  return keccak256(toBytes(canonicalJson(body)));
}

/** Minimal RFC 8785-compatible canonical JSON encoder for JSON data. */
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
  throw new Error('Execution profile is not JCS-serializable');
}

// Initially calculated from the RFC 8785/JCS representation of the body above.
// This literal is intentionally separate from the body: editing v1 in place
// without creating v2 makes startup and the release tests fail closed.
export const EXECUTION_PROFILE_V1_ID =
  '0xe7513b059e9f8291bfa21250e0234661d74112a491efc6b40fbb56692013cb8e' as const;

const computedV1Id = profileDigest(EXECUTION_PROFILE_V1_BODY);
if (EXECUTION_PROFILE_V1_ID !== computedV1Id) {
  throw new Error(
    `Execution profile v1 is immutable: expected ${EXECUTION_PROFILE_V1_ID}, computed ${computedV1Id}`
  );
}

export const CURRENT_EXECUTION_PROFILE_ID = EXECUTION_PROFILE_V1_ID;

export const EXECUTION_PROFILES: Readonly<
  Record<`0x${string}`, Readonly<Record<string, unknown>>>
> = Object.freeze({
  [EXECUTION_PROFILE_V1_ID]: EXECUTION_PROFILE_V1_BODY,
});

export function executionProfileById(profileId: string) {
  return EXECUTION_PROFILES[profileId.toLowerCase() as `0x${string}`] ?? null;
}

export function isSupportedExecutionProfileId(profileId: unknown): profileId is `0x${string}` {
  return typeof profileId === 'string' && executionProfileById(profileId) !== null;
}
