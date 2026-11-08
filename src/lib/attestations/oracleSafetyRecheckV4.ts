/**
 * @fileoverview v4 re-check attestation — `OracleSafetyRecheck` at schema v4.
 *
 * A recheck is a fresh re-run of the pre-trade safety check, signed as a
 * distinct EIP-712 type that binds `originalUid` and `originalRequestHash` so a
 * verifier can confirm "this recheck re-verifies THAT trade". The v4 recheck
 * extends the 31 v4 fields (so the asset-proxy relationship travels into the
 * recheck, not just the check) with the same two `bytes32` reference fields the
 * v3 recheck uses.
 *
 * Schema shape: 31 v4 fields + 2 reference fields = 33 signed fields, appended
 * so the v4 field-name prefix is preserved (diffing convenience only). What
 * prevents a v3 recheck being read as a v4 recheck is the domain version ('4'),
 * not the prefix.
 *
 * Routing: schemaVersion 4 + primaryType 'OracleSafetyRecheck', which the verify
 * router checks BEFORE the plain-v4 branch.
 */

import { createLogger } from '@/lib/utils/logger';
import { nowInSeconds } from '@/lib/utils/time';

import { type AssetProxyRelationData, isAssetProxyDataConsistent } from './assetProxyRelation';
import { getAttesterAccount } from './attesterAccount';
import {
  CANONICAL_REQUEST_DOMAIN,
  CANONICAL_REQUEST_PRIMARY_TYPE,
  CANONICAL_REQUEST_TYPES,
} from './canonicalRequestHash';
import {
  type AttestationDataV4,
  V4_ATTESTER_LABEL,
  V4_DOMAIN,
  V4_SCHEMA_VERSION,
  V4_TYPES,
  V4_VALID_FOR_SECONDS,
  v4TypedDataArgs,
} from './oracleSafetyAttestationV4';

const logger = createLogger('OracleSafetyRecheckV4');

// ---------------------------------------------------------------------------
// EIP-712 domain + types (recheck = v4 + 2 reference fields)
// ---------------------------------------------------------------------------

/** Same separator as v4 (domain name + version '4' + chainId 1). */
export const RECHECK_V4_DOMAIN = V4_DOMAIN;

export const RECHECK_V4_PRIMARY_TYPE = 'OracleSafetyRecheck';

/** The 33 signed fields = v4's 31 + two `bytes32` reference fields. */
export const RECHECK_V4_TYPES = {
  OracleSafetyRecheck: [
    ...V4_TYPES.OracleSafetyCheck,
    { name: 'originalUid', type: 'bytes32' },
    { name: 'originalRequestHash', type: 'bytes32' },
  ],
} as const;

// ---------------------------------------------------------------------------
// Signed message shape
// ---------------------------------------------------------------------------

export interface AttestationDataRecheckV4 extends AttestationDataV4 {
  originalUid: `0x${string}`;
  originalRequestHash: `0x${string}`;
}

/** EIP-712 typed-data args. Reuses {@link v4TypedDataArgs} so the 31-field
 *  widening has one source of truth, then appends the two hex reference fields. */
export function recheckV4TypedDataArgs(message: AttestationDataRecheckV4) {
  const v4Args = v4TypedDataArgs(message);
  return {
    domain: RECHECK_V4_DOMAIN,
    types: RECHECK_V4_TYPES,
    primaryType: RECHECK_V4_PRIMARY_TYPE,
    message: {
      ...v4Args.message,
      originalUid: message.originalUid,
      originalRequestHash: message.originalRequestHash,
    },
  } as const;
}

// ---------------------------------------------------------------------------
// Public envelope
// ---------------------------------------------------------------------------

export const RECHECK_V4_TYPE = 'OracleSafetyRecheck' as const;

export interface OracleSafetyRecheckV4 {
  uid: string;
  schemaVersion: 4;
  type: typeof RECHECK_V4_TYPE;
  attester: string;
  attesterLabel: string;
  signedAt: string;
  validForSeconds: number;
  validUntil: number;
  signature: string;
  verifyUrl: string;
  data: AttestationDataRecheckV4;
  eip712: {
    domain: typeof RECHECK_V4_DOMAIN;
    types: typeof RECHECK_V4_TYPES;
    primaryType: typeof RECHECK_V4_PRIMARY_TYPE;
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

export interface RecheckV4SignInput {
  /** Fresh v4 attestation data produced by re-running the safety check now. */
  v4Data: AttestationDataV4;
  /** UID of the original attestation being re-verified. */
  originalUid: `0x${string}`;
  /** requestHash from the original check (binds the same trade). */
  originalRequestHash: `0x${string}`;
}

export async function signRecheckV4(
  input: RecheckV4SignInput
): Promise<OracleSafetyRecheckV4 | null> {
  const account = await getAttesterAccount();
  if (!account) return null;

  try {
    const { hashTypedData } = await import('viem');

    const message: AttestationDataRecheckV4 = {
      ...input.v4Data,
      originalUid: input.originalUid,
      originalRequestHash: input.originalRequestHash,
    };

    const args = recheckV4TypedDataArgs(message);
    const signature = await account.signTypedData(args);
    const uid = hashTypedData(args);

    return {
      uid,
      schemaVersion: V4_SCHEMA_VERSION,
      type: RECHECK_V4_TYPE,
      attester: account.address,
      attesterLabel: V4_ATTESTER_LABEL,
      signedAt: new Date().toISOString(),
      validForSeconds: V4_VALID_FOR_SECONDS,
      validUntil: Number(message.validUntil),
      signature,
      verifyUrl: getVerifyUrl(),
      data: message,
      eip712: {
        domain: RECHECK_V4_DOMAIN,
        types: RECHECK_V4_TYPES,
        primaryType: RECHECK_V4_PRIMARY_TYPE,
        canonicalRequestDomain: CANONICAL_REQUEST_DOMAIN,
        canonicalRequestTypes: CANONICAL_REQUEST_TYPES,
        canonicalRequestPrimaryType: CANONICAL_REQUEST_PRIMARY_TYPE,
      },
    };
  } catch (error) {
    logger.warn('Failed to sign v4 recheck attestation', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Verify
// ---------------------------------------------------------------------------

export interface VerificationResultRecheckV4 {
  valid: boolean;
  attester: string;
  uid: string | null;
  checkedAt: number | null;
  validUntil: number | null;
  expired: boolean;
  assetProxy: AssetProxyRelationData;
  reason?: string;
}

export async function verifyRecheckV4(
  attestation: OracleSafetyRecheckV4
): Promise<VerificationResultRecheckV4> {
  const message = attestation.data;
  const assetProxy: AssetProxyRelationData = {
    status: message.sourceAssetProxyStatus,
    relation: message.sourceAssetProxyRelation,
    underlyingAssetId: message.sourceAssetUnderlyingId,
    nominalRatioBps: message.sourceAssetProxyNominalRatioBps,
  };

  try {
    const { verifyTypedData, hashTypedData } = await import('viem');
    const args = recheckV4TypedDataArgs(message);

    const expectedUid = hashTypedData(args);
    if (expectedUid !== attestation.uid) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: attestation.uid,
        checkedAt: Number(message.checkedAt) || null,
        validUntil: Number(message.validUntil) || null,
        expired: false,
        assetProxy,
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
        assetProxy,
        reason: 'signature_invalid',
      };
    }

    if (!isAssetProxyDataConsistent(assetProxy)) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: attestation.uid,
        checkedAt: Number(message.checkedAt) || null,
        validUntil: Number(message.validUntil) || null,
        expired: false,
        assetProxy,
        reason: 'asset_proxy_inconsistent: signed proxy fields contradict their status',
      };
    }

    // Same-trade binding invariant, unchanged from the v3 recheck: the recheck's
    // own requestHash must equal the original it claims to re-verify.
    if (message.requestHash !== message.originalRequestHash) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: attestation.uid,
        checkedAt: Number(message.checkedAt) || null,
        validUntil: Number(message.validUntil) || null,
        expired: false,
        assetProxy,
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
      assetProxy,
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
      assetProxy,
      reason: error instanceof Error ? error.message : 'verify_failed',
    };
  }
}
