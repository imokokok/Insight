/**
 * Public registry status / transition artifact (RFC 8615 `.well-known`).
 *
 * Publishes ONE explicit state for the OracleSafetyCheck registry head and
 * cryptographically binds it to the two registry raw-byte hashes, signed by
 * the currently registered attestation key. Created for the Frontier Compute
 * ZAP1 pilot (2026-09-03, request ref zap1-oracle-insight-registry-status-
 * 20260902) after their receiver correctly returned
 * UNKNOWN_BLOCKED / REGISTRY_HEAD_MISMATCH on a v2 sample served against a
 * v3 registry head.
 *
 * Contract (EIP-712, separate domain from every receipt family so a status
 * signature can never be replayed as an attestation):
 *   domain      { name: "Insight Oracle Registry Status", version: "1", chainId: 1 }
 *   primaryType OracleRegistryStatus
 *
 * The bound fields are exactly the nine `required_status_bindings` from the
 * requester's registry-transition-request.json: predecessor/successor registry
 * raw SHA-256, effective activation, active schema + domain version, whether
 * v2 signing continues (and any window), retiredForSigning semantics,
 * requiredSourceGroupCount semantics/units, signer-set + revocation
 * continuity, and divergence/rollback behavior.
 *
 * Byte-drift caveat (deliberately stated in the artifact itself): the registry
 * document's raw bytes change on deploys even when no schema or key changes,
 * so both sha256 values are POINT-IN-TIME bindings. The stable identity is
 * the schema contract plus the key set, not the document bytes.
 *
 * GET /.well-known/oracle-registry-status.json
 *
 * Fail-closed: no attester key, no self-fetch of the registry, or a non-200
 * registry response → 503 with `registry_status_unavailable`. A status
 * artifact that cannot be signed or cannot name the exact bytes it binds is
 * worse than none.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { getAttesterAccount } from '@/lib/attestations/attesterAccount';

/** The registry snapshot the requester had admitted when the mismatch was
 *  captured (frozen 2026-08-31; sha256 matches their admitted_registry and
 *  our own 2026-09-01 recomputation of the live body at that time). */
const PREDECESSOR_REGISTRY_SHA256 =
  '0x42be76e202a6db2058b5778677bc08145b3acdd8bd94e4909c652ee0643cc6a4';
const PREDECESSOR_REGISTRY_BYTES = 9004;
const PREDECESSOR_CAPTURED_AT_UTC = '2026-08-31';

/** When the active v3 contract first shipped (commit cab508dc). */
const V3_CONTRACT_LIVE_SINCE_UTC = '2026-08-29T03:10:49Z';

/** The requester's identifier for this transition, echoed in the signed
 *  bytes so the artifact cannot be replayed as the answer to a different
 *  request. */
const REQUEST_REF = 'zap1-oracle-insight-registry-status-20260902';

const REGISTRY_STATUS_DOMAIN = {
  name: 'Insight Oracle Registry Status',
  version: '1',
  chainId: 1,
} as const;

const REGISTRY_STATUS_PRIMARY_TYPE = 'OracleRegistryStatus';

const REGISTRY_STATUS_TYPES = {
  OracleRegistryStatus: [
    { name: 'state', type: 'string' },
    { name: 'requestRef', type: 'string' },
    { name: 'issuer', type: 'string' },
    { name: 'predecessorRegistrySha256', type: 'bytes32' },
    { name: 'successorRegistrySha256', type: 'bytes32' },
    { name: 'assertedAt', type: 'uint256' },
    { name: 'activationUtc', type: 'string' },
    { name: 'activeSchema', type: 'string' },
    { name: 'v2SigningContinues', type: 'bool' },
    { name: 'retiredForSigningSemantics', type: 'string' },
    { name: 'requiredSourceGroupCountSemantics', type: 'string' },
    { name: 'signerAndRevocationContinuity', type: 'string' },
    { name: 'divergenceRollbackBehavior', type: 'string' },
  ],
} as const;

function resolveBase(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NODE_ENV === 'production') return 'https://www.oracleinsight.xyz';
  return 'http://localhost:3000';
}

export async function GET(_request: NextRequest) {
  const base = resolveBase();
  const account = await getAttesterAccount();

  if (!account) {
    return NextResponse.json(
      {
        schema: 'oracleinsight.oracle-registry-status.v1',
        error: {
          code: 'registry_status_unavailable',
          message:
            'No attestation signer is configured on this instance, so no signed registry status can be produced. An unsigned status is not served.',
        },
      },
      { status: 503 }
    );
  }

  // Successor hash: fetch the registry EXACTLY as any client would and hash
  // the raw bytes received. Never reconstruct the document in-process — the
  // binding must be to the bytes on the wire, not to our idea of them.
  let successorSha256: string;
  let successorBytes: number;
  try {
    const res = await fetch(`${base}/.well-known/oracle-keys.json`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`registry fetch returned HTTP ${res.status}`);
    }
    const raw = await res.text();
    const { createHash } = await import('crypto');
    successorSha256 = `0x${createHash('sha256').update(raw, 'utf8').digest('hex')}`;
    successorBytes = Buffer.byteLength(raw, 'utf8');
  } catch {
    return NextResponse.json(
      {
        schema: 'oracleinsight.oracle-registry-status.v1',
        error: {
          code: 'registry_status_unavailable',
          message:
            'The live registry document could not be fetched and hashed, so its exact bytes cannot be bound. No status is served.',
        },
      },
      { status: 503 }
    );
  }

  const assertedAt = Math.floor(Date.now() / 1000);
  const activationUtc = `v3 contract live since ${V3_CONTRACT_LIVE_SINCE_UTC}; V3_ACTIVE (v3 sample end to end) effective from the first deployment of this artifact, asserted at unix ${assertedAt}`;

  const message = {
    state: 'V3_ACTIVE',
    requestRef: REQUEST_REF,
    issuer: base,
    predecessorRegistrySha256: PREDECESSOR_REGISTRY_SHA256,
    successorRegistrySha256: successorSha256,
    assertedAt,
    activationUtc,
    activeSchema:
      "OracleSafetyCheck schemaVersion 3; EIP-712 domain { name: 'Insight Oracle Safety', version: '3', chainId: 1 }; primaryType OracleSafetyCheck; 27 fields (v2's 26 plus requiredSourceGroupCount)",
    v2SigningContinues: false,
    retiredForSigningSemantics:
      'retiredForSigning=true on a registry alias means the issuer no longer signs new receipts under that layout; receipts already signed remain verifiable against the published alias. It is an issuer commitment enforced on the signing side (issue and sample paths use the active schema only), not a client-side rejection rule.',
    requiredSourceGroupCountSemantics:
      'uint256. Minimum number of DISTINCT NON-DERIVED oracle operator groups required by the independence gate, signed alongside the measured sourceGroupCount so the gate is verifiable from the receipt bytes alone. Units: count of distinct non-derived operating groups (derived sources such as TWAP do not count). Current threshold: 2. Appended as the 27th field; v2 field names, types and order are unchanged.',
    signerAndRevocationContinuity:
      "Attestation signer set unchanged since the 2026-08-26 rotation: insight-oracle-safety-v2-202609 (0x6506F789Edd43338A416f59822A63F309f97E8ce, validFrom 2026-08-26T17:35:36Z, no scheduled expiry) with the predecessor insight-oracle-safety-v2 retained in its historical validity window (validUntil 2026-09-02T17:35:36Z). The only successor-registry addition is a role:'sample' key that signs synthetic samples only and never real attestations. revoked_keys is empty; no revocations have occurred.",
    divergenceRollbackBehavior:
      'If the registry head and the served sample contract diverge again, the sample endpoint fails closed (503 attestation_unavailable) rather than serving a schema the head does not declare. The verify endpoint routes by each receipt own schemaVersion, so historical receipts keep verifying and no receipt is ever reinterpreted under a newer contract. Recovery is a deploy that restores head/sample agreement, then a fresh status artifact.',
  };

  const typedData = {
    domain: REGISTRY_STATUS_DOMAIN,
    types: REGISTRY_STATUS_TYPES,
    primaryType: REGISTRY_STATUS_PRIMARY_TYPE,
    message,
  };

  try {
    const { hashTypedData } = await import('viem');
    const uid = hashTypedData(typedData as never);
    const signature = await account.signTypedData(typedData as never);

    return NextResponse.json(
      {
        schema: 'oracleinsight.oracle-registry-status.v1',
        state: 'V3_ACTIVE',
        requestRef: REQUEST_REF,
        issuer: base,
        assertedAtUtc: new Date(assertedAt * 1000).toISOString(),
        registryBinding: {
          predecessor: {
            rawSha256: PREDECESSOR_REGISTRY_SHA256,
            bytes: PREDECESSOR_REGISTRY_BYTES,
            capturedAtUtc: PREDECESSOR_CAPTURED_AT_UTC,
            note: 'Registry snapshot admitted by the requester (frozen 2026-08-31).',
          },
          successor: {
            url: `${base}/.well-known/oracle-keys.json`,
            rawSha256: successorSha256,
            bytes: successorBytes,
            capturedAtUtc: new Date(assertedAt * 1000).toISOString(),
            note: 'Hashed from the raw bytes this deployment serves right now.',
          },
          byteDriftCaveat:
            'Registry raw bytes change on deploys even when no schema or key changes. Both sha256 values are point-in-time bindings; the stable identity is the schema contract plus the key set, not the document bytes.',
        },
        v2Signing: { continues: false, retiredForSigning: true, compatibilityWindow: null },
        activeSchema: {
          schema: 'OracleSafetyCheck',
          schemaVersion: 3,
          eip712DomainVersion: '3',
          primaryType: 'OracleSafetyCheck',
          fieldCount: 27,
        },
        signature: {
          scheme: 'EIP-712 signTypedData',
          attester: account.address,
          attesterKeyId: 'insight-oracle-safety-v2-202609',
          uid,
          signature,
          eip712: typedData,
          note: 'Verify with the attester address from the successor registry public_keys (role attester). The domain is distinct from every receipt family, so this signature cannot be replayed as an attestation.',
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      {
        schema: 'oracleinsight.oracle-registry-status.v1',
        error: {
          code: 'registry_status_unavailable',
          message: 'Signing the registry status failed; no unsigned status is served.',
        },
      },
      { status: 503 }
    );
  }
}
