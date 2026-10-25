/** Portable Ed25519 evidence for an exact Solana Lending Guard decision. */

import { createHash } from 'node:crypto';

import {
  signSolanaEvidence,
  solanaEvidenceSignerPublicKey,
  verifySolanaEvidence,
  type SolanaSignedEvidence,
} from '@/lib/execution/solanaEvidence';

import {
  SolanaLendingTransactionSchema,
  decodeSolanaLendingExactCall,
  type SolanaLendingDecodedAction,
  type SolanaLendingTransaction,
} from './solanaLendingAction';
import { SolanaLendingGuardInputSchema, type SolanaLendingGuardResult } from './solanaLendingGuard';

export const SOLANA_LENDING_GUARD_ATTESTATION_SCHEMA =
  'insight.solana-lending-guard-decision.v1' as const;
export const SOLANA_LENDING_GUARD_NAMESPACE = 'insight.solana-lending-guard.v1' as const;
export const SOLANA_LENDING_GUARD_VALID_FOR_SECONDS = 300 as const;

export type SolanaLendingGuardAttestationData = {
  decisionHash: `0x${string}`;
  messageHash: `0x${string}`;
  account: string;
  protocolId: 'kamino-lend' | 'marginfi-v2';
  action: 'supply' | 'borrow';
  verdict: 0 | 1 | 2;
  issuedAt: number;
  validUntil: number;
  schemaVersion: 1;
};
export type SolanaLendingGuardAttestation = SolanaSignedEvidence<SolanaLendingGuardAttestationData>;
export type SolanaLendingGuardDecision = {
  schema: typeof SOLANA_LENDING_GUARD_ATTESTATION_SCHEMA;
  guard: SolanaLendingGuardResult;
  transaction: SolanaLendingTransaction;
  action: SolanaLendingDecodedAction | null;
  decisionHash: `0x${string}`;
  attestation: SolanaLendingGuardAttestation | null;
};
export type SolanaLendingGuardDecisionVerification = {
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

export interface SolanaLendingGuardAttestationDependencies {
  now?: () => Date;
  trustedPublicKey?: string | null;
}

function verdictCode(verdict: SolanaLendingGuardResult['verdict']): 0 | 1 | 2 {
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

export function solanaLendingGuardDecisionHash(
  value: Pick<SolanaLendingGuardDecision, 'guard' | 'transaction' | 'action'>
): `0x${string}` {
  return `0x${createHash('sha256')
    .update(canonicalBytes({ schema: SOLANA_LENDING_GUARD_ATTESTATION_SCHEMA, ...value }))
    .digest('hex')}`;
}

/** Create a short-lived attestation only when an exact, executable ALLOW exists. */
export function createSolanaLendingGuardDecision(
  guard: SolanaLendingGuardResult,
  rawTransaction: SolanaLendingTransaction,
  dependencies: SolanaLendingGuardAttestationDependencies = {}
): SolanaLendingGuardDecision {
  const transaction = SolanaLendingTransactionSchema.parse(rawTransaction);
  const action = guard.exactAction
    ? decodeSolanaLendingExactCall(transaction, {
        protocolId: guard.protocolId,
        action: guard.action,
        collateralSymbol: guard.market.collateralSymbol,
        loanSymbol: guard.market.loanSymbol,
      })
    : null;
  const decisionHash = solanaLendingGuardDecisionHash({ guard, transaction, action });
  if (guard.verdict !== 'ALLOW' || !action) {
    return {
      schema: SOLANA_LENDING_GUARD_ATTESTATION_SCHEMA,
      guard,
      transaction,
      action,
      decisionHash,
      attestation: null,
    };
  }
  const issuedAt = Math.floor((dependencies.now ?? (() => new Date()))().getTime() / 1000);
  const data: SolanaLendingGuardAttestationData = {
    decisionHash,
    messageHash: action.messageHash,
    account: action.account,
    protocolId: action.protocolId,
    action: action.action,
    verdict: verdictCode(guard.verdict),
    issuedAt,
    validUntil: issuedAt + SOLANA_LENDING_GUARD_VALID_FOR_SECONDS,
    schemaVersion: 1,
  };
  const attestation = signSolanaEvidence(SOLANA_LENDING_GUARD_ATTESTATION_SCHEMA, data);
  return {
    schema: SOLANA_LENDING_GUARD_ATTESTATION_SCHEMA,
    guard,
    transaction,
    action,
    decisionHash,
    attestation: attestation as SolanaLendingGuardAttestation | null,
  };
}

/** Validate decision scope, Ed25519 signature, pinned signer, and expiry. */
export function verifySolanaLendingGuardDecision(
  value: unknown,
  dependencies: SolanaLendingGuardAttestationDependencies = {}
): SolanaLendingGuardDecisionVerification {
  try {
    if (
      !isRecord(value) ||
      value.schema !== SOLANA_LENDING_GUARD_ATTESTATION_SCHEMA ||
      !isRecord(value.guard)
    )
      return failed('MALFORMED');
    const guard = value.guard as unknown as SolanaLendingGuardResult;
    const guardInput = SolanaLendingGuardInputSchema.parse({
      protocolId: guard.protocolId,
      action: guard.action,
      collateralSymbol: guard.market?.collateralSymbol,
      loanSymbol: guard.market?.loanSymbol,
      collateralValueUsd: guard.projected?.collateralValueUsd,
      debtValueUsd: guard.projected?.debtValueUsd,
    });
    const transaction = SolanaLendingTransactionSchema.parse(value.transaction);
    const action = decodeSolanaLendingExactCall(transaction, guardInput);
    if (
      !isRecord(value.action) ||
      !isRecord(guard.exactAction) ||
      canonicalJson(value.action) !== canonicalJson(action) ||
      canonicalJson(guard.exactAction) !== canonicalJson(action)
    )
      return failed('EXACT_ACTION_MISMATCH');
    const expectedHash = solanaLendingGuardDecisionHash({ guard, transaction, action });
    if (value.decisionHash !== expectedHash) return failed('DECISION_HASH_MISMATCH', expectedHash);
    if (!value.attestation || !isRecord(value.attestation))
      return failed('ATTESTATION_UNAVAILABLE', expectedHash);
    const attestation = value.attestation as SolanaLendingGuardAttestation;
    const trustedPublicKey = dependencies.trustedPublicKey ?? solanaEvidenceSignerPublicKey();
    const attester =
      isRecord(attestation.signer) && typeof attestation.signer.publicKey === 'string'
        ? attestation.signer.publicKey
        : null;
    const data = isRecord(attestation.payload)
      ? (attestation.payload as Partial<SolanaLendingGuardAttestationData>)
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
      data.protocolId !== action.protocolId ||
      data.action !== action.action ||
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
): SolanaLendingGuardDecisionVerification {
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
