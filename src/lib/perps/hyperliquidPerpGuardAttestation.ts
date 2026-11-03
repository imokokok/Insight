/**
 * A portable EIP-712 decision for one exact unsigned Hyperliquid perp order
 * envelope.
 *
 * The attestation domain is Insight's (EVM chainId 1): the attester signs
 * risk-assessment evidence about a non-EVM subject. Hyperliquid's own L1
 * action signing happens entirely in the user's wallet process and is not
 * produced or verified here. Insight never creates a user authorization,
 * submits an order, or turns an ALLOW into execution authority; PriorSeal (or
 * another authorization system) must bind the returned `decisionHash` to the
 * same exact envelope independently.
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
  HYPERLIQUID_PERPS_PROTOCOL_ID,
  type HyperliquidPerpGuardResult,
} from './hyperliquidPerpGuard';
import {
  bindHyperliquidPerpExactOrder,
  hyperliquidPerpOrderIntentHash,
  type HyperliquidPerpOrderBinding,
  type HyperliquidPerpOrderEnvelope,
} from './hyperliquidPerpGuardAction';

const logger = createLogger('HyperliquidPerpGuardAttestation');

export const HYPERLIQUID_PERP_GUARD_DECISION_SCHEMA =
  'insight.hyperliquid-perp-guard-decision.v1' as const;
export const HYPERLIQUID_PERP_GUARD_ATTESTATION_SCHEMA_VERSION = 1 as const;
export const HYPERLIQUID_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS = 300;
export const HYPERLIQUID_PERP_GUARD_ATTESTATION_PRIMARY_TYPE =
  'HyperliquidPerpGuardDecision' as const;
export const HYPERLIQUID_PERP_GUARD_ATTESTATION_DOMAIN = {
  name: 'Insight Hyperliquid Perp Guard',
  version: '1',
  chainId: 1,
} as const;
export const HYPERLIQUID_PERP_GUARD_ATTESTATION_TYPES = {
  HyperliquidPerpGuardDecision: [
    { name: 'decisionHash', type: 'bytes32' },
    { name: 'intentHash', type: 'bytes32' },
    { name: 'coin', type: 'string' },
    { name: 'assetIndex', type: 'uint256' },
    { name: 'size', type: 'string' },
    { name: 'isBuy', type: 'bool' },
    { name: 'builderFeeTenths', type: 'uint256' },
    { name: 'verdict', type: 'uint8' },
    { name: 'issuedAt', type: 'uint256' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

const HASH = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const SIGNATURE = /^0x[0-9a-fA-F]{130}$/;
const POSITIVE_DECIMAL = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;

const AttestationDataSchema = z
  .object({
    decisionHash: z.string().regex(HASH),
    intentHash: z.string().regex(HASH),
    coin: z.string().min(1).max(32),
    assetIndex: z.number().int().nonnegative(),
    size: z.string().regex(POSITIVE_DECIMAL),
    isBuy: z.boolean(),
    builderFeeTenths: z.number().int().nonnegative(),
    verdict: z.number().int().min(0).max(2),
    issuedAt: z.number().int().nonnegative().safe(),
    validUntil: z.number().int().nonnegative().safe(),
    schemaVersion: z.literal(HYPERLIQUID_PERP_GUARD_ATTESTATION_SCHEMA_VERSION),
  })
  .strict();

const AttestationSchema = z
  .object({
    type: z.literal(HYPERLIQUID_PERP_GUARD_ATTESTATION_PRIMARY_TYPE),
    schemaVersion: z.literal(HYPERLIQUID_PERP_GUARD_ATTESTATION_SCHEMA_VERSION),
    uid: z.string().regex(HASH),
    attester: z.string().regex(ADDRESS),
    attesterLabel: z.literal('Insight Hyperliquid Perp Guard attester'),
    signedAt: z.string().datetime(),
    validForSeconds: z.literal(HYPERLIQUID_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS),
    signature: z.string().regex(SIGNATURE),
    verifyUrl: z.string().url(),
    data: AttestationDataSchema,
    eip712: z.record(z.string(), z.unknown()),
  })
  .strict();

const DecisionSchema = z
  .object({
    schema: z.literal(HYPERLIQUID_PERP_GUARD_DECISION_SCHEMA),
    guard: z
      .object({
        schema: z.literal('insight.hyperliquid-perp-guard.v1'),
        verdict: z.enum(['ALLOW', 'CAUTION', 'BLOCK']),
        protocolId: z.literal(HYPERLIQUID_PERPS_PROTOCOL_ID),
        action: z.enum(['open_long', 'open_short']),
      })
      .passthrough(),
    order: z.unknown(),
    binding: z
      .object({
        intentHash: z.string().regex(HASH),
        coin: z.string().min(1).max(32),
        assetIndex: z.number().int().nonnegative(),
        isBuy: z.boolean(),
        size: z.string().regex(POSITIVE_DECIMAL),
        limitPrice: z.string().regex(POSITIVE_DECIMAL),
        reduceOnly: z.literal(false),
        expiresAfter: z.number().int().nonnegative(),
        impliedSizeUsd: z.number().finite().positive(),
        builder: z
          .object({ b: z.string().regex(ADDRESS), f: z.number().int().nonnegative() })
          .strict()
          .nullable(),
      })
      .strict(),
    decisionHash: z.string().regex(HASH),
    attestation: AttestationSchema.nullable(),
  })
  .strict();

export interface HyperliquidPerpGuardAttestationData {
  decisionHash: `0x${string}`;
  intentHash: `0x${string}`;
  coin: string;
  assetIndex: number;
  size: string;
  isBuy: boolean;
  builderFeeTenths: number;
  verdict: 0 | 1 | 2;
  issuedAt: number;
  validUntil: number;
  schemaVersion: 1;
}

export interface HyperliquidPerpGuardAttestation {
  type: typeof HYPERLIQUID_PERP_GUARD_ATTESTATION_PRIMARY_TYPE;
  schemaVersion: 1;
  uid: `0x${string}`;
  attester: `0x${string}`;
  attesterLabel: 'Insight Hyperliquid Perp Guard attester';
  signedAt: string;
  validForSeconds: number;
  signature: `0x${string}`;
  verifyUrl: string;
  data: HyperliquidPerpGuardAttestationData;
  eip712: {
    domain: typeof HYPERLIQUID_PERP_GUARD_ATTESTATION_DOMAIN;
    types: typeof HYPERLIQUID_PERP_GUARD_ATTESTATION_TYPES;
    primaryType: typeof HYPERLIQUID_PERP_GUARD_ATTESTATION_PRIMARY_TYPE;
  };
}

export interface HyperliquidPerpGuardDecision {
  schema: typeof HYPERLIQUID_PERP_GUARD_DECISION_SCHEMA;
  guard: HyperliquidPerpGuardResult;
  order: HyperliquidPerpOrderEnvelope;
  binding: HyperliquidPerpOrderBinding;
  /** keccak256 over the canonical unsigned decision, including the exact envelope. */
  decisionHash: `0x${string}`;
  attestation: HyperliquidPerpGuardAttestation | null;
}

export interface HyperliquidPerpGuardDecisionVerification {
  valid: boolean;
  decisionHash: string | null;
  attester: string | null;
  expired: boolean;
  reason:
    | 'verified'
    | 'missing_attestation'
    | 'malformed'
    | 'decision_hash_mismatch'
    | 'binding_mismatch'
    | 'uid_mismatch'
    | 'signature_invalid'
    | 'untrusted_attester'
    | 'expired'
    | 'verification_error';
}

export interface HyperliquidPerpGuardAttestationDependencies {
  signer?: AttesterAccount | null;
  now?: () => number;
  verifyUrl?: string;
  trustAttester?: (address: string, issuedAt: number) => Promise<boolean>;
}

function verdictCode(verdict: HyperliquidPerpGuardResult['verdict']): 0 | 1 | 2 {
  return verdict === 'ALLOW' ? 0 : verdict === 'CAUTION' ? 1 : 2;
}

function verifyUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://www.oracleinsight.xyz'
      : 'http://localhost:3000');
  return new URL(
    '/api/v1/safety/hyperliquid-perp-guard/verify',
    `${base.replace(/\/+$/, '')}/`
  ).toString();
}

function typedDataArgs(data: HyperliquidPerpGuardAttestationData) {
  return {
    domain: HYPERLIQUID_PERP_GUARD_ATTESTATION_DOMAIN,
    types: HYPERLIQUID_PERP_GUARD_ATTESTATION_TYPES,
    primaryType: HYPERLIQUID_PERP_GUARD_ATTESTATION_PRIMARY_TYPE,
    message: {
      decisionHash: data.decisionHash,
      intentHash: data.intentHash,
      coin: data.coin,
      assetIndex: BigInt(data.assetIndex),
      size: data.size,
      isBuy: data.isBuy,
      builderFeeTenths: BigInt(data.builderFeeTenths),
      verdict: data.verdict,
      issuedAt: BigInt(data.issuedAt),
      validUntil: BigInt(data.validUntil),
      schemaVersion: BigInt(data.schemaVersion),
    },
  } as const;
}

function unsignedDecision(
  value: Pick<HyperliquidPerpGuardDecision, 'guard' | 'order' | 'binding'>
) {
  return {
    schema: HYPERLIQUID_PERP_GUARD_DECISION_SCHEMA,
    guard: value.guard,
    order: value.order,
    binding: value.binding,
  };
}

export function hyperliquidPerpGuardDecisionHash(
  value: Pick<HyperliquidPerpGuardDecision, 'guard' | 'order' | 'binding'>
): `0x${string}` {
  return keccak256(new TextEncoder().encode(canonicalJsonString(unsignedDecision(value))));
}

function assertBindingBinding(
  guard: HyperliquidPerpGuardResult,
  order: HyperliquidPerpOrderEnvelope,
  binding: HyperliquidPerpOrderBinding,
  nowMs: number
): void {
  const rebound = bindHyperliquidPerpExactOrder(guard, order, { nowMs });
  if (
    canonicalJsonString(rebound.binding) !== canonicalJsonString(binding) ||
    binding.intentHash !== hyperliquidPerpOrderIntentHash(order)
  ) {
    throw new Error('bound envelope does not match the decision binding');
  }
}

/** Build a decision even when signing is disabled; only an attested decision is reusable. */
export async function createHyperliquidPerpGuardDecision(
  guard: HyperliquidPerpGuardResult,
  rawOrder: unknown,
  dependencies: HyperliquidPerpGuardAttestationDependencies = {}
): Promise<HyperliquidPerpGuardDecision> {
  const exact = bindHyperliquidPerpExactOrder(guard, rawOrder, {
    nowMs: (dependencies.now ?? nowInSeconds)() * 1000,
  });
  const decisionHash = hyperliquidPerpGuardDecisionHash({
    guard,
    order: exact.order,
    binding: exact.binding,
  });
  const signer =
    dependencies.signer === undefined ? await getAttesterAccount() : dependencies.signer;
  if (!signer) {
    return {
      schema: HYPERLIQUID_PERP_GUARD_DECISION_SCHEMA,
      guard,
      order: exact.order,
      binding: exact.binding,
      decisionHash,
      attestation: null,
    };
  }
  const issuedAt = (dependencies.now ?? nowInSeconds)();
  const data: HyperliquidPerpGuardAttestationData = {
    decisionHash,
    intentHash: exact.binding.intentHash,
    coin: exact.binding.coin,
    assetIndex: exact.binding.assetIndex,
    size: exact.binding.size,
    isBuy: exact.binding.isBuy,
    builderFeeTenths: exact.binding.builder?.f ?? 0,
    verdict: verdictCode(guard.verdict),
    issuedAt,
    validUntil: issuedAt + HYPERLIQUID_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS,
    schemaVersion: HYPERLIQUID_PERP_GUARD_ATTESTATION_SCHEMA_VERSION,
  };
  const trusted = dependencies.trustAttester ?? isPublishedHyperliquidPerpGuardAttester;
  if (!(await trusted(signer.address, issuedAt))) {
    logger.warn('Hyperliquid perp guard signer is outside the published production key registry', {
      attester: signer.address,
    });
    return {
      schema: HYPERLIQUID_PERP_GUARD_DECISION_SCHEMA,
      guard,
      order: exact.order,
      binding: exact.binding,
      decisionHash,
      attestation: null,
    };
  }
  const args = typedDataArgs(data);
  const signature = await signer.signTypedData(args);
  const attestation: HyperliquidPerpGuardAttestation = {
    type: HYPERLIQUID_PERP_GUARD_ATTESTATION_PRIMARY_TYPE,
    schemaVersion: HYPERLIQUID_PERP_GUARD_ATTESTATION_SCHEMA_VERSION,
    uid: hashTypedData(args),
    attester: signer.address.toLowerCase() as `0x${string}`,
    attesterLabel: 'Insight Hyperliquid Perp Guard attester',
    signedAt: new Date(issuedAt * 1000).toISOString(),
    validForSeconds: HYPERLIQUID_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS,
    signature: signature as `0x${string}`,
    verifyUrl: dependencies.verifyUrl ?? verifyUrl(),
    data,
    eip712: {
      domain: HYPERLIQUID_PERP_GUARD_ATTESTATION_DOMAIN,
      types: HYPERLIQUID_PERP_GUARD_ATTESTATION_TYPES,
      primaryType: HYPERLIQUID_PERP_GUARD_ATTESTATION_PRIMARY_TYPE,
    },
  };
  return {
    schema: HYPERLIQUID_PERP_GUARD_DECISION_SCHEMA,
    guard,
    order: exact.order,
    binding: exact.binding,
    decisionHash,
    attestation,
  };
}

/** Verify integrity, exact-envelope binding, EIP-712 issuer signature, and expiry. */
export async function verifyHyperliquidPerpGuardDecision(
  value: unknown,
  dependencies: Pick<HyperliquidPerpGuardAttestationDependencies, 'now' | 'trustAttester'> = {}
): Promise<HyperliquidPerpGuardDecisionVerification> {
  const empty = { valid: false, decisionHash: null, attester: null, expired: false } as const;
  try {
    const parsed = DecisionSchema.safeParse(value);
    if (!parsed.success) return { ...empty, reason: 'malformed' };
    const decision = parsed.data as unknown as HyperliquidPerpGuardDecision;
    const bindingNowMs = (dependencies.now ?? nowInSeconds)() * 1000;
    if (!decision.attestation)
      return { ...empty, decisionHash: decision.decisionHash, reason: 'missing_attestation' };
    const expectedHash = hyperliquidPerpGuardDecisionHash(decision);
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
    // An expired envelope makes the exact binding unusable even when every
    // signature is still valid.
    if (
      (decision.order as HyperliquidPerpOrderEnvelope | undefined)?.expiresAfter === undefined ||
      (decision.order as HyperliquidPerpOrderEnvelope).expiresAfter <= bindingNowMs
    ) {
      return {
        ...empty,
        decisionHash: expectedHash,
        attester: decision.attestation.attester,
        expired: true,
        reason: 'expired',
      };
    }
    try {
      assertBindingBinding(
        decision.guard as HyperliquidPerpGuardResult,
        decision.order as HyperliquidPerpOrderEnvelope,
        decision.binding,
        bindingNowMs
      );
    } catch {
      return {
        ...empty,
        decisionHash: expectedHash,
        attester: decision.attestation.attester,
        reason: 'binding_mismatch',
      };
    }
    const data = decision.attestation.data;
    if (
      data.intentHash.toLowerCase() !== decision.binding.intentHash.toLowerCase() ||
      data.coin !== decision.binding.coin ||
      data.assetIndex !== decision.binding.assetIndex ||
      data.size !== decision.binding.size ||
      data.isBuy !== decision.binding.isBuy ||
      data.builderFeeTenths !== (decision.binding.builder?.f ?? 0) ||
      data.verdict !== verdictCode(decision.guard.verdict) ||
      data.validUntil - data.issuedAt !== HYPERLIQUID_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS ||
      decision.attestation.signedAt !== new Date(data.issuedAt * 1000).toISOString() ||
      canonicalJsonString(decision.attestation.eip712) !==
        canonicalJsonString({
          domain: HYPERLIQUID_PERP_GUARD_ATTESTATION_DOMAIN,
          types: HYPERLIQUID_PERP_GUARD_ATTESTATION_TYPES,
          primaryType: HYPERLIQUID_PERP_GUARD_ATTESTATION_PRIMARY_TYPE,
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
    const trusted = dependencies.trustAttester ?? isPublishedHyperliquidPerpGuardAttester;
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
    logger.warn('Hyperliquid perp guard decision verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...empty, reason: 'verification_error' };
  }
}

export async function isPublishedHyperliquidPerpGuardAttester(
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
