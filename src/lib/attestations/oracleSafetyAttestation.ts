/**
 * @fileoverview Oracle safety attestation — the "Agent economy positioning" layer.
 *
 * When a pre-trade oracle safety check produces a verdict, this module issues an
 * EAS-style OFFCHAIN attestation: an EIP-712 typed-data signature over the
 * verdict payload, signed by the Insight platform's attester key. No gas, no
 * on-chain transaction. Anyone can verify the signature against the attester's
 * published address — giving the BLOCK/PASS verdict a portable, tamper-evident
 * proof that "Insight verified oracle state for this trade at time T".
 *
 * Why offchain (not onchain EAS): gasless, instant, cross-chain agnostic. The
 * attestation travels in the agent's transaction memo / calldata / log so users
 * and protocols can recognize "this agent ran the oracle immune-system check".
 *
 * Graceful degradation: when ATTESTATION_SIGNER_PRIVATE_KEY is unset or invalid,
 * `signAttestation` returns null and the pre-trade check is unaffected. This is a
 * positioning/marketing layer, never a safety-critical dependency.
 *
 * EIP-712 domain uses chainId=1 purely as a domain separator (the attestation is
 * never submitted on-chain). The trade's REAL chain is recorded in the message
 * body (`chainId` field), so verification reflects the actual execution chain.
 */

import { createLogger } from '@/lib/utils/logger';
import { nowInSeconds } from '@/lib/utils/time';

import { getAttesterAccount } from './attesterAccount';
// Re-export so v1's public surface (getAttesterAddress) is unchanged.
export { getAttesterAddress } from './attesterAccount';

const logger = createLogger('OracleSafetyAttestation');

/** Schema version — bump when the EIP-712 type layout changes. */
export const ATTESTATION_SCHEMA_VERSION = 1;
/** How long an attestation is considered meaningful (oracle state updates every 15 min). */
export const ATTESTATION_VALID_FOR_SECONDS = 600; // 10 min
export const ATTESTER_LABEL = 'Insight Oracle Safety';

/** Scale factors to encode floats as uint256 (on-chain-verifiable integers). */
const PRICE_SCALE = 1e8; // 8 decimals, matches Chainlink feed precision
const USD_SCALE = 1e6; // 6 decimals, matches USDC
const BPS_SCALE = 100; // percent -> basis points

/** EIP-712 domain. chainId=1 is a domain separator only (offchain attestation). */
export const ATTESTATION_DOMAIN = {
  name: 'Insight Oracle Safety',
  version: '1',
  chainId: 1,
} as const;

/** EIP-712 primary type. */
export const ATTESTATION_PRIMARY_TYPE = 'OracleSafetyCheck';

/** EIP-712 type definitions (mirrors the message shape below). */
export const ATTESTATION_TYPES = {
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

/** The attested message body (all integers for on-chain portability).
 *  Numbers (not bigint) so the object is JSON-serializable in API responses.
 *  viem's crypto ops use the bigint twin from {@link toBigIntMessage}. */
export interface AttestationData {
  verdict: string;
  asset: string;
  chainId: number;
  action: string;
  tradeAmountUsd: number;
  consensusPrice: number;
  maxDeviationBps: number;
  manipulationRiskBps: number;
  participantCount: number;
  checkedAt: number;
  schemaVersion: number;
}

/** The full attestation object returned to agents / API consumers. */
export interface OracleSafetyAttestation {
  /** EIP-712 struct hash — the stable, deterministic attestation UID. */
  uid: string;
  schemaVersion: number;
  /** Signer address (0x...). Publish this so anyone can verify signatures. */
  attester: string;
  attesterLabel: string;
  signedAt: string;
  validForSeconds: number;
  data: AttestationData;
  eip712: {
    domain: typeof ATTESTATION_DOMAIN;
    types: typeof ATTESTATION_TYPES;
    primaryType: typeof ATTESTATION_PRIMARY_TYPE;
  };
  /** EIP-712 signature (0x... r+s+v). */
  signature: string;
  /** Where third parties can POST { attestation } to verify. */
  verifyUrl: string;
}

/** Input needed to build an attestation from a completed pre-trade result. */
export interface AttestationInput {
  verdict: string;
  asset: string;
  chainId: number;
  action: string;
  tradeAmountUsd: number;
  consensusPrice: number;
  maxDeviationPct: number;
  manipulationRiskScore: number; // 0..1
  participantCount: number;
}

function toUint(n: number, scale: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * scale));
}

function buildMessage(input: AttestationInput): AttestationData {
  return {
    verdict: input.verdict,
    asset: input.asset,
    chainId: input.chainId,
    action: input.action,
    tradeAmountUsd: toUint(input.tradeAmountUsd, USD_SCALE),
    consensusPrice: toUint(input.consensusPrice, PRICE_SCALE),
    // |deviation| as basis points; abs because oracle can deviate either way.
    maxDeviationBps: toUint(Math.abs(input.maxDeviationPct), BPS_SCALE),
    manipulationRiskBps: toUint(Math.max(0, Math.min(1, input.manipulationRiskScore)), 10000),
    participantCount: input.participantCount,
    checkedAt: nowInSeconds(),
    schemaVersion: ATTESTATION_SCHEMA_VERSION,
  };
}

/**
 * viem's EIP-712 typed-data ops require bigint for `uint256` fields (JSON can't
 * serialize bigint, so the public {@link AttestationData} stores numbers and we
 * widen back to bigint only for the crypto calls).
 */
function toBigIntMessage(data: AttestationData) {
  return {
    verdict: data.verdict,
    asset: data.asset,
    chainId: BigInt(data.chainId),
    action: data.action,
    tradeAmountUsd: BigInt(data.tradeAmountUsd),
    consensusPrice: BigInt(data.consensusPrice),
    maxDeviationBps: BigInt(data.maxDeviationBps),
    manipulationRiskBps: BigInt(data.manipulationRiskBps),
    participantCount: BigInt(data.participantCount),
    checkedAt: BigInt(data.checkedAt),
    schemaVersion: BigInt(data.schemaVersion),
  };
}

/** The viem typed-data args shared by sign / hash / verify. */
function typedDataArgs(data: AttestationData) {
  return {
    domain: ATTESTATION_DOMAIN,
    types: ATTESTATION_TYPES,
    primaryType: ATTESTATION_PRIMARY_TYPE,
    message: toBigIntMessage(data),
  } as const;
}

/** Public URL for the verification endpoint, derived from the app URL. */
function getVerifyUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://www.oracleinsight.xyz'
      : 'http://localhost:3000');
  return `${base}/api/v1/safety/attestation/verify`;
}

/**
 * Sign an EIP-712 attestation over the pre-trade verdict. Returns null when no
 * attester key is configured or signing fails — the caller MUST treat null as
 * "attestation unavailable" and never let it affect the safety verdict.
 */
export async function signAttestation(
  input: AttestationInput
): Promise<OracleSafetyAttestation | null> {
  const account = await getAttesterAccount();
  if (!account) return null;

  try {
    const { hashTypedData } = await import('viem');
    const message = buildMessage(input);
    const args = typedDataArgs(message);

    const signature = await account.signTypedData(args);
    const uid = hashTypedData(args);

    return {
      uid,
      schemaVersion: ATTESTATION_SCHEMA_VERSION,
      attester: account.address,
      attesterLabel: ATTESTER_LABEL,
      signedAt: new Date().toISOString(),
      validForSeconds: ATTESTATION_VALID_FOR_SECONDS,
      data: message,
      eip712: {
        domain: ATTESTATION_DOMAIN,
        types: ATTESTATION_TYPES,
        primaryType: ATTESTATION_PRIMARY_TYPE,
      },
      signature,
      verifyUrl: getVerifyUrl(),
    };
  } catch (error) {
    logger.warn('Failed to sign attestation', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Verify an attestation's signature against the attester address. Used by the
 * public /api/v1/safety/attestation/verify endpoint. Also checks:
 *  - the attester matches the platform's configured key (when set), and
 *  - the attestation is within its validity window (not stale).
 *
 * Returns a structured result so the endpoint can explain WHY verification
 * failed, not just true/false.
 */
export interface VerificationResult {
  valid: boolean;
  attester: string;
  uid: string | null;
  checkedAt: number | null;
  ageSeconds: number | null;
  expired: boolean;
  reason?: string;
}

export async function verifyAttestation(
  attestation: OracleSafetyAttestation
): Promise<VerificationResult> {
  try {
    const { verifyTypedData, hashTypedData } = await import('viem');
    const message = attestation.data;
    const args = typedDataArgs(message);

    const valid = await verifyTypedData({
      ...args,
      address: attestation.attester as `0x${string}`,
      signature: attestation.signature as `0x${string}`,
    });
    if (!valid) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: null,
        checkedAt: null,
        ageSeconds: null,
        expired: false,
        reason: 'Signature does not recover to the attester address.',
      };
    }

    // Recompute the UID so a tampered payload is caught even if the signature
    // field were somehow valid for a different (attacker-controlled) message.
    const recomputedUid = hashTypedData(args);
    if (attestation.uid && recomputedUid !== attestation.uid) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: attestation.uid,
        checkedAt: message.checkedAt,
        ageSeconds: null,
        expired: false,
        reason: 'UID does not match the recomputed EIP-712 hash (payload tampered).',
      };
    }

    const now = nowInSeconds();
    const ageSeconds = message.checkedAt ? now - message.checkedAt : null;
    const expired = ageSeconds !== null && ageSeconds > attestation.validForSeconds;

    return {
      valid: true,
      attester: attestation.attester,
      uid: recomputedUid,
      checkedAt: message.checkedAt,
      ageSeconds,
      expired,
      reason: expired
        ? `Attestation is stale (age ${ageSeconds}s > validFor ${attestation.validForSeconds}s).`
        : undefined,
    };
  } catch (error) {
    return {
      valid: false,
      attester: attestation.attester ?? '',
      uid: attestation.uid ?? null,
      checkedAt: attestation.data?.checkedAt ?? null,
      ageSeconds: null,
      expired: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

/** The platform's attester address, when a key is configured. Used to publish
 *  the trusted signer so third parties can reject attestations from anyone else.
 *  (Re-exported from ./attesterAccount above — see that module.) */
