/** Portable Ed25519 evidence for an exact Solana Swap Guard decision. */

import { createHash } from 'node:crypto';

import {
  signSolanaEvidence,
  solanaEvidenceSignerPublicKey,
  verifySolanaEvidence,
  type SolanaSignedEvidence,
} from '@/lib/execution/solanaEvidence';
import {
  SolanaLendingTransactionSchema,
  type SolanaLendingTransaction,
} from '@/lib/lending/solanaLendingAction';

import {
  profileSupportsDirection,
  reviewedSolanaSwapProfile,
  SOLANA_SWAP_GUARD_DIRECTIONS,
  SOLANA_SWAP_GUARD_PROFILE_IDS,
  type SolanaSwapGuardDirection,
  type SolanaSwapGuardProfileId,
} from './solanaOrcaWhirlpool';
import { decodeSolanaSwapExactCall, type SolanaSwapDecodedAction } from './solanaSwapAction';

import type { SolanaSwapGuardResult } from './solanaSwapGuard';

export const SOLANA_SWAP_GUARD_ATTESTATION_SCHEMA =
  'insight.solana-swap-guard-decision.v1' as const;
export const SOLANA_SWAP_GUARD_NAMESPACE = 'insight.solana-swap-guard.v1' as const;
export const SOLANA_SWAP_GUARD_VALID_FOR_SECONDS = 300 as const;

export type SolanaSwapGuardAttestationData = {
  decisionHash: `0x${string}`;
  messageHash: `0x${string}`;
  account: string;
  profileId: SolanaSwapGuardProfileId;
  direction: SolanaSwapGuardDirection;
  verdict: 0 | 1 | 2;
  issuedAt: number;
  validUntil: number;
  schemaVersion: 1;
};
export type SolanaSwapGuardAttestation = SolanaSignedEvidence<SolanaSwapGuardAttestationData>;
export type SolanaSwapGuardDecision = {
  schema: typeof SOLANA_SWAP_GUARD_ATTESTATION_SCHEMA;
  guard: SolanaSwapGuardResult;
  transaction: SolanaLendingTransaction;
  action: SolanaSwapDecodedAction | null;
  decisionHash: `0x${string}`;
  attestation: SolanaSwapGuardAttestation | null;
};
export type SolanaSwapGuardDecisionVerification = {
  valid: boolean;
  signatureValid: boolean;
  trusted: boolean;
  expired: boolean;
  reason: string;
  decisionHash: string | null;
  attester: string | null;
  issuedAt: number | null;
  validUntil: number | null;
};

export interface SolanaSwapGuardAttestationDependencies {
  now?: () => Date;
  trustedPublicKey?: string | null;
}

function verdictCode(verdict: SolanaSwapGuardResult['verdict']): 0 | 1 | 2 {
  return verdict === 'ALLOW' ? 0 : verdict === 'CAUTION' ? 1 : 2;
}
function canonicalBytes(value: unknown): Buffer {
  return Buffer.from(canonicalJson(value), 'utf8');
}
function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    if (keys.some((key) => ['__proto__', 'constructor', 'prototype'].includes(key))) {
      throw new TypeError('Decision contains an unsafe object key');
    }
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  throw new TypeError('Decision is not valid canonical JSON');
}

export function solanaSwapGuardDecisionHash(
  value: Pick<SolanaSwapGuardDecision, 'guard' | 'transaction' | 'action'>
): `0x${string}` {
  return `0x${createHash('sha256')
    .update(canonicalBytes({ schema: SOLANA_SWAP_GUARD_ATTESTATION_SCHEMA, ...value }))
    .digest('hex')}`;
}

/** Create a short-lived attestation only when an exact, executable ALLOW exists. */
export function createSolanaSwapGuardDecision(
  guard: SolanaSwapGuardResult,
  rawTransaction: SolanaLendingTransaction,
  dependencies: SolanaSwapGuardAttestationDependencies = {}
): SolanaSwapGuardDecision {
  const transaction = SolanaLendingTransactionSchema.parse(rawTransaction);
  const action =
    guard.verdict === 'ALLOW'
      ? decodeSolanaSwapExactCall(transaction, {
          profileId: guard.profileId,
          direction: guard.direction,
        })
      : null;
  const decisionHash = solanaSwapGuardDecisionHash({ guard, transaction, action });
  if (guard.verdict !== 'ALLOW' || !action) {
    return {
      schema: SOLANA_SWAP_GUARD_ATTESTATION_SCHEMA,
      guard,
      transaction,
      action,
      decisionHash,
      attestation: null,
    };
  }
  const issuedAt = Math.floor((dependencies.now ?? (() => new Date()))().getTime() / 1000);
  const data: SolanaSwapGuardAttestationData = {
    decisionHash,
    messageHash: action.messageHash,
    account: action.account,
    profileId: action.profileId,
    direction: action.direction,
    verdict: verdictCode(guard.verdict),
    issuedAt,
    validUntil: issuedAt + SOLANA_SWAP_GUARD_VALID_FOR_SECONDS,
    schemaVersion: 1,
  };
  const attestation = signSolanaEvidence(SOLANA_SWAP_GUARD_ATTESTATION_SCHEMA, data);
  return {
    schema: SOLANA_SWAP_GUARD_ATTESTATION_SCHEMA,
    guard,
    transaction,
    action,
    decisionHash,
    attestation: attestation as SolanaSwapGuardAttestation | null,
  };
}

/** Validate decision scope, Ed25519 signature, pinned signer, and expiry. */
export function verifySolanaSwapGuardDecision(
  value: unknown,
  dependencies: SolanaSwapGuardAttestationDependencies = {}
): SolanaSwapGuardDecisionVerification {
  try {
    if (
      !isRecord(value) ||
      value.schema !== SOLANA_SWAP_GUARD_ATTESTATION_SCHEMA ||
      !isRecord(value.guard)
    )
      return failed('MALFORMED');
    const guard = value.guard as unknown as SolanaSwapGuardResult;
    if (
      typeof guard.profileId !== 'string' ||
      typeof guard.direction !== 'string' ||
      !SOLANA_SWAP_GUARD_PROFILE_IDS.includes(guard.profileId as SolanaSwapGuardProfileId) ||
      !SOLANA_SWAP_GUARD_DIRECTIONS.includes(guard.direction as SolanaSwapGuardDirection) ||
      !profileSupportsDirection(
        reviewedSolanaSwapProfile(guard.profileId as SolanaSwapGuardProfileId),
        guard.direction as SolanaSwapGuardDirection
      )
    )
      return failed('MALFORMED');
    const transaction = SolanaLendingTransactionSchema.parse(value.transaction);
    const action = decodeSolanaSwapExactCall(transaction, {
      profileId: guard.profileId as SolanaSwapGuardProfileId,
      direction: guard.direction,
    });
    if (
      !isRecord(value.action) ||
      !isRecord(guard.exactAction) ||
      canonicalJson(value.action) !== canonicalJson(action) ||
      canonicalJson(guard.exactAction) !== canonicalJson(action)
    )
      return failed('EXACT_ACTION_MISMATCH');
    const expectedHash = solanaSwapGuardDecisionHash({ guard, transaction, action });
    if (value.decisionHash !== expectedHash) return failed('DECISION_HASH_MISMATCH', expectedHash);
    if (!value.attestation || !isRecord(value.attestation))
      return failed('ATTESTATION_UNAVAILABLE', expectedHash);
    const attestation = value.attestation as SolanaSwapGuardAttestation;
    const trustedPublicKey = dependencies.trustedPublicKey ?? solanaEvidenceSignerPublicKey();
    const attester =
      isRecord(attestation.signer) && typeof attestation.signer.publicKey === 'string'
        ? attestation.signer.publicKey
        : null;
    const data = isRecord(attestation.payload)
      ? (attestation.payload as Partial<SolanaSwapGuardAttestationData>)
      : null;
    const issuedAt = typeof data?.issuedAt === 'number' ? data.issuedAt : null;
    const validUntil = typeof data?.validUntil === 'number' ? data.validUntil : null;
    const now = Math.floor((dependencies.now ?? (() => new Date()))().getTime() / 1000);
    const trusted = trustedPublicKey !== null && attester === trustedPublicKey;
    const signatureValid = trusted && verifySolanaEvidence(attestation, trustedPublicKey);
    const expired = validUntil === null || validUntil < now;
    if (!trusted)
      return {
        valid: false,
        signatureValid: false,
        trusted: false,
        expired,
        reason: 'UNTRUSTED_ATTESTER',
        decisionHash: expectedHash,
        attester,
        issuedAt,
        validUntil,
      };
    if (!signatureValid)
      return {
        valid: false,
        signatureValid: false,
        trusted: true,
        expired,
        reason: 'INVALID_SIGNATURE',
        decisionHash: expectedHash,
        attester,
        issuedAt,
        validUntil,
      };
    if (
      !data ||
      data.decisionHash !== expectedHash ||
      data.messageHash !== action.messageHash ||
      data.account !== action.account ||
      data.profileId !== action.profileId ||
      data.direction !== action.direction ||
      data.verdict !== verdictCode(guard.verdict) ||
      data.schemaVersion !== 1
    ) {
      return {
        valid: false,
        signatureValid: true,
        trusted: true,
        expired,
        reason: 'ATTESTED_SCOPE_MISMATCH',
        decisionHash: expectedHash,
        attester,
        issuedAt,
        validUntil,
      };
    }
    if (expired)
      return {
        valid: false,
        signatureValid: true,
        trusted: true,
        expired: true,
        reason: 'EXPIRED',
        decisionHash: expectedHash,
        attester,
        issuedAt,
        validUntil,
      };
    return {
      valid: true,
      signatureValid: true,
      trusted: true,
      expired: false,
      reason: 'OK',
      decisionHash: expectedHash,
      attester,
      issuedAt,
      validUntil,
    };
  } catch {
    return failed('MALFORMED');
  }
}

function failed(
  reason: string,
  decisionHash: string | null = null
): SolanaSwapGuardDecisionVerification {
  return {
    valid: false,
    signatureValid: false,
    trusted: false,
    expired: false,
    reason,
    decisionHash,
    attester: null,
    issuedAt: null,
    validUntil: null,
  };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
