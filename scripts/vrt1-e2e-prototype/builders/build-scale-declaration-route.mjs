#!/usr/bin/env node
/**
 * Freeze the registration pin into a route payload, byte for byte.
 *
 * Why this exists: the pin is only a pin if a verifier can fetch it and get the
 * same sha256 Tutankhamun already checked (67b7d601...). JSON.parse +
 * JSON.stringify does NOT round-trip this file: the canonical copy is 6749
 * bytes and a reserialised copy is 7129, because array formatting differs. So
 * the served bytes have to be the source bytes, not a re-encoding of them.
 *
 * Run after editing scripts/vrt1-e2e-prototype/registration/scale-declaration.json:
 *   node scripts/vrt1-e2e-prototype/builders/build-scale-declaration-route.mjs
 * Drift is caught by `npm run verify:vrt1` (verify/verify-scale-pin.mjs).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');
const source = join(
  repoRoot,
  'scripts',
  'vrt1-e2e-prototype',
  'registration',
  'scale-declaration.json'
);
const target = join(
  repoRoot,
  'src',
  'app',
  '.well-known',
  'vrt1-scale-declaration.json',
  'declaration.generated.ts'
);

const raw = readFileSync(source, 'utf8');
const sha256 = createHash('sha256').update(raw, 'utf8').digest('hex');

const out = `// GENERATED FILE - DO NOT EDIT BY HAND.
//
// Source (single source of truth):
//   scripts/vrt1-e2e-prototype/registration/scale-declaration.json
// Regenerate:
//   node scripts/vrt1-e2e-prototype/builders/build-scale-declaration-route.mjs
//
// The payload below is byte-identical to the source file, not a re-serialisation
// of it. Re-serialising changes the bytes (6749 -> 7129) and therefore the
// sha256, which would break the value a verifier checks against.
//
// sha256: ${sha256}
// bytes:  ${Buffer.byteLength(raw, 'utf8')}

// prettier-ignore
export const SCALE_DECLARATION_JSON: string = ${JSON.stringify(raw)};

export const SCALE_DECLARATION_SHA256: string =
  '${sha256}';
`;

writeFileSync(target, out, 'utf8');
console.log(`wrote ${target}`);
console.log(`  bytes  ${Buffer.byteLength(raw, 'utf8')}`);
console.log(`  sha256 ${sha256}`);
