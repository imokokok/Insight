/**
 * @fileoverview Pulse attestation — a minimal EIP-712 signed snapshot of
 * cross-oracle health, intended for public trail consumption (GitHub +
 * OpenTimestamps).
 *
 * Pulse is deliberately smaller than Oracle Watch: the trail needs one
 * compact, human-readable record per run, not the full 22-field Watch
 * envelope. It reuses the SAME attester account and the SAME
 * providerObservationsHash evidence-binding primitive as the other
 * attestation lines — only the EIP-712 domain is distinct so a Pulse
 * signature can never be replayed as a Watch or pre-trade attestation.
 *
 * Scale conventions match the pre-trade / Watch line so one verifier handles
 * all three surfaces: price → 1e8, deviation percentage → 1e2 (basis points),
 * ratio → 1e4.
 */

import type { OracleWatchProvider, OracleWatchResult } from '@/lib/api/services/oracleWatchService';
import { createLogger } from '@/lib/utils/logger';
import { nowInSeconds } from '@/lib/utils/time';

import { getAttesterAccount, getSampleAttesterAccount } from './attesterAccount';
import {
  computeProviderObservationsHash,
  type ProviderObservationEntry,
} from './providerObservationsHash';

const logger = createLogger('PulseAttestation');

/** Schema version — frozen, any reordering breaks every historical UID. */
export const PULSE_SCHEMA_VERSION = 1;

/** Pulse is a moment-in-time snapshot, not a subscription. */
export const PULSE_VALID_FOR_SECONDS = 3600;

/** EIP-712 domain. Distinct `name` from Watch / pre-trade so signatures
 *  across surfaces cannot be replayed. chainId=1 is a separator only — Pulse
 *  is not bound to any particular chain (it describes cross-chain oracle
 *  health, not a L2 transaction). */
export const PULSE_DOMAIN = {
  name: 'Insight Pulse',
  version: '1',
  chainId: 1,
} as const;

export const PULSE_PRIMARY_TYPE = 'OraclePulse';

/**
 * Frozen v1 type layout. DO NOT reorder — reordering changes every UID and
 * invalidates already-published Pulse receipts in the trail.
 *
 * 10 fields: enough to describe the health of one (asset, chain) pair for
 * human readers + verifiers, small enough that the OpenTimestamps trail
 * stays compact.
 */
export const PULSE_TYPES = {
  OraclePulse: [
    { name: 'symbol', type: 'string' },
    { name: 'subjectChainId', type: 'uint256' },
    { name: 'consensusPrice', type: 'uint256' },
    { name: 'maxDeviationBps', type: 'uint256' },
    { name: 'agreementBps', type: 'uint256' },
    { name: 'participantCount', type: 'uint256' },
    { name: 'quorumSatisfied', type: 'bool' },
    { name: 'trustScore', type: 'uint256' },
    { name: 'providerObservationsHash', type: 'bytes32' },
    { name: 'evaluatedAt', type: 'uint256' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

const PRICE_SCALE = 1e8;
const PCT_SCALE = 100;
const RATIO_SCALE = 1e4;
const QUORUM_MIN = 3;

/** Pulse message — the exact bytes that get signed. */
export interface PulseMessage {
  symbol: string;
  subjectChainId: number;
  consensusPrice: number;
  maxDeviationBps: number;
  agreementBps: number;
  participantCount: number;
  quorumSatisfied: boolean;
  trustScore: number;
  providerObservationsHash: string;
  evaluatedAt: number;
  validUntil: number;
  schemaVersion: 1;
}

export interface PulseAttestation {
  uid: string;
  schemaVersion: 1;
  attester: string;
  attesterLabel: string;
  signedAt: string;
  validForSeconds: number;
  validUntil: number;
  signature: string;
  data: PulseMessage;
  eip712: {
    domain: typeof PULSE_DOMAIN;
    types: typeof PULSE_TYPES;
    primaryType: typeof PULSE_PRIMARY_TYPE;
  };
}

export interface PulseInput {
  signal: OracleWatchResult;
  providers: OracleWatchProvider[];
  subjectChainId: number;
}

const ATTESTER_LABEL = 'Insight Pulse attester';

function toObservationEntries(providers: OracleWatchProvider[]): ProviderObservationEntry[] {
  return providers.map((p) => {
    const included = p.status === 'success' && p.countsTowardOracleQuorum && !p.isOutlier;
    const exclusionReason =
      p.status !== 'success'
        ? p.status
        : !p.countsTowardOracleQuorum
          ? 'SHADOW_ONLY'
          : p.isOutlier
            ? 'outlier'
            : p.isStale
              ? 'stale'
              : '';
    return {
      provider: p.provider,
      feedId: p.feedId ?? '',
      value: BigInt(Math.round((p.price > 0 ? p.price : 0) * PRICE_SCALE)),
      timestamp: BigInt(Math.floor((p.timestamp ?? Date.now()) / 1000)),
      dataAgeSeconds: BigInt(Math.max(0, Math.round(p.dataAgeSeconds ?? 0))),
      included,
      exclusionReason,
    };
  });
}

export function pulseMessage(input: PulseInput): PulseMessage {
  const { signal, providers, subjectChainId } = input;
  const evaluatedAt = Math.floor(new Date(signal.evaluatedAt).getTime() / 1000);
  const pct = Math.abs(signal.maxDeviationPct ?? 0);
  return {
    symbol: signal.symbol,
    subjectChainId,
    consensusPrice: Math.round((signal.consensusPrice ?? 0) * PRICE_SCALE),
    maxDeviationBps: Math.round(pct * PCT_SCALE),
    agreementBps: Math.round(signal.agreement * RATIO_SCALE),
    participantCount: signal.participantCount,
    quorumSatisfied: signal.participantCount >= QUORUM_MIN,
    trustScore: Math.round(signal.trustScore),
    providerObservationsHash: computeProviderObservationsHash(toObservationEntries(providers)),
    evaluatedAt,
    validUntil: evaluatedAt + PULSE_VALID_FOR_SECONDS,
    schemaVersion: PULSE_SCHEMA_VERSION,
  };
}

/** EIP-712 typed-data args (domain + types + message) — shared by sign/verify. */
export function pulseTypedDataArgs(message: PulseMessage) {
  return {
    domain: PULSE_DOMAIN,
    types: PULSE_TYPES,
    primaryType: PULSE_PRIMARY_TYPE,
    message: {
      symbol: message.symbol,
      subjectChainId: BigInt(message.subjectChainId),
      consensusPrice: BigInt(message.consensusPrice),
      maxDeviationBps: BigInt(message.maxDeviationBps),
      agreementBps: BigInt(message.agreementBps),
      participantCount: BigInt(message.participantCount),
      quorumSatisfied: message.quorumSatisfied,
      trustScore: BigInt(message.trustScore),
      providerObservationsHash: message.providerObservationsHash as `0x${string}`,
      evaluatedAt: BigInt(message.evaluatedAt),
      validUntil: BigInt(message.validUntil),
      schemaVersion: BigInt(message.schemaVersion),
    },
  } as const;
}

/**
 * Sign a Pulse. Returns null when no attester key is configured — the trail
 * silently skips that run, the signer NEVER swallows an error that would
 * otherwise crash the caller.
 *
 * opts.sample: use the dedicated SAMPLE signer (role: "sample" in the
 * .well-known registry). Safe for public demo trails — anyone verifying the
 * signature can read the role and label it synthetic.
 */
export async function signPulseAttestation(
  input: PulseInput,
  opts: { sample?: boolean } = {}
): Promise<PulseAttestation | null> {
  const account = opts.sample ? await getSampleAttesterAccount() : await getAttesterAccount();
  if (!account) {
    logger.info('Pulse attestation skipped — no attester key configured', {
      sample: opts.sample ?? false,
    });
    return null;
  }

  try {
    const { hashTypedData } = await import('viem');
    const message = pulseMessage(input);
    const args = pulseTypedDataArgs(message);

    const signature = await account.signTypedData(args);
    const uid = hashTypedData(args);

    return {
      uid,
      schemaVersion: message.schemaVersion,
      attester: account.address,
      attesterLabel: ATTESTER_LABEL,
      signedAt: new Date().toISOString(),
      validForSeconds: PULSE_VALID_FOR_SECONDS,
      validUntil: message.validUntil,
      signature,
      data: message,
      eip712: {
        domain: PULSE_DOMAIN,
        types: PULSE_TYPES,
        primaryType: PULSE_PRIMARY_TYPE,
      },
    };
  } catch (error) {
    logger.warn('Failed to sign Pulse attestation', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export interface PulseVerificationResult {
  valid: boolean;
  attester: string;
  uid: string;
  checkedAt: number | null;
  validUntil: number | null;
  expired: boolean;
  reason: string;
}

/** Verify a Pulse attestation — recompute UID, recover signer, check window. */
export async function verifyPulseAttestation(
  attestation: PulseAttestation
): Promise<PulseVerificationResult> {
  try {
    const { verifyTypedData, hashTypedData } = await import('viem');
    const args = pulseTypedDataArgs(attestation.data);

    const expectedUid = hashTypedData(args);
    if (expectedUid !== attestation.uid) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: attestation.uid,
        checkedAt: attestation.data.evaluatedAt,
        validUntil: attestation.data.validUntil,
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
    const expired = attestation.data.validUntil <= now;

    if (!signatureValid) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: attestation.uid,
        checkedAt: attestation.data.evaluatedAt,
        validUntil: attestation.data.validUntil,
        expired,
        reason: 'signature_invalid: not signed by the claimed attester',
      };
    }

    return {
      valid: !expired,
      attester: attestation.attester,
      uid: attestation.uid,
      checkedAt: attestation.data.evaluatedAt,
      validUntil: attestation.data.validUntil,
      expired,
      reason: expired ? 'pulse_expired' : 'verified',
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
