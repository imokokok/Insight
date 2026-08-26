// VRT1 end-to-end prototype: OracleSafetyCheck receipt -> agent_action record
// -> dual signature -> Merkle batch -> OP_RETURN payload -> offline verify.
//
// Free path only: no Bitcoin broadcast (mainnet anchoring is the counterparty's
// anchoring service / our future production step). Everything here is
// reproducible offline against the public vrt1-spec test vectors.
//
// Toolchain self-test first (byte-exact against public vectors), then the real
// production receipt from sample-receipt.json.
//
// Run: node scripts/vrt1-e2e-prototype/prototype.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { schnorr } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes, concatBytes } from '@noble/hashes/utils';
import { hashTypedData, recoverAddress } from 'viem';

const __dirname = dirname(fileURLToPath(import.meta.url));
const canonicalize = (
  await import('file:///Users/imokokok/.workbuddy/insight_aps_demo/node_modules/canonicalize/lib/canonicalize.js')
).default;

const VRT1_ACTION_TAG = 'VRT1/agent-action';

// ---------------------------------------------------------------------------
// Primitives (from spec §4, §5, §8)
// ---------------------------------------------------------------------------

// tagged_hash(tag, msg) = SHA256(SHA256(tag) || SHA256(tag) || msg)
function taggedHash(tag, msg) {
  const t = sha256(new TextEncoder().encode(tag));
  return sha256(concatBytes(t, t, msg));
}

// Merkle: RFC-6962 prefixes + Bitcoin-style odd-leaf duplication, d = double SHA-256
function dblSha256(b) {
  return sha256(sha256(b));
}

function merkleRoot(leaves /* array of Uint8Array 32B */) {
  let level = leaves.map((leaf) => dblSha256(concatBytes(new Uint8Array([0x00]), leaf)));
  while (level.length > 1) {
    if (level.length % 2 === 1) level.push(level[level.length - 1]); // odd-leaf duplication
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(dblSha256(concatBytes(new Uint8Array([0x01]), level[i], level[i + 1])));
    }
    level = next;
  }
  return level[0];
}

// OP_RETURN payload: tag(4) | version(1) | epoch(8 BE) | leaf_count(4 BE) | root(32)
function buildOpReturn(epoch, leafCount, rootHex) {
  const root = hexToBytes(rootHex);
  const buf = new Uint8Array(49);
  buf.set(new TextEncoder().encode('VRT1'), 0);
  buf[4] = 0x01; // version
  const dv = new DataView(buf.buffer);
  dv.setBigUint64(5, BigInt(epoch), false);
  dv.setUint32(13, leafCount, false);
  buf.set(root, 17);
  return buf;
}

// Build a VRT1 agent action payload object (per §8.1) and its canonical bytes
function buildActionPayload(overrides) {
  return {
    action_type: 'insight.oracle-safety-check',
    agent: overrides.agent,
    outcome: overrides.outcome,
    params: overrides.params,
    target: overrides.target,
    ts: overrides.ts,
    v: 1,
  };
}

function canonicalBytes(payload) {
  return new TextEncoder().encode(canonicalize(payload));
}

// action_id := hex(tagged_hash("VRT1/agent-action", canonical_json(payload)))
function actionId(payload) {
  return bytesToHex(taggedHash(VRT1_ACTION_TAG, canonicalBytes(payload)));
}

// ---------------------------------------------------------------------------
// 0. Toolchain self-test against public vectors (byte-exact)
// ---------------------------------------------------------------------------
const pass = (label) => console.log(`  PASS  ${label}`);
const fail = (label) => {
  console.error(`  FAIL  ${label}`);
  process.exitCode = 1;
};

console.log('=== 0. Toolchain self-test against public vrt1-spec vectors ===');

const vec = JSON.parse(readFileSync(join(__dirname, 'vectors', 'agent_action.json'), 'utf8'));
const vecPayload = {
  action_type: vec.action.action_type,
  agent: vec.action.agent,
  outcome: vec.action.outcome,
  params: vec.action.params,
  target: vec.action.target,
  ts: vec.action.ts,
  v: vec.action.v,
};
const canon = canonicalBytes(vecPayload);
bytesToHex(canon) === vec.canonical_bytes_hex
  ? pass('canonical JSON bytes match canonical_bytes_hex')
  : fail('canonical JSON bytes mismatch');
const aid = actionId(vecPayload);
aid === vec.action_id_hex ? pass('action_id matches vector') : fail(`action_id mismatch (${aid})`);
const okVerify = schnorr.verify(
  hexToBytes(vec.sig_hex),
  hexToBytes(vec.action_id_hex),
  hexToBytes(vec.agent_pubkey_xonly_hex)
);
okVerify
  ? pass('schnorr verify over action_id matches vector (expected true)')
  : fail('schnorr verify failed on vector');

// Merkle root self-test (tree of size 7 from merkle.json)
const merkleVec = JSON.parse(readFileSync(join(__dirname, 'vectors', 'merkle.json'), 'utf8'));
{
  const tree = merkleVec.trees['7'];
  const leaves = tree.leaves_hex.map(hexToBytes);
  const root = bytesToHex(merkleRoot(leaves));
  root === tree.root_hex
    ? pass(`merkle root size=7 matches vector (${root})`)
    : fail(`merkle root mismatch (${root})`);
}

// OP_RETURN self-test
{
  const opv = JSON.parse(readFileSync(join(__dirname, 'vectors', 'op_return.json'), 'utf8'));
  const payload = buildOpReturn(opv.input.epoch, opv.input.leaf_count, opv.input.merkle_root_hex);
  bytesToHex(payload) === opv.payload_hex
    ? pass(`OP_RETURN payload (${opv.payload_length_bytes}B) matches vector`)
    : fail('OP_RETURN payload mismatch');
}

// ---------------------------------------------------------------------------
// 1. Real path: production receipt -> VRT1 action
// ---------------------------------------------------------------------------
console.log('=== 1. Production receipt -> VRT1 agent_action ===');

const receipt = JSON.parse(readFileSync(join(__dirname, 'sample-receipt.json'), 'utf8'));
const att = receipt.attestation;
const data = att.data;

// VRT1 agent key: deterministic PROTOTYPE key (pending key-registration talk
// with VERITAS). Not the production EIP-712 attester key.
const agentPriv = sha256(new TextEncoder().encode('insight-vrt1-prototype-agent-key-2026-08-26'));
const agentPubXOnly = bytesToHex(schnorr.getPublicKey(agentPriv));

// 26-field struct -> params (per mapping draft, snake_case keys)
const structFields = {};
for (const f of att.eip712.types.OracleSafetyCheck) {
  structFields[f.name] = data[f.name];
}

const actionPayload = buildActionPayload({
  agent: agentPubXOnly,
  outcome: { verdict: data.verdict, schema_version: 2 },
  params: {
    oracle_safety_check_v2: structFields,
    eip712_attestation: {
      uid: att.uid,
      signature: att.signature,
      signedAt: att.signedAt,
      attester: att.attester,
      verify_url: att.verifyUrl,
    },
  },
  target: `${data.sourceAssetId}->${data.destinationAssetId}`,
  ts: data.checkedAt,
});

const canonHex = bytesToHex(canonicalBytes(actionPayload));
const aid2 = actionId(actionPayload);
const sig = schnorr.sign(hexToBytes(aid2), agentPriv);

console.log(`  agent (x-only pubkey, prototype demo key): ${agentPubXOnly}`);
console.log(`  action_type: ${actionPayload.action_type}`);
console.log(`  target:      ${actionPayload.target}`);
console.log(
  `  ts (=checkedAt): ${actionPayload.ts}  (epoch = floor(ts/600) = ${Math.floor(actionPayload.ts / 600)})`
);
console.log(`  action_id:   ${aid2}`);
console.log(`  canonical bytes: ${canonHex.length / 2} bytes`);
console.log(`  schnorr sig: ${bytesToHex(sig)}`);

// ---------------------------------------------------------------------------
// 2. Dual-signature verification (offline)
// ---------------------------------------------------------------------------
console.log('=== 2. Offline verification: outer Schnorr + inner EIP-712 ===');

// 2a. Outer: Schnorr over action_id
const outerOk = schnorr.verify(sig, hexToBytes(aid2), hexToBytes(agentPubXOnly));
outerOk ? pass('VRT1 BIP340 Schnorr (outer) verifies') : fail('outer schnorr verify failed');

// 2b. Inner: EIP-712 recovery against the receipt's own domain/types
const message = {};
for (const f of att.eip712.types.OracleSafetyCheck) {
  const t = f.type;
  message[f.name] = t === 'uint256' ? BigInt(data[f.name]) : data[f.name];
}
const digest = hashTypedData({
  domain: att.eip712.domain,
  types: { OracleSafetyCheck: att.eip712.types.OracleSafetyCheck },
  primaryType: 'OracleSafetyCheck',
  message,
});
const recovered = await recoverAddress({ hash: digest, signature: att.signature });
const innerOk = recovered.toLowerCase() === att.attester.toLowerCase();
innerOk
  ? pass(`EIP-712 (inner) recovers to attester ${att.attester} (uid ${att.uid.slice(0, 10)}...)`)
  : fail(`EIP-712 recovered ${recovered}, expected ${att.attester}`);

// ---------------------------------------------------------------------------
// 3. Batch + Merkle + OP_RETURN (epoch anchor)
// ---------------------------------------------------------------------------
console.log('=== 3. Batch anchoring (Merkle + OP_RETURN, offline) ===');

const epoch = Math.floor(data.checkedAt / 600); // VRT1 epoch = 600s (§2.2)
const leaf = hexToBytes(aid2); // 32-byte attestation digest = action_id
const root = merkleRoot([leaf]);
const opReturn = buildOpReturn(epoch, 1, bytesToHex(root));
console.log(`  epoch: ${epoch}  (checkedAt ${data.checkedAt} / 600)`);
console.log(`  leaf_count: 1`);
console.log(`  merkle_root: ${bytesToHex(root)}`);
console.log(`  OP_RETURN payload (49B): ${bytesToHex(opReturn)}`);
const opParsed = {
  tag: new TextDecoder().decode(opReturn.slice(0, 4)),
  version: opReturn[4],
  epoch: Number(new DataView(opReturn.buffer).getBigUint64(5, false)),
  leaf_count: new DataView(opReturn.buffer).getUint32(13, false),
  merkle_root_hex: bytesToHex(opReturn.slice(17)),
};
const opOk =
  opParsed.tag === 'VRT1' &&
  opParsed.version === 1 &&
  opParsed.epoch === epoch &&
  opParsed.leaf_count === 1 &&
  opParsed.merkle_root_hex === bytesToHex(root);
opOk ? pass('OP_RETURN roundtrip parse OK') : fail('OP_RETURN parse mismatch');

// 3b. Multi-leaf batch to exercise inclusion proof (3 leaves: ours + 2 demos)
console.log('--- multi-leaf batch (3 leaves) with inclusion proof for our action ---');
const demoLeafA = taggedHash(VRT1_ACTION_TAG, new TextEncoder().encode('demo-a'));
const demoLeafB = taggedHash(VRT1_ACTION_TAG, new TextEncoder().encode('demo-b'));
const batchLeaves = [leaf, demoLeafA, demoLeafB];
const batchRoot = merkleRoot(batchLeaves);
// inclusion proof for index 0 in a 3-leaf tree:
// level0: d(0x00||L0), d(0x00||L1), d(0x00||L2) -> odd -> dup L2
// level1: d(0x01||lvl0[0]||lvl0[1]), d(0x01||lvl0[2]||lvl0[2])
// level2: d(0x01||level1[0]||level1[1])
// proof for idx 0: sibling level0[1] (dir 0), then sibling level1[1] (dir 0)
const l0 = batchLeaves.map((x) => dblSha256(concatBytes(new Uint8Array([0x00]), x)));
const l1 = [
  dblSha256(concatBytes(new Uint8Array([0x01]), l0[0], l0[1])),
  dblSha256(concatBytes(new Uint8Array([0x01]), l0[2], l0[2])),
];
const proofSiblings = [l0[1], l1[1]];
const proofDirs = [0, 0];
let cur = dblSha256(concatBytes(new Uint8Array([0x00]), leaf));
for (let i = 0; i < proofSiblings.length; i++) {
  cur =
    proofDirs[i] === 0
      ? dblSha256(concatBytes(new Uint8Array([0x01]), cur, proofSiblings[i]))
      : dblSha256(concatBytes(new Uint8Array([0x01]), proofSiblings[i], cur));
}
const proofOk = bytesToHex(cur) === bytesToHex(batchRoot);
proofOk
  ? pass(`inclusion proof for our action verifies (root ${bytesToHex(batchRoot).slice(0, 16)}...)`)
  : fail('inclusion proof mismatch');

// ---------------------------------------------------------------------------
// 4. Write artifacts
// ---------------------------------------------------------------------------
console.log('=== 4. Artifacts ===');
const record = {
  action: actionPayload,
  action_id_hex: aid2,
  canonical_bytes_hex: canonHex,
  sig_hex: bytesToHex(sig),
  agent_privkey_hex_demo_only: bytesToHex(agentPriv),
  agent_pubkey_xonly_hex: agentPubXOnly,
  inner_eip712: {
    uid: att.uid,
    attester: att.attester,
    signature: att.signature,
    eip712_verified_offline: innerOk,
  },
  spec_section: '8',
  verify_result_expected: true,
};
const anchor = {
  epoch,
  leaf_count: 1,
  merkle_root_hex: bytesToHex(root),
  op_return_payload_hex: bytesToHex(opReturn),
  op_return_payload_length_bytes: opReturn.length,
  spec_section: '5',
  broadcast:
    'NOT_BROADCAST (free-path prototype; mainnet anchor is VERITAS anchoring service / future production step)',
};
writeFileSync(join(__dirname, 'vrt1-action.json'), JSON.stringify(record, null, 2));
writeFileSync(join(__dirname, 'anchor-epoch.json'), JSON.stringify(anchor, null, 2));

console.log('  wrote vrt1-action.json');
console.log('  wrote anchor-epoch.json');
console.log('');
const allOk = process.exitCode !== 1;
console.log(allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED');
