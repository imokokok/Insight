/**
 * @fileoverview v2 re-check attestation — `OracleSafetyRecheck` EIP-712 type.
 *
 * A recheck is a FRESH re-run of the pre-trade safety check, signed as a
 * distinct EIP-712 type that REFERENCES the original check it re-verifies.
 * Per Raul's locked spec: rechecks do NOT overwrite v1 — they issue a new
 * signed attestation of a separate type, binding both `originalUid` (the
 * original attestation's UID) and `originalRequestHash` (the original
 * CanonicalPreTradeRequest hash) so a verifier can confirm "this recheck is a
 * freshness re-verification of THAT original trade".
 *
 * Schema shape: the 26 v2 fields (reflecting CURRENT oracle state at recheck
 * time) + 2 reference fields = 28 signed fields. The 26 v2 fields come
 * directly from a fresh {@link buildMessage} call (the recheck re-runs the
 * safety check, so its verdict / consensusPrice / deviation / freshness are
 * current, not stale copies of the original).
 *
 * Binding invariant: because the recheck uses the SAME trade params as the
 * original, the recheck's own `requestHash` (one of the 26 v2 fields) equals
 * `originalRequestHash`. A verifier can assert
 * `recheck.data.requestHash === recheck.data.originalRequestHash` to confirm
 * the recheck is for the same trade — no need to re-fetch the original.
 *
 * Routing: the recheck carries `schemaVersion: 2` (v2 family) but a distinct
 * `eip712.primaryType: 'OracleSafetyRecheck'`. The verify endpoint routes by
 * primaryType so a recheck is verified against the 28-field type, not the
 * 26-field `OracleSafetyCheck` type (a mismatch would fail UID recovery).
 *
 * Determinism: the recheck UID is `hashTypedData(recheckArgs)`. For fixed v2
 * data + originalUid + originalRequestHash it is reproducible by both Insight
 * and ThoughtPrint. The pinned test vector lives in
 * `__tests__/oracleSafetyRecheck.test.ts`.
 */

import { createLogger } from '@/lib/utils/logger';

import { getAttesterAccount } from './attesterAccount';
import {
  CANONICAL_REQUEST_DOMAIN,
  CANONICAL_REQUEST_PRIMARY_TYPE,
  CANONICAL_REQUEST_TYPES,
} from './canonicalRequestHash';
import {
  type AttestationDataV2,
  V2_ATTESTER_LABEL,
  V2_DOMAIN,
  V2_SCHEMA_VERSION,
  V2_TYPES,
  V2_VALID_FOR_SECONDS,
  v2TypedDataArgs,
} from './oracleSafetyAttestationV2';

const logger = createLogger('OracleSafetyRecheck');

// ---------------------------------------------------------------------------
// EIP-712 domain + types (recheck = v2 + 2 reference fields)
// ---------------------------------------------------------------------------

/**
 * Same separator as v2 (domain name + version '2' + chainId 1). The real chain
 * is `subjectChainId` inside the message; the domain chainId is a salt only.
 */
export const RECHECK_DOMAIN = V2_DOMAIN;

export const RECHECK_PRIMARY_TYPE = 'OracleSafetyRecheck';

/**
 * The 28 signed fields = v2's 26 + `originalUid` (string) + `originalRequestHash`
 * (bytes32). Field order is fixed — appending the reference fields (rather than
 * inserting) keeps the v2 prefix byte-identical, so a v2 verifier reading the
 * first 26 fields sees the same layout. Changing the order or count is a
 * schema-version bump.
 */
export const RECHECK_TYPES = {
  OracleSafetyRecheck: [
    ...V2_TYPES.OracleSafetyCheck,
    { name: 'originalUid', type: 'string' },
    { name: 'originalRequestHash', type: 'bytes32' },
  ],
} as const;

// ---------------------------------------------------------------------------
// Signed message shape
// ---------------------------------------------------------------------------

/**
 * The 28 recheck fields, JSON-serializable (numbers + hex strings — same
 * bigint→number rationale as v2; see {@link AttestationDataV2}). The two
 * reference fields bind the recheck to the original attestation it re-verifies.
 */
export interface AttestationDataRecheck extends AttestationDataV2 {
  /** UID of the original v2 attestation this recheck re-verifies. */
  originalUid: string;
  /** requestHash of the original check — binds "same trade". */
  originalRequestHash: `0x${string}`;
}

/**
 * EIP-712 typed-data args for the recheck. Reuses {@link v2TypedDataArgs} to
 * widen the 26 v2 number-fields to their bigint twin, then appends the two
 * reference fields (already string / hex — no widening needed). This keeps a
 * single source of truth for the v2 widening and avoids re-implementing it.
 */
export function recheckTypedDataArgs(message: AttestationDataRecheck) {
  const v2Args = v2TypedDataArgs(message); // widens the 26 v2 fields to bigint
  return {
    domain: RECHECK_DOMAIN,
    types: RECHECK_TYPES,
    primaryType: RECHECK_PRIMARY_TYPE,
    message: {
      ...v2Args.message,
      originalUid: message.originalUid,
      originalRequestHash: message.originalRequestHash,
    },
  } as const;
}

// ---------------------------------------------------------------------------
// Public envelope
// ---------------------------------------------------------------------------

/** Discriminator carried in the JSON envelope so the verify route can route a
 *  recheck apart from a plain v2 attestation without inspecting `eip712`. */
export const RECHECK_TYPE = 'OracleSafetyRecheck' as const;

export interface OracleSafetyRecheck {
  uid: string;
  /** v2-family schema version. The recheck is a v2-schema attestation. */
  schemaVersion: 2;
  /** Discriminator: distinguishes a recheck from a plain v2 attestation. */
  type: typeof RECHECK_TYPE;
  attester: string;
  attesterLabel: string;
  signedAt: string;
  validForSeconds: number;
  validUntil: number;
  signature: string;
  verifyUrl: string;
  data: AttestationDataRecheck;
  eip712: {
    domain: typeof RECHECK_DOMAIN;
    types: typeof RECHECK_TYPES;
    primaryType: typeof RECHECK_PRIMARY_TYPE;
    canonicalRequestDomain: typeof CANONICAL_REQUEST_DOMAIN;
    canonicalRequestTypes: typeof CANONICAL_REQUEST_TYPES;
    canonicalRequestPrimaryType: typeof CANONICAL_REQUEST_PRIMARY_TYPE;
  };
}

function getVerifyUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://www.oracleinsight.xyz'
      : 'http://localhost:3000');
  return `${base}/api/v1/safety/attestation/verify`;
}

// ---------------------------------------------------------------------------
// Sign
// ---------------------------------------------------------------------------

/** Input to {@link signRecheck}: the fresh v2 data (from a re-run of the safety
 *  check) plus the two reference fields that bind the recheck to its original. */
export interface RecheckSignInput {
  /** Fresh v2 attestation data produced by re-running the safety check now. */
  v2Data: AttestationDataV2;
  /** UID of the original v2 attestation being re-verified. */
  originalUid: string;
  /** requestHash from the original check (binds the same trade). */
  originalRequestHash: `0x${string}`;
}

/**
 * Sign a recheck attestation. The 26 v2 fields come verbatim from `v2Data`
 * (already built by the re-run, so checkedAt / validUntil / verdict reflect the
 * CURRENT state), and the two reference fields are appended. Returns null when
 * no attester key is configured (feature disabled) — never throws on signing
 * failure, mirroring v2's contract.
 */
export async function signRecheck(input: RecheckSignInput): Promise<OracleSafetyRecheck | null> {
  const account = await getAttesterAccount();
  if (!account) return null;

  try {
    const { hashTypedData } = await import('viem');

    const message: AttestationDataRecheck = {
      ...input.v2Data,
      originalUid: input.originalUid,
      originalRequestHash: input.originalRequestHash,
    };

    const args = recheckTypedDataArgs(message);
    const signature = await account.signTypedData(args);
    const uid = hashTypedData(args);

    return {
      uid,
      schemaVersion: V2_SCHEMA_VERSION,
      type: RECHECK_TYPE,
      attester: account.address,
      attesterLabel: V2_ATTESTER_LABEL,
      signedAt: new Date().toISOString(),
      validForSeconds: V2_VALID_FOR_SECONDS,
      validUntil: Number(message.validUntil),
      signature,
      verifyUrl: getVerifyUrl(),
      data: message,
      eip712: {
        domain: RECHECK_DOMAIN,
        types: RECHECK_TYPES,
        primaryType: RECHECK_PRIMARY_TYPE,
        canonicalRequestDomain: CANONICAL_REQUEST_DOMAIN,
        canonicalRequestTypes: CANONICAL_REQUEST_TYPES,
        canonicalRequestPrimaryType: CANONICAL_REQUEST_PRIMARY_TYPE,
      },
    };
  } catch (error) {
    logger.warn('Failed to sign recheck attestation', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Verify
// ---------------------------------------------------------------------------

export interface VerificationResultRecheck {
  valid: boolean;
  attester: string;
  uid: string | null;
  checkedAt: number | null;
  validUntil: number | null;
  expired: boolean;
  reason?: string;
}

/**
 * Verify a recheck attestation: recompute the UID from the 28-field type layout
 * (NOT the 26-field v2 layout — that would ignore the reference fields and
 * always mismatch), recover the signature against the recheck domain/types, and
 * check the validity window. Returns a structured result; never throws.
 */
export async function verifyRecheck(
  attestation: OracleSafetyRecheck
): Promise<VerificationResultRecheck> {
  try {
    const { verifyTypedData, hashTypedData } = await import('viem');
    const message = attestation.data;
    const args = recheckTypedDataArgs(message);

    const expectedUid = hashTypedData(args);
    if (expectedUid !== attestation.uid) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: attestation.uid,
        checkedAt: Number(message.checkedAt) || null,
        validUntil: Number(message.validUntil) || null,
        expired: false,
        reason: 'uid_mismatch: data was modified after signing',
      };
    }

    const valid = await verifyTypedData({
      ...args,
      address: attestation.attester as `0x${string}`,
      signature: attestation.signature as `0x${string}`,
    });

    if (!valid) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: attestation.uid,
        checkedAt: Number(message.checkedAt) || null,
        validUntil: Number(message.validUntil) || null,
        expired: false,
        reason: 'signature_invalid',
      };
    }

    const now = Math.floor(Date.now() / 1000);
    const validUntil = Number(message.validUntil);
    const expired = now > validUntil;

    return {
      valid: !expired,
      attester: attestation.attester,
      uid: attestation.uid,
      checkedAt: Number(message.checkedAt) || null,
      validUntil,
      expired,
      reason: expired ? 'expired' : undefined,
    };
  } catch (error) {
    return {
      valid: false,
      attester: attestation.attester ?? '',
      uid: attestation.uid ?? null,
      checkedAt: null,
      validUntil: null,
      expired: false,
      reason: error instanceof Error ? error.message : 'verify_failed',
    };
  }
}
