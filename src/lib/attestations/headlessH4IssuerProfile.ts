import { createHash } from 'node:crypto';

import {
  V3_DOMAIN,
  V3_PRIMARY_TYPE,
  V3_SCHEMA_VERSION,
  V3_TYPES,
} from './oracleSafetyAttestationV3';

import type { KeyEntry } from './keyRegistryConfig';

/**
 * A pinned profile for Michael Msebenzi's Chirindo H4 verifier.
 *
 * This is an evidence adapter only. It describes existing Insight v3 receipts
 * and the published attester-key document; it does not issue a receipt, enable
 * a Headless partner runtime path, or alter the current activation set.
 */
export const HEADLESS_H4_ISSUER_PROFILE_FORMAT = 'chirindo-h4-issuer-profile/1';
export const HEADLESS_H4_CHAIN_ID = 8453;

export interface HeadlessH4IssuerProfileOptions {
  /** Origin hosting Insight's existing `.well-known/oracle-keys.json`. */
  issuerOrigin: string;
  /** The public key registry snapshot used to construct this immutable profile. */
  publicKeys: readonly KeyEntry[];
}

export interface HeadlessH4IssuerProfile {
  format: typeof HEADLESS_H4_ISSUER_PROFILE_FORMAT;
  label: string;
  test: false;
  issuer: string;
  chain_id: typeof HEADLESS_H4_CHAIN_ID;
  receipt: {
    eip712: {
      domain: typeof V3_DOMAIN;
      types: typeof V3_TYPES;
      primaryType: typeof V3_PRIMARY_TYPE;
    };
    fields: {
      checked_at: 'checkedAt';
      valid_until: 'validUntil';
      request_hash: 'requestHash';
      verdict: 'verdict';
      schema_version: 'schemaVersion';
    };
    schema_version: typeof V3_SCHEMA_VERSION;
  };
  envelope: {
    required: readonly string[];
    optional: readonly [];
    uid: 'uid';
    signature: 'signature';
    signer: 'attester';
    message: 'data';
    schema_version: 'schemaVersion';
    valid_until: 'validUntil';
    valid_for_seconds: 'validForSeconds';
  };
  signers: Array<{
    address: string;
    key_id: string;
    valid_from: string;
    valid_until: string | null;
  }>;
  key_document: {
    url: string;
    keys: 'public_keys';
    address: 'public_key';
    key_id: 'key_id';
    valid_from: 'validFrom';
    valid_until: 'validUntil';
    require: { algorithm: 'EIP-712/secp256k1'; revoked: false };
    role: 'role';
    accepted_roles: readonly ['attester'];
    layout: 'schemas.OracleSafetyCheck.eip712';
  };
}

const REQUIRED_ENVELOPE_MEMBERS = [
  'uid',
  'schemaVersion',
  'attester',
  'attesterLabel',
  'signedAt',
  'validForSeconds',
  'validUntil',
  'signature',
  'verifyUrl',
  'data',
  'eip712',
] as const;

/** Build the exact profile bytes a verifier must SHA-256-pin out of band. */
export function buildHeadlessH4IssuerProfile(
  options: HeadlessH4IssuerProfileOptions
): HeadlessH4IssuerProfile {
  const issuerOrigin = normalizeHttpsOrigin(options.issuerOrigin);
  const signers = options.publicKeys
    .filter((key) => key.algorithm === 'EIP-712/secp256k1')
    .filter((key) => key.revoked === false)
    .filter((key) => key.role === undefined || key.role === 'attester')
    .map((key) => toProfileSigner(key));

  if (signers.length === 0) {
    throw new Error('Headless H4 profile needs at least one active production attester key')
  }
  if (new Set(signers.map((key) => key.address.toLowerCase())).size !== signers.length) {
    throw new Error('Headless H4 profile cannot contain duplicate attester addresses')
  }

  return {
    format: HEADLESS_H4_ISSUER_PROFILE_FORMAT,
    label: 'Insight Oracle Safety v3 issuer profile for Chirindo H4',
    test: false,
    issuer: 'Insight',
    chain_id: HEADLESS_H4_CHAIN_ID,
    receipt: {
      eip712: {
        domain: V3_DOMAIN,
        types: V3_TYPES,
        primaryType: V3_PRIMARY_TYPE,
      },
      fields: {
        checked_at: 'checkedAt',
        valid_until: 'validUntil',
        request_hash: 'requestHash',
        verdict: 'verdict',
        schema_version: 'schemaVersion',
      },
      schema_version: V3_SCHEMA_VERSION,
    },
    // Insight's raw v3 envelope also carries canonical-request descriptors
    // inside `eip712`. Chirindo verifies the signed domain/types from this
    // profile, so that informational member remains required but un-mapped.
    envelope: {
      required: REQUIRED_ENVELOPE_MEMBERS,
      optional: [],
      uid: 'uid',
      signature: 'signature',
      signer: 'attester',
      message: 'data',
      schema_version: 'schemaVersion',
      valid_until: 'validUntil',
      valid_for_seconds: 'validForSeconds',
    },
    signers,
    key_document: {
      url: `${issuerOrigin}/.well-known/oracle-keys.json`,
      keys: 'public_keys',
      address: 'public_key',
      key_id: 'key_id',
      valid_from: 'validFrom',
      valid_until: 'validUntil',
      require: { algorithm: 'EIP-712/secp256k1', revoked: false },
      role: 'role',
      accepted_roles: ['attester'],
      layout: 'schemas.OracleSafetyCheck.eip712',
    },
  };
}

/** Stable, sendable UTF-8 bytes for the case directory's `issuer/profile.json`. */
export function serializeHeadlessH4IssuerProfile(profile: HeadlessH4IssuerProfile): string {
  return `${JSON.stringify(profile)}\n`;
}

/** SHA-256 pin of the exact serialized profile bytes (lowercase hex, no prefix). */
export function headlessH4IssuerProfileSha256(profile: HeadlessH4IssuerProfile): string {
  return createHash('sha256').update(serializeHeadlessH4IssuerProfile(profile), 'utf8').digest('hex');
}

function normalizeHttpsOrigin(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Headless H4 issuerOrigin must be an absolute HTTPS URL');
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('Headless H4 issuerOrigin must be a bare HTTPS origin');
  }
  return parsed.origin;
}

function toProfileSigner(key: KeyEntry): HeadlessH4IssuerProfile['signers'][number] {
  if (!/^0x[0-9a-fA-F]{40}$/.test(key.public_key)) {
    throw new Error(`Headless H4 profile key ${key.key_id} has an invalid public_key`);
  }
  if (Number.isNaN(Date.parse(key.validFrom))) {
    throw new Error(`Headless H4 profile key ${key.key_id} has an invalid validFrom`);
  }
  if (key.validUntil !== null && Number.isNaN(Date.parse(key.validUntil))) {
    throw new Error(`Headless H4 profile key ${key.key_id} has an invalid validUntil`);
  }
  return {
    address: key.public_key,
    key_id: key.key_id,
    valid_from: key.validFrom,
    valid_until: key.validUntil,
  };
}
