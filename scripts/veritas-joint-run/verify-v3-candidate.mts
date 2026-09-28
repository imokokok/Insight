#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import canonicalize from 'canonicalize';
import { keccak256 } from 'viem';
import { z } from 'zod';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (name: string): unknown => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const RuleSchema = z
  .object({
    schema: z.string(),
    gateWindowSeconds: z.number().int(),
    candidateWindow: z.object({ closesAt: z.string() }).passthrough(),
    bitcoinAnchorCommitment: z
      .object({ selectionRuleHash: z.string(), preimageSchema: z.string(), leafTag: z.string() })
      .passthrough(),
    ethereumOrderingCommitment: z.object({ preimageSchema: z.string() }).passthrough(),
    finalPackageMustPublish: z.array(z.string()),
  })
  .passthrough();
const VectorSchema = z
  .object({
    selectionRuleFile: z.string(),
    selectionRuleHash: z.string(),
    preimage: z.record(z.string(), z.union([z.string(), z.number()])),
    canonicalPreimage: z.string(),
    canonicalPreimageHex: z.string(),
    canonicalPreimageBytes: z.number().int(),
  })
  .passthrough();
const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};
const bytes = (value: unknown) => Buffer.from(canonicalize(value), 'utf8');
const hash = (value: unknown) => keccak256(bytes(value));
const sha256 = (value: Buffer) => createHash('sha256').update(value).digest();
const v2 = RuleSchema.parse(read('anchored-settlement-selection-rule-v2.json'));
const v3 = RuleSchema.parse(read('anchored-settlement-selection-rule-v3.json'));

assert(bytes(v2).length === 7737, 'registered v2 byte length changed');
assert(
  hash(v2) === '0x545ede509529b6d8716be4f74e3e6715d92d821d18493dbc7f32e15156d2fc7a',
  'registered v2 hash changed'
);
const expected = structuredClone(v2);
expected.schema = 'insight-veritas-anchored-settlement-selection/v3';
expected.gateWindowSeconds = 1800;
expected.candidateWindow.closesAt =
  'The signed pre-trade gate validUntil; never widen the 1800-second window agreed for this joint run';
expected.bitcoinAnchorCommitment.selectionRuleHash =
  'keccak256(UTF8(JCS(this complete v3 selection-rule object)))';
expected.finalPackageMustPublish = expected.finalPackageMustPublish.map((value: string) =>
  value.replace('complete v2 selection-rule object', 'complete v3 selection-rule object')
);
assert(
  canonicalize(v3) === canonicalize(expected),
  'v3 is not the exact five-text-change proposal'
);
assert(bytes(v3).length === 7754, 'v3 JCS byte length mismatch');
const ruleHash = hash(v3);
assert(
  ruleHash === '0xb1071d6929d1dc13812d9aa19bf28a74dca4d90c07d47e9b2052f9f9c3c52465',
  'v3 rule hash mismatch'
);

const bitcoin = VectorSchema.extend({
  leafTag: z.string(),
  anchorLeafHash: z.string(),
}).parse(read('bitcoin-anchor-commitment-vector-v2.json'));
const ethereum = VectorSchema.extend({
  orderingCommitmentHash: z.string(),
  ethereumTransactionTemplate: z.object({ inputData: z.string() }).passthrough(),
}).parse(read('ethereum-ordering-commitment-vector-v2.json'));
for (const [label, vector] of [
  ['bitcoin', bitcoin],
  ['ethereum', ethereum],
] as const) {
  assert(
    vector.selectionRuleFile === 'anchored-settlement-selection-rule-v3.json',
    `${label} rule file`
  );
  assert(vector.selectionRuleHash === ruleHash, `${label} outer rule hash`);
  assert(vector.preimage.selectionRuleHash === ruleHash, `${label} preimage rule hash`);
  assert(vector.canonicalPreimage === canonicalize(vector.preimage), `${label} canonical preimage`);
  assert(vector.canonicalPreimageHex === bytes(vector.preimage).toString('hex'), `${label} hex`);
  assert(vector.canonicalPreimageBytes === bytes(vector.preimage).length, `${label} length`);
}
assert(
  bitcoin.preimage.schema === v3.bitcoinAnchorCommitment.preimageSchema,
  'Bitcoin preimage schema'
);
assert(
  ethereum.preimage.schema === v3.ethereumOrderingCommitment.preimageSchema,
  'Ethereum preimage schema'
);
const tag = sha256(Buffer.from(bitcoin.leafTag, 'utf8'));
const leaf = sha256(Buffer.concat([tag, tag, bytes(bitcoin.preimage)])).toString('hex');
assert(bitcoin.anchorLeafHash === leaf, 'Bitcoin tagged leaf hash');
assert(ethereum.orderingCommitmentHash === hash(ethereum.preimage), 'Ethereum ordering hash');
assert(
  ethereum.ethereumTransactionTemplate.inputData === ethereum.orderingCommitmentHash,
  'Ethereum calldata does not equal the ordering hash'
);
for (const name of ['sourceGateUid', 'destinationGateUid', 'preTradeUidsHash']) {
  assert(bitcoin.preimage[name] === ethereum.preimage[name], `${name} differs between vectors`);
}
assert(hash({ ...v3, gateWindowSeconds: 600 }) !== ruleHash, 'TTL mutation must change rule hash');
assert(
  hash({ ...bitcoin.preimage, selectionRuleHash: hash(v2) }) !== hash(bitcoin.preimage),
  'old rule hash must change Bitcoin commitment'
);

process.stdout.write(
  `VERITAS v3 candidate: PASS; rule JCS=${bytes(v3).length} bytes, hash=${ruleHash}, BTC leaf=${leaf}, ETH ordering=${ethereum.orderingCommitmentHash}\n`
);
