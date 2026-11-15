#!/usr/bin/env node
// Independent recomputation of providerObservationsHash for the 2026-11-15
// BNB (chain 56) sample. Requires only `viem` (keccak256 + ABI encoding).
// No Insight server, no API key, no payment, no network call at verify time.
//
// `viem` resolves from the CURRENT WORKING DIRECTORY; the JSON vector is read
// from THIS FILE'S directory, so keep the three sample files together:
//   cd /path/to/insight && node \
//     docs/evidence/bnb-decision-input-sample-2026-11-15/verify-bnb-observations.mjs
// or, from any scratch directory with viem installed:
//   node /path/to/verify-bnb-observations.mjs

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const requireFromCwd = createRequire(path.join(process.cwd(), '__verify_resolver__.js'));
let viem;
try {
  viem = requireFromCwd('viem');
} catch {
  console.error('Cannot resolve `viem` from', process.cwd());
  console.error('Run from the insight repo root, or run `npm i viem` here first.');
  process.exit(2);
}
const { encodeAbiParameters, keccak256, concat } = viem;

const here = path.dirname(fileURLToPath(import.meta.url));
const vectorPath = path.join(here, 'bnb-observation-vector-2026-11-15.json');
const v = JSON.parse(fs.readFileSync(vectorPath, 'utf8'));

const abi = v.canonicalization.entryAbi;

const entryHashes = v.observations.map((e) => {
  const encoded = encodeAbiParameters(abi, [
    e.provider,
    e.feedId,
    BigInt(e.value),
    BigInt(e.timestamp),
    BigInt(e.dataAgeSeconds),
    e.included,
    e.exclusionReason,
  ]);
  return keccak256(encoded);
});

const sorted = [...entryHashes].sort((a, b) => {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  return la < lb ? -1 : la > lb ? 1 : 0;
});

const recomputed = sorted.length === 0 ? keccak256('0x') : keccak256(concat(sorted));

const expected = v.providerObservationsHash;
const ok = recomputed === expected;

console.log('sample           ', v.sample);
console.log('chain / block    ', v.chainId, '/', v.blockNumber);
console.log(
  'observations     ',
  v.observations.length,
  '(',
  v.derived.includedCount,
  'included,',
  v.derived.excludedCount,
  'excluded )'
);
console.log('recomputed       ', recomputed);
console.log('published        ', expected);
console.log(ok ? 'RESULT            MATCH' : 'RESULT            MISMATCH');
process.exit(ok ? 0 : 1);
