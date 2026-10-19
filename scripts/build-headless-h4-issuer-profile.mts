/**
 * Build the immutable issuer/profile.json consumed by Chirindo's H4 checker.
 *
 * The source is Insight's already-public key registry; no private key, paid
 * caller credential, transaction signer, or production setting is read here.
 * The resulting SHA-256 must be supplied out of band to the verifier with
 * `--profile-sha256`, never learned from the case directory itself.
 *
 * Usage:
 *   node --import tsx scripts/build-headless-h4-issuer-profile.mts \
 *     --out /absolute/path/to/case/issuer/profile.json
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  buildHeadlessH4IssuerProfile,
  headlessH4IssuerProfileSha256,
  serializeHeadlessH4IssuerProfile,
} from '../src/lib/attestations/headlessH4IssuerProfile';

import type { KeyEntry } from '../src/lib/attestations/keyRegistryConfig';

const DEFAULT_ISSUER_ORIGIN = 'https://www.oracleinsight.xyz';

function usage(): never {
  console.error('usage: node --import tsx scripts/build-headless-h4-issuer-profile.mts --out <case-dir>/issuer/profile.json');
  process.exit(2);
}

function readArguments(): { output: string; issuerOrigin: string } {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--out' || !args[1]) usage();
  return {
    output: args[1],
    issuerOrigin: process.env.H4_ISSUER_ORIGIN ?? DEFAULT_ISSUER_ORIGIN,
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readPublicKeys(value: unknown): KeyEntry[] {
  if (!record(value) || !Array.isArray(value.public_keys)) {
    throw new Error('published key document has no public_keys array');
  }
  return value.public_keys.map((candidate, index) => {
    if (!record(candidate)) throw new Error(`public_keys[${index}] is not an object`);
    const { key_id, public_key, algorithm, validFrom, validUntil, revoked, role, note } = candidate;
    if (typeof key_id !== 'string' || typeof public_key !== 'string') {
      throw new Error(`public_keys[${index}] lacks key_id or public_key`);
    }
    if (algorithm !== 'EIP-712/secp256k1' || typeof validFrom !== 'string') {
      throw new Error(`public_keys[${index}] has an unsupported signing layout`);
    }
    if (validUntil !== null && typeof validUntil !== 'string') {
      throw new Error(`public_keys[${index}].validUntil must be a string or null`);
    }
    if (typeof revoked !== 'boolean') throw new Error(`public_keys[${index}].revoked must be a boolean`);
    if (role !== undefined && role !== 'attester' && role !== 'sample') {
      throw new Error(`public_keys[${index}].role is unsupported`);
    }
    if (note !== undefined && typeof note !== 'string') throw new Error(`public_keys[${index}].note must be a string`);
    return {
      key_id,
      public_key,
      algorithm,
      validFrom,
      validUntil,
      revoked,
      ...(role === undefined ? {} : { role }),
      ...(note === undefined ? {} : { note }),
    };
  });
}

async function main(): Promise<void> {
  const { output, issuerOrigin } = readArguments();
  const keyUrl = `${new URL(issuerOrigin).origin}/.well-known/oracle-keys.json`;
  const response = await fetch(keyUrl, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`published key document GET ${keyUrl} returned ${response.status}`);
  const profile = buildHeadlessH4IssuerProfile({
    issuerOrigin,
    publicKeys: readPublicKeys(await response.json()),
  });
  const bytes = serializeHeadlessH4IssuerProfile(profile);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, bytes, 'utf8');
  console.log(`wrote profile: ${output}`);
  console.log(`profile SHA-256 (send in email body): ${headlessH4IssuerProfileSha256(profile)}`);
  console.log(`attester keys pinned: ${profile.signers.map((key) => key.key_id).join(', ')}`);
}

main().catch((error: unknown) => {
  console.error(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
