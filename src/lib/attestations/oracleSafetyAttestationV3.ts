/**
 * @fileoverview v3 EIP-712 oracle safety attestation.
 *
 * v3 exists for exactly one reason: v2 signs `sourceGroupCount` (the measured
 * number of distinct non-derived oracle operator groups) WITHOUT signing the
 * threshold it is compared against. A holder of a v2 attestation can see
 * `sourceGroupCount: 2` but cannot know, from the bytes alone, whether 2 is a
 * pass or a fail — the requirement (`V2_REQUIRED_NON_DERIVED_GROUPS`) lives in
 * this codebase, not in the signed struct. That makes the independence gate
 * unverifiable by a third party, unlike the quorum gate, whose two operands
 * (`participantCount` / `requiredParticipantCount`) are both signed.
 *
 * VERITAS raised this on 2026-08-29 while verifying a real VRT1-anchored
 * record. The general rule their review produced: any constant that governs
 * how a receipt must be read belongs INSIDE the signed bytes, not in the
 * envelope and not in the issuer's source code. Otherwise a consumer needs the
 * issuer's source to interpret a document the issuer signed.
 *
 * v3 therefore adds ONE field, `requiredSourceGroupCount` (uint256), and
 * changes nothing else. v1 (11 fields) and v2 (26 fields) are left completely
 * untouched and remain verifiable — v3 is additive, not a migration.
 *
 * Field order: the new field is APPENDED. Keep two claims separate here.
 * (1) Appending preserves v2's field-NAME/TYPE prefix and 25 of the 26 values
 *     byte-for-byte. The 26th, `schemaVersion`, moves from 2 to 3 by
 *     construction. So the prefix is a diffing convenience, NOT a v2 struct: a
 *     consumer that parsed the first 26 fields of a v3 attestation as v2 would
 *     read the correct layout with one field announcing schemaVersion 3.
 * (2) What actually prevents that misparse is not the prefix at all. It is the
 *     EIP-712 domain version ('3') and, on the VRT1 side, the params key
 *     `oracle_safety_check_v3`, which sits inside the canonical bytes. A
 *     consumer looking for the v2 key does not find it and stops.
 * Any fixed position is equally valid for the typehash; appending is chosen
 * because it keeps the diff minimal.
 *
 * Determinism: identical to v2 (the extra field is a constant for a given
 * schema version), so a fixed input still yields one reproducible UID.
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
  type AttestationDataV2,
  type AttestationInputV2,
  V2_ATTESTER_LABEL,
  V2_REQUIRED_NON_DERIVED_GROUPS,
  V2_TYPES,
  V2_VALID_FOR_SECONDS,
  buildMessage,
  toBigIntMessageV2,
} from './oracleSafetyAttestationV2';

const logger = createLogger('OracleSafetyAttestationV3');

export const V3_SCHEMA_VERSION = 3;
/** How long a v3 attestation is considered meaningful (unchanged from v2). */
export const V3_VALID_FOR_SECONDS = V2_VALID_FOR_SECONDS;

/**
 * Independence floor: fewer distinct NON-DERIVED operator groups than this →
 * INSUFFICIENT_INDEPENDENCE. Derived sources (TWAP) do not count.
 *
 * Sourced from v2's constant so the two can never drift: this is the SAME gate
 * with the SAME threshold. v3 only makes the threshold visible to whoever holds
 * the attestation; it does not change the decision.
 */
export const V3_REQUIRED_SOURCE_GROUP_COUNT = V2_REQUIRED_NON_DERIVED_GROUPS;

/** Attester label (human-readable) carried in the JSON envelope, not signed. */
export const V3_ATTESTER_LABEL = V2_ATTESTER_LABEL;

// ---------------------------------------------------------------------------
// EIP-712 domain + types (v3)
// ---------------------------------------------------------------------------

/** Domain chainId=1 is a separator only — real chain is subjectChainId. */
export const V3_DOMAIN = {
  name: 'Insight Oracle Safety',
  version: '3',
  chainId: 1,
} as const;

export const V3_PRIMARY_TYPE = 'OracleSafetyCheck';

/** The one field v3 adds: the independence threshold, signed alongside the
 *  count it is compared against. */
const V3_ADDED_FIELDS = [{ name: 'requiredSourceGroupCount', type: 'uint256' }] as const;

/** The 27 signed fields = v2's 26 (same names, types and order) + the
 *  independence threshold appended. Note that "same fields" is a statement
 *  about the schema, not about the values: `schemaVersion` is 3 here, not 2.
 *  Field order is fixed — changing it changes every UID and is a schema-version
 *  bump. */
export const V3_TYPES = {
  OracleSafetyCheck: [...V2_TYPES.OracleSafetyCheck, ...V3_ADDED_FIELDS],
} as const;

// ---------------------------------------------------------------------------
// Signed message shape
// ---------------------------------------------------------------------------

/** The 27 signed fields as JSON-serializable numbers / hex strings. Same
 *  number-vs-bigint rationale as v2 (JSON cannot serialize bigint; the verify
 *  endpoint receives numbers off the wire). */
export interface AttestationDataV3 extends AttestationDataV2 {
  /** The independence threshold `sourceGroupCount` was compared against. */
  requiredSourceGroupCount: number;
}

// ---------------------------------------------------------------------------
// Message construction
// ---------------------------------------------------------------------------

/** Build the v3 message from the same raw inputs as v2. Everything except
 *  `schemaVersion` and the new threshold comes from v2's {@link buildMessage},
 *  so the two versions cannot disagree about the evidence they commit to. */
export async function buildMessageV3(input: AttestationInputV2): Promise<AttestationDataV3> {
  const v2Message = await buildMessage(input);
  return {
    ...v2Message,
    requiredSourceGroupCount: V3_REQUIRED_SOURCE_GROUP_COUNT,
    schemaVersion: V3_SCHEMA_VERSION,
  };
}

/** EIP-712 typed-data args (domain + types + message) — shared by sign/verify. */
export function v3TypedDataArgs(message: AttestationDataV3) {
  return {
    domain: V3_DOMAIN,
    types: V3_TYPES,
    primaryType: V3_PRIMARY_TYPE,
    message: {
      ...toBigIntMessageV2(message),
      requiredSourceGroupCount: BigInt(message.requiredSourceGroupCount),
    },
  } as const;
}

// ---------------------------------------------------------------------------
// Public envelope
// ---------------------------------------------------------------------------

export interface OracleSafetyAttestationV3 {
  uid: string;
  schemaVersion: 3;
  attester: string;
  attesterLabel: string;
  signedAt: string;
  validForSeconds: number;
  validUntil: number;
  signature: string;
  verifyUrl: string;
  data: AttestationDataV3;
  eip712: {
    domain: typeof V3_DOMAIN;
    types: typeof V3_TYPES;
    primaryType: typeof V3_PRIMARY_TYPE;
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

export async function signAttestationV3(
  input: AttestationInputV2
): Promise<OracleSafetyAttestationV3 | null> {
  const account = await getAttesterAccount();
  if (!account) return null;

  try {
    const { hashTypedData } = await import('viem');
    const message = await buildMessageV3(input);
    const args = v3TypedDataArgs(message);

    const signature = await account.signTypedData(args);
    const uid = hashTypedData(args);

    return {
      uid,
      schemaVersion: V3_SCHEMA_VERSION,
      attester: account.address,
      attesterLabel: V3_ATTESTER_LABEL,
      signedAt: new Date().toISOString(),
      validForSeconds: V3_VALID_FOR_SECONDS,
      validUntil: Number(message.validUntil),
      signature,
      verifyUrl: getVerifyUrl(),
      data: message,
      eip712: {
        domain: V3_DOMAIN,
        types: V3_TYPES,
        primaryType: V3_PRIMARY_TYPE,
        canonicalRequestDomain: CANONICAL_REQUEST_DOMAIN,
        canonicalRequestTypes: CANONICAL_REQUEST_TYPES,
        canonicalRequestPrimaryType: CANONICAL_REQUEST_PRIMARY_TYPE,
      },
    };
  } catch (error) {
    logger.warn('Failed to sign v3 attestation', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Verify
// ---------------------------------------------------------------------------

export interface VerificationResultV3 {
  valid: boolean;
  attester: string;
  uid: string | null;
  checkedAt: number | null;
  validUntil: number | null;
  expired: boolean;
  reason?: string;
}

export async function verifyAttestationV3(
  attestation: OracleSafetyAttestationV3
): Promise<VerificationResultV3> {
  try {
    const { verifyTypedData, hashTypedData } = await import('viem');
    const message = attestation.data;
    const args = v3TypedDataArgs(message);

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
