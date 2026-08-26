/**
 * Public oracle-keys document (RFC 8615 `.well-known`).
 *
 * Mirrors the convention Headless Oracle / LembaGang uses for its SMA receipts
 * (`.well-known/oracle-keys.json`): a stable, fetchable, unauthenticated
 * location where a verifier learns (a) which issuer address to trust and
 * (b) the EIP-712 domain/types needed to verify a signed receipt.
 *
 * This endpoint is the "verification key at a well-known path" half of the
 * published attestation surface. The schema half already ships at
 * GET /api/v1/safety/attestation/verify; we surface the same descriptors here
 * so a single well-known URL is enough to both verify and fetch a live sample.
 *
 * GET /.well-known/oracle-keys.json
 */

import { type NextRequest, NextResponse } from 'next/server';

import { getAttesterAddress } from '@/lib/attestations/attesterAccount';
import {
  CANONICAL_REQUEST_DOMAIN,
  CANONICAL_REQUEST_TYPES,
  CANONICAL_REQUEST_PRIMARY_TYPE,
} from '@/lib/attestations/canonicalRequestHash';
import { buildKeyRegistryConfig } from '@/lib/attestations/keyRegistryConfig';
import {
  V2_DOMAIN,
  V2_TYPES,
  V2_PRIMARY_TYPE,
  V2_SCHEMA_VERSION,
  V2_ATTESTER_LABEL,
} from '@/lib/attestations/oracleSafetyAttestationV2';
import {
  RECHECK_DOMAIN,
  RECHECK_TYPES,
  RECHECK_PRIMARY_TYPE,
} from '@/lib/attestations/oracleSafetyRecheck';

/** Loose EIP-712 descriptor shape for JSON (domain version widened to string). */
interface Eip712Descriptor {
  domain: { name: string; version: string; chainId: number };
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
}

function descriptor(
  domain: { name: string; version: string; chainId: number },
  types: Record<string, Array<{ name: string; type: string }>>,
  primaryType: string
): Eip712Descriptor {
  return { domain, types, primaryType };
}

/** Resolve the canonical issuer origin for cross-references. Prefers an
 *  explicit env override, then a production default, then the request origin
 *  (works for both NextRequest.nextUrl and a plain Request via URL parsing). */
function resolveOrigin(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NODE_ENV === 'production') return 'https://www.oracleinsight.xyz';
  try {
    return new URL(request.url).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export async function GET(request: NextRequest) {
  const origin = resolveOrigin(request);

  const attester = await getAttesterAddress();

  // Key-lifecycle windows (added 2026-08-26 in response to the VERITAS
  // collaboration). Anchoring fixes the retroactive-forgery gap, but only a
  // published validity window lets a verifier say "trust this key up to a
  // given date". validUntil: null = no scheduled expiry until the first
  // rotation; revoked flips on compromise. The key list is config-driven
  // (ATTESTATION_KEYS_CONFIG) so rotation can publish a second key with its
  // own window without a code change (see key-rotation-procedure.md §5.1).
  const registry = buildKeyRegistryConfig(attester);

  const body = {
    issuer: origin,
    mic: V2_ATTESTER_LABEL,
    /** The EIP-712 attestation is signed by a secp256k1 key; the recovered
     *  signer address IS the public verification key. Trust a receipt only if
     *  its `attester` field equals one of these addresses AND it verifies
     *  against the schema below AND (when enforced) its `checkedAt` falls
     *  inside the key's [validFrom, validUntil) window and it is not revoked. */
    public_keys: registry.keys,
    revoked_keys: registry.revoked,
    attestation_enabled: attester !== null,
    schemas: {
      OracleSafetyCheck: {
        schemaVersion: V2_SCHEMA_VERSION,
        eip712: descriptor(V2_DOMAIN, V2_TYPES as never, V2_PRIMARY_TYPE),
      },
      OracleSafetyRecheck: {
        schemaVersion: V2_SCHEMA_VERSION,
        eip712: descriptor(RECHECK_DOMAIN, RECHECK_TYPES as never, RECHECK_PRIMARY_TYPE),
      },
      CanonicalPreTradeRequest: {
        eip712: descriptor(
          CANONICAL_REQUEST_DOMAIN,
          CANONICAL_REQUEST_TYPES as never,
          CANONICAL_REQUEST_PRIMARY_TYPE
        ),
      },
    },
    verify: `${origin}/api/v1/safety/attestation/verify`,
    sample: `${origin}/api/v1/safety/attestation/sample`,
    /** Rotation contract (added 2026-08-26). Target cadence: annual, or
     *  immediately on compromise (ROTATION_TARGET_CADENCE_DAYS). To rotate:
     *  generate a new key, publish it with validFrom = activation time, retain
     *  the prior key with validUntil for the overlap window, and set
     *  revoked = true on compromise. Compromised-or-expired keys move to
     *  `revoked_keys` (each with revoked_at + reason) so historical receipts
     *  keep a verifiable trust boundary. The key list is config-driven
     *  (ATTESTATION_KEYS_CONFIG / ATTESTATION_REVOKED_KEYS_CONFIG). */
    key_rotation_policy:
      'config-driven multi-key; rotate by publishing new key_id with validFrom, retaining prior key with validUntil for overlap; revoke on compromise (annual target or immediate)',
  };

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
