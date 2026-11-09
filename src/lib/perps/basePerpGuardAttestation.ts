/**
 * A portable EIP-712 decision for one already-decoded Synthetix Perps V3 Base
 * `commitOrder` call.
 *
 * Insight signs risk assessment evidence only. This module never creates a
 * user authorization, broadcasts a transaction, or turns an ALLOW into
 * execution authority. PriorSeal (or another authorization system) must bind
 * the returned `decisionHash` to the same exact call independently.
 */

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
  BASE_CHAIN_ID,
  BasePerpExactTransactionSchema,
  decodeBasePerpExactCall,
  type BasePerpDecodedAction,
  type BasePerpExactTransaction,
} from './basePerpAction';
import { SYNTHETIX_PERPS_V3_BASE_PROTOCOL_ID, type BasePerpGuardResult } from './basePerpGuard';

const logger = createLogger('BasePerpGuardAttestation');

export const BASE_PERP_GUARD_DECISION_SCHEMA = 'insight.base-perp-guard-decision.v1' as const;
export const BASE_PERP_GUARD_ATTESTATION_SCHEMA_VERSION = 1 as const;
export const BASE_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS = 300;
export const BASE_PERP_GUARD_ATTESTATION_PRIMARY_TYPE = 'BasePerpGuardDecision' as const;
export const BASE_PERP_GUARD_ATTESTATION_DOMAIN = {
  name: 'Insight Base Perp Guard',
  version: '1',
  chainId: 1,
} as const;
export const BASE_PERP_GUARD_ATTESTATION_TYPES = {
  BasePerpGuardDecision: [
    { name: 'decisionHash', type: 'bytes32' },
    { name: 'calldataHash', type: 'bytes32' },
    { name: 'account', type: 'address' },
    { name: 'marketId', type: 'uint256' },
    { name: 'sizeDelta', type: 'int256' },
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
const DECIMAL = /^(?:0|[1-9][0-9]*)$/;
const SIGNED_DECIMAL = /^-?(?:0|[1-9][0-9]*)$/;

const TransactionSchema = BasePerpExactTransactionSchema;
const ActionSchema = z
  .object({
    protocolId: z.literal(SYNTHETIX_PERPS_V3_BASE_PROTOCOL_ID),
    action: z.enum(['open_long', 'open_short']),
    target: z.string().regex(ADDRESS),
    calldataHash: z.string().regex(HASH),
    marketId: z.string().regex(DECIMAL),
    account: z.string().regex(ADDRESS),
    accountId: z.string().regex(DECIMAL),
    sizeDelta: z.string().regex(SIGNED_DECIMAL),
    acceptablePrice: z.string().regex(DECIMAL),
    trackingCode: z.string().regex(/^0x(?:[a-fA-F0-9]{2}){32}$/),
    referrer: z.string().regex(ADDRESS),
  })
  .strict();

const AttestationDataSchema = z
  .object({
    decisionHash: z.string().regex(HASH),
    calldataHash: z.string().regex(HASH),
    account: z.string().regex(ADDRESS),
    marketId: z.string().regex(DECIMAL),
    sizeDelta: z.string().regex(SIGNED_DECIMAL),
    chainId: z.literal(BASE_CHAIN_ID),
    verdict: z.number().int().min(0).max(2),
    issuedAt: z.number().int().nonnegative().safe(),
    validUntil: z.number().int().nonnegative().safe(),
    schemaVersion: z.literal(BASE_PERP_GUARD_ATTESTATION_SCHEMA_VERSION),
  })
  .strict();

const AttestationSchema = z
  .object({
    type: z.literal(BASE_PERP_GUARD_ATTESTATION_PRIMARY_TYPE),
    schemaVersion: z.literal(BASE_PERP_GUARD_ATTESTATION_SCHEMA_VERSION),
    uid: z.string().regex(HASH),
    attester: z.string().regex(ADDRESS),
    attesterLabel: z.literal('Insight Base Perp Guard attester'),
    signedAt: z.string().datetime(),
    validForSeconds: z.literal(BASE_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS),
    signature: z.string().regex(SIGNATURE),
    verifyUrl: z.string().url(),
    data: AttestationDataSchema,
    eip712: z.record(z.string(), z.unknown()),
  })
  .strict();

const DecisionSchema = z
  .object({
    schema: z.literal(BASE_PERP_GUARD_DECISION_SCHEMA),
    guard: z
      .object({
        schema: z.literal('insight.base-perp-guard.v1'),
        verdict: z.enum(['ALLOW', 'CAUTION', 'BLOCK']),
        protocolId: z.literal(SYNTHETIX_PERPS_V3_BASE_PROTOCOL_ID),
        action: z.enum(['open_long', 'open_short']),
        scope: z.object({ chainId: z.literal(BASE_CHAIN_ID) }).passthrough(),
      })
      .passthrough(),
    transaction: TransactionSchema,
    action: ActionSchema,
    decisionHash: z.string().regex(HASH),
    attestation: AttestationSchema.nullable(),
  })
  .strict();

export interface BasePerpGuardAttestationData {
  decisionHash: `0x${string}`;
  calldataHash: `0x${string}`;
  account: `0x${string}`;
  marketId: string;
  sizeDelta: string;
  chainId: 8453;
  verdict: 0 | 1 | 2;
  issuedAt: number;
  validUntil: number;
  schemaVersion: 1;
}

export interface BasePerpGuardAttestation {
  type: typeof BASE_PERP_GUARD_ATTESTATION_PRIMARY_TYPE;
  schemaVersion: 1;
  uid: `0x${string}`;
  attester: `0x${string}`;
  attesterLabel: 'Insight Base Perp Guard attester';
  signedAt: string;
  validForSeconds: number;
  signature: `0x${string}`;
  verifyUrl: string;
  data: BasePerpGuardAttestationData;
  eip712: {
    domain: typeof BASE_PERP_GUARD_ATTESTATION_DOMAIN;
    types: typeof BASE_PERP_GUARD_ATTESTATION_TYPES;
    primaryType: typeof BASE_PERP_GUARD_ATTESTATION_PRIMARY_TYPE;
  };
}

export interface BasePerpGuardDecision {
  schema: typeof BASE_PERP_GUARD_DECISION_SCHEMA;
  guard: BasePerpGuardResult;
  transaction: BasePerpExactTransaction;
  action: BasePerpDecodedAction;
  /** keccak256 over the canonical unsigned decision, including exact calldata. */
  decisionHash: `0x${string}`;
  attestation: BasePerpGuardAttestation | null;
}

export interface BasePerpGuardDecisionVerification {
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

export interface BasePerpGuardAttestationDependencies {
  signer?: AttesterAccount | null;
  now?: () => number;
  verifyUrl?: string;
  trustAttester?: (address: string, issuedAt: number) => Promise<boolean>;
}

function verdictCode(verdict: BasePerpGuardResult['verdict']): 0 | 1 | 2 {
  return verdict === 'ALLOW' ? 0 : verdict === 'CAUTION' ? 1 : 2;
}

function verifyUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://www.oracleinsight.xyz'
      : 'http://localhost:3000');
  return new URL(
    '/api/v1/safety/base-perp-guard/verify',
    `${base.replace(/\/+$/, '')}/`
  ).toString();
}

function typedDataArgs(data: BasePerpGuardAttestationData) {
  return {
    domain: BASE_PERP_GUARD_ATTESTATION_DOMAIN,
    types: BASE_PERP_GUARD_ATTESTATION_TYPES,
    primaryType: BASE_PERP_GUARD_ATTESTATION_PRIMARY_TYPE,
    message: {
      decisionHash: data.decisionHash,
      calldataHash: data.calldataHash,
      account: data.account,
      marketId: BigInt(data.marketId),
      sizeDelta: BigInt(data.sizeDelta),
      chainId: BigInt(data.chainId),
      verdict: data.verdict,
      issuedAt: BigInt(data.issuedAt),
      validUntil: BigInt(data.validUntil),
      schemaVersion: BigInt(data.schemaVersion),
    },
  } as const;
}

function unsignedDecision(value: Pick<BasePerpGuardDecision, 'guard' | 'transaction' | 'action'>) {
  return {
    schema: BASE_PERP_GUARD_DECISION_SCHEMA,
    guard: value.guard,
    transaction: value.transaction,
    action: value.action,
  };
}

export function basePerpGuardDecisionHash(
  value: Pick<BasePerpGuardDecision, 'guard' | 'transaction' | 'action'>
): `0x${string}` {
  return keccak256(new TextEncoder().encode(canonicalJsonString(unsignedDecision(value))));
}

/**
 * Reviewed worst-case notional binding: `sizeDelta × acceptablePrice` is the
 * maximum USD the committed order can spend, so it must stay within tolerance
 * of the assessed declared size. The band absorbs the prepare-time slippage
 * headroom baked into `acceptablePrice` by the reviewed envelope flow.
 */
export const BASE_PERP_BINDING_NOTIONAL_TOLERANCE = 0.15;

/**
 * Guard-level invariants that must hold for any bindable exact call: a BLOCK
 * assessment is never executable evidence, and the committed worst-case spend
 * cannot depart from the assessed size.
 */
function assertGuardBindingScope(guard: BasePerpGuardResult, action: BasePerpDecodedAction): void {
  if (guard.verdict === 'BLOCK') {
    throw new Error('A BLOCK verdict must not be bound to an exact order');
  }
  const signedSize = BigInt(action.sizeDelta);
  const magnitude = signedSize < 0n ? -signedSize : signedSize;
  const worstCaseNotionalUsd = Number((magnitude * BigInt(action.acceptablePrice)) / 10n ** 36n);
  if (
    !Number.isFinite(worstCaseNotionalUsd) ||
    worstCaseNotionalUsd <= 0 ||
    Math.abs(worstCaseNotionalUsd - guard.projected.sizeUsd) / guard.projected.sizeUsd >
      BASE_PERP_BINDING_NOTIONAL_TOLERANCE
  ) {
    throw new Error(
      'Exact call worst-case notional departs from the assessed declared size beyond the reviewed tolerance; re-assess at the actual size'
    );
  }
}

function assertCallBinding(
  guard: BasePerpGuardResult,
  transaction: BasePerpExactTransaction,
  action: BasePerpDecodedAction
): void {
  const decoded = decodeBasePerpExactCall(transaction, {
    protocolId: guard.protocolId,
    action: guard.action,
    assetSymbol: guard.market.assetSymbol,
  });
  if (canonicalJsonString(decoded) !== canonicalJsonString(action)) {
    throw new Error('decoded exact call does not match the decision action binding');
  }
  assertGuardBindingScope(guard, decoded);
}

/** Build a decision even when signing is disabled; only an attested decision is reusable. */
export async function createBasePerpGuardDecision(
  guard: BasePerpGuardResult,
  rawTransaction: BasePerpExactTransaction,
  dependencies: BasePerpGuardAttestationDependencies = {}
): Promise<BasePerpGuardDecision> {
  const transaction = TransactionSchema.parse(rawTransaction);
  const action = decodeBasePerpExactCall(transaction, {
    protocolId: guard.protocolId,
    action: guard.action,
    assetSymbol: guard.market.assetSymbol,
  });
  assertGuardBindingScope(guard, action);
  const decisionHash = basePerpGuardDecisionHash({ guard, transaction, action });
  const signer =
    dependencies.signer === undefined ? await getAttesterAccount() : dependencies.signer;
  if (!signer) {
    return {
      schema: BASE_PERP_GUARD_DECISION_SCHEMA,
      guard,
      transaction,
      action,
      decisionHash,
      attestation: null,
    };
  }
  const issuedAt = (dependencies.now ?? nowInSeconds)();
  const data: BasePerpGuardAttestationData = {
    decisionHash,
    calldataHash: action.calldataHash,
    account: action.account,
    marketId: action.marketId,
    sizeDelta: action.sizeDelta,
    chainId: BASE_CHAIN_ID,
    verdict: verdictCode(guard.verdict),
    issuedAt,
    validUntil: issuedAt + BASE_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS,
    schemaVersion: BASE_PERP_GUARD_ATTESTATION_SCHEMA_VERSION,
  };
  const trusted = dependencies.trustAttester ?? isPublishedBasePerpGuardAttester;
  if (!(await trusted(signer.address, issuedAt))) {
    logger.warn('Base perp guard signer is outside the published production key registry', {
      attester: signer.address,
    });
    return {
      schema: BASE_PERP_GUARD_DECISION_SCHEMA,
      guard,
      transaction,
      action,
      decisionHash,
      attestation: null,
    };
  }
  const args = typedDataArgs(data);
  const signature = await signer.signTypedData(args);
  const attestation: BasePerpGuardAttestation = {
    type: BASE_PERP_GUARD_ATTESTATION_PRIMARY_TYPE,
    schemaVersion: BASE_PERP_GUARD_ATTESTATION_SCHEMA_VERSION,
    uid: hashTypedData(args),
    attester: signer.address.toLowerCase() as `0x${string}`,
    attesterLabel: 'Insight Base Perp Guard attester',
    signedAt: new Date(issuedAt * 1000).toISOString(),
    validForSeconds: BASE_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS,
    signature: signature as `0x${string}`,
    verifyUrl: dependencies.verifyUrl ?? verifyUrl(),
    data,
    eip712: {
      domain: BASE_PERP_GUARD_ATTESTATION_DOMAIN,
      types: BASE_PERP_GUARD_ATTESTATION_TYPES,
      primaryType: BASE_PERP_GUARD_ATTESTATION_PRIMARY_TYPE,
    },
  };
  return {
    schema: BASE_PERP_GUARD_DECISION_SCHEMA,
    guard,
    transaction,
    action,
    decisionHash,
    attestation,
  };
}

/** Verify integrity, exact-call binding, EIP-712 issuer signature, and expiry. */
export async function verifyBasePerpGuardDecision(
  value: unknown,
  dependencies: Pick<BasePerpGuardAttestationDependencies, 'now' | 'trustAttester'> = {}
): Promise<BasePerpGuardDecisionVerification> {
  const empty = { valid: false, decisionHash: null, attester: null, expired: false } as const;
  try {
    const parsed = DecisionSchema.safeParse(value);
    if (!parsed.success) return { ...empty, reason: 'malformed' };
    const decision = parsed.data as unknown as BasePerpGuardDecision;
    if (!decision.attestation)
      return { ...empty, decisionHash: decision.decisionHash, reason: 'missing_attestation' };
    const expectedHash = basePerpGuardDecisionHash(decision);
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
      data.marketId !== decision.action.marketId ||
      data.sizeDelta !== decision.action.sizeDelta ||
      data.verdict !== verdictCode(decision.guard.verdict) ||
      data.validUntil - data.issuedAt !== BASE_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS ||
      decision.attestation.signedAt !== new Date(data.issuedAt * 1000).toISOString() ||
      canonicalJsonString(decision.attestation.eip712) !==
        canonicalJsonString({
          domain: BASE_PERP_GUARD_ATTESTATION_DOMAIN,
          types: BASE_PERP_GUARD_ATTESTATION_TYPES,
          primaryType: BASE_PERP_GUARD_ATTESTATION_PRIMARY_TYPE,
        })
    ) {
      return {
        ...empty,
        decisionHash: expectedHash,
        attester: decision.attestation.attester,
        reason: 'malformed',
      };
    }
    const args = typedDataArgs(data);
    if (hashTypedData(args).toLowerCase() !== decision.attestation.uid.toLowerCase()) {
      return {
        ...empty,
        decisionHash: expectedHash,
        attester: decision.attestation.attester,
        reason: 'uid_mismatch',
      };
    }
    const signatureValid = await verifyTypedData({
      ...args,
      address: decision.attestation.attester,
      signature: decision.attestation.signature,
    });
    if (!signatureValid) {
      return {
        ...empty,
        decisionHash: expectedHash,
        attester: decision.attestation.attester,
        reason: 'signature_invalid',
      };
    }
    const trusted = dependencies.trustAttester ?? isPublishedBasePerpGuardAttester;
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
    logger.warn('Base perp guard decision verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...empty, reason: 'verification_error' };
  }
}

export async function isPublishedBasePerpGuardAttester(
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
