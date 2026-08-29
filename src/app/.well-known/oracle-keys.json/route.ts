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
import {
  CURRENT_WATCH_SCHEMA_VERSION,
  WATCH_DOMAIN,
  WATCH_PRIMARY_TYPE,
  WATCH_SCHEMA_VERSION,
  WATCH_TYPES,
  WATCH_TYPES_V2,
  WATCH_VALID_FOR_SECONDS,
  WATCH_REQUIRED_PARTICIPANT_COUNT,
  WATCH_REQUIRED_SOURCE_GROUP_COUNT,
} from '@/lib/attestations/oracleWatchAttestation';

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
      /**
       * Oracle Watch — the always-on cross-oracle trust signal. v2 is the
       * current signing layout and carries the independence gate
       * (`sourceGroupCount` / `requiredSourceGroupCount` / `independenceSatisfied`)
       * plus `reasonCodesHash`, so a receipt explains WHY a feed was called
       * DANGER without the holder needing our source code.
       */
      OracleWatchCheck: {
        schemaVersion: CURRENT_WATCH_SCHEMA_VERSION,
        eip712: descriptor(WATCH_DOMAIN, WATCH_TYPES_V2 as never, WATCH_PRIMARY_TYPE),
        validForSeconds: WATCH_VALID_FOR_SECONDS,
        /** Gate thresholds signed into every receipt alongside the observed
         *  values — a receipt is self-contained by construction. */
        gates: {
          requiredParticipantCount: WATCH_REQUIRED_PARTICIPANT_COUNT,
          requiredSourceGroupCount: WATCH_REQUIRED_SOURCE_GROUP_COUNT,
        },
        verify: `${origin}/api/v1/oracle-watch/attestation/verify`,
        sample: `${origin}/api/v1/oracle-watch/attestation/sample`,
      },
      /** v1 Watch layout: RETIRED FOR SIGNING, but kept published so receipts
       *  already handed to counterparties keep verifying after the upgrade. */
      OracleWatchCheckV1: {
        schemaVersion: WATCH_SCHEMA_VERSION,
        retiredForSigning: true,
        eip712: descriptor(WATCH_DOMAIN, WATCH_TYPES as never, WATCH_PRIMARY_TYPE),
        verify: `${origin}/api/v1/oracle-watch/attestation/verify`,
      },
    },
    verify: `${origin}/api/v1/safety/attestation/verify`,
    sample: `${origin}/api/v1/safety/attestation/sample`,
    /** Oracle Watch's verification half, kept separate from the pre-trade pair
     *  above: the two surfaces have different EIP-712 domains and different
     *  gate semantics, so a verifier must not be able to cross-replay them. */
    watch_verify: `${origin}/api/v1/oracle-watch/attestation/verify`,
    watch_sample: `${origin}/api/v1/oracle-watch/attestation/sample`,
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
