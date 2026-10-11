/**
 * Signed decision-input context attestation ("what did we receive, and when").
 *
 * Structure is isomorphic to the PriorSeal sample-attestation.v1 manifest used
 * by the Mag-7 replay sample: a canonical JSON digest of the evidence entries,
 * signed by the platform attester key. It deliberately does NOT reuse the main
 * `OracleSafetyCheck` EIP-712 domain — this is an independent nested signature
 * so the v3 oracle attestation contract stays byte-for-byte unchanged
 * (`decision-input-expansion-2026-10-12.md` discipline).
 *
 * Honest boundary (must stay in all external copy): the signature proves
 * "Insight received this raw response at time T". Third-party scan data drifts
 * (holder balances etc.) — rawResponseSha256 is NOT replayable after the fact.
 * This is evidence of capture, not a recomputation, and never a claim that the
 * third party's conclusion is correct.
 */

import { createHash } from 'node:crypto';

import { keccak256, verifyTypedData } from 'viem';

import { getAttesterAccount } from '@/lib/attestations/attesterAccount';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ContextAttestation');

export const CONTEXT_ATTESTATION_MANIFEST = 'context-attestation.v1';
export const CONTEXT_ATTESTATION_SCHEMA_VERSION = 1;

const CONTEXT_DOMAIN = { name: 'InsightContextAttestation', version: '1' } as const;

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
  /** sha256 of the verbatim raw response body — the evidence anchor. */
  rawResponseSha256: `0x${string}`;
  retrievedAt: string;
  /** AIUC-1 D003 slot: tool identity + version of the fetcher. */
  toolVersion?: string;
  /** AIUC-1 D003 slot: our own data-access authorization policy id. */
  authorization?: string;
  /** AIUC-1 D003 slot: fetch latency in ms. */
  latencyMs?: number;
  /** AIUC-1 D003 slot: hash of the related pre-trade verdict attestation uid. */
  transactionContext?: string;
  priorSeal: {
    manifest: typeof CONTEXT_ATTESTATION_MANIFEST;
    signature: string;
    keyId: string;
  };
}

export interface ContextAttestation {
  schemaVersion: typeof CONTEXT_ATTESTATION_SCHEMA_VERSION;
  capturedAt: string;
  entries: ContextAttestationEntry[];
}

/** Advisory parsed view of the third-party scan, linked to the signed raw hash. */
export interface TokenSecurityView {
  sourcedFrom: string;
  rawHash: string;
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

/** sha256 of the verbatim raw response body — the evidence anchor format. */
export function rawBodySha256(rawBody: string): `0x${string}` {
  return `0x${createHash('sha256').update(rawBody, 'utf8').digest('hex')}` as `0x${string}`;
}

/**
 * Deterministic JSON (recursively sorted keys) — the digest is only verifiable
 * if the serialization is canonical.
 */
export function canonicalJsonString(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJsonString).join(',')}]`;
  const keys = Object.keys(value).sort();
  const body = keys
    .map(
      (key) =>
        `${JSON.stringify(key)}:${canonicalJsonString((value as Record<string, unknown>)[key])}`
    )
    .join(',');
  return `{${body}}`;
}

export function contextEntriesDigest(
  entries: Array<Omit<ContextAttestationEntry, 'priorSeal'>>
): `0x${string}` {
  // TextEncoder (not Buffer): in jsdom test realms Buffer's Uint8Array is a
  // different realm class, which @noble's keccak rejects ("Uint8Array expected").
  return keccak256(new TextEncoder().encode(canonicalJsonString(entries)));
}

/**
 * Sign the entries (canonical digest) with the platform attester key.
 * Returns null when no key is configured or signing fails — the caller must
 * then omit the whole contextAttestation/tokenSecurity pair (fail-closed: we
 * never emit an unsigned object that looks like evidence).
 */
export async function signContextAttestation(input: {
  entries: Array<Omit<ContextAttestationEntry, 'priorSeal'>>;
  capturedAt: string;
  transactionContext?: string;
}): Promise<ContextAttestation | null> {
  const account = await getAttesterAccount();
  if (!account) return null;

  try {
    const entriesDigest = contextEntriesDigest(input.entries);
    const signature = await account.signTypedData({
      domain: CONTEXT_DOMAIN,
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

    return {
      schemaVersion: CONTEXT_ATTESTATION_SCHEMA_VERSION,
      capturedAt: input.capturedAt,
      entries: input.entries.map((entry) => ({
        ...entry,
        priorSeal: {
          manifest: CONTEXT_ATTESTATION_MANIFEST,
          signature,
          keyId: account.address,
        },
      })),
    };
  } catch (error) {
    logger.warn('Failed to sign context attestation; advisory omitted', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export interface ContextAttestationVerificationResult {
  valid: boolean;
  attester: string | null;
  reason?: string;
}

/**
 * Offline verification: recompute the canonical digest from the (unsigned)
 * entry fields and check the EIP-712 signature against the embedded keyId.
 */
export async function verifyContextAttestation(
  attestation: ContextAttestation
): Promise<ContextAttestationVerificationResult> {
  try {
    if (attestation.schemaVersion !== CONTEXT_ATTESTATION_SCHEMA_VERSION) {
      return { valid: false, attester: null, reason: 'unsupported schemaVersion' };
    }
    if (!Array.isArray(attestation.entries) || attestation.entries.length === 0) {
      return { valid: false, attester: null, reason: 'no entries' };
    }
    const first = attestation.entries[0];
    if (
      !first?.priorSeal ||
      first.priorSeal.manifest !== CONTEXT_ATTESTATION_MANIFEST ||
      !/^0x[0-9a-fA-F]{40}$/.test(first.priorSeal.keyId)
    ) {
      return { valid: false, attester: null, reason: 'missing or malformed priorSeal' };
    }
    for (const entry of attestation.entries) {
      if (
        entry.priorSeal.signature !== first.priorSeal.signature ||
        entry.priorSeal.keyId !== first.priorSeal.keyId
      ) {
        return { valid: false, attester: null, reason: 'entries not covered by one signature' };
      }
    }

    const unsignedEntries = attestation.entries.map(({ priorSeal: _priorSeal, ...rest }) => rest);
    const transactionContext = unsignedEntries[0].transactionContext;
    const entriesDigest = contextEntriesDigest(unsignedEntries);
    const valid = await verifyTypedData({
      address: first.priorSeal.keyId as `0x${string}`,
      domain: CONTEXT_DOMAIN,
      types: CONTEXT_TYPES,
      primaryType: 'ContextAttestationManifest',
      message: {
        manifest: CONTEXT_ATTESTATION_MANIFEST,
        schemaVersion: BigInt(CONTEXT_ATTESTATION_SCHEMA_VERSION),
        capturedAt: attestation.capturedAt,
        entriesDigest,
        transactionContext: transactionContext ?? '',
      },
      signature: first.priorSeal.signature as `0x${string}`,
    });
    if (!valid) {
      return { valid: false, attester: first.priorSeal.keyId, reason: 'signature mismatch' };
    }
    return { valid: true, attester: first.priorSeal.keyId };
  } catch (error) {
    return {
      valid: false,
      attester: null,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
