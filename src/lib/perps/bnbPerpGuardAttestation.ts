/**
 * A portable EIP-712 decision for one exact unsigned Aster perp order
 * envelope on BNB Smart Chain.
 *
 * The binding surface is the canonical Aster venue REST order payload
 * (`bnbPerpOrderEnvelope.ts`): not EVM calldata and not proof of on-chain
 * execution. The attestation domain is Insight's (EVM chainId 1); the signed
 * message carries the target chain (56) as data. Aster's own signing happens
 * entirely in the user's venue client with user-held credentials and is not
 * produced or verified here. Insight never creates a user authorization,
 * signs, or submits an order; PriorSeal (or another authorization system)
 * must bind the returned `decisionHash` to the same exact envelope
 * independently.
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

import { BNB_PERP_GUARD_ASTER_PROTOCOL_ID, type BnbPerpGuardResult } from './bnbPerpGuard';
import {
  BNB_PERP_ORDER_CHAIN_ID,
  BNB_PERP_ORDER_SCHEMA,
  type BnbPerpOrderEnvelope,
} from './bnbPerpOrderEnvelope';
import { buildPerpOrderRiskReference, perpOrderIntentHash } from './perpOrderEnvelope';

const logger = createLogger('BnbPerpGuardAttestation');

export const BNB_PERP_GUARD_DECISION_SCHEMA = 'insight.bnb-perp-guard-decision.v1' as const;
export const BNB_PERP_GUARD_ATTESTATION_SCHEMA_VERSION = 1 as const;
export const BNB_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS = 300;
export const BNB_PERP_GUARD_ATTESTATION_PRIMARY_TYPE = 'BnbPerpGuardDecision' as const;
export const BNB_PERP_GUARD_ATTESTATION_DOMAIN = {
  name: 'Insight BNB Perp Guard',
  version: '1',
  chainId: 1,
} as const;
export const BNB_PERP_GUARD_ATTESTATION_TYPES = {
  BnbPerpGuardDecision: [
    { name: 'decisionHash', type: 'bytes32' },
    { name: 'intentHash', type: 'bytes32' },
    { name: 'payloadHash', type: 'bytes32' },
    { name: 'venueSymbol', type: 'string' },
    { name: 'side', type: 'string' },
    { name: 'orderType', type: 'string' },
    { name: 'quantity', type: 'string' },
    { name: 'price', type: 'string' },
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
const POSITIVE_DECIMAL = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;
const VENUE_SYMBOL = /^[A-Z]+USDT$/;

/** Market orders carry no venue price; the binding commits to "0" instead. */
const MARKET_ORDER_PRICE_BINDING = '0';

const AttestationDataSchema = z
  .object({
    decisionHash: z.string().regex(HASH),
    intentHash: z.string().regex(HASH),
    payloadHash: z.string().regex(HASH),
    venueSymbol: z.string().regex(VENUE_SYMBOL),
    side: z.enum(['BUY', 'SELL']),
    orderType: z.enum(['MARKET', 'LIMIT']),
    quantity: z.string().regex(POSITIVE_DECIMAL),
    price: z.string().regex(POSITIVE_DECIMAL),
    chainId: z.literal(BNB_PERP_ORDER_CHAIN_ID),
    verdict: z.number().int().min(0).max(2),
    issuedAt: z.number().int().nonnegative().safe(),
    validUntil: z.number().int().nonnegative().safe(),
    schemaVersion: z.literal(BNB_PERP_GUARD_ATTESTATION_SCHEMA_VERSION),
  })
  .strict();

const AttestationSchema = z
  .object({
    type: z.literal(BNB_PERP_GUARD_ATTESTATION_PRIMARY_TYPE),
    schemaVersion: z.literal(BNB_PERP_GUARD_ATTESTATION_SCHEMA_VERSION),
    uid: z.string().regex(HASH),
    attester: z.string().regex(ADDRESS),
    attesterLabel: z.literal('Insight BNB Perp Guard attester'),
    signedAt: z.string().datetime(),
    validForSeconds: z.literal(BNB_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS),
    signature: z.string().regex(SIGNATURE),
    verifyUrl: z.string().url(),
    data: AttestationDataSchema,
    eip712: z.record(z.string(), z.unknown()),
  })
  .strict();

const DecisionSchema = z
  .object({
    schema: z.literal(BNB_PERP_GUARD_DECISION_SCHEMA),
    guard: z
      .object({
        schema: z.literal('insight.bnb-perp-guard.v1'),
        verdict: z.enum(['ALLOW', 'CAUTION', 'BLOCK']),
        protocolId: z.literal(BNB_PERP_GUARD_ASTER_PROTOCOL_ID),
        action: z.enum(['open_long', 'open_short']),
      })
      .passthrough(),
    envelope: z.unknown(),
    binding: z
      .object({
        intentHash: z.string().regex(HASH),
        payloadHash: z.string().regex(HASH),
        chainId: z.literal(BNB_PERP_ORDER_CHAIN_ID),
        venueSymbol: z.string().regex(VENUE_SYMBOL),
        assetSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
        side: z.enum(['BUY', 'SELL']),
        orderType: z.enum(['MARKET', 'LIMIT']),
        quantity: z.string().regex(POSITIVE_DECIMAL),
        price: z.string().regex(POSITIVE_DECIMAL),
        clientOrderId: z.string().regex(/^[A-Za-z0-9_-]{1,36}$/),
        quoteValidUntil: z.number().int().nonnegative(),
        impliedSizeUsd: z.number().finite().positive(),
        assessmentHash: z.string().regex(HASH),
      })
      .strict(),
    decisionHash: z.string().regex(HASH),
    attestation: AttestationSchema.nullable(),
  })
  .strict();

export interface BnbPerpOrderBinding {
  /** keccak256 over the canonical unsigned order intent carried by the envelope. */
  intentHash: `0x${string}`;
  /** keccak256 over the canonical Aster REST payload; the exact signed subject. */
  payloadHash: `0x${string}`;
  chainId: typeof BNB_PERP_ORDER_CHAIN_ID;
  venueSymbol: string;
  assetSymbol: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  quantity: string;
  /** LIMIT price or "0" for a MARKET order. */
  price: string;
  clientOrderId: string;
  /** The envelope quote validity; past this the exact binding is unusable. */
  quoteValidUntil: number;
  /** quantity × quote reference price, the notional implied by the bound payload. */
  impliedSizeUsd: number;
  /** Fingerprint of the guard assessment the envelope was prepared against. */
  assessmentHash: `0x${string}`;
}

export interface BnbPerpExactOrder {
  guard: BnbPerpGuardResult;
  envelope: BnbPerpOrderEnvelope;
  binding: BnbPerpOrderBinding;
}

export interface BnbPerpGuardAttestationData {
  decisionHash: `0x${string}`;
  intentHash: `0x${string}`;
  payloadHash: `0x${string}`;
  venueSymbol: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  quantity: string;
  price: string;
  chainId: 56;
  verdict: 0 | 1 | 2;
  issuedAt: number;
  validUntil: number;
  schemaVersion: 1;
}

export interface BnbPerpGuardAttestation {
  type: typeof BNB_PERP_GUARD_ATTESTATION_PRIMARY_TYPE;
  schemaVersion: 1;
  uid: `0x${string}`;
  attester: `0x${string}`;
  attesterLabel: 'Insight BNB Perp Guard attester';
  signedAt: string;
  validForSeconds: number;
  signature: `0x${string}`;
  verifyUrl: string;
  data: BnbPerpGuardAttestationData;
  eip712: {
    domain: typeof BNB_PERP_GUARD_ATTESTATION_DOMAIN;
    types: typeof BNB_PERP_GUARD_ATTESTATION_TYPES;
    primaryType: typeof BNB_PERP_GUARD_ATTESTATION_PRIMARY_TYPE;
  };
}

export interface BnbPerpGuardDecision {
  schema: typeof BNB_PERP_GUARD_DECISION_SCHEMA;
  guard: BnbPerpGuardResult;
  envelope: BnbPerpOrderEnvelope;
  binding: BnbPerpOrderBinding;
  /** keccak256 over the canonical unsigned decision, including the exact envelope. */
  decisionHash: `0x${string}`;
  attestation: BnbPerpGuardAttestation | null;
}

export interface BnbPerpGuardDecisionVerification {
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

export interface BnbPerpGuardAttestationDependencies {
  signer?: AttesterAccount | null;
  now?: () => number;
  verifyUrl?: string;
  trustAttester?: (address: string, issuedAt: number) => Promise<boolean>;
}

/**
 * The implied notional may depart from the assessed declared size by at most
 * this fraction (mirrors the Hyperliquid binding tolerance).
 */
const BNB_PERP_BINDING_NOTIONAL_TOLERANCE = 0.1;

function verdictCode(verdict: BnbPerpGuardResult['verdict']): 0 | 1 | 2 {
  return verdict === 'ALLOW' ? 0 : verdict === 'CAUTION' ? 1 : 2;
}

function verifyUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://www.oracleinsight.xyz'
      : 'http://localhost:3000');
  return new URL('/api/v1/safety/bnb-perp-guard/verify', `${base.replace(/\/+$/, '')}/`).toString();
}

function typedDataArgs(data: BnbPerpGuardAttestationData) {
  return {
    domain: BNB_PERP_GUARD_ATTESTATION_DOMAIN,
    types: BNB_PERP_GUARD_ATTESTATION_TYPES,
    primaryType: BNB_PERP_GUARD_ATTESTATION_PRIMARY_TYPE,
    message: {
      decisionHash: data.decisionHash,
      intentHash: data.intentHash,
      payloadHash: data.payloadHash,
      venueSymbol: data.venueSymbol,
      side: data.side,
      orderType: data.orderType,
      quantity: data.quantity,
      price: data.price,
      chainId: BigInt(data.chainId),
      verdict: data.verdict,
      issuedAt: BigInt(data.issuedAt),
      validUntil: BigInt(data.validUntil),
      schemaVersion: BigInt(data.schemaVersion),
    },
  } as const;
}

function unsignedDecision(value: Pick<BnbPerpGuardDecision, 'guard' | 'envelope' | 'binding'>) {
  return {
    schema: BNB_PERP_GUARD_DECISION_SCHEMA,
    guard: value.guard,
    envelope: value.envelope,
    binding: value.binding,
  };
}

export function bnbPerpGuardDecisionHash(
  value: Pick<BnbPerpGuardDecision, 'guard' | 'envelope' | 'binding'>
): `0x${string}` {
  return keccak256(new TextEncoder().encode(canonicalJsonString(unsignedDecision(value))));
}

/**
 * Validate one prepared Aster order envelope against the guard result it was
 * assessed under and derive the immutable binding. Pure: no network reads.
 *
 * Fails closed on any schema/chain mismatch, a BLOCK verdict, a missing venue
 * payload, a side that contradicts the assessed action, an envelope that was
 * prepared against a different guard assessment, an implied notional that
 * departs from the assessed declared size beyond the reviewed tolerance, or an
 * expired envelope quote.
 */
export function bindBnbPerpExactOrder(
  guard: BnbPerpGuardResult,
  rawEnvelope: unknown,
  options: { nowSec?: number } = {}
): BnbPerpExactOrder {
  const envelope = rawEnvelope as BnbPerpOrderEnvelope;
  const nowSec = options.nowSec ?? nowInSeconds();

  if (envelope?.schema !== BNB_PERP_ORDER_SCHEMA) {
    throw new Error('Envelope is not an insight.bnb-perp-order-envelope.v1 artifact');
  }
  if (guard.schema !== 'insight.bnb-perp-guard.v1') {
    throw new Error('Guard result is not an insight.bnb-perp-guard.v1 assessment');
  }
  if (guard.protocolId !== BNB_PERP_GUARD_ASTER_PROTOCOL_ID) {
    throw new Error('Guard result protocol does not match the BNB perp guard');
  }
  if (envelope.chain?.chainId !== BNB_PERP_ORDER_CHAIN_ID) {
    throw new Error(`Envelope targets chain ${String(envelope.chain?.chainId)}, not BNB (56)`);
  }
  if (guard.verdict === 'BLOCK' || envelope.verdict === 'BLOCK') {
    if (guard.verdict !== envelope.verdict) {
      throw new Error('Envelope and guard verdicts disagree');
    }
    throw new Error('A BLOCK verdict must not be bound to an exact order');
  }
  if (envelope.verdict !== 'REQUIRES_VENUE_CREDENTIALS') {
    throw new Error(`Envelope verdict ${envelope.verdict} is not bindable`);
  }
  const venuePayload = envelope.unsignedOrderEnvelope;
  if (!venuePayload) {
    throw new Error('Envelope carries no unsigned venue order payload');
  }
  if (envelope.market.assetSymbol !== guard.market.assetSymbol) {
    throw new Error('Envelope asset symbol does not match the assessed market');
  }

  const payload = venuePayload.payload;
  const expectedSide = guard.action === 'open_long' ? 'BUY' : 'SELL';
  if (payload.side !== expectedSide) {
    throw new Error(`Payload side does not match the assessed ${guard.action} action`);
  }

  // The envelope must have been prepared against exactly this guard result:
  // the risk reference fingerprint covers schema, protocolId, verdict,
  // evaluatedAt, and reasons, so a re-assessed guard cannot silently bind.
  const risk = buildPerpOrderRiskReference(guard);
  if (risk.assessmentHash !== envelope.risk.assessmentHash) {
    throw new Error(
      'Envelope was prepared against a different guard assessment; re-prepare the envelope from this assessment'
    );
  }

  const impliedSizeUsd = Number(payload.quantity) * envelope.quote.referencePriceUsd;
  if (
    !Number.isFinite(impliedSizeUsd) ||
    impliedSizeUsd <= 0 ||
    Math.abs(impliedSizeUsd - guard.projected.sizeUsd) / guard.projected.sizeUsd >
      BNB_PERP_BINDING_NOTIONAL_TOLERANCE
  ) {
    throw new Error(
      'Envelope implied notional departs from the assessed declared size beyond the reviewed tolerance; re-assess at the actual size'
    );
  }

  if (envelope.quote.validUntil <= nowSec) {
    throw new Error('Envelope quote has already expired');
  }

  const payloadHash = perpOrderIntentHash(payload);
  if (payloadHash !== venuePayload.payloadHash) {
    throw new Error('Envelope payload hash does not match its payload');
  }

  const binding: BnbPerpOrderBinding = {
    intentHash: envelope.intentHash,
    payloadHash,
    chainId: BNB_PERP_ORDER_CHAIN_ID,
    venueSymbol: payload.symbol,
    assetSymbol: envelope.market.assetSymbol,
    side: payload.side,
    orderType: payload.type,
    quantity: payload.quantity,
    price: payload.price ?? MARKET_ORDER_PRICE_BINDING,
    clientOrderId: payload.newClientOrderId,
    quoteValidUntil: envelope.quote.validUntil,
    impliedSizeUsd,
    assessmentHash: risk.assessmentHash,
  };
  return { guard, envelope, binding };
}

function assertBindingBinding(
  guard: BnbPerpGuardResult,
  envelope: BnbPerpOrderEnvelope,
  binding: BnbPerpOrderBinding,
  nowSec: number
): void {
  const rebound = bindBnbPerpExactOrder(guard, envelope, { nowSec });
  if (canonicalJsonString(rebound.binding) !== canonicalJsonString(binding)) {
    throw new Error('bound envelope does not match the decision binding');
  }
}

/** Build a decision even when signing is disabled; only an attested decision is reusable. */
export async function createBnbPerpGuardDecision(
  guard: BnbPerpGuardResult,
  rawEnvelope: unknown,
  dependencies: BnbPerpGuardAttestationDependencies = {}
): Promise<BnbPerpGuardDecision> {
  const exact = bindBnbPerpExactOrder(guard, rawEnvelope, {
    nowSec: (dependencies.now ?? nowInSeconds)(),
  });
  const decisionHash = bnbPerpGuardDecisionHash({
    guard,
    envelope: exact.envelope,
    binding: exact.binding,
  });
  const signer =
    dependencies.signer === undefined ? await getAttesterAccount() : dependencies.signer;
  if (!signer) {
    return {
      schema: BNB_PERP_GUARD_DECISION_SCHEMA,
      guard,
      envelope: exact.envelope,
      binding: exact.binding,
      decisionHash,
      attestation: null,
    };
  }
  const issuedAt = (dependencies.now ?? nowInSeconds)();
  const data: BnbPerpGuardAttestationData = {
    decisionHash,
    intentHash: exact.binding.intentHash,
    payloadHash: exact.binding.payloadHash,
    venueSymbol: exact.binding.venueSymbol,
    side: exact.binding.side,
    orderType: exact.binding.orderType,
    quantity: exact.binding.quantity,
    price: exact.binding.price,
    chainId: BNB_PERP_ORDER_CHAIN_ID,
    verdict: verdictCode(guard.verdict),
    issuedAt,
    validUntil: issuedAt + BNB_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS,
    schemaVersion: BNB_PERP_GUARD_ATTESTATION_SCHEMA_VERSION,
  };
  const trusted = dependencies.trustAttester ?? isPublishedBnbPerpGuardAttester;
  if (!(await trusted(signer.address, issuedAt))) {
    logger.warn('BNB perp guard signer is outside the published production key registry', {
      attester: signer.address,
    });
    return {
      schema: BNB_PERP_GUARD_DECISION_SCHEMA,
      guard,
      envelope: exact.envelope,
      binding: exact.binding,
      decisionHash,
      attestation: null,
    };
  }
  const args = typedDataArgs(data);
  const signature = await signer.signTypedData(args);
  const attestation: BnbPerpGuardAttestation = {
    type: BNB_PERP_GUARD_ATTESTATION_PRIMARY_TYPE,
    schemaVersion: BNB_PERP_GUARD_ATTESTATION_SCHEMA_VERSION,
    uid: hashTypedData(args),
    attester: signer.address.toLowerCase() as `0x${string}`,
    attesterLabel: 'Insight BNB Perp Guard attester',
    signedAt: new Date(issuedAt * 1000).toISOString(),
    validForSeconds: BNB_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS,
    signature: signature as `0x${string}`,
    verifyUrl: dependencies.verifyUrl ?? verifyUrl(),
    data,
    eip712: {
      domain: BNB_PERP_GUARD_ATTESTATION_DOMAIN,
      types: BNB_PERP_GUARD_ATTESTATION_TYPES,
      primaryType: BNB_PERP_GUARD_ATTESTATION_PRIMARY_TYPE,
    },
  };
  return {
    schema: BNB_PERP_GUARD_DECISION_SCHEMA,
    guard,
    envelope: exact.envelope,
    binding: exact.binding,
    decisionHash,
    attestation,
  };
}

/** Verify integrity, exact-envelope binding, EIP-712 issuer signature, and expiry. */
export async function verifyBnbPerpGuardDecision(
  value: unknown,
  dependencies: Pick<BnbPerpGuardAttestationDependencies, 'now' | 'trustAttester'> = {}
): Promise<BnbPerpGuardDecisionVerification> {
  const empty = { valid: false, decisionHash: null, attester: null, expired: false } as const;
  try {
    const parsed = DecisionSchema.safeParse(value);
    if (!parsed.success) return { ...empty, reason: 'malformed' };
    const decision = parsed.data as unknown as BnbPerpGuardDecision;
    const nowSec = (dependencies.now ?? nowInSeconds)();
    if (!decision.attestation)
      return { ...empty, decisionHash: decision.decisionHash, reason: 'missing_attestation' };
    const expectedHash = bnbPerpGuardDecisionHash(decision);
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
    // An expired envelope quote makes the exact binding unusable even when
    // every signature is still valid.
    if (decision.binding.quoteValidUntil <= nowSec) {
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
        decision.guard as BnbPerpGuardResult,
        decision.envelope as BnbPerpOrderEnvelope,
        decision.binding,
        nowSec
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
      data.payloadHash.toLowerCase() !== decision.binding.payloadHash.toLowerCase() ||
      data.venueSymbol !== decision.binding.venueSymbol ||
      data.side !== decision.binding.side ||
      data.orderType !== decision.binding.orderType ||
      data.quantity !== decision.binding.quantity ||
      data.price !== decision.binding.price ||
      data.verdict !== verdictCode(decision.guard.verdict) ||
      data.validUntil - data.issuedAt !== BNB_PERP_GUARD_ATTESTATION_VALID_FOR_SECONDS ||
      decision.attestation.signedAt !== new Date(data.issuedAt * 1000).toISOString() ||
      canonicalJsonString(decision.attestation.eip712) !==
        canonicalJsonString({
          domain: BNB_PERP_GUARD_ATTESTATION_DOMAIN,
          types: BNB_PERP_GUARD_ATTESTATION_TYPES,
          primaryType: BNB_PERP_GUARD_ATTESTATION_PRIMARY_TYPE,
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
    const trusted = dependencies.trustAttester ?? isPublishedBnbPerpGuardAttester;
    if (!(await trusted(decision.attestation.attester, data.issuedAt))) {
      return {
        ...empty,
        decisionHash: expectedHash,
        attester: decision.attestation.attester,
        reason: 'untrusted_attester',
      };
    }
    const expired = data.validUntil <= nowSec;
    return {
      valid: !expired,
      decisionHash: expectedHash,
      attester: decision.attestation.attester,
      expired,
      reason: expired ? 'expired' : 'verified',
    };
  } catch (error) {
    logger.warn('BNB perp guard decision verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...empty, reason: 'verification_error' };
  }
}

export async function isPublishedBnbPerpGuardAttester(
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
