/**
 * Signed decision-input evidence for the pre-trade token-security lane.
 *
 * V2 signs both the source-response digest and a digest of the normalized
 * `tokenSecurity` object returned to the caller. This links the displayed
 * fields to an Insight-signed capture statement without claiming that the
 * source was correct or that an agent consumed the fields. The raw source body
 * is not returned, so the verifier cannot independently replay its parsing.
 */

import { createHash } from 'node:crypto';

import { keccak256, verifyTypedData } from 'viem';

import { getAttesterAccount } from '@/lib/attestations/attesterAccount';
import { canonicalJsonString } from '@/lib/utils/canonicalJson';
import { createLogger } from '@/lib/utils/logger';

export { canonicalJsonString };

const logger = createLogger('ContextAttestation');

export const CONTEXT_ATTESTATION_V1_MANIFEST = 'context-attestation.v1';
export const CONTEXT_ATTESTATION_V1_SCHEMA_VERSION = 1;
export const CONTEXT_ATTESTATION_MANIFEST = 'context-attestation.v2';
export const CONTEXT_ATTESTATION_SCHEMA_VERSION = 2;
export const TOKEN_SECURITY_VIEW_SCHEMA = 'insight.token-security-view.v1';

const CONTEXT_DOMAINS = {
  1: { name: 'InsightContextAttestation', version: '1' },
  2: { name: 'InsightContextAttestation', version: '2' },
} as const;

const CONTEXT_TYPES = {
  ContextAttestationManifest: [
    { name: 'manifest', type: 'string' },
    { name: 'schemaVersion', type: 'uint256' },
    { name: 'capturedAt', type: 'string' },
    { name: 'entriesDigest', type: 'bytes32' },
    { name: 'transactionContext', type: 'string' },
  ],
} as const;

export interface ContextAttestationEntry {
  /** Evidence lane kind, e.g. 'third_party_token_scan'. */
  kind: string;
  /** Data source identifier, e.g. 'gopluslabs'. */
  source: string;
  request: {
    chainId: number;
    contractAddress: string;
  };
  /** SHA-256 of the verbatim source response body. */
  rawResponseSha256: `0x${string}`;
  /** V2: SHA-256 of the exact normalized result object returned to the caller. */
  normalizedResultSha256?: `0x${string}`;
  retrievedAt: string;
  /** Identity and version of the fetcher. */
  toolVersion?: string;
  /** Data-access authorization policy identifier. */
  authorization?: string;
  /** Fetch latency in milliseconds. */
  latencyMs?: number;
  /** Related pre-trade verdict attestation UID. */
  transactionContext?: string;
  priorSeal: {
    manifest: typeof CONTEXT_ATTESTATION_V1_MANIFEST | typeof CONTEXT_ATTESTATION_MANIFEST;
    signature: string;
    keyId: string;
  };
}

export interface ContextAttestation {
  schemaVersion:
    | typeof CONTEXT_ATTESTATION_V1_SCHEMA_VERSION
    | typeof CONTEXT_ATTESTATION_SCHEMA_VERSION;
  capturedAt: string;
  entries: ContextAttestationEntry[];
}

/** Advisory parsed view of the third-party scan, linked to its signed capture. */
export interface TokenSecurityView {
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

export interface ContextAttestationVerificationResult {
  valid: boolean;
  attester: string | null;
  code:
    | 'ok'
    | 'signature_valid_result_unlinked'
    | 'unsupported_schema'
    | 'malformed'
    | 'signature_invalid'
    | 'result_view_missing'
    | 'result_digest_mismatch';
  /** True only when the supplied normalized result matches the signed V2 digest. */
  resultLinked: boolean;
  reason?: string;
}

type UnsignedContextAttestationEntry = Omit<ContextAttestationEntry, 'priorSeal'>;

const SAFE_HASH_PATTERN = /^0x[0-9a-f]{64}$/;
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const SIGNATURE_PATTERN = /^0x[0-9a-fA-F]{130}$/;
const MAX_ENTRIES = 32;

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function isCanonicalIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 64) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isSafeText(value: unknown, maxLength = 256): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

function isSafeHash(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && SAFE_HASH_PATTERN.test(value);
}

export function rawBodySha256(rawBody: string): `0x${string}` {
  return `0x${createHash('sha256').update(rawBody, 'utf8').digest('hex')}` as `0x${string}`;
}

/** Normalize and strictly validate the exact response view before signing it. */
export function normalizeTokenSecurityView(input: unknown): TokenSecurityView | null {
  if (!isRecord(input)) return null;
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
  if (Object.keys(input).some((key) => !allowed.has(key))) return null;
  if (
    input.schema !== TOKEN_SECURITY_VIEW_SCHEMA ||
    !isSafeText(input.sourcedFrom, 128) ||
    !isSafeHash(input.rawHash) ||
    input.advisory !== true
  ) {
    return null;
  }

  const view: TokenSecurityView = {
    schema: TOKEN_SECURITY_VIEW_SCHEMA,
    sourcedFrom: input.sourcedFrom,
    rawHash: input.rawHash,
    advisory: true,
  };
  const booleanFields = [
    'isHoneypot',
    'isOpenSource',
    'isProxy',
    'isMintable',
    'hiddenOwner',
    'isInCex',
    'trustList',
  ] as const;
  for (const field of booleanFields) {
    const fieldValue = input[field];
    if (fieldValue !== undefined) {
      if (typeof fieldValue !== 'boolean') return null;
      view[field] = fieldValue;
    }
  }
  for (const field of ['buyTaxPct', 'sellTaxPct'] as const) {
    const fieldValue = input[field];
    if (fieldValue !== undefined) {
      if (
        typeof fieldValue !== 'number' ||
        !Number.isFinite(fieldValue) ||
        fieldValue < 0 ||
        fieldValue > 100
      ) {
        return null;
      }
      view[field] = fieldValue;
    }
  }
  if (input.holderCount !== undefined) {
    if (!Number.isSafeInteger(input.holderCount) || Number(input.holderCount) < 0) return null;
    view.holderCount = Number(input.holderCount);
  }
  if (input.tokenSymbol !== undefined) {
    if (typeof input.tokenSymbol !== 'string' || input.tokenSymbol.length > 128) return null;
    view.tokenSymbol = input.tokenSymbol;
  }
  return view;
}

/** SHA-256 of the exact, normalized tokenSecurity object returned by the API. */
export function tokenSecurityViewSha256(view: TokenSecurityView): `0x${string}` {
  return rawBodySha256(canonicalJsonString(view));
}

export function contextEntriesDigest(
  entries: Array<UnsignedContextAttestationEntry>
): `0x${string}` {
  return keccak256(new TextEncoder().encode(canonicalJsonString(entries)));
}

function validateUnsignedEntry(
  value: unknown,
  schemaVersion: 1 | 2
): value is UnsignedContextAttestationEntry {
  if (!isRecord(value)) return false;
  const allowed = new Set([
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
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return false;
  if (
    !isSafeText(value.kind) ||
    !isSafeText(value.source) ||
    !isRecord(value.request) ||
    Object.keys(value.request).some((key) => !['chainId', 'contractAddress'].includes(key)) ||
    !Number.isSafeInteger(value.request.chainId) ||
    Number(value.request.chainId) <= 0 ||
    typeof value.request.contractAddress !== 'string' ||
    !ADDRESS_PATTERN.test(value.request.contractAddress) ||
    !isSafeHash(value.rawResponseSha256) ||
    !isCanonicalIsoDate(value.retrievedAt)
  ) {
    return false;
  }
  if (schemaVersion === 2 && !isSafeHash(value.normalizedResultSha256)) return false;
  if (schemaVersion === 1 && value.normalizedResultSha256 !== undefined) return false;
  if (value.toolVersion !== undefined && !isSafeText(value.toolVersion)) return false;
  if (value.authorization !== undefined && !isSafeText(value.authorization)) return false;
  if (
    value.latencyMs !== undefined &&
    (!Number.isSafeInteger(value.latencyMs) || Number(value.latencyMs) < 0)
  ) {
    return false;
  }
  if (value.transactionContext !== undefined && !isSafeText(value.transactionContext, 1024))
    return false;
  return true;
}

function validateAttestation(value: unknown): ContextAttestation | null {
  if (!isRecord(value) || ![1, 2].includes(Number(value.schemaVersion))) return null;
  const schemaVersion = Number(value.schemaVersion) as 1 | 2;
  const expectedManifest =
    schemaVersion === 1 ? CONTEXT_ATTESTATION_V1_MANIFEST : CONTEXT_ATTESTATION_MANIFEST;
  if (
    Object.keys(value).some((key) => !['schemaVersion', 'capturedAt', 'entries'].includes(key)) ||
    !isCanonicalIsoDate(value.capturedAt) ||
    !Array.isArray(value.entries) ||
    value.entries.length === 0 ||
    value.entries.length > MAX_ENTRIES
  ) {
    return null;
  }
  const entries: ContextAttestationEntry[] = [];
  let signature: string | undefined;
  let keyId: string | undefined;
  let transactionContext: string | undefined;
  for (const rawEntry of value.entries) {
    if (!isRecord(rawEntry) || !isRecord(rawEntry.priorSeal)) {
      return null;
    }
    const { priorSeal: entrySeal, ...unsignedEntry } = rawEntry;
    if (!validateUnsignedEntry(unsignedEntry, schemaVersion)) return null;
    if (
      Object.keys(entrySeal).some((key) => !['manifest', 'signature', 'keyId'].includes(key)) ||
      entrySeal.manifest !== expectedManifest ||
      typeof entrySeal.signature !== 'string' ||
      !SIGNATURE_PATTERN.test(entrySeal.signature) ||
      typeof entrySeal.keyId !== 'string' ||
      !ADDRESS_PATTERN.test(entrySeal.keyId)
    ) {
      return null;
    }
    if (signature !== undefined && signature !== entrySeal.signature) return null;
    if (keyId !== undefined && keyId.toLowerCase() !== entrySeal.keyId.toLowerCase()) return null;
    if (
      transactionContext !== undefined &&
      transactionContext !== (unsignedEntry.transactionContext ?? '')
    )
      return null;
    signature = entrySeal.signature;
    keyId = entrySeal.keyId;
    transactionContext = unsignedEntry.transactionContext ?? '';
    if (
      Object.keys(rawEntry).some(
        (key) =>
          ![
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
          ].includes(key)
      )
    )
      return null;
    entries.push(rawEntry as unknown as ContextAttestationEntry);
  }
  const attestation: ContextAttestation = {
    schemaVersion,
    capturedAt: value.capturedAt,
    entries,
  };
  try {
    canonicalJsonString(attestation);
  } catch {
    return null;
  }
  return attestation;
}

/**
 * Sign V2 entries. The caller must include normalizedResultSha256 so the
 * returned `tokenSecurity` view is covered by the same source-capture claim.
 */
export async function signContextAttestation(input: {
  entries: Array<UnsignedContextAttestationEntry>;
  capturedAt: string;
  transactionContext?: string;
}): Promise<ContextAttestation | null> {
  try {
    if (
      !isCanonicalIsoDate(input.capturedAt) ||
      !Array.isArray(input.entries) ||
      input.entries.length === 0 ||
      input.entries.length > MAX_ENTRIES ||
      input.entries.some(
        (entry) =>
          !validateUnsignedEntry(entry, CONTEXT_ATTESTATION_SCHEMA_VERSION) ||
          (entry.transactionContext ?? '') !== (input.transactionContext ?? '')
      )
    ) {
      return null;
    }
    const account = await getAttesterAccount();
    if (!account) return null;

    const entriesDigest = contextEntriesDigest(input.entries);
    const signature = await account.signTypedData({
      domain: CONTEXT_DOMAINS[CONTEXT_ATTESTATION_SCHEMA_VERSION],
      types: CONTEXT_TYPES,
      primaryType: 'ContextAttestationManifest',
      message: {
        manifest: CONTEXT_ATTESTATION_MANIFEST,
        schemaVersion: BigInt(CONTEXT_ATTESTATION_SCHEMA_VERSION),
        capturedAt: input.capturedAt,
        entriesDigest,
        transactionContext: input.transactionContext ?? '',
      },
    });

    const entries: ContextAttestationEntry[] = input.entries.map((entry) => ({
      ...entry,
      priorSeal: {
        manifest: CONTEXT_ATTESTATION_MANIFEST,
        signature,
        keyId: account.address,
      },
    }));
    return {
      schemaVersion: CONTEXT_ATTESTATION_SCHEMA_VERSION,
      capturedAt: input.capturedAt,
      entries,
    };
  } catch (error) {
    logger.warn('Failed to sign context attestation; advisory omitted', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Verify a capture statement and, for V2, bind the supplied normalized view to
 * the signed digest. A valid result still authenticates only the attester's
 * statement; callers must establish trust in `attester` separately.
 */
export async function verifyContextAttestation(
  attestationInput: unknown,
  tokenSecurityInput?: unknown
): Promise<ContextAttestationVerificationResult> {
  let attestation: ContextAttestation | null;
  try {
    attestation = validateAttestation(attestationInput);
  } catch (error) {
    return {
      valid: false,
      attester: null,
      code: 'malformed',
      resultLinked: false,
      reason: error instanceof Error ? error.message : 'Malformed attestation input',
    };
  }
  if (!attestation) {
    return { valid: false, attester: null, code: 'malformed', resultLinked: false };
  }
  const first = attestation.entries[0];
  const attester = first.priorSeal.keyId;
  const unsignedEntries = attestation.entries.map(({ priorSeal: _priorSeal, ...rest }) => rest);
  const transactionContext = unsignedEntries[0]?.transactionContext ?? '';
  const schemaVersion = attestation.schemaVersion;
  const domain = CONTEXT_DOMAINS[schemaVersion];
  const manifest =
    schemaVersion === 1 ? CONTEXT_ATTESTATION_V1_MANIFEST : CONTEXT_ATTESTATION_MANIFEST;

  try {
    const validSignature = await verifyTypedData({
      address: attester as `0x${string}`,
      domain,
      types: CONTEXT_TYPES,
      primaryType: 'ContextAttestationManifest',
      message: {
        manifest,
        schemaVersion: BigInt(schemaVersion),
        capturedAt: attestation.capturedAt,
        entriesDigest: contextEntriesDigest(unsignedEntries),
        transactionContext,
      },
      signature: first.priorSeal.signature as `0x${string}`,
    });
    if (!validSignature) {
      return { valid: false, attester, code: 'signature_invalid', resultLinked: false };
    }
  } catch (error) {
    return {
      valid: false,
      attester,
      code: 'signature_invalid',
      resultLinked: false,
      reason: error instanceof Error ? error.message : 'signature verification failed',
    };
  }

  if (schemaVersion === 1) {
    return {
      valid: true,
      attester,
      code: 'signature_valid_result_unlinked',
      resultLinked: false,
    };
  }

  let view: TokenSecurityView | null;
  try {
    view = normalizeTokenSecurityView(tokenSecurityInput);
  } catch {
    view = null;
  }
  if (!view) {
    return { valid: false, attester, code: 'result_view_missing', resultLinked: false };
  }
  const matchingEntries = attestation.entries.filter(
    (entry) => entry.kind === 'third_party_token_scan' && entry.source === view.sourcedFrom
  );
  if (
    matchingEntries.length !== 1 ||
    matchingEntries[0].rawResponseSha256 !== view.rawHash ||
    matchingEntries[0].normalizedResultSha256 !== tokenSecurityViewSha256(view)
  ) {
    return { valid: false, attester, code: 'result_digest_mismatch', resultLinked: false };
  }
  return { valid: true, attester, code: 'ok', resultLinked: true };
}
