/**
 * @fileoverview v2 EIP-712 oracle safety attestation.
 *
 * Implements Raul's locked v2 schema (26 signed fields). Coexists with v1:
 * the pre-trade service routes by schemaVersion, and the verify endpoint
 * selects the domain/types by the attestation's schemaVersion. v1 is left
 * untouched (its PASS path is the one Raul already verified end-to-end).
 *
 * What v2 adds over v1 (all driven by Raul's "unsigned v1 fields" review):
 *   - Pair binding via CAIP-19 sourceAssetId + destinationAssetId (not the
 *     raw symbol/chain the agent passed — the canonical on-chain asset id).
 *   - requestHash: EIP-712 typed commitment over CanonicalPreTradeRequest.
 *   - providerObservationsHash: binds WHICH providers/feeds produced the verdict.
 *   - reasonCodesHash: distinguishes BLOCK-from-missing-evidence vs
 *     BLOCK-from-market-danger without expanding the signed field set.
 *   - Quorum gate: participantCount vs requiredParticipantCount(=3) →
 *     coverageStatus (SUFFICIENT / INSUFFICIENT).
 *   - Independence gate (v2.1): distinct NON-DERIVED source groups vs
 *     V2_REQUIRED_NON_DERIVED_GROUPS(=2) → independenceStatus
 *     (ASSESSED / INSUFFICIENT_INDEPENDENCE) and sourceGroupCount. TWAP is
 *     derived and excluded from the group count (Raul 16:09). This is orthogonal
 *     to the quorum gate: a fake quorum (>=3 participants, same operator) fails
 *     independence even though the participant count clears the quorum.
 *   - evaluationScope = SOURCE_ASSET_ONLY + evaluatedAssetIdsHash (v2.0 only
 *     evaluates the source leg; destinationAssetId is BOUND but not EVALUATED).
 *   - validUntil + checkedAt bound the attestation window explicitly.
 *
 * Determinism: requestHash / providerObservationsHash / reasonCodesHash /
 * evaluatedAssetIdsHash are all pure & deterministic (see their modules), so a
 * fixed AttestationInputV2 always produces the same UID — reproducible by both
 * Insight and ThoughtProof. The signed message uses uint256/bytes32/string
 * scalars only (no nested structs, no arrays) so the EIP-712 type layout is
 * fixed and the UID is stable.
 */

import { createLogger } from '@/lib/utils/logger';
import { nowInSeconds } from '@/lib/utils/time';

import { getAttesterAccount, getSampleAttesterAccount } from './attesterAccount';
import {
  CANONICAL_REQUEST_DOMAIN,
  CANONICAL_REQUEST_PRIMARY_TYPE,
  CANONICAL_REQUEST_TYPES,
  computeRequestHash,
} from './canonicalRequestHash';
import {
  type ProviderObservationEntry,
  computeProviderObservationsHash,
} from './providerObservationsHash';
import { computeReasonCodesHash, reasonCodesFromContributingFactors } from './reasonCodesHash';
import { nonDerivedGroupCount } from './sourceGroups';

const logger = createLogger('OracleSafetyAttestationV2');

export const V2_SCHEMA_VERSION = 2;
/** How long a v2 attestation is considered meaningful. */
export const V2_VALID_FOR_SECONDS = 600;
/** Quorum floor: fewer independent providers than this → INSUFFICIENT coverage. */
export const V2_REQUIRED_PARTICIPANT_COUNT = 3;
/** Independence floor: fewer distinct NON-DERIVED operator groups than this →
 *  INSUFFICIENT_INDEPENDENCE. Raul 16:09: TWAP (derived) does NOT count. */
export const V2_REQUIRED_NON_DERIVED_GROUPS = 2;
/** Attester label (human-readable) carried in the JSON envelope, not signed. */
export const V2_ATTESTER_LABEL = 'Insight Oracle Safety Attestation';

// ---------------------------------------------------------------------------
// Scaling (matches v1 + the canonical-request scale factors)
// ---------------------------------------------------------------------------

const PRICE_SCALE = 1e8; // prices → uint256
const USD_SCALE = 1e6; // USD amounts → uint256
const PCT_SCALE = 100; // percent (e.g. 1.5%) → bps (150) → uint256
const AGREEMENT_SCALE = 1e4; // 0..1 agreement → uint256
const MANIP_SCALE = 1e4; // 0..1 manipulation risk → uint256

/** Returns a JSON-serializable uint256-encoded number. viem's EIP-712 crypto
 *  ops require bigint, so the public {@link AttestationDataV2} stores numbers
 *  and {@link toBigIntMessageV2} widens them back only for hashTypedData /
 *  verifyTypedData — mirroring v1's design (JSON can't serialize bigint, and a
 *  verify endpoint receives numbers, not bigints, off the wire). All values
 *  stay well under Number.MAX_SAFE_INTEGER (prices ×1e8, USD ×1e6, unix seconds,
 *  counts), so the number↔bigint round trip is exact. */
function toUint(n: number, scale: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * scale));
}

// ---------------------------------------------------------------------------
// EIP-712 domain + types (v2)
// ---------------------------------------------------------------------------

/** Domain chainId=1 is a separator only — real chain is subjectChainId. */
export const V2_DOMAIN = {
  name: 'Insight Oracle Safety',
  version: '2',
  chainId: 1,
} as const;

export const V2_PRIMARY_TYPE = 'OracleSafetyCheck';

/**
 * The 26 signed fields. Enums are encoded as `string` (portable across EIP-712
 * implementations); hashes are `bytes32`. Field order is fixed — changing it
 * changes every UID and is a schema-version bump.
 */
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
// Status enums (string-valued; carried as `string` in the EIP-712 type)
// ---------------------------------------------------------------------------

export type CoverageStatus = 'SUFFICIENT' | 'INSUFFICIENT';
export type IndependenceStatus = 'ASSESSED' | 'INSUFFICIENT_INDEPENDENCE';
export type EvaluationScope = 'SOURCE_ASSET_ONLY'; // v2.1 will add SOURCE_AND_DESTINATION

function deriveCoverageStatus(participantCount: number): CoverageStatus {
  return participantCount >= V2_REQUIRED_PARTICIPANT_COUNT ? 'SUFFICIENT' : 'INSUFFICIENT';
}

// ---------------------------------------------------------------------------
// Signed message shape
// ---------------------------------------------------------------------------

/**
 * The 26 signed fields as JSON-serializable numbers / hex strings. uint256
 * fields are stored as `number` (NOT bigint) so the attestation can travel
 * through the API response and the verify endpoint's JSON body without
 * serialization breakage. {@link toBigIntMessageV2} widens these back to
 * bigint for viem's EIP-712 hashTypedData / verifyTypedData calls.
 *
 * Hash fields (`reasonCodesHash` / `requestHash` / `evaluatedAssetIdsHash` /
 * `providerObservationsHash`) are `0x${string}` — hex survives JSON round trips
 * unchanged and viem accepts hex for `bytes32`.
 */
export interface AttestationDataV2 {
  verdict: string;
  sourceAssetId: string;
  destinationAssetId: string;
  subjectChainId: number;
  action: string;
  tradeAmountUsd: number;
  consensusPrice: number;
  maxDeviationBps: number;
  manipulationRiskBps: number;
  participantCount: number;
  requiredParticipantCount: number;
  coverageStatus: CoverageStatus;
  independenceStatus: IndependenceStatus;
  sourceGroupCount: number;
  crossProviderAgreementBps: number;
  maxStablecoinDepegBps: number;
  maxDataAgeSeconds: number;
  recommendedMaxPositionUsd: number;
  reasonCodesHash: `0x${string}`;
  requestHash: `0x${string}`;
  evaluationScope: EvaluationScope;
  evaluatedAssetIdsHash: `0x${string}`;
  providerObservationsHash: `0x${string}`;
  validUntil: number;
  checkedAt: number;
  schemaVersion: number;
}

/**
 * BigInt twin of {@link AttestationDataV2}. viem's EIP-712 crypto ops require
 * bigint for `uint256` fields; this is the shape fed to hashTypedData /
 * verifyTypedData. It is NEVER serialized to JSON (the public attestation
 * carries the number-valued {@link AttestationDataV2} instead).
 */
export interface V2BigIntMessage {
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
  reasonCodesHash: `0x${string}`;
  requestHash: `0x${string}`;
  evaluationScope: string;
  evaluatedAssetIdsHash: `0x${string}`;
  providerObservationsHash: `0x${string}`;
  validUntil: bigint;
  checkedAt: bigint;
  schemaVersion: bigint;
}

/** Widen the JSON-serializable {@link AttestationDataV2} to its bigint twin
 *  for viem EIP-712 crypto ops. Pure / synchronous / deterministic.
 *
 *  Exported so v3 can reuse the 26-field widening instead of re-implementing
 *  it (v3 = these 26 fields + one appended threshold). The widened values are
 *  whatever the caller passes, so v3 feeds it a message whose `schemaVersion`
 *  is already 3. */
export function toBigIntMessageV2(data: AttestationDataV2): V2BigIntMessage {
  return {
    verdict: data.verdict,
    sourceAssetId: data.sourceAssetId,
    destinationAssetId: data.destinationAssetId,
    subjectChainId: BigInt(data.subjectChainId),
    action: data.action,
    tradeAmountUsd: BigInt(data.tradeAmountUsd),
    consensusPrice: BigInt(data.consensusPrice),
    maxDeviationBps: BigInt(data.maxDeviationBps),
    manipulationRiskBps: BigInt(data.manipulationRiskBps),
    participantCount: BigInt(data.participantCount),
    requiredParticipantCount: BigInt(data.requiredParticipantCount),
    coverageStatus: data.coverageStatus,
    independenceStatus: data.independenceStatus,
    sourceGroupCount: BigInt(data.sourceGroupCount),
    crossProviderAgreementBps: BigInt(data.crossProviderAgreementBps),
    maxStablecoinDepegBps: BigInt(data.maxStablecoinDepegBps),
    maxDataAgeSeconds: BigInt(data.maxDataAgeSeconds),
    recommendedMaxPositionUsd: BigInt(data.recommendedMaxPositionUsd),
    reasonCodesHash: data.reasonCodesHash,
    requestHash: data.requestHash,
    evaluationScope: data.evaluationScope,
    evaluatedAssetIdsHash: data.evaluatedAssetIdsHash,
    providerObservationsHash: data.providerObservationsHash,
    validUntil: BigInt(data.validUntil),
    checkedAt: BigInt(data.checkedAt),
    schemaVersion: BigInt(data.schemaVersion),
  };
}

/** Raw (un-scaled) inputs the pre-trade service provides. Hash + status fields
 *  are DERIVED inside buildMessage so the attestation can't disagree with its
 *  own signed evidence. */
export interface AttestationInputV2 {
  verdict: string;
  /** CAIP-19 source asset id (pre-resolved via the caip19 module). */
  sourceAssetId: string;
  /** CAIP-19 destination asset id (pre-resolved). */
  destinationAssetId: string;
  subjectChainId: number;
  action: string;
  tradeAmountUsd: number;
  consensusPrice: number;
  /** Max cross-provider deviation, percent (e.g. 1.5 = 1.5%). */
  maxDeviationPct: number;
  /** Manipulation risk score, 0..1. */
  manipulationRiskScore: number;
  participantCount: number;
  /** Cross-provider agreement, 0..1. */
  crossProviderAgreement: number;
  /** Worst stablecoin depeg, percent (0 if none / not a stablecoin). */
  maxStablecoinDepegPct: number;
  /** Max data age across included providers, seconds. */
  maxDataAgeSeconds: number;
  recommendedMaxPositionUsd: number;
  /** Contributing factors → reason codes (rule strings from the engine). */
  contributingFactors: ReadonlyArray<{ rule: string }>;
  /** Per-provider observation entries (included AND excluded). */
  providerObservations: ProviderObservationEntry[];
  /** Optional override of the check time (tests). Defaults to Date.now(). */
  checkedAtMs?: number;
}

// ---------------------------------------------------------------------------
// evaluatedAssetIdsHash (v2.0: only the source leg is evaluated)
// ---------------------------------------------------------------------------

async function computeEvaluatedAssetIdsHash(evaluatedAssetIds: string[]): Promise<`0x${string}`> {
  const { encodeAbiParameters, keccak256 } = await import('viem');
  const sorted = [...new Set(evaluatedAssetIds)].sort();
  return keccak256(
    encodeAbiParameters([{ type: 'string[]', name: 'assetIds' }], [sorted])
  ) as `0x${string}`;
}

// ---------------------------------------------------------------------------
// Message construction
// ---------------------------------------------------------------------------

export async function buildMessage(input: AttestationInputV2): Promise<AttestationDataV2> {
  const checkedAtMs = input.checkedAtMs ?? Date.now();
  const checkedAt = Math.floor(checkedAtMs / 1000);
  const validUntil = checkedAt + V2_VALID_FOR_SECONDS;

  // Derived hash commitments — pure functions of the inputs.
  const requestHash = computeRequestHash({
    subjectChainId: input.subjectChainId,
    sourceAssetId: input.sourceAssetId,
    destinationAssetId: input.destinationAssetId,
    action: input.action,
    tradeAmountUsd: input.tradeAmountUsd,
  });

  const reasonCodes = reasonCodesFromContributingFactors(input.contributingFactors);
  const reasonCodesHash = computeReasonCodesHash(reasonCodes);

  const providerObservationsHash = computeProviderObservationsHash(input.providerObservations);

  // v2.1 independence gate: count distinct NON-DERIVED source groups among the
  // included providers. Derived sources (TWAP) are excluded from the count per
  // Raul 16:09, but still feed the quorum. This is DERIVED inside buildMessage so
  // the attestation can't disagree with its own signed evidence (same reason the
  // hashes are derived here). Orthogonal to the quorum gate in the service.
  const includedProviders = input.providerObservations
    .filter((o) => o.included)
    .map((o) => o.provider);
  const nonDerivedGroups = nonDerivedGroupCount(includedProviders);
  const independenceStatus: IndependenceStatus =
    nonDerivedGroups >= V2_REQUIRED_NON_DERIVED_GROUPS ? 'ASSESSED' : 'INSUFFICIENT_INDEPENDENCE';

  // v2.0 evaluation scope: only the source leg is evaluated.
  const evaluatedAssetIdsHash = await computeEvaluatedAssetIdsHash([input.sourceAssetId]);

  return {
    verdict: input.verdict,
    sourceAssetId: input.sourceAssetId,
    destinationAssetId: input.destinationAssetId,
    subjectChainId: input.subjectChainId,
    action: input.action,
    tradeAmountUsd: toUint(input.tradeAmountUsd, USD_SCALE),
    consensusPrice: toUint(input.consensusPrice, PRICE_SCALE),
    maxDeviationBps: toUint(input.maxDeviationPct, PCT_SCALE),
    manipulationRiskBps: toUint(input.manipulationRiskScore, MANIP_SCALE),
    participantCount: Math.max(0, Math.floor(input.participantCount)),
    requiredParticipantCount: V2_REQUIRED_PARTICIPANT_COUNT,
    coverageStatus: deriveCoverageStatus(input.participantCount),
    independenceStatus,
    sourceGroupCount: nonDerivedGroups,
    crossProviderAgreementBps: toUint(input.crossProviderAgreement, AGREEMENT_SCALE),
    maxStablecoinDepegBps: toUint(input.maxStablecoinDepegPct, PCT_SCALE),
    maxDataAgeSeconds: Math.max(0, Math.floor(input.maxDataAgeSeconds)),
    recommendedMaxPositionUsd: toUint(input.recommendedMaxPositionUsd, USD_SCALE),
    reasonCodesHash,
    requestHash,
    evaluationScope: 'SOURCE_ASSET_ONLY',
    evaluatedAssetIdsHash,
    providerObservationsHash,
    validUntil,
    checkedAt,
    schemaVersion: V2_SCHEMA_VERSION,
  };
}

/** EIP-712 typed-data args (domain + types + message) — shared by sign/verify.
 *  The message is widened to its bigint twin here so viem's crypto ops receive
 *  the uint256 values they require, while the public attestation carries the
 *  JSON-serializable number-valued data. */
export function v2TypedDataArgs(message: AttestationDataV2) {
  return {
    domain: V2_DOMAIN,
    types: V2_TYPES,
    primaryType: V2_PRIMARY_TYPE,
    message: toBigIntMessageV2(message),
  } as const;
}

// ---------------------------------------------------------------------------
// Public envelope
// ---------------------------------------------------------------------------

export interface OracleSafetyAttestationV2 {
  uid: string;
  schemaVersion: 2;
  attester: string;
  attesterLabel: string;
  signedAt: string;
  validForSeconds: number;
  validUntil: number;
  signature: string;
  verifyUrl: string;
  data: AttestationDataV2;
  eip712: {
    domain: typeof V2_DOMAIN;
    types: typeof V2_TYPES;
    primaryType: typeof V2_PRIMARY_TYPE;
    canonicalRequestDomain: typeof CANONICAL_REQUEST_DOMAIN;
    canonicalRequestTypes: typeof CANONICAL_REQUEST_TYPES;
    canonicalRequestPrimaryType: typeof CANONICAL_REQUEST_PRIMARY_TYPE;
  };
}

function getVerifyUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://www.oracleinsight.xyz'
      : 'http://localhost:3000');
  return `${base}/api/v1/safety/attestation/verify`;
}

// ---------------------------------------------------------------------------
// Sign
// ---------------------------------------------------------------------------

export async function signAttestationV2(
  input: AttestationInputV2,
  opts?: { sample?: boolean }
): Promise<OracleSafetyAttestationV2 | null> {
  // opts.sample (Headless H8, 2026-09-02): dedicated sample signer, labelled
  // role "sample" in the .well-known registry; null (fail-closed) when the
  // sample key is unconfigured — the production key never signs a sample.
  const account = opts?.sample ? await getSampleAttesterAccount() : await getAttesterAccount();
  if (!account) return null;

  try {
    const { hashTypedData } = await import('viem');
    const message = await buildMessage(input);
    const args = v2TypedDataArgs(message);

    const signature = await account.signTypedData(args);
    const uid = hashTypedData(args);

    return {
      uid,
      schemaVersion: V2_SCHEMA_VERSION,
      attester: account.address,
      attesterLabel: V2_ATTESTER_LABEL,
      signedAt: new Date().toISOString(),
      validForSeconds: V2_VALID_FOR_SECONDS,
      validUntil: Number(message.validUntil),
      signature,
      verifyUrl: getVerifyUrl(),
      data: message,
      eip712: {
        domain: V2_DOMAIN,
        types: V2_TYPES,
        primaryType: V2_PRIMARY_TYPE,
        canonicalRequestDomain: CANONICAL_REQUEST_DOMAIN,
        canonicalRequestTypes: CANONICAL_REQUEST_TYPES,
        canonicalRequestPrimaryType: CANONICAL_REQUEST_PRIMARY_TYPE,
      },
    };
  } catch (error) {
    logger.warn('Failed to sign v2 attestation', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Verify
// ---------------------------------------------------------------------------

export interface VerificationResultV2 {
  valid: boolean;
  attester: string;
  uid: string | null;
  checkedAt: number | null;
  validUntil: number | null;
  expired: boolean;
  reason?: string;
}

export async function verifyAttestationV2(
  attestation: OracleSafetyAttestationV2
): Promise<VerificationResultV2> {
  try {
    const { verifyTypedData, hashTypedData } = await import('viem');
    const message = attestation.data;
    const args = v2TypedDataArgs(message);

    const expectedUid = hashTypedData(args);
    if (expectedUid !== attestation.uid) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: attestation.uid,
        checkedAt: Number(message.checkedAt) || null,
        validUntil: Number(message.validUntil) || null,
        expired: false,
        reason: 'uid_mismatch: data was modified after signing',
      };
    }

    const valid = await verifyTypedData({
      ...args,
      address: attestation.attester as `0x${string}`,
      signature: attestation.signature as `0x${string}`,
    });

    if (!valid) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: attestation.uid,
        checkedAt: Number(message.checkedAt) || null,
        validUntil: Number(message.validUntil) || null,
        expired: false,
        reason: 'signature_invalid',
      };
    }

    const now = nowInSeconds();
    const validUntil = Number(message.validUntil);
    const expired = now > validUntil;

    return {
      valid: !expired,
      attester: attestation.attester,
      uid: attestation.uid,
      checkedAt: Number(message.checkedAt) || null,
      validUntil,
      expired,
      reason: expired ? 'expired' : undefined,
    };
  } catch (error) {
    return {
      valid: false,
      attester: attestation.attester ?? '',
      uid: attestation.uid ?? null,
      checkedAt: null,
      validUntil: null,
      expired: false,
      reason: error instanceof Error ? error.message : 'verify_failed',
    };
  }
}
