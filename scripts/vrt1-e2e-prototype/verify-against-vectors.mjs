// Byte-exact verification against the counterparty's canonical vectors
// (Tutankhamun 2026-08-27, insight-vectors/ in this directory, produced by
// gen-insight-vectors.py). This is the FINAL acceptance: if every vector below
// matches byte-for-byte and every negative is rejected, we are converged.
//
// Checks:
//   action.json    : canonical bytes, action_id, outer Schnorr sig, inner EIP-712
//   merkle.json    : single-leaf root + 3-leaf batch root + inclusion proof (idx 0)
//   op_return.json : 49-byte payload for single + 3-leaf batches
//   nostr_1990.json: event id (NIP-01), outer sig, pubkey == agent, inner action sig
//   negative.json  : 3 action_id cases MUST differ from canonical, 2 sig cases MUST fail
//
// Run: node scripts/vrt1-e2e-prototype/verify-against-vectors.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { schnorr } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes, concatBytes } from '@noble/hashes/utils';
import { hashTypedData, recoverAddress } from 'viem';
import {
  buildCanonicalPayload,
  buildOpReturn,
  canonicalBytes,
  dblSha256,
  merkleRoot,
  canonicalize,
  taggedHash,
} from './vrt1-encoding.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const V = (name) => JSON.parse(readFileSync(join(__dirname, 'insight-vectors', name), 'utf8'));

const pass = (label) => console.log(`  PASS  ${label}`);
const fail = (label) => {
  console.error(`  FAIL  ${label}`);
  process.exitCode = 1;
};

console.log('=== Byte-exact verification vs counterparty insight-vectors ===');

// ---------------------------------------------------------------------------
// 1. action.json: canonical bytes + action_id + signatures
// ---------------------------------------------------------------------------
console.log('--- 1. action.json (positive vector) ---');
const act = V('action.json');
const receipt = JSON.parse(readFileSync(join(__dirname, 'sample-receipt.json'), 'utf8'));
const att = receipt.attestation;
const data = att.data;
const agentPubXOnly = act.action.agent; // 9ac20335…
const payload = buildCanonicalPayload(receipt, agentPubXOnly);
const canon = canonicalBytes(payload);
bytesToHex(canon) === act.canonical_bytes_hex
  ? pass(`canonical bytes match vector (${canon.length}B)`)
  : fail(`canonical bytes differ (got ${bytesToHex(canon).slice(0, 32)}…)`);

// action_id recomputed over OUR payload
const aid = bytesToHex(taggedHash('VRT1/agent-action', canon));
aid === act.action_id_hex
  ? pass(`action_id matches vector (${aid.slice(0, 16)}…)`)
  : fail(`action_id differs (${aid.slice(0, 16)}… vs ${act.action_id_hex.slice(0, 16)}…)`);

// outer Schnorr: verify vector sig against vector agent key
const outerOk = schnorr.verify(hexToBytes(act.sig_hex), hexToBytes(aid), hexToBytes(agentPubXOnly));
outerOk ? pass('outer Schnorr sig from vector verifies') : fail('outer Schnorr verify failed');

// inner EIP-712: recover from the embedded attestation
const message = {};
for (const f of att.eip712.types.OracleSafetyCheck) {
  message[f.name] = f.type === 'uint256' ? BigInt(data[f.name]) : data[f.name];
}
const digest = hashTypedData({
  domain: att.eip712.domain,
  types: { OracleSafetyCheck: att.eip712.types.OracleSafetyCheck },
  primaryType: 'OracleSafetyCheck',
  message,
});
const recovered = await recoverAddress({ hash: digest, signature: att.signature });
recovered.toLowerCase() === att.attester.toLowerCase()
  ? pass(`inner EIP-712 recovers to attester ${att.attester}`)
  : fail(`inner EIP-712 recovered ${recovered}`);

// ---------------------------------------------------------------------------
// 2. merkle.json: single + 3-leaf batch + inclusion proof
// ---------------------------------------------------------------------------
console.log('--- 2. merkle.json ---');
const mkv = V('merkle.json');
const singleRoot = bytesToHex(merkleRoot([hexToBytes(aid)]));
singleRoot === mkv.single.root_hex
  ? pass(`single-leaf root matches vector (${singleRoot.slice(0, 16)}…)`)
  : fail(`single-leaf root differs (${singleRoot.slice(0, 16)}…)`);
const batchLeaves = mkv.batch_of_three.leaves_hex.map(hexToBytes);
const batchRoot = bytesToHex(merkleRoot(batchLeaves));
batchRoot === mkv.batch_of_three.root_hex
  ? pass(`3-leaf batch root matches vector (${batchRoot.slice(0, 16)}…)`)
  : fail(`3-leaf batch root differs (${batchRoot.slice(0, 16)}…)`);
// inclusion proof for index 0 (verify_expected: true)
const proof = mkv.batch_of_three.proof_for_index_0;
let cur = dblSha256(concatBytes(new Uint8Array([0x00]), hexToBytes(proof.leaf_hex)));
for (let i = 0; i < proof.siblings_hex.length; i++) {
  const sib = hexToBytes(proof.siblings_hex[i]);
  cur =
    proof.directions[i] === 'L'
      ? dblSha256(concatBytes(new Uint8Array([0x01]), sib, cur))
      : dblSha256(concatBytes(new Uint8Array([0x01]), cur, sib));
}
bytesToHex(cur) === mkv.batch_of_three.root_hex
  ? pass(`inclusion proof for index 0 recomputes the batch root`)
  : fail(`inclusion proof mismatch`);

// ---------------------------------------------------------------------------
// 3. op_return.json: 49-byte payloads for both batches
// ---------------------------------------------------------------------------
console.log('--- 3. op_return.json ---');
const opv = V('op_return.json');
const pl1 = buildOpReturn(opv.epoch, opv.single_leaf.leaf_count, opv.single_leaf.root_hex);
bytesToHex(pl1) === opv.single_leaf.payload_hex && pl1.length === 49
  ? pass(`single-leaf OP_RETURN payload matches (49B)`)
  : fail(`single-leaf OP_RETURN mismatch`);
const pl3 = buildOpReturn(opv.epoch, opv.batch_of_three.leaf_count, opv.batch_of_three.root_hex);
bytesToHex(pl3) === opv.batch_of_three.payload_hex && pl3.length === 49
  ? pass(`3-leaf OP_RETURN payload matches (49B)`)
  : fail(`3-leaf OP_RETURN mismatch`);

// ---------------------------------------------------------------------------
// 4. nostr_1990.json: the three consumer checks
// ---------------------------------------------------------------------------
console.log('--- 4. nostr_1990.json (kind 1990, three required checks) ---');
const nv = V('nostr_1990.json');
const ev = nv.event;
const ser = JSON.stringify(
  [0, ev.pubkey, ev.created_at, ev.kind, ev.tags, ev.content],
  undefined,
  0
);
const nid = bytesToHex(sha256(new TextEncoder().encode(ser)));
nid === ev.id
  ? pass(`event id == sha256(NIP-01 serialization)`)
  : fail(`event id mismatch (${nid.slice(0, 16)}… vs ${ev.id.slice(0, 16)}…)`);
schnorr.verify(hexToBytes(ev.sig), hexToBytes(ev.id), hexToBytes(ev.pubkey))
  ? pass(`outer Nostr event signature verifies`)
  : fail(`outer Nostr signature invalid`);
ev.pubkey === ev.pubkey && ev.pubkey === agentPubXOnly
  ? pass(`event.pubkey == action.agent`)
  : fail(`event.pubkey mismatch`);
const content = JSON.parse(ev.content);
content.action.action_type === 'insight.oracle-safety-check' &&
bytesToHex(
  taggedHash('VRT1/agent-action', new TextEncoder().encode(canonicalize(content.action)))
) === act.action_id_hex
  ? pass(`inner action in content reproduces the canonical action_id`)
  : fail(`inner action in content does not reproduce action_id`);
schnorr.verify(hexToBytes(content.sig), hexToBytes(act.action_id_hex), hexToBytes(agentPubXOnly))
  ? pass(`inner action signature verifies over action_id`)
  : fail(`inner action signature invalid`);

// ---------------------------------------------------------------------------
// 5. negative.json: all MUST be rejected
// ---------------------------------------------------------------------------
console.log('--- 5. negative.json (all cases MUST be rejected) ---');
const negv = V('negative.json');
// 5a. the three action_id divergences: our encoder must NOT produce them
const negPayloads = {
  'Class A hex left 0x-prefixed (VRT1 1.5 violation)': 'neg-hex-0x',
  'Class B CAIP-19 wrongly lowercased (destroys EIP-55 checksum)': 'neg-caip19-lower',
  'uint256 as JSON numbers instead of decimal strings (5.1)': 'neg-uint-number',
};
for (const c of negv.action_id_cases) {
  const mode = negPayloads[c.case];
  const p = buildCanonicalPayload(receipt, agentPubXOnly, mode);
  const id = bytesToHex(taggedHash('VRT1/agent-action', canonicalBytes(p)));
  id !== act.action_id_hex
    ? pass(`rejected: ${c.case.slice(0, 48)}…`)
    : fail(`NOT rejected: ${c.case}`);
}
// 5b. signature cases
const flipCase = negv.signature_cases.find((c) => c.case.includes('flipped'));
schnorr.verify(
  hexToBytes(flipCase.sig_hex),
  hexToBytes(act.action_id_hex),
  hexToBytes(agentPubXOnly)
)
  ? fail('flipped signature accepted (must reject)')
  : pass('flipped signature byte rejected');
const wrongLeaf = negv.signature_cases.find((c) => c.case.includes('wrong Merkle leaf'));
const wrongRoot = bytesToHex(merkleRoot([hexToBytes(wrongLeaf.leaf_hex)]));
wrongRoot !== act.action_id_hex && wrongRoot !== mkv.single.root_hex
  ? pass('wrong Merkle leaf does not match canonical root (rejected)')
  : fail('wrong Merkle leaf matches a canonical root (must reject)');

// ---------------------------------------------------------------------------
console.log('');
const allOk = process.exitCode !== 1;
console.log(
  allOk ? 'BYTE-EXACT CONVERGED: all vectors match, all negatives rejected' : 'NOT CONVERGED'
);
