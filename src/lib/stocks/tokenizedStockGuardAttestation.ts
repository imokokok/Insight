/**
 * EIP-712 decision attestation for the Tokenized Stock Guard.
 *
 * The signature commits to the exact guard result returned to the caller
 * (keccak256 over its canonical JSON). It proves integrity and issuer
 * identity, not correctness of the issuer NAV, authorization to transact,
 * or any execution outcome.
 *
 * Pattern follows the guard-family attestations (baseLendingGuardAttestation
 * and siblings): signer from ATTESTATION_SIGNER_PRIVATE_KEY, publish-registry
 * trust check, 300-second validity, and a null attestation (never an error)
 * when signing is unavailable so the verdict remains usable either way.
 */

import { hashTypedData, keccak256, verifyTypedData } from 'viem';
import { z } from 'zod';

import {
  getAttesterAccount,
  getAttesterAddress,
  getSampleAttesterAddress,
} from '@/lib/attestations/attesterAccount';
import { buildKeyRegistryConfig, trustedAttesterEntry } from '@/lib/attestations/keyRegistryConfig';
import { canonicalJsonString } from '@/lib/utils/canonicalJson';
import { createLogger } from '@/lib/utils/logger';
import { nowInSeconds } from '@/lib/utils/time';

import type { TokenizedStockGuardResult, TokenizedStockVerdict } from './tokenizedStockGuard';

const logger = createLogger('TokenizedStockGuardAttestation');

export const TOKENIZED_STOCK_GUARD_DECISION_SCHEMA =
  'insight.tokenized-stock-guard-decision.v1' as const;
export const TOKENIZED_STOCK_GUARD_ATTESTATION_SCHEMA_VERSION = 1 as const;
export const TOKENIZED_STOCK_GUARD_ATTESTATION_VALID_FOR_SECONDS = 300;
export const TOKENIZED_STOCK_GUARD_ATTESTATION_PRIMARY_TYPE =
  'TokenizedStockGuardDecision' as const;
export const TOKENIZED_STOCK_GUARD_ATTESTATION_DOMAIN = {
  name: 'Insight Tokenized Stock Guard',
  version: '1',
  chainId: 8453,
} as const;
export const TOKENIZED_STOCK_GUARD_ATTESTATION_TYPES = {
  TokenizedStockGuardDecision: [
    { name: 'decisionHash', type: 'bytes32' },
    { name: 'verdict', type: 'uint8' },
    { name: 'issuedAt', type: 'uint256' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

const HASH = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const SIGNATURE = /^0x[0-9a-fA-F]{130}$/;

const VERDICT_CODES = { ALLOW: 0, WAIT: 1, BLOCK: 2, NOT_PRICEABLE: 3 } as const;
const VERDICT_NAMES: readonly TokenizedStockVerdict[] = ['ALLOW', 'WAIT', 'BLOCK', 'NOT_PRICEABLE'];

const AttestationDataSchema = z
  .object({
    decisionHash: z.string().regex(HASH),
    verdict: z.number().int().min(0).max(3),
    issuedAt: z.number().int().nonnegative().safe(),
    validUntil: z.number().int().nonnegative().safe(),
    schemaVersion: z.literal(TOKENIZED_STOCK_GUARD_ATTESTATION_SCHEMA_VERSION),
  })
  .strict();

const AttestationSchema = z
  .object({
    type: z.literal(TOKENIZED_STOCK_GUARD_ATTESTATION_PRIMARY_TYPE),
    schemaVersion: z.literal(TOKENIZED_STOCK_GUARD_ATTESTATION_SCHEMA_VERSION),
    uid: z.string().regex(HASH),
    attester: z.string().regex(ADDRESS),
    attesterLabel: z.literal('Insight Tokenized Stock Guard attester'),
    signedAt: z.string().datetime(),
    validForSeconds: z.literal(TOKENIZED_STOCK_GUARD_ATTESTATION_VALID_FOR_SECONDS),
    signature: z.string().regex(SIGNATURE),
    verifyUrl: z.string().url(),
    data: AttestationDataSchema,
    eip712: z.record(z.string(), z.unknown()),
  })
  .strict();

const GuardResultSchema = z
  .object({
    schema: z.literal('insight.tokenized-stock-guard.v1'),
    verdict: z.enum(['ALLOW', 'WAIT', 'BLOCK', 'NOT_PRICEABLE']),
  })
  .passthrough();

const DecisionSchema = z
  .object({
    schema: z.literal(TOKENIZED_STOCK_GUARD_DECISION_SCHEMA),
    guard: GuardResultSchema,
    decisionHash: z.string().regex(HASH),
    attestation: AttestationSchema.nullable(),
  })
  .strict();

export interface TokenizedStockGuardAttestationData {
  decisionHash: `0x${string}`;
  verdict: number;
  issuedAt: number;
  validUntil: number;
  schemaVersion: number;
}

export interface TokenizedStockGuardAttestation {
  type: typeof TOKENIZED_STOCK_GUARD_ATTESTATION_PRIMARY_TYPE;
  schemaVersion: number;
  uid: `0x${string}`;
  attester: `0x${string}`;
  attesterLabel: string;
  signedAt: string;
  validForSeconds: number;
  signature: `0x${string}`;
  verifyUrl: string;
  data: TokenizedStockGuardAttestationData;
  eip712: Record<string, unknown>;
}

export interface TokenizedStockGuardDecision {
  schema: typeof TOKENIZED_STOCK_GUARD_DECISION_SCHEMA;
  guard: TokenizedStockGuardResult;
  decisionHash: `0x${string}`;
  attestation: TokenizedStockGuardAttestation | null;
}

export interface TokenizedStockGuardDecisionVerification {
  valid: boolean;
  expired: boolean;
  hashMatches: boolean;
  signatureValid: boolean;
  attesterTrusted: boolean | null;
  decisionHash: string | null;
  reason: string | null;
}

export interface TokenizedStockGuardAttestationDependencies {
  signer?: Awaited<ReturnType<typeof getAttesterAccount>>;
  now?: () => number;
  trustAttester?: (address: string, issuedAt: number) => Promise<boolean>;
  verifyUrl?: string;
}

function verdictCode(verdict: TokenizedStockVerdict): number {
  return VERDICT_CODES[verdict];
}

function verifyUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://www.oracleinsight.xyz'
      : 'http://localhost:3000');
  return new URL(
    '/api/v1/safety/tokenized-stock-guard/verify',
    `${base.replace(/\/+$/, '')}/`
  ).toString();
}

function typedDataArgs(data: TokenizedStockGuardAttestationData) {
  return {
    domain: TOKENIZED_STOCK_GUARD_ATTESTATION_DOMAIN,
    types: TOKENIZED_STOCK_GUARD_ATTESTATION_TYPES,
    primaryType: TOKENIZED_STOCK_GUARD_ATTESTATION_PRIMARY_TYPE,
    message: {
      decisionHash: data.decisionHash,
      verdict: data.verdict,
      issuedAt: BigInt(data.issuedAt),
      validUntil: BigInt(data.validUntil),
      schemaVersion: BigInt(data.schemaVersion),
    },
  } as const;
}

export function tokenizedStockGuardDecisionHash(
  guard: Omit<TokenizedStockGuardResult, never>
): `0x${string}` {
  return keccak256(new TextEncoder().encode(canonicalJsonString(guard)));
}

export async function isPublishedTokenizedStockGuardAttester(
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

/**
 * Bind the guard result into a decision and sign it when an attester is
 * configured and trusted. A null attestation means "unsigned result", not
 * "failed check": the guard verdict itself is unaffected.
 */
export async function createTokenizedStockGuardDecision(
  guard: TokenizedStockGuardResult,
  dependencies: TokenizedStockGuardAttestationDependencies = {}
): Promise<TokenizedStockGuardDecision> {
  const decisionHash = tokenizedStockGuardDecisionHash(guard);
  const signer =
    dependencies.signer === undefined ? await getAttesterAccount() : dependencies.signer;
  const unsigned = (): TokenizedStockGuardDecision => ({
    schema: TOKENIZED_STOCK_GUARD_DECISION_SCHEMA,
    guard,
    decisionHash,
    attestation: null,
  });
  if (!signer) return unsigned();

  const issuedAt = (dependencies.now ?? nowInSeconds)();
  const trusted = dependencies.trustAttester ?? isPublishedTokenizedStockGuardAttester;
  if (!(await trusted(signer.address, issuedAt))) {
    logger.warn('Tokenized stock guard signer is outside the published production key registry', {
      attester: signer.address,
    });
    return unsigned();
  }

  const data: TokenizedStockGuardAttestationData = {
    decisionHash,
    verdict: verdictCode(guard.verdict),
    issuedAt,
    validUntil: issuedAt + TOKENIZED_STOCK_GUARD_ATTESTATION_VALID_FOR_SECONDS,
    schemaVersion: TOKENIZED_STOCK_GUARD_ATTESTATION_SCHEMA_VERSION,
  };
  const args = typedDataArgs(data);
  const signature = await signer.signTypedData(args);
  const attestation: TokenizedStockGuardAttestation = {
    type: TOKENIZED_STOCK_GUARD_ATTESTATION_PRIMARY_TYPE,
    schemaVersion: TOKENIZED_STOCK_GUARD_ATTESTATION_SCHEMA_VERSION,
    uid: hashTypedData(args),
    attester: signer.address.toLowerCase() as `0x${string}`,
    attesterLabel: 'Insight Tokenized Stock Guard attester',
    signedAt: new Date(issuedAt * 1000).toISOString(),
    validForSeconds: TOKENIZED_STOCK_GUARD_ATTESTATION_VALID_FOR_SECONDS,
    signature: signature as `0x${string}`,
    verifyUrl: dependencies.verifyUrl ?? verifyUrl(),
    data,
    eip712: {
      domain: TOKENIZED_STOCK_GUARD_ATTESTATION_DOMAIN,
      types: TOKENIZED_STOCK_GUARD_ATTESTATION_TYPES,
      primaryType: TOKENIZED_STOCK_GUARD_ATTESTATION_PRIMARY_TYPE,
    },
  };
  return {
    schema: TOKENIZED_STOCK_GUARD_DECISION_SCHEMA,
    guard,
    decisionHash,
    attestation,
  };
}

/** Verify integrity, EIP-712 issuer signature, and expiry of a decision. */
export async function verifyTokenizedStockGuardDecision(
  value: unknown,
  dependencies: Pick<TokenizedStockGuardAttestationDependencies, 'now' | 'trustAttester'> = {}
): Promise<TokenizedStockGuardDecisionVerification> {
  const invalid = (reason: string): TokenizedStockGuardDecisionVerification => ({
    valid: false,
    expired: false,
    hashMatches: false,
    signatureValid: false,
    attesterTrusted: null,
    decisionHash: null,
    reason,
  });

  const parsed = DecisionSchema.safeParse(value);
  if (!parsed.success) return invalid('decision does not match the published schema');
  const decision = parsed.data;

  const expectedHash = tokenizedStockGuardDecisionHash(
    decision.guard as unknown as TokenizedStockGuardResult
  );
  const hashMatches = expectedHash.toLowerCase() === decision.decisionHash.toLowerCase();
  if (!decision.attestation) {
    return {
      valid: false,
      expired: false,
      hashMatches,
      signatureValid: false,
      attesterTrusted: null,
      decisionHash: decision.decisionHash,
      reason: 'decision carries no attestation (unsigned result)',
    };
  }

  const attestation = decision.attestation;
  if (attestation.data.decisionHash.toLowerCase() !== decision.decisionHash.toLowerCase()) {
    return {
      valid: false,
      expired: false,
      hashMatches,
      signatureValid: false,
      attesterTrusted: null,
      decisionHash: decision.decisionHash,
      reason: 'attestation decisionHash does not match the decision',
    };
  }

  const args = typedDataArgs(attestation.data as unknown as TokenizedStockGuardAttestationData);
  const signatureValid = await verifyTypedData({
    ...args,
    address: attestation.attester as `0x${string}`,
    signature: attestation.signature as `0x${string}`,
  }).catch(() => false);

  const now = (dependencies.now ?? nowInSeconds)();
  const expired = now > attestation.data.validUntil;
  const trusted =
    dependencies.trustAttester === undefined
      ? await isPublishedTokenizedStockGuardAttester(
          attestation.attester,
          attestation.data.issuedAt
        )
      : await dependencies.trustAttester(attestation.attester, attestation.data.issuedAt);

  const verdictMatches = VERDICT_NAMES[attestation.data.verdict] === decision.guard.verdict;

  const valid = hashMatches && signatureValid && !expired && trusted && verdictMatches;
  return {
    valid,
    expired,
    hashMatches,
    signatureValid,
    attesterTrusted: trusted,
    decisionHash: decision.decisionHash,
    reason: valid
      ? null
      : !hashMatches
        ? 'decision hash does not match the guard result'
        : !signatureValid
          ? 'EIP-712 signature does not recover the attester'
          : expired
            ? 'attestation has expired'
            : !trusted
              ? 'attester is outside the published production key registry'
              : 'attested verdict code does not match the guard verdict',
  };
}
