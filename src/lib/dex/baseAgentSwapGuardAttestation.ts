/**
 * Portable, signed evidence for an Insight Base Agent Swap Guard ALLOW result.
 *
 * The attestation is deliberately evidence only: it does not authorize a
 * wallet, broadcast either transaction, or collapse approval and swap into a
 * batch. A downstream authorization system must bind both exact calls.
 */

import { hashTypedData, keccak256, verifyTypedData, type Hex } from 'viem';

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
  BASE_AGENT_SWAP_GUARD_SCHEMA,
  baseAgentSwapGuardDecisionHash,
  type BaseAgentSwapGuardChainId,
  type BaseAgentSwapGuardResult,
} from './baseAgentSwapGuard';

const logger = createLogger('BaseAgentSwapGuardAttestation');

export const BASE_AGENT_SWAP_GUARD_DECISION_SCHEMA =
  'insight.base-agent-swap-guard-decision.v1' as const;
export const BASE_AGENT_SWAP_GUARD_ATTESTATION_SCHEMA_VERSION = 1 as const;
export const BASE_AGENT_SWAP_GUARD_ATTESTATION_PRIMARY_TYPE = 'BaseAgentSwapGuardDecision' as const;
/** The source guard itself allows a quote to be live for at most 120 seconds. */
export const BASE_AGENT_SWAP_GUARD_ATTESTATION_MAX_VALID_FOR_SECONDS = 120;
export const BASE_AGENT_SWAP_GUARD_ATTESTATION_DOMAIN = {
  name: 'Insight Base Agent Swap Guard',
  version: '1',
  // An EIP-712 domain is intentionally chain-separated from the calls it
  // attests. The signed message separately commits to the reviewed execution
  // chain (8453 or 56) inside the decisionHash and the chainId field.
  chainId: 1,
} as const;
export const BASE_AGENT_SWAP_GUARD_ATTESTATION_TYPES = {
  BaseAgentSwapGuardDecision: [
    { name: 'decisionHash', type: 'bytes32' },
    { name: 'approvalCalldataHash', type: 'bytes32' },
    { name: 'swapCalldataHash', type: 'bytes32' },
    { name: 'recipient', type: 'address' },
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
const SUPPORTED_PROFILE_IDS = new Set([
  'base-aerodrome-slipstream-weth-usdc-cl100',
  'base-aerodrome-slipstream-usdc-usdt-cl1',
  'base-pancakeswap-v3-usdc-usdt-100',
  'bnb-pancakeswap-v3-usdt-usdc-100',
]);
const SUPPORTED_CHAIN_IDS = new Set<number>([8453, 56]);

export interface BaseAgentSwapGuardAttestationData {
  decisionHash: Hex;
  approvalCalldataHash: Hex;
  swapCalldataHash: Hex;
  recipient: `0x${string}`;
  chainId: BaseAgentSwapGuardChainId;
  verdict: 0;
  issuedAt: number;
  validUntil: number;
  schemaVersion: 1;
}

export interface BaseAgentSwapGuardAttestation {
  type: typeof BASE_AGENT_SWAP_GUARD_ATTESTATION_PRIMARY_TYPE;
  schemaVersion: 1;
  uid: Hex;
  attester: `0x${string}`;
  attesterLabel: 'Insight Base Agent Swap Guard attester';
  signedAt: string;
  validForSeconds: number;
  signature: Hex;
  verifyUrl: string;
  data: BaseAgentSwapGuardAttestationData;
  eip712: {
    domain: typeof BASE_AGENT_SWAP_GUARD_ATTESTATION_DOMAIN;
    types: typeof BASE_AGENT_SWAP_GUARD_ATTESTATION_TYPES;
    primaryType: typeof BASE_AGENT_SWAP_GUARD_ATTESTATION_PRIMARY_TYPE;
  };
}

export interface BaseAgentSwapGuardDecision {
  schema: typeof BASE_AGENT_SWAP_GUARD_DECISION_SCHEMA;
  guard: BaseAgentSwapGuardResult;
  /** Equal to guard.decisionHash; retained as the portable commitment key. */
  decisionHash: Hex;
  attestation: BaseAgentSwapGuardAttestation | null;
}

export interface BaseAgentSwapGuardDecisionVerification {
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

export interface BaseAgentSwapGuardAttestationDependencies {
  signer?: AttesterAccount | null;
  now?: () => number;
  verifyUrl?: string;
  trustAttester?: (address: string, issuedAt: number) => Promise<boolean>;
}

function verificationUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://www.oracleinsight.xyz'
      : 'http://localhost:3000');
  return new URL(
    '/api/v1/safety/base-agent-swap-guard/verify',
    `${base.replace(/\/+$/, '')}/`
  ).toString();
}

function typedDataArgs(data: BaseAgentSwapGuardAttestationData) {
  return {
    domain: BASE_AGENT_SWAP_GUARD_ATTESTATION_DOMAIN,
    types: BASE_AGENT_SWAP_GUARD_ATTESTATION_TYPES,
    primaryType: BASE_AGENT_SWAP_GUARD_ATTESTATION_PRIMARY_TYPE,
    message: {
      decisionHash: data.decisionHash,
      approvalCalldataHash: data.approvalCalldataHash,
      swapCalldataHash: data.swapCalldataHash,
      recipient: data.recipient,
      chainId: BigInt(data.chainId),
      verdict: data.verdict,
      issuedAt: BigInt(data.issuedAt),
      validUntil: BigInt(data.validUntil),
      schemaVersion: BigInt(data.schemaVersion),
    },
  } as const;
}

function sameAddress(left: unknown, right: unknown): boolean {
  return (
    typeof left === 'string' &&
    typeof right === 'string' &&
    ADDRESS.test(left) &&
    ADDRESS.test(right) &&
    left.toLowerCase() === right.toLowerCase()
  );
}

function sameHash(left: unknown, right: unknown): boolean {
  return (
    typeof left === 'string' &&
    typeof right === 'string' &&
    HASH.test(left) &&
    HASH.test(right) &&
    left.toLowerCase() === right.toLowerCase()
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Validate the precise approval and swap call relationship before signing or trusting it. */
function exactCallBindingIsValid(guard: BaseAgentSwapGuardResult): boolean {
  const binding = guard.binding;
  const calls = guard.transactionsToSign;
  return Boolean(
    guard.schema === BASE_AGENT_SWAP_GUARD_SCHEMA &&
    guard.verdict === 'ALLOW' &&
    SUPPORTED_CHAIN_IDS.has(guard.scope.chainId) &&
    SUPPORTED_PROFILE_IDS.has(guard.scope.profileId) &&
    Number.isSafeInteger(guard.validUntil) &&
    guard.validUntil !== null &&
    binding &&
    calls &&
    binding.chainId === guard.scope.chainId &&
    sameAddress(binding.recipient, guard.binding?.recipient) &&
    sameAddress(calls.approval.to, binding.approval.token) &&
    calls.approval.value === '0x0' &&
    sameHash(keccak256(calls.approval.data), binding.approval.calldataHash) &&
    sameAddress(calls.swap.to, binding.swap.to) &&
    sameAddress(binding.approval.spender, calls.swap.to) &&
    calls.swap.value === '0x0' &&
    sameHash(keccak256(calls.swap.data), binding.swap.calldataHash) &&
    binding.approval.amountRaw === guard.market?.exactInput.amountInRaw
  );
}

function asDecision(value: unknown): BaseAgentSwapGuardDecision | null {
  if (
    !isRecord(value) ||
    value.schema !== BASE_AGENT_SWAP_GUARD_DECISION_SCHEMA ||
    !isRecord(value.guard)
  )
    return null;
  if (typeof value.decisionHash !== 'string' || !HASH.test(value.decisionHash)) return null;
  if (value.attestation !== null && !isRecord(value.attestation)) return null;
  return value as unknown as BaseAgentSwapGuardDecision;
}

function asAttestationData(value: unknown): BaseAgentSwapGuardAttestationData | null {
  if (!isRecord(value)) return null;
  const fields = [value.decisionHash, value.approvalCalldataHash, value.swapCalldataHash];
  if (
    fields.some((field) => typeof field !== 'string' || !HASH.test(field)) ||
    typeof value.recipient !== 'string' ||
    !ADDRESS.test(value.recipient) ||
    typeof value.chainId !== 'number' ||
    !SUPPORTED_CHAIN_IDS.has(value.chainId) ||
    value.verdict !== 0 ||
    value.schemaVersion !== BASE_AGENT_SWAP_GUARD_ATTESTATION_SCHEMA_VERSION ||
    typeof value.issuedAt !== 'number' ||
    typeof value.validUntil !== 'number' ||
    !Number.isSafeInteger(value.issuedAt) ||
    !Number.isSafeInteger(value.validUntil) ||
    value.issuedAt < 0 ||
    value.validUntil <= value.issuedAt
  )
    return null;
  return value as unknown as BaseAgentSwapGuardAttestationData;
}

function guardIntegrityHash(guard: BaseAgentSwapGuardResult): Hex | null {
  try {
    const { decisionHash: _ignored, ...unsigned } = guard;
    return baseAgentSwapGuardDecisionHash(unsigned);
  } catch {
    return null;
  }
}

function unsignedEip712(): BaseAgentSwapGuardAttestation['eip712'] {
  return {
    domain: BASE_AGENT_SWAP_GUARD_ATTESTATION_DOMAIN,
    types: BASE_AGENT_SWAP_GUARD_ATTESTATION_TYPES,
    primaryType: BASE_AGENT_SWAP_GUARD_ATTESTATION_PRIMARY_TYPE,
  };
}

/** Build an unsigned decision when no trusted platform attester is configured. */
export async function createBaseAgentSwapGuardDecision(
  guard: BaseAgentSwapGuardResult,
  dependencies: BaseAgentSwapGuardAttestationDependencies = {}
): Promise<BaseAgentSwapGuardDecision> {
  const unsigned: BaseAgentSwapGuardDecision = {
    schema: BASE_AGENT_SWAP_GUARD_DECISION_SCHEMA,
    guard,
    decisionHash: guard.decisionHash,
    attestation: null,
  };
  const now = (dependencies.now ?? nowInSeconds)();
  if (!exactCallBindingIsValid(guard) || guard.validUntil === null || guard.validUntil <= now)
    return unsigned;
  const expectedHash = guardIntegrityHash(guard);
  if (!expectedHash || !sameHash(expectedHash, guard.decisionHash)) return unsigned;
  const validForSeconds = guard.validUntil - now;
  if (
    validForSeconds < 1 ||
    validForSeconds > BASE_AGENT_SWAP_GUARD_ATTESTATION_MAX_VALID_FOR_SECONDS
  )
    return unsigned;
  const signer =
    dependencies.signer === undefined ? await getAttesterAccount() : dependencies.signer;
  if (!signer) return unsigned;
  const trusted = dependencies.trustAttester ?? isPublishedBaseAgentSwapGuardAttester;
  if (!(await trusted(signer.address, now))) {
    logger.warn('Base agent swap guard signer is outside the published production key registry', {
      attester: signer.address,
    });
    return unsigned;
  }
  const calls = guard.transactionsToSign!;
  const binding = guard.binding!;
  const data: BaseAgentSwapGuardAttestationData = {
    decisionHash: guard.decisionHash,
    approvalCalldataHash: keccak256(calls.approval.data),
    swapCalldataHash: keccak256(calls.swap.data),
    recipient: binding.recipient.toLowerCase() as `0x${string}`,
    chainId: guard.scope.chainId,
    verdict: 0,
    issuedAt: now,
    validUntil: guard.validUntil,
    schemaVersion: BASE_AGENT_SWAP_GUARD_ATTESTATION_SCHEMA_VERSION,
  };
  const args = typedDataArgs(data);
  const signature = (await signer.signTypedData(args)) as Hex;
  return {
    ...unsigned,
    attestation: {
      type: BASE_AGENT_SWAP_GUARD_ATTESTATION_PRIMARY_TYPE,
      schemaVersion: BASE_AGENT_SWAP_GUARD_ATTESTATION_SCHEMA_VERSION,
      uid: hashTypedData(args),
      attester: signer.address.toLowerCase() as `0x${string}`,
      attesterLabel: 'Insight Base Agent Swap Guard attester',
      signedAt: new Date(now * 1_000).toISOString(),
      validForSeconds,
      signature,
      verifyUrl: dependencies.verifyUrl ?? verificationUrl(),
      data,
      eip712: unsignedEip712(),
    },
  };
}

/** Verify guard integrity, exact two-call binding, issuer signature, trust, and expiry. */
export async function verifyBaseAgentSwapGuardDecision(
  value: unknown,
  dependencies: Pick<BaseAgentSwapGuardAttestationDependencies, 'now' | 'trustAttester'> = {}
): Promise<BaseAgentSwapGuardDecisionVerification> {
  const empty = { valid: false, decisionHash: null, attester: null, expired: false } as const;
  try {
    const decision = asDecision(value);
    if (!decision) return { ...empty, reason: 'malformed' };
    if (!decision.attestation) {
      return { ...empty, decisionHash: decision.decisionHash, reason: 'missing_attestation' };
    }
    const attestation = decision.attestation as unknown as Record<string, unknown>;
    const data = asAttestationData(attestation.data);
    const attester = typeof attestation.attester === 'string' ? attestation.attester : null;
    if (!data || !attester || !ADDRESS.test(attester)) return { ...empty, reason: 'malformed' };
    const expectedHash = guardIntegrityHash(decision.guard);
    if (
      !expectedHash ||
      !sameHash(expectedHash, decision.guard.decisionHash) ||
      !sameHash(expectedHash, decision.decisionHash) ||
      !sameHash(expectedHash, data.decisionHash)
    )
      return { ...empty, decisionHash: expectedHash, attester, reason: 'decision_hash_mismatch' };
    if (
      !exactCallBindingIsValid(decision.guard) ||
      !decision.guard.binding ||
      !decision.guard.transactionsToSign ||
      !sameHash(data.approvalCalldataHash, decision.guard.binding.approval.calldataHash) ||
      !sameHash(data.swapCalldataHash, decision.guard.binding.swap.calldataHash) ||
      !sameAddress(data.recipient, decision.guard.binding.recipient) ||
      data.validUntil !== decision.guard.validUntil
    )
      return { ...empty, decisionHash: expectedHash, attester, reason: 'call_binding_mismatch' };
    const expectedEip712 = unsignedEip712();
    if (
      attestation.type !== BASE_AGENT_SWAP_GUARD_ATTESTATION_PRIMARY_TYPE ||
      attestation.schemaVersion !== BASE_AGENT_SWAP_GUARD_ATTESTATION_SCHEMA_VERSION ||
      typeof attestation.uid !== 'string' ||
      !HASH.test(attestation.uid) ||
      attestation.attesterLabel !== 'Insight Base Agent Swap Guard attester' ||
      typeof attestation.signedAt !== 'string' ||
      attestation.signedAt !== new Date(data.issuedAt * 1_000).toISOString() ||
      !Number.isSafeInteger(attestation.validForSeconds) ||
      attestation.validForSeconds !== data.validUntil - data.issuedAt ||
      attestation.validForSeconds < 1 ||
      attestation.validForSeconds > BASE_AGENT_SWAP_GUARD_ATTESTATION_MAX_VALID_FOR_SECONDS ||
      typeof attestation.signature !== 'string' ||
      !SIGNATURE.test(attestation.signature) ||
      canonicalJsonString(attestation.eip712) !== canonicalJsonString(expectedEip712)
    )
      return { ...empty, decisionHash: expectedHash, attester, reason: 'malformed' };
    const args = typedDataArgs(data);
    if (!sameHash(hashTypedData(args), attestation.uid))
      return { ...empty, decisionHash: expectedHash, attester, reason: 'uid_mismatch' };
    const signatureValid = await verifyTypedData({
      ...args,
      address: attester as `0x${string}`,
      signature: attestation.signature as Hex,
    });
    if (!signatureValid)
      return { ...empty, decisionHash: expectedHash, attester, reason: 'signature_invalid' };
    const trusted = dependencies.trustAttester ?? isPublishedBaseAgentSwapGuardAttester;
    if (!(await trusted(attester, data.issuedAt)))
      return { ...empty, decisionHash: expectedHash, attester, reason: 'untrusted_attester' };
    const expired = data.validUntil <= (dependencies.now ?? nowInSeconds)();
    return {
      valid: !expired,
      decisionHash: expectedHash,
      attester,
      expired,
      reason: expired ? 'expired' : 'verified',
    };
  } catch (error) {
    logger.warn('Base agent swap guard decision verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...empty, reason: 'verification_error' };
  }
}

export async function isPublishedBaseAgentSwapGuardAttester(
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
