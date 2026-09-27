import { sha256 } from 'viem';

import type { KeyEntry, KeyRegistry } from './types';

export interface PinnedKeyRegistry {
  registry: KeyRegistry;
  sha256: string;
  byteLength: number;
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const date = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));

/** Hash the exact UTF-8 snapshot bytes, before parsing. The expected digest must
 * come from the consumer's independently reviewed trust configuration. Matching
 * a hash supplied alongside an untrusted receipt does not authenticate its issuer. */
export function parsePinnedKeyRegistry(
  bytes: Uint8Array,
  expectedSha256: string
): PinnedKeyRegistry {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.byteLength === 0 ||
    bytes.byteLength > 1048576 ||
    typeof expectedSha256 !== 'string' ||
    !/^(?:0x)?[0-9a-f]{64}$/.test(expectedSha256)
  )
    throw new TypeError('Invalid registry snapshot or SHA-256 pin');
  const digest = sha256(bytes).slice(2);
  if (digest !== expectedSha256.replace(/^0x/, ''))
    throw new Error('REGISTRY_SNAPSHOT_HASH_MISMATCH');
  const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (
    !object(value) ||
    (value.keys !== undefined && value.public_keys !== undefined) ||
    (value.revoked !== undefined && value.revoked_keys !== undefined)
  )
    throw new TypeError('Invalid or ambiguous key registry');
  const keys = value.public_keys ?? value.keys;
  const revoked = value.revoked_keys ?? value.revoked ?? [];
  if (
    !Array.isArray(keys) ||
    keys.length === 0 ||
    keys.length > 256 ||
    !Array.isArray(revoked) ||
    revoked.length > 256
  )
    throw new TypeError('Invalid key registry lists');
  const addresses = new Set<string>(),
    ids = new Set<string>();
  for (const k of keys) {
    if (
      !object(k) ||
      typeof k.key_id !== 'string' ||
      !k.key_id ||
      typeof k.public_key !== 'string' ||
      !/^0x[0-9a-fA-F]{40}$/.test(k.public_key) ||
      !date(k.validFrom) ||
      (k.validUntil !== null && !date(k.validUntil)) ||
      (date(k.validUntil) && Date.parse(k.validUntil) < Date.parse(k.validFrom)) ||
      typeof k.revoked !== 'boolean' ||
      (k.role !== undefined &&
        (typeof k.role !== 'string' || !['sample', 'attester'].includes(k.role))) ||
      (k.algorithm !== undefined && k.algorithm !== 'EIP-712/secp256k1') ||
      addresses.has(k.public_key.toLowerCase()) ||
      ids.has(k.key_id)
    )
      throw new TypeError('Invalid or duplicate registry key');
    addresses.add(k.public_key.toLowerCase());
    ids.add(k.key_id);
  }
  if (
    revoked.some(
      (r) =>
        !object(r) ||
        typeof r.key_id !== 'string' ||
        !date(r.revoked_at) ||
        typeof r.reason !== 'string'
    )
  )
    throw new TypeError('Invalid revoked key');
  return {
    registry: { keys: keys as KeyEntry[], revoked },
    sha256: digest,
    byteLength: bytes.byteLength,
  };
}
