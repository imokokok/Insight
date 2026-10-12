/** Offline verifier for Insight's token-security context capture statements. */

import { keccak256, sha256, toBytes, verifyTypedData } from 'viem';

import { resolveKeyStatus } from './keyRegistry';

import type { KeyRegistry, KeyStatus } from './types';

export const CONTEXT_ATTESTATION_V1_MANIFEST = 'context-attestation.v1';
export const CONTEXT_ATTESTATION_V2_MANIFEST = 'context-attestation.v2';
export const TOKEN_SECURITY_VIEW_SCHEMA = 'insight.token-security-view.v1';

const DOMAINS = {
  1: { name: 'InsightContextAttestation', version: '1' },
  2: { name: 'InsightContextAttestation', version: '2' },
} as const;

const TYPES = {
  ContextAttestationManifest: [
    { name: 'manifest', type: 'string' },
    { name: 'schemaVersion', type: 'uint256' },
    { name: 'capturedAt', type: 'string' },
    { name: 'entriesDigest', type: 'bytes32' },
    { name: 'transactionContext', type: 'string' },
  ],
} as const;

const HASH_PATTERN = /^0x[0-9a-f]{64}$/;
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const SIGNATURE_PATTERN = /^0x[0-9a-fA-F]{130}$/;
const MAX_ENTRIES = 32;
const MAX_CANONICAL_BYTES = 256 * 1024;

export interface ContextTokenSecurityView {
  schema: typeof TOKEN_SECURITY_VIEW_SCHEMA;
  sourcedFrom: string;
  rawHash: `0x${string}`;
  advisory: true;
  isHoneypot?: boolean;
  buyTaxPct?: number;
  sellTaxPct?: number;
  isOpenSource?: boolean;
  isProxy?: boolean;
  isMintable?: boolean;
  hiddenOwner?: boolean;
  holderCount?: number;
  isInCex?: boolean;
  trustList?: boolean;
  tokenSymbol?: string;
}

export interface ContextAttestationVerification {
  /** Cryptographic signature and V2 normalized-result linkage are valid. */
  valid: boolean;
  /** A V1 signature is valid but does not bind the returned normalized view. */
  accepted: boolean;
  resultLinked: boolean;
  sourceBodyRecomputed: false;
  code:
    | 'ok'
    | 'legacy_result_unlinked'
    | 'unsupported_schema'
    | 'malformed'
    | 'signature_invalid'
    | 'result_view_missing'
    | 'result_digest_mismatch';
  attester: string | null;
  keyStatus: KeyStatus;
  capturedAt: string | null;
  reason?: string;
}

export interface ContextAttestationVerifyOptions {
  /** Caller-confirmed key registry. Supplying it does not establish its origin. */
  keyRegistry?: KeyRegistry;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function canonicalIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 64) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function safeText(value: unknown, max = 256): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

/** Must remain byte-identical to Insight's signing implementation. */
export function canonicalContextJson(value: unknown): string {
  const ancestors = new Set<object>();
  let visited = 0;
  const visit = (current: unknown, depth: number): string => {
    visited += 1;
    if (visited > 20_000 || depth > 64)
      throw new TypeError('JSON value exceeds canonicalization limits');
    if (current === null) return 'null';
    if (typeof current === 'string' || typeof current === 'boolean') return JSON.stringify(current);
    if (typeof current === 'number') {
      if (!Number.isFinite(current))
        throw new TypeError('Non-finite numbers are not canonical JSON');
      return JSON.stringify(current);
    }
    if (typeof current !== 'object') throw new TypeError('Value is not JSON serializable');
    if (ancestors.has(current)) throw new TypeError('Circular JSON value');
    ancestors.add(current);
    try {
      if (Array.isArray(current))
        return `[${current.map((item) => visit(item, depth + 1)).join(',')}]`;
      if (!isRecord(current)) throw new TypeError('Only plain JSON objects are supported');
      const keys = Object.keys(current).sort();
      if (keys.some((key) => ['__proto__', 'prototype', 'constructor'].includes(key))) {
        throw new TypeError('Unsafe JSON object key');
      }
      return `{${keys.map((key) => `${JSON.stringify(key)}:${visit(current[key], depth + 1)}`).join(',')}}`;
    } finally {
      ancestors.delete(current);
    }
  };
  const result = visit(value, 0);
  if (new TextEncoder().encode(result).byteLength > MAX_CANONICAL_BYTES) {
    throw new TypeError('Canonical JSON exceeds the byte limit');
  }
  return result;
}

function normalizeView(value: unknown): ContextTokenSecurityView | null {
  if (!isRecord(value)) return null;
  const allowed = new Set([
    'schema',
    'sourcedFrom',
    'rawHash',
    'advisory',
    'isHoneypot',
    'buyTaxPct',
    'sellTaxPct',
    'isOpenSource',
    'isProxy',
    'isMintable',
    'hiddenOwner',
    'holderCount',
    'isInCex',
    'trustList',
    'tokenSymbol',
  ]);
  if (
    Object.keys(value).some((key) => !allowed.has(key)) ||
    value.schema !== TOKEN_SECURITY_VIEW_SCHEMA ||
    !safeText(value.sourcedFrom, 128) ||
    typeof value.rawHash !== 'string' ||
    !HASH_PATTERN.test(value.rawHash) ||
    value.advisory !== true
  )
    return null;

  const view: ContextTokenSecurityView = {
    schema: TOKEN_SECURITY_VIEW_SCHEMA,
    sourcedFrom: value.sourcedFrom,
    rawHash: value.rawHash as `0x${string}`,
    advisory: true,
  };
  for (const field of [
    'isHoneypot',
    'isOpenSource',
    'isProxy',
    'isMintable',
    'hiddenOwner',
    'isInCex',
    'trustList',
  ] as const) {
    if (value[field] !== undefined) {
      if (typeof value[field] !== 'boolean') return null;
      view[field] = value[field];
    }
  }
  for (const field of ['buyTaxPct', 'sellTaxPct'] as const) {
    if (value[field] !== undefined) {
      const number = value[field];
      if (typeof number !== 'number' || !Number.isFinite(number) || number < 0 || number > 100)
        return null;
      view[field] = number;
    }
  }
  if (value.holderCount !== undefined) {
    if (!Number.isSafeInteger(value.holderCount) || Number(value.holderCount) < 0) return null;
    view.holderCount = Number(value.holderCount);
  }
  if (value.tokenSymbol !== undefined) {
    if (typeof value.tokenSymbol !== 'string' || value.tokenSymbol.length > 128) return null;
    view.tokenSymbol = value.tokenSymbol;
  }
  return view;
}

function validEntry(value: unknown, version: 1 | 2): value is Record<string, unknown> {
  if (!isRecord(value) || !isRecord(value.request)) return false;
  const allowed = [
    'kind',
    'source',
    'request',
    'rawResponseSha256',
    'normalizedResultSha256',
    'retrievedAt',
    'toolVersion',
    'authorization',
    'latencyMs',
    'transactionContext',
    'priorSeal',
  ];
  const unsignedKeys = Object.keys(value).filter((key) => key !== 'priorSeal');
  if (unsignedKeys.some((key) => !allowed.includes(key))) return false;
  const request = value.request;
  const expectedManifest =
    version === 1 ? CONTEXT_ATTESTATION_V1_MANIFEST : CONTEXT_ATTESTATION_V2_MANIFEST;
  if (
    !safeText(value.kind) ||
    !safeText(value.source) ||
    Object.keys(request).some((key) => !['chainId', 'contractAddress'].includes(key)) ||
    !Number.isSafeInteger(request.chainId) ||
    Number(request.chainId) <= 0 ||
    typeof request.contractAddress !== 'string' ||
    !ADDRESS_PATTERN.test(request.contractAddress) ||
    typeof value.rawResponseSha256 !== 'string' ||
    !HASH_PATTERN.test(value.rawResponseSha256) ||
    !canonicalIsoDate(value.retrievedAt) ||
    (version === 2 &&
      (typeof value.normalizedResultSha256 !== 'string' ||
        !HASH_PATTERN.test(value.normalizedResultSha256))) ||
    (version === 1 && value.normalizedResultSha256 !== undefined) ||
    (value.toolVersion !== undefined && !safeText(value.toolVersion)) ||
    (value.authorization !== undefined && !safeText(value.authorization)) ||
    (value.latencyMs !== undefined &&
      (!Number.isSafeInteger(value.latencyMs) || Number(value.latencyMs) < 0)) ||
    (value.transactionContext !== undefined && !safeText(value.transactionContext, 1024))
  )
    return false;
  const seal = value.priorSeal;
  return (
    isRecord(seal) &&
    Object.keys(seal).every((key) => ['manifest', 'signature', 'keyId'].includes(key)) &&
    seal.manifest === expectedManifest &&
    typeof seal.signature === 'string' &&
    SIGNATURE_PATTERN.test(seal.signature) &&
    typeof seal.keyId === 'string' &&
    ADDRESS_PATTERN.test(seal.keyId)
  );
}

function fail(
  code: ContextAttestationVerification['code'],
  partial: Partial<ContextAttestationVerification> = {}
): ContextAttestationVerification {
  return {
    valid: false,
    accepted: false,
    resultLinked: false,
    sourceBodyRecomputed: false,
    code,
    attester: null,
    keyStatus: 'not_checked',
    capturedAt: null,
    ...partial,
  };
}

/**
 * Verify a V1/V2 capture statement without network access. V2 also requires the
 * exact normalized token-security view so its signed digest can be recomputed.
 */
async function verifyContextAttestationInternal(
  attestationInput: unknown,
  tokenSecurityViewInput?: unknown,
  options: ContextAttestationVerifyOptions = {}
): Promise<ContextAttestationVerification> {
  if (!isRecord(attestationInput)) return fail('malformed');
  const version = attestationInput.schemaVersion;
  if (version !== 1 && version !== 2) return fail('unsupported_schema');
  const manifest =
    version === 1 ? CONTEXT_ATTESTATION_V1_MANIFEST : CONTEXT_ATTESTATION_V2_MANIFEST;
  if (
    Object.keys(attestationInput).some(
      (key) => !['schemaVersion', 'capturedAt', 'entries'].includes(key)
    ) ||
    !canonicalIsoDate(attestationInput.capturedAt) ||
    !Array.isArray(attestationInput.entries) ||
    attestationInput.entries.length === 0 ||
    attestationInput.entries.length > MAX_ENTRIES ||
    attestationInput.entries.some((entry) => !validEntry(entry, version))
  )
    return fail('malformed');

  const entries = attestationInput.entries as Array<Record<string, unknown>>;
  const seals = entries.map((entry) => entry.priorSeal as Record<string, unknown>);
  const firstSeal = seals[0];
  if (
    seals.some(
      (seal) =>
        seal.signature !== firstSeal.signature ||
        String(seal.keyId).toLowerCase() !== String(firstSeal.keyId).toLowerCase()
    )
  ) {
    return fail('malformed');
  }
  const transactionContexts = entries.map((entry) => entry.transactionContext ?? '');
  if (transactionContexts.some((context) => context !== transactionContexts[0]))
    return fail('malformed');

  const unsignedEntries = entries.map(({ priorSeal: _priorSeal, ...entry }) => entry);
  const capturedAt = attestationInput.capturedAt;
  const attester = String(firstSeal.keyId);
  const keyStatus = resolveKeyStatus(attester, Date.parse(capturedAt) / 1000, options.keyRegistry);
  let signatureValid = false;
  try {
    signatureValid = await verifyTypedData({
      address: attester as `0x${string}`,
      domain: DOMAINS[version],
      types: TYPES,
      primaryType: 'ContextAttestationManifest',
      message: {
        manifest,
        schemaVersion: BigInt(version),
        capturedAt,
        entriesDigest: keccak256(toBytes(canonicalContextJson(unsignedEntries))),
        transactionContext: String(transactionContexts[0]),
      },
      signature: String(firstSeal.signature) as `0x${string}`,
    });
  } catch (error) {
    return fail('signature_invalid', {
      attester,
      keyStatus,
      capturedAt,
      reason: error instanceof Error ? error.message : 'Signature verification failed',
    });
  }
  if (!signatureValid) return fail('signature_invalid', { attester, keyStatus, capturedAt });

  if (version === 1) {
    return {
      valid: true,
      accepted: false,
      resultLinked: false,
      sourceBodyRecomputed: false,
      code: 'legacy_result_unlinked',
      attester,
      keyStatus,
      capturedAt,
    };
  }

  const view = normalizeView(tokenSecurityViewInput);
  if (!view) return fail('result_view_missing', { attester, keyStatus, capturedAt });
  const candidates = entries.filter(
    (entry) => entry.kind === 'third_party_token_scan' && entry.source === view.sourcedFrom
  );
  if (candidates.length !== 1)
    return fail('result_digest_mismatch', { attester, keyStatus, capturedAt });
  const candidate = candidates[0];
  const digest = sha256(toBytes(canonicalContextJson(view)));
  if (candidate.rawResponseSha256 !== view.rawHash || candidate.normalizedResultSha256 !== digest) {
    return fail('result_digest_mismatch', { attester, keyStatus, capturedAt });
  }
  const trustedKey = (options.keyRegistry?.public_keys ?? options.keyRegistry?.keys ?? []).find(
    (key) => key.public_key.toLowerCase() === attester.toLowerCase()
  );
  return {
    valid: true,
    accepted: keyStatus === 'valid' && trustedKey?.role !== 'sample',
    resultLinked: true,
    sourceBodyRecomputed: false,
    code: 'ok',
    attester,
    keyStatus,
    capturedAt,
  };
}

/** Malformed or hostile JavaScript objects return a result instead of escaping. */
export async function verifyContextAttestation(
  attestationInput: unknown,
  tokenSecurityViewInput?: unknown,
  options: ContextAttestationVerifyOptions = {}
): Promise<ContextAttestationVerification> {
  try {
    return await verifyContextAttestationInternal(
      attestationInput,
      tokenSecurityViewInput,
      options
    );
  } catch (error) {
    return fail('malformed', {
      reason: error instanceof Error ? error.message : 'Malformed attestation input',
    });
  }
}
