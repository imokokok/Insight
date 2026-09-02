/**
 * EIP-712 domain + type descriptors for every Insight receipt schema.
 *
 * These constants are the verifier's ONLY source of truth for how a receipt is
 * hashed. They are deliberately NOT read from the document being verified —
 * a receipt carries an informational `eip712` block, but trusting it would let
 * an attacker ship a type layout that makes their own hash verify.
 *
 * DRIFT WARNING
 * -------------
 * These five layouts are duplicated from `src/lib/attestations/`. Duplication
 * is the point (this package must build and run with no access to the app),
 * but it is also the failure mode: editing one copy and not the other silently
 * breaks every independently-verified receipt.
 *
 * `src/lib/attestations/__tests__/verifierParity.test.ts` diffs the two copies
 * field-by-field and fails on any difference. If you change a layout here,
 * change it there too — the test is the only thing keeping them honest.
 *
 * Field order is load-bearing. Reordering, adding or removing a field changes
 * every UID and is a schema-version bump, not an edit.
 */

// ---------------------------------------------------------------------------
// Message shapes (bigint twin)
// ---------------------------------------------------------------------------

/**
 * viem's EIP-712 crypto ops require `bigint` for `uint256` fields. JSON cannot
 * carry bigint, so a receipt on the wire stores `number` and we widen here —
 * the same round trip the production signer does in reverse.
 */
export interface V1Message {
  verdict: string;
  asset: string;
  chainId: bigint;
  action: string;
  tradeAmountUsd: bigint;
  consensusPrice: bigint;
  maxDeviationBps: bigint;
  manipulationRiskBps: bigint;
  participantCount: bigint;
  checkedAt: bigint;
  schemaVersion: bigint;
}

export interface V2Message {
  verdict: string;
  sourceAssetId: string;
  destinationAssetId: string;
  subjectChainId: bigint;
  action: string;
  tradeAmountUsd: bigint;
  consensusPrice: bigint;
  maxDeviationBps: bigint;
  manipulationRiskBps: bigint;
  participantCount: bigint;
  requiredParticipantCount: bigint;
  coverageStatus: string;
  independenceStatus: string;
  sourceGroupCount: bigint;
  crossProviderAgreementBps: bigint;
  maxStablecoinDepegBps: bigint;
  maxDataAgeSeconds: bigint;
  recommendedMaxPositionUsd: bigint;
  reasonCodesHash: string;
  requestHash: string;
  evaluationScope: string;
  evaluatedAssetIdsHash: string;
  providerObservationsHash: string;
  validUntil: bigint;
  checkedAt: bigint;
  schemaVersion: bigint;
}

/** v3 = v2's 26 fields + the signed independence threshold. */
export interface V3Message extends V2Message {
  requiredSourceGroupCount: bigint;
}

/** v2 recheck = v2's 26 fields + 2 reference fields. `originalUid` is a
 *  `string` here — see the type layout note on RECHECK_V3_TYPES. */
export interface RecheckMessage extends V2Message {
  originalUid: string;
  originalRequestHash: string;
}

/** v3 recheck = v3's 27 fields + 2 reference fields, both `bytes32`. */
export interface RecheckV3Message extends V3Message {
  originalUid: string;
  originalRequestHash: string;
}

// ---------------------------------------------------------------------------
// v1 — 11 signed fields
// ---------------------------------------------------------------------------

/** Domain chainId=1 is a separator only. The real chain is `chainId` inside the
 *  message (v1) / `subjectChainId` (v2+). No verifyingContract: the receipt is
 *  never submitted on-chain. */
export const V1_DOMAIN = {
  name: 'Insight Oracle Safety',
  version: '1',
  chainId: 1,
} as const;

export const V1_PRIMARY_TYPE = 'OracleSafetyCheck';

export const V1_TYPES = {
  OracleSafetyCheck: [
    { name: 'verdict', type: 'string' },
    { name: 'asset', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'action', type: 'string' },
    { name: 'tradeAmountUsd', type: 'uint256' },
    { name: 'consensusPrice', type: 'uint256' },
    { name: 'maxDeviationBps', type: 'uint256' },
    { name: 'manipulationRiskBps', type: 'uint256' },
    { name: 'participantCount', type: 'uint256' },
    { name: 'checkedAt', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

// ---------------------------------------------------------------------------
// v2 — 26 signed fields
// ---------------------------------------------------------------------------

export const V2_DOMAIN = {
  name: 'Insight Oracle Safety',
  version: '2',
  chainId: 1,
} as const;

export const V2_PRIMARY_TYPE = 'OracleSafetyCheck';

export const V2_TYPES = {
  OracleSafetyCheck: [
    { name: 'verdict', type: 'string' },
    { name: 'sourceAssetId', type: 'string' },
    { name: 'destinationAssetId', type: 'string' },
    { name: 'subjectChainId', type: 'uint256' },
    { name: 'action', type: 'string' },
    { name: 'tradeAmountUsd', type: 'uint256' },
    { name: 'consensusPrice', type: 'uint256' },
    { name: 'maxDeviationBps', type: 'uint256' },
    { name: 'manipulationRiskBps', type: 'uint256' },
    { name: 'participantCount', type: 'uint256' },
    { name: 'requiredParticipantCount', type: 'uint256' },
    { name: 'coverageStatus', type: 'string' },
    { name: 'independenceStatus', type: 'string' },
    { name: 'sourceGroupCount', type: 'uint256' },
    { name: 'crossProviderAgreementBps', type: 'uint256' },
    { name: 'maxStablecoinDepegBps', type: 'uint256' },
    { name: 'maxDataAgeSeconds', type: 'uint256' },
    { name: 'recommendedMaxPositionUsd', type: 'uint256' },
    { name: 'reasonCodesHash', type: 'bytes32' },
    { name: 'requestHash', type: 'bytes32' },
    { name: 'evaluationScope', type: 'string' },
    { name: 'evaluatedAssetIdsHash', type: 'bytes32' },
    { name: 'providerObservationsHash', type: 'bytes32' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'checkedAt', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

// ---------------------------------------------------------------------------
// v3 — 27 signed fields (v2 + the independence threshold)
// ---------------------------------------------------------------------------

export const V3_DOMAIN = {
  name: 'Insight Oracle Safety',
  version: '3',
  chainId: 1,
} as const;

export const V3_PRIMARY_TYPE = 'OracleSafetyCheck';

const V3_ADDED_FIELDS = [{ name: 'requiredSourceGroupCount', type: 'uint256' }] as const;

/**
 * Derived from v2 the same way production derives it, so the two can never
 * disagree about the shared prefix. Note this is a statement about the SCHEMA,
 * not the values: `schemaVersion` reads 3 in a v3 receipt, not 2.
 */
export const V3_TYPES = {
  OracleSafetyCheck: [...V2_TYPES.OracleSafetyCheck, ...V3_ADDED_FIELDS],
} as const;

// ---------------------------------------------------------------------------
// v2 recheck — 28 signed fields
// ---------------------------------------------------------------------------

export const RECHECK_DOMAIN = V2_DOMAIN;
export const RECHECK_PRIMARY_TYPE = 'OracleSafetyRecheck';

export const RECHECK_TYPES = {
  OracleSafetyRecheck: [
    ...V2_TYPES.OracleSafetyCheck,
    { name: 'originalUid', type: 'string' },
    { name: 'originalRequestHash', type: 'bytes32' },
  ],
} as const;

// ---------------------------------------------------------------------------
// v3 recheck — 29 signed fields
// ---------------------------------------------------------------------------

export const RECHECK_V3_DOMAIN = V3_DOMAIN;
export const RECHECK_V3_PRIMARY_TYPE = 'OracleSafetyRecheck';

/**
 * `originalUid` is `bytes32` here and `string` in the v2 recheck. That
 * asymmetry is deliberate and must be preserved: a UID is a 32-byte hash, so
 * `bytes32` is its honest type, but v2 already committed to keccak256(ascii)
 * and changing it there would invalidate every v2 recheck ever issued.
 */
export const RECHECK_V3_TYPES = {
  OracleSafetyRecheck: [
    ...V3_TYPES.OracleSafetyCheck,
    { name: 'originalUid', type: 'bytes32' },
    { name: 'originalRequestHash', type: 'bytes32' },
  ],
} as const;

/** Envelope discriminator. A recheck carries `type: 'OracleSafetyRecheck'`
 *  and/or `eip712.primaryType: 'OracleSafetyRecheck'`; either is enough to
 *  route it away from the plain-check verifier. */
export const RECHECK_TYPE = 'OracleSafetyRecheck';

// ---------------------------------------------------------------------------
// Widening: JSON numbers -> bigint for viem
// ---------------------------------------------------------------------------

/**
 * Widen one `uint256` field. Throws on anything that is not an integer, a
 * numeric string or a bigint — the caller's try/catch turns that into
 * `valid: false` with a readable reason, which is the correct answer for a
 * malformed receipt.
 */
function uint(value: unknown, field: string): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`field "${field}" is not a uint256: ${String(value)}`);
    }
    return BigInt(value);
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value);
  throw new Error(`field "${field}" is not a uint256: ${typeof value}`);
}

/** Widen one `string` field. Same fail-closed contract as {@link uint}. */
function str(value: unknown, field: string): string {
  if (typeof value === 'string') return value;
  throw new Error(`field "${field}" is not a string: ${typeof value}`);
}

function pick(data: Record<string, unknown>, field: string): unknown {
  return data[field];
}

export function toV1Message(data: Record<string, unknown>): V1Message {
  return {
    verdict: str(pick(data, 'verdict'), 'verdict'),
    asset: str(pick(data, 'asset'), 'asset'),
    chainId: uint(pick(data, 'chainId'), 'chainId'),
    action: str(pick(data, 'action'), 'action'),
    tradeAmountUsd: uint(pick(data, 'tradeAmountUsd'), 'tradeAmountUsd'),
    consensusPrice: uint(pick(data, 'consensusPrice'), 'consensusPrice'),
    maxDeviationBps: uint(pick(data, 'maxDeviationBps'), 'maxDeviationBps'),
    manipulationRiskBps: uint(pick(data, 'manipulationRiskBps'), 'manipulationRiskBps'),
    participantCount: uint(pick(data, 'participantCount'), 'participantCount'),
    checkedAt: uint(pick(data, 'checkedAt'), 'checkedAt'),
    schemaVersion: uint(pick(data, 'schemaVersion'), 'schemaVersion'),
  };
}

export function toV2Message(data: Record<string, unknown>): V2Message {
  return {
    verdict: str(pick(data, 'verdict'), 'verdict'),
    sourceAssetId: str(pick(data, 'sourceAssetId'), 'sourceAssetId'),
    destinationAssetId: str(pick(data, 'destinationAssetId'), 'destinationAssetId'),
    subjectChainId: uint(pick(data, 'subjectChainId'), 'subjectChainId'),
    action: str(pick(data, 'action'), 'action'),
    tradeAmountUsd: uint(pick(data, 'tradeAmountUsd'), 'tradeAmountUsd'),
    consensusPrice: uint(pick(data, 'consensusPrice'), 'consensusPrice'),
    maxDeviationBps: uint(pick(data, 'maxDeviationBps'), 'maxDeviationBps'),
    manipulationRiskBps: uint(pick(data, 'manipulationRiskBps'), 'manipulationRiskBps'),
    participantCount: uint(pick(data, 'participantCount'), 'participantCount'),
    requiredParticipantCount: uint(
      pick(data, 'requiredParticipantCount'),
      'requiredParticipantCount'
    ),
    coverageStatus: str(pick(data, 'coverageStatus'), 'coverageStatus'),
    independenceStatus: str(pick(data, 'independenceStatus'), 'independenceStatus'),
    sourceGroupCount: uint(pick(data, 'sourceGroupCount'), 'sourceGroupCount'),
    crossProviderAgreementBps: uint(
      pick(data, 'crossProviderAgreementBps'),
      'crossProviderAgreementBps'
    ),
    maxStablecoinDepegBps: uint(pick(data, 'maxStablecoinDepegBps'), 'maxStablecoinDepegBps'),
    maxDataAgeSeconds: uint(pick(data, 'maxDataAgeSeconds'), 'maxDataAgeSeconds'),
    recommendedMaxPositionUsd: uint(
      pick(data, 'recommendedMaxPositionUsd'),
      'recommendedMaxPositionUsd'
    ),
    reasonCodesHash: str(pick(data, 'reasonCodesHash'), 'reasonCodesHash'),
    requestHash: str(pick(data, 'requestHash'), 'requestHash'),
    evaluationScope: str(pick(data, 'evaluationScope'), 'evaluationScope'),
    evaluatedAssetIdsHash: str(pick(data, 'evaluatedAssetIdsHash'), 'evaluatedAssetIdsHash'),
    providerObservationsHash: str(
      pick(data, 'providerObservationsHash'),
      'providerObservationsHash'
    ),
    validUntil: uint(pick(data, 'validUntil'), 'validUntil'),
    checkedAt: uint(pick(data, 'checkedAt'), 'checkedAt'),
    schemaVersion: uint(pick(data, 'schemaVersion'), 'schemaVersion'),
  };
}

/** v3 message = v2's widening + the one appended threshold. Reuses
 *  {@link toV2Message} so the shared 26 fields can never drift apart inside
 *  this package either. */
export function toV3Message(data: Record<string, unknown>): V3Message {
  return {
    ...toV2Message(data),
    requiredSourceGroupCount: uint(
      pick(data, 'requiredSourceGroupCount'),
      'requiredSourceGroupCount'
    ),
  };
}

export function toRecheckMessage(data: Record<string, unknown>): RecheckMessage {
  return {
    ...toV2Message(data),
    originalUid: str(pick(data, 'originalUid'), 'originalUid'),
    originalRequestHash: str(pick(data, 'originalRequestHash'), 'originalRequestHash'),
  };
}

export function toRecheckV3Message(data: Record<string, unknown>): RecheckV3Message {
  return {
    ...toV3Message(data),
    originalUid: str(pick(data, 'originalUid'), 'originalUid'),
    originalRequestHash: str(pick(data, 'originalRequestHash'), 'originalRequestHash'),
  };
}

// ---------------------------------------------------------------------------
// Schema registry — machine-readable descriptor of every supported layout
// ---------------------------------------------------------------------------

export type SchemaId = 'v1' | 'v2' | 'v3' | 'recheck' | 'recheckV3';

export const DOMAIN_BY_SCHEMA = {
  v1: V1_DOMAIN,
  v2: V2_DOMAIN,
  v3: V3_DOMAIN,
  recheck: RECHECK_DOMAIN,
  recheckV3: RECHECK_V3_DOMAIN,
} as const;

export const TYPES_BY_SCHEMA = {
  v1: V1_TYPES,
  v2: V2_TYPES,
  v3: V3_TYPES,
  recheck: RECHECK_TYPES,
  recheckV3: RECHECK_V3_TYPES,
} as const;

export const PRIMARY_TYPE_BY_SCHEMA = {
  v1: V1_PRIMARY_TYPE,
  v2: V2_PRIMARY_TYPE,
  v3: V3_PRIMARY_TYPE,
  recheck: RECHECK_PRIMARY_TYPE,
  recheckV3: RECHECK_V3_PRIMARY_TYPE,
} as const;

/** Canonical, order-stable JSON of a layout. Used by the parity test to diff
 *  this copy against the app's copy. */
export function layoutFingerprint(schema: SchemaId): string {
  return JSON.stringify(TYPES_BY_SCHEMA[schema]);
}
