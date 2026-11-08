/**
 * @fileoverview v4 EIP-712 oracle safety attestation.
 *
 * v4 exists for exactly one reason: v1–v3 can prove a price/verdict held at a
 * time, but none of them can say WHAT the evaluated symbol actually is. An
 * attestation that books WBTC as an independent asset carries no field naming
 * the BTC it is a claim on, so a holder cannot see the custodian leg in the
 * signed bytes — the exact gap this version closes.
 *
 * Contract shape:
 *   - 31 signed fields = v3's 27 (same names, types, order) + 4 appended
 *     scalar fields describing the SOURCE asset's proxy relationship.
 *   - New fields: `sourceAssetProxyStatus` (string),
 *     `sourceAssetProxyRelation` (string), `sourceAssetUnderlyingId` (string),
 *     `sourceAssetProxyNominalRatioBps` (uint256).
 *   - All four participate in the EIP-712 typehash and therefore in both the
 *     UID and the signature. Writing them into the response without signing
 *     them would not be a schema version — it would be metadata.
 *
 * Missing-data policy: v4 NEVER fails open. When no reviewed proxy record
 * exists, the four fields are signed as an explicit `UNKNOWN` (empty relation /
 * underlying, ratio 0), and the verifier surfaces it. `nominalRatioBps` 0 is not
 * a 1:1 claim; only `ASSESSED` with 10000 says that. Rejecting issuance instead
 * was considered and rejected: it would make every unlisted ERC-20 (most of the
 * market) un-attestable, a breaking regression, while an UNKNOWN inside the
 * signed bytes is strictly stronger evidence than an unsigned gap. See
 * {@link ./assetProxyRelation}.
 *
 * Routing: schemaVersion 4 + primaryType 'OracleSafetyCheck' → v4 domain/types.
 * The numeric version is the router; field presence is never inspected. v1/v2/v3
 * are untouched and keep verifying, so historical receipts are unaffected.
 *
 * Versioning note (same discipline as v3): the v3 field prefix is preserved by
 * appending, but the prefix is a diffing convenience — what prevents a v3
 * receipt being read as v4 is the domain `version: '4'`, not the prefix.
 */

import { createLogger } from '@/lib/utils/logger';
import { nowInSeconds } from '@/lib/utils/time';

import {
  type AssetProxyRelationData,
  type AssetProxyRelationKind,
  type AssetProxyStatus,
  isAssetProxyDataConsistent,
  resolveAssetProxyRelation,
} from './assetProxyRelation';
import { getAttesterAccount, getSampleAttesterAccount } from './attesterAccount';
import {
  CANONICAL_REQUEST_DOMAIN,
  CANONICAL_REQUEST_PRIMARY_TYPE,
  CANONICAL_REQUEST_TYPES,
} from './canonicalRequestHash';
import {
  type AttestationDataV3,
  V3_ATTESTER_LABEL,
  V3_TYPES,
  V3_VALID_FOR_SECONDS,
  buildMessageV3,
  v3TypedDataArgs,
} from './oracleSafetyAttestationV3';

import type { AttestationInputV2 } from './oracleSafetyAttestationV2';

const logger = createLogger('OracleSafetyAttestationV4');

export const V4_SCHEMA_VERSION = 4;

/** Same validity policy as v3; the proxy fields are constants for a given
 *  source asset, so determinism is unchanged. */
export const V4_VALID_FOR_SECONDS = V3_VALID_FOR_SECONDS;
export const V4_ATTESTER_LABEL = V3_ATTESTER_LABEL;

// ---------------------------------------------------------------------------
// EIP-712 domain + types (v4)
// ---------------------------------------------------------------------------

/** Domain chainId=1 is a separator only — real chain is subjectChainId. */
export const V4_DOMAIN = {
  name: 'Insight Oracle Safety',
  version: '4',
  chainId: 1,
} as const;

export const V4_PRIMARY_TYPE = 'OracleSafetyCheck';

/** The four fields v4 adds. Appended so the v3 prefix stays byte-identical. */
const V4_ADDED_FIELDS = [
  { name: 'sourceAssetProxyStatus', type: 'string' },
  { name: 'sourceAssetProxyRelation', type: 'string' },
  { name: 'sourceAssetUnderlyingId', type: 'string' },
  { name: 'sourceAssetProxyNominalRatioBps', type: 'uint256' },
] as const;

/** The 31 signed fields = v3's 27 + the four proxy fields. */
export const V4_TYPES = {
  OracleSafetyCheck: [...V3_TYPES.OracleSafetyCheck, ...V4_ADDED_FIELDS],
} as const;

// ---------------------------------------------------------------------------
// Signed message shape
// ---------------------------------------------------------------------------
//

export interface AttestationDataV4 extends AttestationDataV3 {
  sourceAssetProxyStatus: AssetProxyStatus;
  sourceAssetProxyRelation: AssetProxyRelationKind | '';
  sourceAssetUnderlyingId: string;
  sourceAssetProxyNominalRatioBps: number;
}

/** Raw inputs = v2/v3's inputs plus the raw symbol. The symbol is only a
 *  fallback for an ERC-20 id whose address is not in the proxy registry; it is
 *  never used for `unresolved:` markers (those stay UNKNOWN). */
export interface AttestationInputV4 extends AttestationInputV2 {
  /** Symbol the caller asked about (pre-CAIP-19). Optional. */
  sourceAssetSymbol?: string;
}

// ---------------------------------------------------------------------------
// Message construction
// ---------------------------------------------------------------------------

/** Build the v4 message from the same evidence as v3. Everything except
 *  `schemaVersion` and the four proxy fields comes from v3's builder, so v4
 *  cannot disagree with the evidence v3 already commits to. */
export async function buildMessageV4(
  input: AttestationInputV4,
  opts?: { validForSeconds?: 600 | 900 | 1800 }
): Promise<AttestationDataV4> {
  const v3Message = await buildMessageV3(input, opts);
  const proxy = resolveAssetProxyRelation(v3Message.sourceAssetId, input.sourceAssetSymbol);
  return {
    ...v3Message,
    sourceAssetProxyStatus: proxy.status,
    sourceAssetProxyRelation: proxy.relation,
    sourceAssetUnderlyingId: proxy.underlyingAssetId,
    sourceAssetProxyNominalRatioBps: proxy.nominalRatioBps,
    schemaVersion: V4_SCHEMA_VERSION,
  };
}

/** EIP-712 typed-data args (domain + types + message) — shared by sign/verify. */
export function v4TypedDataArgs(message: AttestationDataV4) {
  const v3Args = v3TypedDataArgs(message);
  return {
    domain: V4_DOMAIN,
    types: V4_TYPES,
    primaryType: V4_PRIMARY_TYPE,
    message: {
      ...v3Args.message,
      sourceAssetProxyStatus: message.sourceAssetProxyStatus,
      sourceAssetProxyRelation: message.sourceAssetProxyRelation,
      sourceAssetUnderlyingId: message.sourceAssetUnderlyingId,
      sourceAssetProxyNominalRatioBps: BigInt(message.sourceAssetProxyNominalRatioBps),
    },
  } as const;
}

// ---------------------------------------------------------------------------
// Public envelope
// ---------------------------------------------------------------------------

export interface OracleSafetyAttestationV4 {
  uid: string;
  schemaVersion: 4;
  attester: string;
  attesterLabel: string;
  signedAt: string;
  validForSeconds: number;
  validUntil: number;
  signature: string;
  verifyUrl: string;
  data: AttestationDataV4;
  eip712: {
    domain: typeof V4_DOMAIN;
    types: typeof V4_TYPES;
    primaryType: typeof V4_PRIMARY_TYPE;
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

export async function signAttestationV4(
  input: AttestationInputV4,
  opts?: { sample?: boolean; validForSeconds?: 600 | 900 | 1800 }
): Promise<OracleSafetyAttestationV4 | null> {
  const account = opts?.sample ? await getSampleAttesterAccount() : await getAttesterAccount();
  if (!account) return null;

  try {
    const { hashTypedData } = await import('viem');
    if (opts?.sample && (opts.validForSeconds ?? V4_VALID_FOR_SECONDS) !== 600) {
      throw new Error('Sample attestations cannot use the WAK validity exception');
    }
    const message = await buildMessageV4(input, opts);
    const args = v4TypedDataArgs(message);

    const signature = await account.signTypedData(args);
    const uid = hashTypedData(args);

    return {
      uid,
      schemaVersion: V4_SCHEMA_VERSION,
      attester: account.address,
      attesterLabel: V4_ATTESTER_LABEL,
      signedAt: new Date().toISOString(),
      validForSeconds: message.validUntil - message.checkedAt,
      validUntil: Number(message.validUntil),
      signature,
      verifyUrl: getVerifyUrl(),
      data: message,
      eip712: {
        domain: V4_DOMAIN,
        types: V4_TYPES,
        primaryType: V4_PRIMARY_TYPE,
        canonicalRequestDomain: CANONICAL_REQUEST_DOMAIN,
        canonicalRequestTypes: CANONICAL_REQUEST_TYPES,
        canonicalRequestPrimaryType: CANONICAL_REQUEST_PRIMARY_TYPE,
      },
    };
  } catch (error) {
    logger.warn('Failed to sign v4 attestation', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Verify
// ---------------------------------------------------------------------------

export interface VerificationResultV4 {
  valid: boolean;
  attester: string;
  uid: string | null;
  checkedAt: number | null;
  validUntil: number | null;
  expired: boolean;
  assetProxy: AssetProxyRelationData;
  reason?: string;
}

function proxyOf(message: AttestationDataV4): AssetProxyRelationData {
  return {
    status: message.sourceAssetProxyStatus,
    relation: message.sourceAssetProxyRelation,
    underlyingAssetId: message.sourceAssetUnderlyingId,
    nominalRatioBps: message.sourceAssetProxyNominalRatioBps,
  };
}

export async function verifyAttestationV4(
  attestation: OracleSafetyAttestationV4
): Promise<VerificationResultV4> {
  const message = attestation.data;
  const assetProxy = proxyOf(message);

  try {
    const { verifyTypedData, hashTypedData } = await import('viem');
    const args = v4TypedDataArgs(message);

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

    // Signature proves the bytes were not touched; it does NOT prove the bytes
    // are semantically coherent. A signed record that says ASSESSED but ships
    // an empty underlying id is malformed, and must not verify as valid.
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
