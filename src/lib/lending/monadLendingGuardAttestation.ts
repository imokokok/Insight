/** Portable EIP-712 evidence for one already-decoded Monad lending call. */

import { hashTypedData, keccak256, verifyTypedData } from 'viem';
import { z } from 'zod';

import {
  getAttesterAccount,
  getAttesterAddress,
  getSampleAttesterAddress,
  type AttesterAccount,
} from '@/lib/attestations/attesterAccount';
import { buildKeyRegistryConfig, trustedAttesterEntry } from '@/lib/attestations/keyRegistryConfig';
import { canonicalJsonString } from '@/lib/utils/canonicalJson';
import { createLogger } from '@/lib/utils/logger';
import { nowInSeconds } from '@/lib/utils/time';

import {
  MONAD_CHAIN_ID,
  MonadLendingExactTransactionSchema,
  decodeMonadLendingExactCall,
  type MonadLendingDecodedAction,
  type MonadLendingExactTransaction,
} from './monadLendingAction';

import type { MonadLendingGuardResult } from './monadLendingGuard';

const logger = createLogger('MonadLendingGuardAttestation');

export const MONAD_LENDING_GUARD_DECISION_SCHEMA =
  'insight.monad-lending-guard-decision.v1' as const;
export const MONAD_LENDING_GUARD_ATTESTATION_SCHEMA_VERSION = 1 as const;
export const MONAD_LENDING_GUARD_ATTESTATION_VALID_FOR_SECONDS = 300;
export const MONAD_LENDING_GUARD_ATTESTATION_PRIMARY_TYPE = 'MonadLendingGuardDecision' as const;
export const MONAD_LENDING_GUARD_ATTESTATION_DOMAIN = {
  name: 'Insight Monad Lending Guard',
  version: '1',
  chainId: MONAD_CHAIN_ID,
} as const;
export const MONAD_LENDING_GUARD_ATTESTATION_TYPES = {
  MonadLendingGuardDecision: [
    { name: 'decisionHash', type: 'bytes32' },
    { name: 'calldataHash', type: 'bytes32' },
    { name: 'account', type: 'address' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verdict', type: 'uint8' },
    { name: 'issuedAt', type: 'uint256' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

const HASH = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const SIGNATURE = /^0x[0-9a-fA-F]{130}$/;
const ActionSchema = z
  .object({
    protocolId: z.enum(['aave-v3-monad', 'morpho-blue-monad']),
    action: z.enum(['supply', 'borrow']),
    target: z.string().regex(ADDRESS),
    calldataHash: z.string().regex(HASH),
    amount: z.string().regex(/^0$|^[1-9][0-9]*$/),
    account: z.string().regex(ADDRESS),
    receiver: z.string().regex(ADDRESS).nullable(),
    asset: z.string().regex(ADDRESS).nullable(),
    marketId: z.string().regex(HASH).nullable(),
  })
  .strict();
const AttestationDataSchema = z
  .object({
    decisionHash: z.string().regex(HASH),
    calldataHash: z.string().regex(HASH),
    account: z.string().regex(ADDRESS),
    chainId: z.literal(MONAD_CHAIN_ID),
    verdict: z.number().int().min(0).max(2),
    issuedAt: z.number().int().nonnegative().safe(),
    validUntil: z.number().int().nonnegative().safe(),
    schemaVersion: z.literal(MONAD_LENDING_GUARD_ATTESTATION_SCHEMA_VERSION),
  })
  .strict();
const AttestationSchema = z
  .object({
    type: z.literal(MONAD_LENDING_GUARD_ATTESTATION_PRIMARY_TYPE),
    schemaVersion: z.literal(MONAD_LENDING_GUARD_ATTESTATION_SCHEMA_VERSION),
    uid: z.string().regex(HASH),
    attester: z.string().regex(ADDRESS),
    attesterLabel: z.literal('Insight Monad Lending Guard attester'),
    signedAt: z.string().datetime(),
    validForSeconds: z.literal(MONAD_LENDING_GUARD_ATTESTATION_VALID_FOR_SECONDS),
    signature: z.string().regex(SIGNATURE),
    verifyUrl: z.string().url(),
    data: AttestationDataSchema,
    eip712: z.record(z.string(), z.unknown()),
  })
  .strict();
const DecisionSchema = z
  .object({
    schema: z.literal(MONAD_LENDING_GUARD_DECISION_SCHEMA),
    guard: z
      .object({
        schema: z.literal('insight.monad-lending-guard.v1'),
        verdict: z.enum(['ALLOW', 'CAUTION', 'BLOCK']),
        protocolId: z.enum(['aave-v3-monad', 'morpho-blue-monad']),
        action: z.enum(['supply', 'borrow']),
        scope: z.object({ chainId: z.literal(MONAD_CHAIN_ID) }).passthrough(),
      })
      .passthrough(),
    transaction: MonadLendingExactTransactionSchema,
    action: ActionSchema,
    decisionHash: z.string().regex(HASH),
    attestation: AttestationSchema.nullable(),
  })
  .strict();

export interface MonadLendingGuardAttestationData {
  decisionHash: `0x${string}`;
  calldataHash: `0x${string}`;
  account: `0x${string}`;
  chainId: 143;
  verdict: 0 | 1 | 2;
  issuedAt: number;
  validUntil: number;
  schemaVersion: 1;
}
export interface MonadLendingGuardAttestation {
  type: typeof MONAD_LENDING_GUARD_ATTESTATION_PRIMARY_TYPE;
  schemaVersion: 1;
  uid: `0x${string}`;
  attester: `0x${string}`;
  attesterLabel: 'Insight Monad Lending Guard attester';
  signedAt: string;
  validForSeconds: number;
  signature: `0x${string}`;
  verifyUrl: string;
  data: MonadLendingGuardAttestationData;
  eip712: {
    domain: typeof MONAD_LENDING_GUARD_ATTESTATION_DOMAIN;
    types: typeof MONAD_LENDING_GUARD_ATTESTATION_TYPES;
    primaryType: typeof MONAD_LENDING_GUARD_ATTESTATION_PRIMARY_TYPE;
  };
}
export interface MonadLendingGuardDecision {
  schema: typeof MONAD_LENDING_GUARD_DECISION_SCHEMA;
  guard: MonadLendingGuardResult;
  transaction: MonadLendingExactTransaction;
  action: MonadLendingDecodedAction;
  decisionHash: `0x${string}`;
  attestation: MonadLendingGuardAttestation | null;
}
export interface MonadLendingGuardDecisionVerification {
  valid: boolean;
  decisionHash: string | null;
  attester: string | null;
  expired: boolean;
  reason:
    | 'verified'
    | 'missing_attestation'
    | 'malformed'
    | 'decision_hash_mismatch'
    | 'call_binding_mismatch'
    | 'uid_mismatch'
    | 'signature_invalid'
    | 'untrusted_attester'
    | 'expired'
    | 'verification_error';
}
export interface MonadLendingGuardAttestationDependencies {
  signer?: AttesterAccount | null;
  now?: () => number;
  verifyUrl?: string;
  trustAttester?: (address: string, issuedAt: number) => Promise<boolean>;
}

function verdictCode(verdict: MonadLendingGuardResult['verdict']): 0 | 1 | 2 {
  return verdict === 'ALLOW' ? 0 : verdict === 'CAUTION' ? 1 : 2;
}
function verifierUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://www.oracleinsight.xyz'
      : 'http://localhost:3000');
  return new URL(
    '/api/v1/safety/monad-lending-guard/verify',
    `${base.replace(/\/+$/, '')}/`
  ).toString();
}
function typedDataArgs(data: MonadLendingGuardAttestationData) {
  return {
    domain: MONAD_LENDING_GUARD_ATTESTATION_DOMAIN,
    types: MONAD_LENDING_GUARD_ATTESTATION_TYPES,
    primaryType: MONAD_LENDING_GUARD_ATTESTATION_PRIMARY_TYPE,
    message: {
      decisionHash: data.decisionHash,
      calldataHash: data.calldataHash,
      account: data.account,
      chainId: BigInt(data.chainId),
      verdict: data.verdict,
      issuedAt: BigInt(data.issuedAt),
      validUntil: BigInt(data.validUntil),
      schemaVersion: BigInt(data.schemaVersion),
    },
  } as const;
}
function unsignedDecision(
  value: Pick<MonadLendingGuardDecision, 'guard' | 'transaction' | 'action'>
) {
  return {
    schema: MONAD_LENDING_GUARD_DECISION_SCHEMA,
    guard: value.guard,
    transaction: value.transaction,
    action: value.action,
  };
}
export function monadLendingGuardDecisionHash(
  value: Pick<MonadLendingGuardDecision, 'guard' | 'transaction' | 'action'>
): `0x${string}` {
  return keccak256(new TextEncoder().encode(canonicalJsonString(unsignedDecision(value))));
}
function assertCallBinding(
  guard: MonadLendingGuardResult,
  transaction: MonadLendingExactTransaction,
  action: MonadLendingDecodedAction
): void {
  const decoded = decodeMonadLendingExactCall(transaction, {
    protocolId: guard.protocolId,
    action: guard.action,
    collateralSymbol: guard.market.collateralSymbol,
    loanSymbol: guard.market.loanSymbol,
    ...(guard.market.marketId ? { marketId: guard.market.marketId } : {}),
  });
  if (canonicalJsonString(decoded) !== canonicalJsonString(action)) {
    throw new Error('decoded exact call does not match the decision action binding');
  }
}

/** Build a decision even if signing is disabled; only an attested one is reusable evidence. */
export async function createMonadLendingGuardDecision(
  guard: MonadLendingGuardResult,
  rawTransaction: MonadLendingExactTransaction,
  dependencies: MonadLendingGuardAttestationDependencies = {}
): Promise<MonadLendingGuardDecision> {
  const transaction = MonadLendingExactTransactionSchema.parse(rawTransaction);
  const action = decodeMonadLendingExactCall(transaction, {
    protocolId: guard.protocolId,
    action: guard.action,
    collateralSymbol: guard.market.collateralSymbol,
    loanSymbol: guard.market.loanSymbol,
    ...(guard.market.marketId ? { marketId: guard.market.marketId } : {}),
  });
  const decisionHash = monadLendingGuardDecisionHash({ guard, transaction, action });
  const signer =
    dependencies.signer === undefined ? await getAttesterAccount() : dependencies.signer;
  if (!signer)
    return {
      schema: MONAD_LENDING_GUARD_DECISION_SCHEMA,
      guard,
      transaction,
      action,
      decisionHash,
      attestation: null,
    };
  const issuedAt = (dependencies.now ?? nowInSeconds)();
  const data: MonadLendingGuardAttestationData = {
    decisionHash,
    calldataHash: action.calldataHash,
    account: action.account,
    chainId: MONAD_CHAIN_ID,
    verdict: verdictCode(guard.verdict),
    issuedAt,
    validUntil: issuedAt + MONAD_LENDING_GUARD_ATTESTATION_VALID_FOR_SECONDS,
    schemaVersion: MONAD_LENDING_GUARD_ATTESTATION_SCHEMA_VERSION,
  };
  const trusted = dependencies.trustAttester ?? isPublishedMonadLendingGuardAttester;
  if (!(await trusted(signer.address, issuedAt))) {
    logger.warn('Monad lending guard signer is outside the published production key registry', {
      attester: signer.address,
    });
    return {
      schema: MONAD_LENDING_GUARD_DECISION_SCHEMA,
      guard,
      transaction,
      action,
      decisionHash,
      attestation: null,
    };
  }
  const args = typedDataArgs(data);
  const signature = await signer.signTypedData(args);
  return {
    schema: MONAD_LENDING_GUARD_DECISION_SCHEMA,
    guard,
    transaction,
    action,
    decisionHash,
    attestation: {
      type: MONAD_LENDING_GUARD_ATTESTATION_PRIMARY_TYPE,
      schemaVersion: MONAD_LENDING_GUARD_ATTESTATION_SCHEMA_VERSION,
      uid: hashTypedData(args),
      attester: signer.address.toLowerCase() as `0x${string}`,
      attesterLabel: 'Insight Monad Lending Guard attester',
      signedAt: new Date(issuedAt * 1000).toISOString(),
      validForSeconds: MONAD_LENDING_GUARD_ATTESTATION_VALID_FOR_SECONDS,
      signature: signature as `0x${string}`,
      verifyUrl: dependencies.verifyUrl ?? verifierUrl(),
      data,
      eip712: {
        domain: MONAD_LENDING_GUARD_ATTESTATION_DOMAIN,
        types: MONAD_LENDING_GUARD_ATTESTATION_TYPES,
        primaryType: MONAD_LENDING_GUARD_ATTESTATION_PRIMARY_TYPE,
      },
    },
  };
}

/** Verify integrity, exact-call binding, typed-data signature, trust and expiry. */
export async function verifyMonadLendingGuardDecision(
  value: unknown,
  dependencies: Pick<MonadLendingGuardAttestationDependencies, 'now' | 'trustAttester'> = {}
): Promise<MonadLendingGuardDecisionVerification> {
  const empty = { valid: false, decisionHash: null, attester: null, expired: false } as const;
  try {
    const parsed = DecisionSchema.safeParse(value);
    if (!parsed.success) return { ...empty, reason: 'malformed' };
    const decision = parsed.data as unknown as MonadLendingGuardDecision;
    if (!decision.attestation)
      return { ...empty, decisionHash: decision.decisionHash, reason: 'missing_attestation' };
    const expectedHash = monadLendingGuardDecisionHash(decision);
    if (
      expectedHash.toLowerCase() !== decision.decisionHash.toLowerCase() ||
      expectedHash.toLowerCase() !== decision.attestation.data.decisionHash.toLowerCase()
    ) {
      return {
        ...empty,
        decisionHash: expectedHash,
        attester: decision.attestation.attester,
        reason: 'decision_hash_mismatch',
      };
    }
    try {
      assertCallBinding(decision.guard, decision.transaction, decision.action);
    } catch {
      return {
        ...empty,
        decisionHash: expectedHash,
        attester: decision.attestation.attester,
        reason: 'call_binding_mismatch',
      };
    }
    const data = decision.attestation.data;
    if (
      data.calldataHash.toLowerCase() !== decision.action.calldataHash.toLowerCase() ||
      data.account.toLowerCase() !== decision.action.account.toLowerCase() ||
      data.verdict !== verdictCode(decision.guard.verdict) ||
      data.validUntil - data.issuedAt !== MONAD_LENDING_GUARD_ATTESTATION_VALID_FOR_SECONDS ||
      decision.attestation.signedAt !== new Date(data.issuedAt * 1000).toISOString() ||
      canonicalJsonString(decision.attestation.eip712) !==
        canonicalJsonString({
          domain: MONAD_LENDING_GUARD_ATTESTATION_DOMAIN,
          types: MONAD_LENDING_GUARD_ATTESTATION_TYPES,
          primaryType: MONAD_LENDING_GUARD_ATTESTATION_PRIMARY_TYPE,
        })
    )
      return {
        ...empty,
        decisionHash: expectedHash,
        attester: decision.attestation.attester,
        reason: 'malformed',
      };
    const args = typedDataArgs(data);
    if (hashTypedData(args).toLowerCase() !== decision.attestation.uid.toLowerCase()) {
      return {
        ...empty,
        decisionHash: expectedHash,
        attester: decision.attestation.attester,
        reason: 'uid_mismatch',
      };
    }
    if (
      !(await verifyTypedData({
        ...args,
        address: decision.attestation.attester,
        signature: decision.attestation.signature,
      }))
    ) {
      return {
        ...empty,
        decisionHash: expectedHash,
        attester: decision.attestation.attester,
        reason: 'signature_invalid',
      };
    }
    const trusted = dependencies.trustAttester ?? isPublishedMonadLendingGuardAttester;
    if (!(await trusted(decision.attestation.attester, data.issuedAt))) {
      return {
        ...empty,
        decisionHash: expectedHash,
        attester: decision.attestation.attester,
        reason: 'untrusted_attester',
      };
    }
    const expired = data.validUntil <= (dependencies.now ?? nowInSeconds)();
    return {
      valid: !expired,
      decisionHash: expectedHash,
      attester: decision.attestation.attester,
      expired,
      reason: expired ? 'expired' : 'verified',
    };
  } catch (error) {
    logger.warn('Monad lending guard decision verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...empty, reason: 'verification_error' };
  }
}
export async function isPublishedMonadLendingGuardAttester(
  address: string,
  issuedAt: number
): Promise<boolean> {
  if (!ADDRESS.test(address)) return false;
  const config = buildKeyRegistryConfig(
    await getAttesterAddress(),
    await getSampleAttesterAddress()
  );
  return trustedAttesterEntry(address, issuedAt, config) !== null;
}
