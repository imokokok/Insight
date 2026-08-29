/**
 * @fileoverview v3 re-check attestation — `OracleSafetyRecheck` at schema v3.
 *
 * The v2 recheck ({@link ./oracleSafetyRecheck}) extends the 26 v2 fields. v3
 * extends the 27 v3 fields, so a v3 check has a v3 recheck. Everything about
 * the contract is unchanged: a recheck is a FRESH re-run of the pre-trade
 * safety check, signed as a distinct EIP-712 type that binds `originalUid` and
 * `originalRequestHash` so a verifier can confirm "this recheck is a freshness
 * re-verification of THAT original trade".
 *
 * Two differences from the v2 recheck, both deliberate:
 *   - the base is v3's 27 fields (so the independence threshold travels into
 *     the recheck as well, not just the check);
 *   - `originalUid` is typed `bytes32` instead of `string`. A UID is a 32-byte
 *     hash, so `bytes32` is its honest type; as `string` the EIP-712 encoding
 *     committed to keccak256(ascii) instead of the value itself. Unifying this
 *     was already on the pre-registration checklist, and doing it inside the
 *     same schema bump avoids a second breaking change later.
 *
 * Schema shape: 27 v3 fields + 2 reference fields = 29 signed fields, appended
 * (not inserted) so the v3 prefix stays byte-identical.
 *
 * Routing: the recheck carries `schemaVersion: 3` and
 * `eip712.primaryType: 'OracleSafetyRecheck'`. The verify endpoint routes on
 * both, so a v3 recheck is verified against the 29-field type and never
 * against the 27-field `OracleSafetyCheck` type.
 */

import { createLogger } from '@/lib/utils/logger';
import { nowInSeconds } from '@/lib/utils/time';

import { getAttesterAccount } from './attesterAccount';
import {
  CANONICAL_REQUEST_DOMAIN,
  CANONICAL_REQUEST_PRIMARY_TYPE,
  CANONICAL_REQUEST_TYPES,
} from './canonicalRequestHash';
import {
  type AttestationDataV3,
  V3_ATTESTER_LABEL,
  V3_DOMAIN,
  V3_SCHEMA_VERSION,
  V3_TYPES,
  V3_VALID_FOR_SECONDS,
  v3TypedDataArgs,
} from './oracleSafetyAttestationV3';

const logger = createLogger('OracleSafetyRecheckV3');

// ---------------------------------------------------------------------------
// EIP-712 domain + types (recheck = v3 + 2 reference fields)
// ---------------------------------------------------------------------------

/** Same separator as v3 (domain name + version '3' + chainId 1). */
export const RECHECK_V3_DOMAIN = V3_DOMAIN;

export const RECHECK_V3_PRIMARY_TYPE = 'OracleSafetyRecheck';

/** The 29 signed fields = v3's 27 + `originalUid` (bytes32) +
 *  `originalRequestHash` (bytes32). Appended, so the v3 prefix is unchanged. */
export const RECHECK_V3_TYPES = {
  OracleSafetyRecheck: [
    ...V3_TYPES.OracleSafetyCheck,
    { name: 'originalUid', type: 'bytes32' },
    { name: 'originalRequestHash', type: 'bytes32' },
  ],
} as const;

// ---------------------------------------------------------------------------
// Signed message shape
// ---------------------------------------------------------------------------

export interface AttestationDataRecheckV3 extends AttestationDataV3 {
  /** UID (bytes32) of the original attestation this recheck re-verifies. */
  originalUid: `0x${string}`;
  /** requestHash of the original check — binds "same trade". */
  originalRequestHash: `0x${string}`;
}

/** EIP-712 typed-data args. Reuses {@link v3TypedDataArgs} to widen the 27 v3
 *  number-fields to their bigint twin, then appends the two reference fields
 *  (already hex — no widening needed). One source of truth for the widening. */
export function recheckV3TypedDataArgs(message: AttestationDataRecheckV3) {
  const v3Args = v3TypedDataArgs(message);
  return {
    domain: RECHECK_V3_DOMAIN,
    types: RECHECK_V3_TYPES,
    primaryType: RECHECK_V3_PRIMARY_TYPE,
    message: {
      ...v3Args.message,
      originalUid: message.originalUid,
      originalRequestHash: message.originalRequestHash,
    },
  } as const;
}

// ---------------------------------------------------------------------------
// Public envelope
// ---------------------------------------------------------------------------

export const RECHECK_V3_TYPE = 'OracleSafetyRecheck' as const;

export interface OracleSafetyRecheckV3 {
  uid: string;
  /** v3-family schema version. */
  schemaVersion: 3;
  /** Discriminator: distinguishes a recheck from a plain v3 attestation. */
  type: typeof RECHECK_V3_TYPE;
  attester: string;
  attesterLabel: string;
  signedAt: string;
  validForSeconds: number;
  validUntil: number;
  signature: string;
  verifyUrl: string;
  data: AttestationDataRecheckV3;
  eip712: {
    domain: typeof RECHECK_V3_DOMAIN;
    types: typeof RECHECK_V3_TYPES;
    primaryType: typeof RECHECK_V3_PRIMARY_TYPE;
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

export interface RecheckV3SignInput {
  /** Fresh v3 attestation data produced by re-running the safety check now. */
  v3Data: AttestationDataV3;
  /** UID of the original attestation being re-verified. */
  originalUid: `0x${string}`;
  /** requestHash from the original check (binds the same trade). */
  originalRequestHash: `0x${string}`;
}

/** Sign a v3 recheck attestation. Returns null when no attester key is
 *  configured — mirrors v2/v3's "never throw on signing failure" contract. */
export async function signRecheckV3(
  input: RecheckV3SignInput
): Promise<OracleSafetyRecheckV3 | null> {
  const account = await getAttesterAccount();
  if (!account) return null;

  try {
    const { hashTypedData } = await import('viem');

    const message: AttestationDataRecheckV3 = {
      ...input.v3Data,
      originalUid: input.originalUid,
      originalRequestHash: input.originalRequestHash,
    };

    const args = recheckV3TypedDataArgs(message);
    const signature = await account.signTypedData(args);
    const uid = hashTypedData(args);

    return {
      uid,
      schemaVersion: V3_SCHEMA_VERSION,
      type: RECHECK_V3_TYPE,
      attester: account.address,
      attesterLabel: V3_ATTESTER_LABEL,
      signedAt: new Date().toISOString(),
      validForSeconds: V3_VALID_FOR_SECONDS,
      validUntil: Number(message.validUntil),
      signature,
      verifyUrl: getVerifyUrl(),
      data: message,
      eip712: {
        domain: RECHECK_V3_DOMAIN,
        types: RECHECK_V3_TYPES,
        primaryType: RECHECK_V3_PRIMARY_TYPE,
        canonicalRequestDomain: CANONICAL_REQUEST_DOMAIN,
        canonicalRequestTypes: CANONICAL_REQUEST_TYPES,
        canonicalRequestPrimaryType: CANONICAL_REQUEST_PRIMARY_TYPE,
      },
    };
  } catch (error) {
    logger.warn('Failed to sign v3 recheck attestation', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Verify
// ---------------------------------------------------------------------------

export interface VerificationResultRecheckV3 {
  valid: boolean;
  attester: string;
  uid: string | null;
  checkedAt: number | null;
  validUntil: number | null;
  expired: boolean;
  reason?: string;
}

/** Verify a v3 recheck: recompute the UID from the 29-field type layout,
 *  recover the signature, enforce the same-trade binding invariant, and check
 *  the validity window. Returns a structured result; never throws. */
export async function verifyRecheckV3(
  attestation: OracleSafetyRecheckV3
): Promise<VerificationResultRecheckV3> {
  try {
    const { verifyTypedData, hashTypedData } = await import('viem');
    const message = attestation.data;
    const args = recheckV3TypedDataArgs(message);

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

    // Same-trade binding invariant: a recheck's own requestHash (one of the 27
    // v3 fields) MUST equal the originalRequestHash it claims to bind. The
    // signature check proves the attestation is genuine, NOT that it honors
    // same-trade continuity.
    if (message.requestHash !== message.originalRequestHash) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: attestation.uid,
        checkedAt: Number(message.checkedAt) || null,
        validUntil: Number(message.validUntil) || null,
        expired: false,
        reason: 'recheck_binding_mismatch: requestHash must equal originalRequestHash',
      };
    }

    const now = nowInSeconds();
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
