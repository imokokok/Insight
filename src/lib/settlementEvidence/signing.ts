/**
 * EIP-712 attestation for settlement-evidence packs.
 *
 * Same design rules as the existing attestation lines (pre-trade, Oracle
 * Watch, oracle-test): a missing attester key means "attestation unavailable",
 * never a different grade. Field order is FROZEN for schemaVersion 1 —
 * reordering changes every UID and would invalidate handed-out receipts.
 *
 * The signed message hash-binds the payload hash, so any tampering with the
 * derived analytics after signing is detectable by re-deriving the hash from
 * the payload and re-verifying the signature.
 */

import { getAttesterAccount, type AttesterAccount } from '@/lib/attestations/attesterAccount';
import { createLogger } from '@/lib/utils/logger';
import { nowInSeconds } from '@/lib/utils/time';

import { computePayloadHash } from './engine';
import {
  SETTLEMENT_EVIDENCE_SCHEMA_VERSION,
  SETTLEMENT_EVIDENCE_VALID_FOR_SECONDS,
  type SettlementEvidenceAttestation,
  type SettlementEvidencePack,
  type SettlementEvidencePayload,
} from './types';

const logger = createLogger('SettlementEvidenceSigning');

/** EIP-712 domain. Distinct `name` so a settlement receipt can never be
 *  replayed on the pre-trade / watch / scenario-test surfaces. */
export const SETTLEMENT_EVIDENCE_DOMAIN = {
  name: 'Insight Settlement Evidence',
  version: '1',
  chainId: 1,
} as const;

export const SETTLEMENT_EVIDENCE_PRIMARY_TYPE = 'SettlementEvidence';

/** v1 type layout — FROZEN. */
export const SETTLEMENT_EVIDENCE_TYPES = {
  SettlementEvidence: [
    { name: 'marketSlug', type: 'string' },
    { name: 'asset', type: 'string' },
    { name: 'settlementVenue', type: 'string' },
    { name: 'windowStart', type: 'uint256' },
    { name: 'windowEnd', type: 'uint256' },
    { name: 'declaredOutcome', type: 'string' },
    { name: 'independentOutcome', type: 'string' },
    { name: 'priceChangeBpsE4', type: 'int256' },
    { name: 'oracleDeviationBpsE4', type: 'int256' },
    { name: 'oracleAvailable', type: 'uint256' },
    { name: 'candleCoverageE4', type: 'uint256' },
    { name: 'grade', type: 'string' },
    { name: 'payloadHash', type: 'bytes32' },
    { name: 'generatedAt', type: 'uint256' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

/** The exact signed-message field shape. Concrete (not `Record<string,
 *  unknown>`) so viem's typed-data hashing infers parameter types. */
export interface SettlementEvidenceMessage {
  marketSlug: string;
  asset: string;
  settlementVenue: string;
  windowStart: bigint;
  windowEnd: bigint;
  declaredOutcome: string;
  independentOutcome: string;
  priceChangeBpsE4: bigint;
  oracleDeviationBpsE4: bigint;
  oracleAvailable: bigint;
  candleCoverageE4: bigint;
  grade: string;
  payloadHash: `0x${string}`;
  generatedAt: bigint;
  validUntil: bigint;
  schemaVersion: bigint;
}

/** EIP-712 integer fields cannot be null: unavailable metrics are encoded as
 *  0 with an explicit availability flag instead of a fabricated value. */
const UNAVAILABLE_BPS_SENTINEL = 0n;

/** priceChangeBps / oracleDeviationBps are serialized ×1e4 in the signed
 *  message (integers only), while the payload keeps decimals. */
function toBpsE4(value: number | null): bigint {
  if (value === null || !Number.isFinite(value)) return UNAVAILABLE_BPS_SENTINEL;
  return BigInt(Math.round(value * 10_000));
}

const NULL_OUTCOME_LABEL = 'unknown';

function outcomeLabel(outcome: string | null): string {
  return outcome ?? NULL_OUTCOME_LABEL;
}

function payloadHashToBytes32(payloadHash: string): `0x${string}` {
  return `0x${payloadHash.replace(/^0x/, '')}` as `0x${string}`;
}

export function buildSettlementEvidenceMessage(
  payload: SettlementEvidencePayload,
  payloadHash: string,
  signedAtSeconds: number
): SettlementEvidenceMessage {
  const oracleAvailable = payload.oracleDeviationBps === null ? 0n : 1n;
  return {
    marketSlug: payload.marketSlug,
    asset: payload.asset,
    settlementVenue: payload.settlementVenue,
    windowStart: BigInt(Math.floor(payload.windowStartMs / 1000)),
    windowEnd: BigInt(Math.floor(payload.windowEndMs / 1000)),
    declaredOutcome: outcomeLabel(payload.declaredOutcome),
    independentOutcome: outcomeLabel(payload.independentOutcome),
    priceChangeBpsE4: toBpsE4(payload.priceChangeBps),
    oracleDeviationBpsE4: toBpsE4(payload.oracleDeviationBps),
    oracleAvailable,
    candleCoverageE4: BigInt(Math.max(0, Math.round(payload.candleCoverageE4 ?? 0))),
    grade: payload.grade,
    payloadHash: payloadHashToBytes32(payloadHash),
    generatedAt: BigInt(Math.floor(payload.generatedAtMs / 1000)),
    validUntil: BigInt(signedAtSeconds + SETTLEMENT_EVIDENCE_VALID_FOR_SECONDS),
    schemaVersion: BigInt(SETTLEMENT_EVIDENCE_SCHEMA_VERSION),
  };
}

function typedDataArgs(message: SettlementEvidenceMessage) {
  return {
    domain: SETTLEMENT_EVIDENCE_DOMAIN,
    types: SETTLEMENT_EVIDENCE_TYPES,
    primaryType: SETTLEMENT_EVIDENCE_PRIMARY_TYPE,
    message,
  } as const;
}

/**
 * Sign a pack. Returns null when no attester key is configured — the pack
 * itself remains valid and unchanged; the attestation is additive.
 */
export async function signSettlementEvidence(
  payload: SettlementEvidencePayload,
  payloadHash: string,
  account?: AttesterAccount | null
): Promise<SettlementEvidenceAttestation | null> {
  const signer = account ?? (await getAttesterAccount());
  if (!signer) return null;
  try {
    const { hashTypedData } = await import('viem');
    const signedAtSeconds = nowInSeconds();
    const args = typedDataArgs(
      buildSettlementEvidenceMessage(payload, payloadHash, signedAtSeconds)
    );
    const signature = await signer.signTypedData(args);
    const uid = hashTypedData(args);
    return {
      uid,
      schemaVersion: 1,
      attester: signer.address,
      attesterLabel: 'Insight Settlement Evidence attester',
      signedAt: new Date(signedAtSeconds * 1000).toISOString(),
      validForSeconds: SETTLEMENT_EVIDENCE_VALID_FOR_SECONDS,
      signature,
      eip712: {
        domain: { ...SETTLEMENT_EVIDENCE_DOMAIN },
        primaryType: SETTLEMENT_EVIDENCE_PRIMARY_TYPE,
      },
    };
  } catch (error) {
    logger.warn('Failed to sign settlement-evidence pack', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export interface SettlementEvidenceVerificationResult {
  valid: boolean;
  attester: string;
  uid: string;
  expired: boolean;
  reason: string;
}

/**
 * Verify a pack end-to-end: recompute the payload hash from the payload,
 * rebuild the typed message, recompute the UID and recover the signer. Anyone
 * holding a pack can run this against Insight's published attester address.
 */
export async function verifySettlementEvidence(
  pack: SettlementEvidencePack,
  expectedAttester?: string
): Promise<SettlementEvidenceVerificationResult> {
  const attestation = pack.attestation;
  if (!attestation) {
    return {
      valid: false,
      attester: '',
      uid: '',
      expired: false,
      reason: 'attestation_unavailable: pack was produced without an attester key',
    };
  }
  try {
    const { verifyTypedData, hashTypedData } = await import('viem');

    const recomputedHash = computePayloadHash(pack.payload);
    if (recomputedHash !== pack.payloadHash) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: attestation.uid,
        expired: false,
        reason: 'payload_hash_mismatch: payload was modified after signing',
      };
    }

    const message = buildSettlementEvidenceMessage(
      pack.payload,
      pack.payloadHash,
      Math.floor(Date.parse(attestation.signedAt) / 1000)
    );
    const args = typedDataArgs(message);

    const expectedUid = hashTypedData(args);
    if (expectedUid !== attestation.uid) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: attestation.uid,
        expired: false,
        reason: 'uid_mismatch: attestation does not bind this payload',
      };
    }

    const signatureValid = await verifyTypedData({
      ...args,
      address: attestation.attester as `0x${string}`,
      signature: attestation.signature as `0x${string}`,
    });

    const expired =
      Date.parse(attestation.signedAt) / 1000 + SETTLEMENT_EVIDENCE_VALID_FOR_SECONDS <=
      nowInSeconds();
    if (!signatureValid) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: attestation.uid,
        expired,
        reason: 'signature_invalid: not signed by the claimed attester',
      };
    }
    if (expectedAttester && attestation.attester.toLowerCase() !== expectedAttester.toLowerCase()) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: attestation.uid,
        expired,
        reason: 'unexpected_attester: signer is not the published attester',
      };
    }
    return {
      valid: !expired,
      attester: attestation.attester,
      uid: attestation.uid,
      expired,
      reason: expired ? 'attestation_expired' : 'verified',
    };
  } catch (error) {
    return {
      valid: false,
      attester: attestation.attester,
      uid: attestation.uid,
      expired: false,
      reason: `verification_error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
