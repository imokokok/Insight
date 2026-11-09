/**
 * Portable EIP-712 decision for one bound centralized Perpl order payload
 * (Monad perp guard). Reuses the Base/Solana/Monad-lending attestation pattern.
 *
 * Insight signs RISK-ASSESSMENT EVIDENCE only. The signed bytes commit to the
 * canonical-serialization payloadHash of a centralized venue API order — NOT
 * to chain calldata — so this attestation can never prove on-chain execution.
 * It proves that a specific guard decision was bound to one specific order
 * payload, and it is independently recomputable via
 * verifyMonadPerpGuardDecision (the lib-level verify path).
 *
 * Note: the conventional HTTP `/api/v1/safety/monad-perp-guard/verify` route
 * referenced by verifyUrl is not part of this module's ownership boundary;
 * verification here is a pure, self-contained recompute of the decision hash,
 * exact order binding, typed-data signature, signer trust, and expiry.
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
import { MONAD_CHAIN_ID } from '@/lib/lending/monadLendingProtocols';
import { canonicalJsonString } from '@/lib/utils/canonicalJson';
import { createLogger } from '@/lib/utils/logger';
import { nowInSeconds } from '@/lib/utils/time';

import {
  bindMonadPerpExactOrder,
  monadPerpOrderPayloadHash,
  MonadPerpExactOrderPayloadSchema,
  type MonadPerpDecodedAction,
  type MonadPerpExactOrderPayload,
} from './monadPerpAction';
import { MONAD_PERP_GUARD_PERPL_PROTOCOL_ID, type MonadPerpGuardResult } from './monadPerpGuard';

const logger = createLogger('MonadPerpGuardAttestation');

export const MONAD_PERP_GUARD_DECISION_SCHEMA = 'insight.monad-perp-guard-decision.v1' as const;
export const MONAD_PERP_GUARD_ATTESTATION_SCHEMA_VERSION = 1 as const;
export const MONAD_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS = 300;
export const MONAD_PERP_GUARD_ATTESTATION_PRIMARY_TYPE = 'MonadPerpGuardDecision' as const;
export const MONAD_PERP_GUARD_ATTESTATION_DOMAIN = {
  name: 'Insight Monad Perp Guard',
  version: '1',
  chainId: MONAD_CHAIN_ID,
} as const;
export const MONAD_PERP_GUARD_ATTESTATION_TYPES = {
  MonadPerpGuardDecision: [
    { name: 'decisionHash', type: 'bytes32' },
    { name: 'payloadHash', type: 'bytes32' },
    { name: 'accountHash', type: 'bytes32' },
    { name: 'marketId', type: 'uint256' },
    { name: 'side', type: 'uint8' },
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

const ActionSchema = z
  .object({
    protocolId: z.literal(MONAD_PERP_GUARD_PERPL_PROTOCOL_ID),
    action: z.enum(['open_long', 'open_short']),
    marketId: z.number().int().positive(),
    symbol: z.string().min(1),
    marginAssetSymbol: z.literal('AUSD'),
    side: z.enum(['long', 'short']),
    orderType: z.enum(['market', 'limit']),
    sizeUsd: z.number().finite().positive(),
    marginUsd: z.number().finite().positive(),
    leverage: z.number().finite().positive(),
    limitPrice: z.number().finite().positive().nullable(),
    priceBoundBps: z.number().int().nonnegative(),
    reduceOnly: z.literal(false),
    account: z.string().min(1),
    clientOrderId: z.string().min(1),
    createdAtMs: z.number().int().nonnegative(),
    payloadHash: z.string().regex(HASH),
    bindingSurface: z.literal('centralized-order-payload-canonical-serialization'),
    provesOnchainExecution: z.literal(false),
  })
  .strict();

const AttestationDataSchema = z
  .object({
    decisionHash: z.string().regex(HASH),
    payloadHash: z.string().regex(HASH),
    accountHash: z.string().regex(HASH),
    marketId: z.string().regex(DECIMAL),
    side: z.union([z.literal(0), z.literal(1)]),
    chainId: z.literal(MONAD_CHAIN_ID),
    verdict: z.number().int().min(0).max(2),
    issuedAt: z.number().int().nonnegative().safe(),
    validUntil: z.number().int().nonnegative().safe(),
    schemaVersion: z.literal(MONAD_PERP_GUARD_ATTESTATION_SCHEMA_VERSION),
  })
  .strict();

const AttestationSchema = z
  .object({
    type: z.literal(MONAD_PERP_GUARD_ATTESTATION_PRIMARY_TYPE),
    schemaVersion: z.literal(MONAD_PERP_GUARD_ATTESTATION_SCHEMA_VERSION),
    uid: z.string().regex(HASH),
    attester: z.string().regex(ADDRESS),
    attesterLabel: z.literal('Insight Monad Perp Guard attester'),
    signedAt: z.string().datetime(),
    validForSeconds: z.literal(MONAD_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS),
    signature: z.string().regex(SIGNATURE),
    verifyUrl: z.string().url(),
    data: AttestationDataSchema,
    eip712: z.record(z.string(), z.unknown()),
  })
  .strict();

const DecisionSchema = z
  .object({
    schema: z.literal(MONAD_PERP_GUARD_DECISION_SCHEMA),
    guard: z
      .object({
        schema: z.literal('insight.monad-perp-guard.v1'),
        verdict: z.enum(['ALLOW', 'CAUTION', 'BLOCK']),
        protocolId: z.literal(MONAD_PERP_GUARD_PERPL_PROTOCOL_ID),
        action: z.enum(['open_long', 'open_short']),
        scope: z.object({ venue: z.literal('perpl') }).passthrough(),
      })
      .passthrough(),
    order: MonadPerpExactOrderPayloadSchema,
    action: ActionSchema,
    decisionHash: z.string().regex(HASH),
    attestation: AttestationSchema.nullable(),
  })
  .strict();

export interface MonadPerpGuardAttestationData {
  decisionHash: `0x${string}`;
  /** Canonical-serialization hash of the centralized Perpl order payload. */
  payloadHash: `0x${string}`;
  /** keccak256 of the venue account identifier (no on-chain address claim). */
  accountHash: `0x${string}`;
  marketId: string;
  side: 0 | 1;
  chainId: 143;
  verdict: 0 | 1 | 2;
  issuedAt: number;
  validUntil: number;
  schemaVersion: 1;
}

export interface MonadPerpGuardAttestation {
  type: typeof MONAD_PERP_GUARD_ATTESTATION_PRIMARY_TYPE;
  schemaVersion: 1;
  uid: `0x${string}`;
  attester: `0x${string}`;
  attesterLabel: 'Insight Monad Perp Guard attester';
  signedAt: string;
  validForSeconds: number;
  signature: `0x${string}`;
  verifyUrl: string;
  data: MonadPerpGuardAttestationData;
  eip712: {
    domain: typeof MONAD_PERP_GUARD_ATTESTATION_DOMAIN;
    types: typeof MONAD_PERP_GUARD_ATTESTATION_TYPES;
    primaryType: typeof MONAD_PERP_GUARD_ATTESTATION_PRIMARY_TYPE;
  };
}

export interface MonadPerpGuardDecision {
  schema: typeof MONAD_PERP_GUARD_DECISION_SCHEMA;
  guard: MonadPerpGuardResult;
  order: MonadPerpExactOrderPayload;
  action: MonadPerpDecodedAction;
  /** keccak256 over the canonical unsigned decision, including the order payload. */
  decisionHash: `0x${string}`;
  attestation: MonadPerpGuardAttestation | null;
}

export interface MonadPerpGuardDecisionVerification {
  valid: boolean;
  decisionHash: string | null;
  attester: string | null;
  expired: boolean;
  reason:
    | 'verified'
    | 'missing_attestation'
    | 'malformed'
    | 'decision_hash_mismatch'
    | 'order_binding_mismatch'
    | 'uid_mismatch'
    | 'signature_invalid'
    | 'untrusted_attester'
    | 'expired'
    | 'verification_error';
}

export interface MonadPerpGuardAttestationDependencies {
  signer?: AttesterAccount | null;
  now?: () => number;
  verifyUrl?: string;
  trustAttester?: (address: string, issuedAt: number) => Promise<boolean>;
}

function verdictCode(verdict: MonadPerpGuardResult['verdict']): 0 | 1 | 2 {
  return verdict === 'ALLOW' ? 0 : verdict === 'CAUTION' ? 1 : 2;
}
function sideCode(action: MonadPerpDecodedAction): 0 | 1 {
  return action.side === 'long' ? 0 : 1;
}
function accountHash(account: string): `0x${string}` {
  return keccak256(new TextEncoder().encode(account));
}
function verifierUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://www.oracleinsight.xyz'
      : 'http://localhost:3000');
  return new URL(
    '/api/v1/safety/monad-perp-guard/verify',
    `${base.replace(/\/+$/, '')}/`
  ).toString();
}
function typedDataArgs(data: MonadPerpGuardAttestationData) {
  return {
    domain: MONAD_PERP_GUARD_ATTESTATION_DOMAIN,
    types: MONAD_PERP_GUARD_ATTESTATION_TYPES,
    primaryType: MONAD_PERP_GUARD_ATTESTATION_PRIMARY_TYPE,
    message: {
      decisionHash: data.decisionHash,
      payloadHash: data.payloadHash,
      accountHash: data.accountHash,
      marketId: BigInt(data.marketId),
      side: data.side,
      chainId: BigInt(data.chainId),
      verdict: data.verdict,
      issuedAt: BigInt(data.issuedAt),
      validUntil: BigInt(data.validUntil),
      schemaVersion: BigInt(data.schemaVersion),
    },
  } as const;
}
function unsignedDecision(value: Pick<MonadPerpGuardDecision, 'guard' | 'order' | 'action'>) {
  return {
    schema: MONAD_PERP_GUARD_DECISION_SCHEMA,
    guard: value.guard,
    order: value.order,
    action: value.action,
  };
}
export function monadPerpGuardDecisionHash(
  value: Pick<MonadPerpGuardDecision, 'guard' | 'order' | 'action'>
): `0x${string}` {
  return keccak256(new TextEncoder().encode(canonicalJsonString(unsignedDecision(value))));
}

/**
 * Guard-level invariant shared by bind and verify: a BLOCK assessment is
 * never executable evidence (same invariant as the BNB / Hyperliquid layers).
 */
function assertMonadGuardBindingScope(guard: MonadPerpGuardResult): void {
  if (guard.verdict === 'BLOCK') {
    throw new Error('A BLOCK verdict must not be bound to an exact order');
  }
}

/** Recompute the exact order binding from the guard scope and order payload. */
function assertOrderBinding(
  guard: MonadPerpGuardResult,
  order: MonadPerpExactOrderPayload,
  action: MonadPerpDecodedAction
): void {
  assertMonadGuardBindingScope(guard);
  const decoded = bindMonadPerpExactOrder(order, {
    protocolId: guard.protocolId,
    action: guard.action,
    assetSymbol: guard.market.assetSymbol,
    sizeUsd: guard.projected.sizeUsd,
    marginValueUsd: guard.projected.marginValueUsd,
  });
  if (canonicalJsonString(decoded) !== canonicalJsonString(action)) {
    throw new Error('decoded exact order does not match the decision action binding');
  }
}

/** Build a decision even if signing is disabled; only an attested one is reusable. */
export async function createMonadPerpGuardDecision(
  guard: MonadPerpGuardResult,
  rawOrder: MonadPerpExactOrderPayload,
  dependencies: MonadPerpGuardAttestationDependencies = {}
): Promise<MonadPerpGuardDecision> {
  assertMonadGuardBindingScope(guard);
  const order = MonadPerpExactOrderPayloadSchema.parse(rawOrder);
  const action = bindMonadPerpExactOrder(order, {
    protocolId: guard.protocolId,
    action: guard.action,
    assetSymbol: guard.market.assetSymbol,
    sizeUsd: guard.projected.sizeUsd,
    marginValueUsd: guard.projected.marginValueUsd,
  });
  const decisionHash = monadPerpGuardDecisionHash({ guard, order, action });
  const signer =
    dependencies.signer === undefined ? await getAttesterAccount() : dependencies.signer;
  if (!signer) {
    return {
      schema: MONAD_PERP_GUARD_DECISION_SCHEMA,
      guard,
      order,
      action,
      decisionHash,
      attestation: null,
    };
  }
  const issuedAt = (dependencies.now ?? nowInSeconds)();
  const data: MonadPerpGuardAttestationData = {
    decisionHash,
    payloadHash: action.payloadHash,
    accountHash: accountHash(action.account),
    marketId: action.marketId.toString(10),
    side: sideCode(action),
    chainId: MONAD_CHAIN_ID,
    verdict: verdictCode(guard.verdict),
    issuedAt,
    validUntil: issuedAt + MONAD_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS,
    schemaVersion: MONAD_PERP_GUARD_ATTESTATION_SCHEMA_VERSION,
  };
  const trusted = dependencies.trustAttester ?? isPublishedMonadPerpGuardAttester;
  if (!(await trusted(signer.address, issuedAt))) {
    logger.warn('Monad perp guard signer is outside the published production key registry', {
      attester: signer.address,
    });
    return {
      schema: MONAD_PERP_GUARD_DECISION_SCHEMA,
      guard,
      order,
      action,
      decisionHash,
      attestation: null,
    };
  }
  const args = typedDataArgs(data);
  const signature = await signer.signTypedData(args);
  return {
    schema: MONAD_PERP_GUARD_DECISION_SCHEMA,
    guard,
    order,
    action,
    decisionHash,
    attestation: {
      type: MONAD_PERP_GUARD_ATTESTATION_PRIMARY_TYPE,
      schemaVersion: MONAD_PERP_GUARD_ATTESTATION_SCHEMA_VERSION,
      uid: hashTypedData(args),
      attester: signer.address.toLowerCase() as `0x${string}`,
      attesterLabel: 'Insight Monad Perp Guard attester',
      signedAt: new Date(issuedAt * 1000).toISOString(),
      validForSeconds: MONAD_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS,
      signature: signature as `0x${string}`,
      verifyUrl: dependencies.verifyUrl ?? verifierUrl(),
      data,
      eip712: {
        domain: MONAD_PERP_GUARD_ATTESTATION_DOMAIN,
        types: MONAD_PERP_GUARD_ATTESTATION_TYPES,
        primaryType: MONAD_PERP_GUARD_ATTESTATION_PRIMARY_TYPE,
      },
    },
  };
}

/** Verify integrity, exact-order binding, EIP-712 signature, trust and expiry. */
export async function verifyMonadPerpGuardDecision(
  value: unknown,
  dependencies: Pick<MonadPerpGuardAttestationDependencies, 'now' | 'trustAttester'> = {}
): Promise<MonadPerpGuardDecisionVerification> {
  const empty = { valid: false, decisionHash: null, attester: null, expired: false } as const;
  try {
    const parsed = DecisionSchema.safeParse(value);
    if (!parsed.success) return { ...empty, reason: 'malformed' };
    const decision = parsed.data as unknown as MonadPerpGuardDecision;
    if (!decision.attestation)
      return { ...empty, decisionHash: decision.decisionHash, reason: 'missing_attestation' };
    const expectedHash = monadPerpGuardDecisionHash(decision);
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
    // Independent recompute: rebind the order to the guard scope and rehash.
    try {
      assertOrderBinding(decision.guard, decision.order, decision.action);
      if (
        monadPerpOrderPayloadHash(decision.order).toLowerCase() !==
        decision.action.payloadHash.toLowerCase()
      ) {
        throw new Error('order payload hash does not match the bound action');
      }
    } catch {
      return {
        ...empty,
        decisionHash: expectedHash,
        attester: decision.attestation.attester,
        reason: 'order_binding_mismatch',
      };
    }
    const data = decision.attestation.data;
    if (
      data.payloadHash.toLowerCase() !== decision.action.payloadHash.toLowerCase() ||
      data.accountHash.toLowerCase() !== accountHash(decision.action.account).toLowerCase() ||
      data.marketId !== decision.action.marketId.toString(10) ||
      data.side !== sideCode(decision.action) ||
      data.verdict !== verdictCode(decision.guard.verdict) ||
      data.validUntil - data.issuedAt !== MONAD_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS ||
      decision.attestation.signedAt !== new Date(data.issuedAt * 1000).toISOString() ||
      canonicalJsonString(decision.attestation.eip712) !==
        canonicalJsonString({
          domain: MONAD_PERP_GUARD_ATTESTATION_DOMAIN,
          types: MONAD_PERP_GUARD_ATTESTATION_TYPES,
          primaryType: MONAD_PERP_GUARD_ATTESTATION_PRIMARY_TYPE,
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
    // A structurally malformed signature makes viem throw instead of
    // returning false; treat that as an invalid signature (fail closed) rather
    // than collapsing it into a generic verification_error.
    let signatureValid = false;
    try {
      signatureValid = await verifyTypedData({
        ...args,
        address: decision.attestation.attester,
        signature: decision.attestation.signature,
      });
    } catch {
      signatureValid = false;
    }
    if (!signatureValid) {
      return {
        ...empty,
        decisionHash: expectedHash,
        attester: decision.attestation.attester,
        reason: 'signature_invalid',
      };
    }
    const trusted = dependencies.trustAttester ?? isPublishedMonadPerpGuardAttester;
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
    logger.warn('Monad perp guard decision verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...empty, reason: 'verification_error' };
  }
}

export async function isPublishedMonadPerpGuardAttester(
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
