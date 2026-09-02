/**
 * @fileoverview Oracle Watch attestation — a signed, independently verifiable
 * record of the always-on cross-oracle trust signal.
 *
 * Pre-trade answers "can I trade this price right now?" and signs that answer.
 * Oracle Watch answers "can my strategy keep depending on this feed?" and had no
 * equivalent: its signal was an API return value nobody could verify after the
 * fact. This module closes that gap using the SAME attester account, the SAME
 * EIP-712 machinery and the SAME evidence-binding primitives as the pre-trade
 * attestations (v1/v2/v3). Those versions are untouched.
 *
 * Design rules inherited from the pre-trade line, because each was paid for by a
 * partner finding:
 *
 *   - Thresholds that gate the verdict are SIGNED alongside the value they are
 *     compared against, so a receipt is self-contained. `requiredParticipantCount`
 *     is the quorum floor the signal is judged against; without it a holder would
 *     need our source code to interpret a document we signed.
 *   - Evidence provenance is bound by `providerObservationsHash`, which covers
 *     both included AND excluded observations (participantCount alone does not
 *     say which providers produced the verdict).
 *   - A missing attester key means "attestations unavailable", never a different
 *     verdict. Signing is additive; it must never become a safety dependency.
 *
 * Scale conventions match the pre-trade line so one verifier handles both:
 *   price → 1e8, deviation percentage → 1e2 (basis points), ratio → 1e4.
 */

import type { OracleWatchProvider, OracleWatchResult } from '@/lib/api/services/oracleWatchService';
import { createLogger } from '@/lib/utils/logger';
import { nowInSeconds } from '@/lib/utils/time';

import { getAttesterAccount, getSampleAttesterAccount } from './attesterAccount';
import {
  computeProviderObservationsHash,
  type ProviderObservationEntry,
} from './providerObservationsHash';
import { computeReasonCodesHash } from './reasonCodesHash';

const logger = createLogger('OracleWatchAttestation');

/**
 * v1 is RETIRED FOR SIGNING but must stay verifiable: receipts already handed
 * to counterparties under it have to keep validating after the upgrade. New
 * receipts are issued as v2.
 */
export const WATCH_SCHEMA_VERSION = 1;
export const WATCH_SCHEMA_VERSION_V2 = 2;
/** Schema version new receipts are signed with. */
export const CURRENT_WATCH_SCHEMA_VERSION = WATCH_SCHEMA_VERSION_V2;

/**
 * How long a watch attestation is considered meaningful. Mirrors the pre-trade
 * window: the signal is live and re-evaluated continuously, so a receipt is a
 * statement about a moment, not a subscription.
 */
export const WATCH_VALID_FOR_SECONDS = 600;

/** Independence/coverage floor the quorum flag is judged against (QUORUM_MIN). */
export const WATCH_REQUIRED_PARTICIPANT_COUNT = 3;

/** Independence floor: distinct NON-DERIVED operator groups required
 *  (INDEPENDENCE_MIN in oracleWatchService). Signed alongside the observed
 *  count so a receipt is self-contained — a holder can check the independence
 *  gate without our source code. */
export const WATCH_REQUIRED_SOURCE_GROUP_COUNT = 2;

/** EIP-712 domain. Distinct `name` from the pre-trade domain so the two can
 *  never be replayed across surfaces. chainId=1 is a separator only. */
export const WATCH_DOMAIN = {
  name: 'Insight Oracle Watch',
  version: '1',
  chainId: 1,
} as const;

export const WATCH_PRIMARY_TYPE = 'OracleWatchCheck';

/**
 * v1 type layout — FROZEN. Reordering or editing these fields changes every
 * v1 UID, which would invalidate receipts already in counterparties' hands.
 * Kept exclusively so historical v1 receipts keep verifying.
 *
 * Field order is fixed — reordering changes every UID and is a schema bump.
 */
export const WATCH_TYPES = {
  OracleWatchCheck: [
    { name: 'symbol', type: 'string' },
    { name: 'subjectChainId', type: 'uint256' },
    { name: 'verdict', type: 'string' },
    { name: 'recommendation', type: 'string' },
    { name: 'reason', type: 'string' },
    { name: 'trustScore', type: 'uint256' },
    { name: 'trustLevel', type: 'string' },
    { name: 'consensusPrice', type: 'uint256' },
    { name: 'maxDeviationBps', type: 'uint256' },
    { name: 'agreementBps', type: 'uint256' },
    { name: 'participantCount', type: 'uint256' },
    { name: 'requiredParticipantCount', type: 'uint256' },
    { name: 'quorumSatisfied', type: 'bool' },
    { name: 'outlierCount', type: 'uint256' },
    { name: 'staleCount', type: 'uint256' },
    { name: 'mlRiskBps', type: 'uint256' },
    { name: 'avgReputationBps', type: 'uint256' },
    { name: 'providerObservationsHash', type: 'bytes32' },
    { name: 'requestHash', type: 'bytes32' },
    { name: 'evaluatedAt', type: 'uint256' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

/**
 * v2 type layout — adds the independence gate and the reason codes to the
 * signed surface.
 *
 * Three fields are new relative to v1:
 *   - `sourceGroupCount` + `requiredSourceGroupCount` + `independenceSatisfied`:
 *     the independence gate, self-verifying. Without them a holder cannot tell
 *     whether "quorum satisfied" means three independent operators or three
 *     wrappers of one operator — the exact failure pre-trade paid for in v2.1.
 *   - `reasonCodesHash`: binds the composable reason-code set (NO_COVERAGE /
 *     INSUFFICIENT_QUORUM / INSUFFICIENT_INDEPENDENCE / MAX_DEVIATION /
 *     LOW_AGREEMENT / OUTLIER_PRESENT / STALE_DATA / ML_FORWARD_RISK_HIGH) so a
 *     "pause when DANGER" policy can be explained and audited after the fact.
 *
 * v1's field order and names are preserved verbatim inside v2; the new fields
 * are inserted after `quorumSatisfied` (grouping the gates together) and after
 * `providerObservationsHash` (grouping the evidence hashes together).
 */
export const WATCH_TYPES_V2 = {
  OracleWatchCheck: [
    { name: 'symbol', type: 'string' },
    { name: 'subjectChainId', type: 'uint256' },
    { name: 'verdict', type: 'string' },
    { name: 'recommendation', type: 'string' },
    { name: 'reason', type: 'string' },
    { name: 'trustScore', type: 'uint256' },
    { name: 'trustLevel', type: 'string' },
    { name: 'consensusPrice', type: 'uint256' },
    { name: 'maxDeviationBps', type: 'uint256' },
    { name: 'agreementBps', type: 'uint256' },
    { name: 'participantCount', type: 'uint256' },
    { name: 'requiredParticipantCount', type: 'uint256' },
    { name: 'quorumSatisfied', type: 'bool' },
    { name: 'sourceGroupCount', type: 'uint256' },
    { name: 'requiredSourceGroupCount', type: 'uint256' },
    { name: 'independenceSatisfied', type: 'bool' },
    { name: 'outlierCount', type: 'uint256' },
    { name: 'staleCount', type: 'uint256' },
    { name: 'mlRiskBps', type: 'uint256' },
    { name: 'avgReputationBps', type: 'uint256' },
    { name: 'providerObservationsHash', type: 'bytes32' },
    { name: 'reasonCodesHash', type: 'bytes32' },
    { name: 'requestHash', type: 'bytes32' },
    { name: 'evaluatedAt', type: 'uint256' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

const PRICE_SCALE = 1e8;
const PCT_SCALE = 100;
const RATIO_SCALE = 1e4;

/** The signed fields as JSON-serializable numbers / hex strings (JSON cannot
 *  carry bigint, and the verify endpoint receives numbers off the wire). */
export interface AttestationDataWatch {
  symbol: string;
  subjectChainId: number;
  verdict: string;
  recommendation: string;
  reason: string;
  trustScore: number;
  trustLevel: string;
  consensusPrice: number;
  maxDeviationBps: number;
  agreementBps: number;
  participantCount: number;
  requiredParticipantCount: number;
  quorumSatisfied: boolean;
  outlierCount: number;
  staleCount: number;
  mlRiskBps: number;
  avgReputationBps: number;
  providerObservationsHash: string;
  requestHash: string;
  evaluatedAt: number;
  validUntil: number;
  schemaVersion: 1;
}

/** v2 signed fields. Extends v1 with the independence gate + reason codes. */
export interface AttestationDataWatchV2 extends Omit<AttestationDataWatch, 'schemaVersion'> {
  /** Distinct NON-DERIVED operator groups observed among the participants. */
  sourceGroupCount: number;
  /** Independence floor `sourceGroupCount` is judged against. */
  requiredSourceGroupCount: number;
  /** sourceGroupCount >= requiredSourceGroupCount. */
  independenceSatisfied: boolean;
  /** keccak of the sorted, deduplicated reason-code set. */
  reasonCodesHash: string;
  schemaVersion: 2;
}

export type AnyAttestationDataWatch = AttestationDataWatch | AttestationDataWatchV2;

export interface AttestationWatchInput {
  signal: OracleWatchResult;
  providers: OracleWatchProvider[];
  subjectChainId: number;
  /** Schema version to issue. Defaults to v2; v1 exists only for tests that
   *  pin the historical layout. */
  schemaVersion?: 1 | 2;
}

const ATTESTER_LABEL = 'Insight Oracle Watch attester';

/**
 * Bind the query itself, so a receipt cannot be replayed as an answer to a
 * different question. Watch has no trade to bind to — the subject is the
 * (asset, chain) pair the signal was computed for.
 */
async function computeWatchRequestHash(
  symbol: string,
  chain: string | null,
  subjectChainId: number
): Promise<`0x${string}`> {
  const { encodeAbiParameters, keccak256 } = await import('viem');
  return keccak256(
    encodeAbiParameters(
      [
        { name: 'symbol', type: 'string' },
        { name: 'chain', type: 'string' },
        { name: 'subjectChainId', type: 'uint256' },
      ],
      [symbol, chain ?? '', BigInt(subjectChainId)]
    )
  );
}

function toObservationEntries(providers: OracleWatchProvider[]): ProviderObservationEntry[] {
  return providers.map((p) => {
    const included = p.status === 'success' && !p.isOutlier;
    const exclusionReason =
      p.status !== 'success' ? p.status : p.isOutlier ? 'outlier' : p.isStale ? 'stale' : '';
    return {
      provider: p.provider,
      feedId: p.source ?? '',
      value: BigInt(Math.round((p.price > 0 ? p.price : 0) * PRICE_SCALE)),
      timestamp: BigInt(Math.floor(p.timestamp / 1000)),
      dataAgeSeconds: BigInt(Math.max(0, Math.round(p.dataAgeSeconds ?? 0))),
      included,
      exclusionReason,
    };
  });
}

/** Fields shared by v1 and v2, in the scale conventions both layouts use. */
async function buildCommonWatchFields(input: AttestationWatchInput) {
  const { signal, providers, subjectChainId } = input;
  const evaluatedAt = Math.floor(new Date(signal.evaluatedAt).getTime() / 1000);
  return {
    evaluatedAt,
    validUntil: evaluatedAt + WATCH_VALID_FOR_SECONDS,
    consensusPrice: Math.round((signal.consensusPrice ?? 0) * PRICE_SCALE),
    maxDeviationBps: Math.round(Math.abs(signal.maxDeviationPct ?? 0) * PCT_SCALE),
    agreementBps: Math.round(signal.agreement * RATIO_SCALE),
    mlRiskBps: Math.round((signal.mlRiskScore ?? 0) * RATIO_SCALE),
    avgReputationBps: Math.round((signal.avgReputation ?? 0) * PCT_SCALE),
    providerObservationsHash: computeProviderObservationsHash(toObservationEntries(providers)),
    requestHash: await computeWatchRequestHash(signal.symbol, signal.chain, subjectChainId),
    // v2-only values. Harmless to compute for v1; they are simply not signed
    // there. `?? ` fallbacks keep a signal whose independence fields are absent
    // (e.g. a replayed object) from throwing in the signing path.
    sourceGroupCount: signal.sourceGroupCount ?? 0,
    requiredSourceGroupCount: signal.requiredSourceGroupCount ?? WATCH_REQUIRED_SOURCE_GROUP_COUNT,
    independenceSatisfied: signal.independenceSatisfied ?? false,
    reasonCodesHash: computeReasonCodesHash(signal.reasonCodes ?? []),
  };
}

/** v1 message — frozen layout, only used to keep historical receipts honest. */
export async function buildWatchMessageV1(
  input: AttestationWatchInput
): Promise<AttestationDataWatch> {
  const { signal, subjectChainId } = input;
  const c = await buildCommonWatchFields(input);
  return {
    symbol: signal.symbol,
    subjectChainId,
    verdict: signal.verdict,
    recommendation: signal.recommendation,
    reason: signal.reason,
    trustScore: Math.round(signal.trustScore),
    trustLevel: signal.trustLevel,
    consensusPrice: c.consensusPrice,
    maxDeviationBps: c.maxDeviationBps,
    agreementBps: c.agreementBps,
    participantCount: signal.participantCount,
    requiredParticipantCount: WATCH_REQUIRED_PARTICIPANT_COUNT,
    quorumSatisfied: signal.quorumSatisfied,
    outlierCount: signal.outlierCount,
    staleCount: signal.staleCount,
    mlRiskBps: c.mlRiskBps,
    avgReputationBps: c.avgReputationBps,
    providerObservationsHash: c.providerObservationsHash,
    requestHash: c.requestHash,
    evaluatedAt: c.evaluatedAt,
    validUntil: c.validUntil,
    schemaVersion: 1,
  };
}

/** v2 message — the current signing layout (independence gate + reason codes). */
export async function buildWatchMessageV2(
  input: AttestationWatchInput
): Promise<AttestationDataWatchV2> {
  const { signal, subjectChainId } = input;
  const c = await buildCommonWatchFields(input);
  return {
    symbol: signal.symbol,
    subjectChainId,
    verdict: signal.verdict,
    recommendation: signal.recommendation,
    reason: signal.reason,
    trustScore: Math.round(signal.trustScore),
    trustLevel: signal.trustLevel,
    consensusPrice: c.consensusPrice,
    maxDeviationBps: c.maxDeviationBps,
    agreementBps: c.agreementBps,
    participantCount: signal.participantCount,
    requiredParticipantCount: WATCH_REQUIRED_PARTICIPANT_COUNT,
    quorumSatisfied: signal.quorumSatisfied,
    sourceGroupCount: c.sourceGroupCount,
    requiredSourceGroupCount: c.requiredSourceGroupCount,
    independenceSatisfied: c.independenceSatisfied,
    outlierCount: signal.outlierCount,
    staleCount: signal.staleCount,
    mlRiskBps: c.mlRiskBps,
    avgReputationBps: c.avgReputationBps,
    providerObservationsHash: c.providerObservationsHash,
    reasonCodesHash: c.reasonCodesHash,
    requestHash: c.requestHash,
    evaluatedAt: c.evaluatedAt,
    validUntil: c.validUntil,
    schemaVersion: 2,
  };
}

/** Build the signed message from an already-computed watch signal.
 *  Dispatches on `input.schemaVersion` (default: current). */
export async function buildWatchMessage(
  input: AttestationWatchInput
): Promise<AnyAttestationDataWatch> {
  const version = input.schemaVersion ?? CURRENT_WATCH_SCHEMA_VERSION;
  return version === 1 ? buildWatchMessageV1(input) : buildWatchMessageV2(input);
}

/**
 * EIP-712 typed-data args, widened so ONE call site can carry either schema
 * version. viem constrains `types` only to a record of parameter lists, which
 * both layouts satisfy — the alternative (a returned union) breaks viem's
 * generic inference.
 */
export interface WatchTypedDataArgs {
  domain: typeof WATCH_DOMAIN;
  types: Record<string, ReadonlyArray<{ readonly name: string; readonly type: string }>>;
  primaryType: typeof WATCH_PRIMARY_TYPE;
  message: Record<string, unknown>;
}

/**
 * EIP-712 typed-data args (domain + types + message) — shared by sign/verify.
 *
 * Routing is by `message.schemaVersion`, never by the `eip712` block carried in
 * the payload (that block is informational and attacker-controllable). A v1
 * receipt must keep verifying against the frozen v1 layout forever.
 */
export function watchTypedDataArgs(message: AnyAttestationDataWatch): WatchTypedDataArgs {
  const shared = {
    symbol: message.symbol,
    subjectChainId: BigInt(message.subjectChainId),
    verdict: message.verdict,
    recommendation: message.recommendation,
    reason: message.reason,
    trustScore: BigInt(message.trustScore),
    trustLevel: message.trustLevel,
    consensusPrice: BigInt(message.consensusPrice),
    maxDeviationBps: BigInt(message.maxDeviationBps),
    agreementBps: BigInt(message.agreementBps),
    participantCount: BigInt(message.participantCount),
    requiredParticipantCount: BigInt(message.requiredParticipantCount),
    quorumSatisfied: message.quorumSatisfied,
    outlierCount: BigInt(message.outlierCount),
    staleCount: BigInt(message.staleCount),
    mlRiskBps: BigInt(message.mlRiskBps),
    avgReputationBps: BigInt(message.avgReputationBps),
    providerObservationsHash: message.providerObservationsHash as `0x${string}`,
    requestHash: message.requestHash as `0x${string}`,
    evaluatedAt: BigInt(message.evaluatedAt),
    validUntil: BigInt(message.validUntil),
    schemaVersion: BigInt(message.schemaVersion),
  };

  if (message.schemaVersion === 2) {
    const v2 = message as AttestationDataWatchV2;
    return {
      domain: WATCH_DOMAIN,
      types: WATCH_TYPES_V2,
      primaryType: WATCH_PRIMARY_TYPE,
      message: {
        symbol: shared.symbol,
        subjectChainId: shared.subjectChainId,
        verdict: shared.verdict,
        recommendation: shared.recommendation,
        reason: shared.reason,
        trustScore: shared.trustScore,
        trustLevel: shared.trustLevel,
        consensusPrice: shared.consensusPrice,
        maxDeviationBps: shared.maxDeviationBps,
        agreementBps: shared.agreementBps,
        participantCount: shared.participantCount,
        requiredParticipantCount: shared.requiredParticipantCount,
        quorumSatisfied: shared.quorumSatisfied,
        sourceGroupCount: BigInt(v2.sourceGroupCount),
        requiredSourceGroupCount: BigInt(v2.requiredSourceGroupCount),
        independenceSatisfied: v2.independenceSatisfied,
        outlierCount: shared.outlierCount,
        staleCount: shared.staleCount,
        mlRiskBps: shared.mlRiskBps,
        avgReputationBps: shared.avgReputationBps,
        providerObservationsHash: shared.providerObservationsHash,
        reasonCodesHash: v2.reasonCodesHash as `0x${string}`,
        requestHash: shared.requestHash,
        evaluatedAt: shared.evaluatedAt,
        validUntil: shared.validUntil,
        schemaVersion: shared.schemaVersion,
      },
    } as const;
  }

  return {
    domain: WATCH_DOMAIN,
    types: WATCH_TYPES,
    primaryType: WATCH_PRIMARY_TYPE,
    message: shared,
  } as const;
}

export interface OracleWatchAttestation {
  uid: string;
  schemaVersion: 1 | 2;
  attester: string;
  attesterLabel: string;
  signedAt: string;
  validForSeconds: number;
  validUntil: number;
  signature: string;
  verifyUrl: string;
  data: AnyAttestationDataWatch;
  /** Informational only — verification always re-derives types from
   *  `data.schemaVersion`, never from this block. */
  eip712: {
    domain: typeof WATCH_DOMAIN;
    types: typeof WATCH_TYPES | typeof WATCH_TYPES_V2;
    primaryType: typeof WATCH_PRIMARY_TYPE;
  };
}

function getVerifyUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://www.oracleinsight.xyz'
      : 'http://localhost:3000');
  return `${base}/api/v1/oracle-watch/attestation/verify`;
}

/**
 * Sign a watch signal. Returns null when no attester key is configured — the
 * signal itself remains valid and unchanged; the attestation is additive.
 *
 * Issues v2 (independence gate + reason codes) unless `schemaVersion: 1` is
 * requested explicitly; v1 signing exists only so the historical layout can be
 * reproduced in tests.
 */
export async function signWatchAttestation(
  input: AttestationWatchInput,
  opts?: { sample?: boolean }
): Promise<OracleWatchAttestation | null> {
  // opts.sample (Headless H8, 2026-09-02): dedicated sample signer, labelled
  // role "sample" in the .well-known registry; null (fail-closed) when the
  // sample key is unconfigured — the production key never signs a sample.
  const account = opts?.sample
    ? await getSampleAttesterAccount()
    : await getAttesterAccount();
  if (!account) return null;

  try {
    const { hashTypedData } = await import('viem');
    const message = await buildWatchMessage(input);
    const args = watchTypedDataArgs(message);

    const signature = await account.signTypedData(args);
    const uid = hashTypedData(args);

    return {
      uid,
      schemaVersion: message.schemaVersion,
      attester: account.address,
      attesterLabel: ATTESTER_LABEL,
      signedAt: new Date().toISOString(),
      validForSeconds: WATCH_VALID_FOR_SECONDS,
      validUntil: message.validUntil,
      signature,
      verifyUrl: getVerifyUrl(),
      data: message,
      eip712: {
        domain: WATCH_DOMAIN,
        types: message.schemaVersion === 2 ? WATCH_TYPES_V2 : WATCH_TYPES,
        primaryType: WATCH_PRIMARY_TYPE,
      },
    };
  } catch (error) {
    // Signing must never break the signal path.
    logger.warn('Failed to sign oracle watch attestation', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export interface WatchVerificationResult {
  valid: boolean;
  attester: string;
  uid: string;
  checkedAt: number | null;
  validUntil: number | null;
  expired: boolean;
  reason: string;
}

/** Verify a watch attestation: recompute the UID, recover the signer, check the
 *  window. Anyone can call this against a receipt they were handed. */
export async function verifyWatchAttestation(
  attestation: OracleWatchAttestation
): Promise<WatchVerificationResult> {
  try {
    const { verifyTypedData, hashTypedData } = await import('viem');
    const message = attestation.data;
    const args = watchTypedDataArgs(message);

    const expectedUid = hashTypedData(args);
    if (expectedUid !== attestation.uid) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: attestation.uid,
        checkedAt: Number(message.evaluatedAt) || null,
        validUntil: Number(message.validUntil) || null,
        expired: false,
        reason: 'uid_mismatch: data was modified after signing',
      };
    }

    const signatureValid = await verifyTypedData({
      ...args,
      address: attestation.attester as `0x${string}`,
      signature: attestation.signature as `0x${string}`,
    });

    const now = nowInSeconds();
    const expired = Number(message.validUntil) <= now;

    if (!signatureValid) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: attestation.uid,
        checkedAt: Number(message.evaluatedAt) || null,
        validUntil: Number(message.validUntil) || null,
        expired,
        reason: 'signature_invalid: not signed by the claimed attester',
      };
    }

    return {
      valid: !expired,
      attester: attestation.attester,
      uid: attestation.uid,
      checkedAt: Number(message.evaluatedAt) || null,
      validUntil: Number(message.validUntil) || null,
      expired,
      reason: expired ? 'attestation_expired' : 'verified',
    };
  } catch (error) {
    return {
      valid: false,
      attester: attestation.attester ?? '',
      uid: attestation.uid ?? '',
      checkedAt: null,
      validUntil: null,
      expired: false,
      reason: `verification_error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
