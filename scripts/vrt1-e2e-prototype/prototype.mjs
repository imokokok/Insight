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
import {
  AUX_RAND,
  VRT1_ACTION_TAG,
  buildCanonicalPayload,
  buildOpReturn,
  canonicalBytes,
  canonicalize,
  actionId,
  dblSha256,
  merkleRoot,
  taggedHash,
} from './vrt1-encoding.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Primitives used in the self-test section live in vrt1-encoding.mjs
// (single source of truth for canonical encoding rules, revised §5.2).
// ---------------------------------------------------------------------------

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

const receipt = JSON.parse(
  readFileSync(process.argv[2] || join(__dirname, 'sample-receipt.json'), 'utf8')
);
const att = receipt.attestation;
const data = att.data;

// VRT1 agent key: DEMO key per the counterparty vectors (0x55..55, published so
// vectors are reproducible). Not the production EIP-712 attester key.
const agentPriv = new Uint8Array(32).fill(0x55);
const agentPubXOnly = bytesToHex(schnorr.getPublicKey(agentPriv));

// 26-field struct -> params, canonical encoding applied per revised §5.2/§5.1
// (bytes32 -> strip 0x + lowercase; uint256 -> decimal string; CAIP-19 -> byte-identical).
const actionPayload = buildCanonicalPayload(receipt, agentPubXOnly);

const canonHex = bytesToHex(canonicalBytes(actionPayload));
const aid2 = actionId(actionPayload);
const sig = schnorr.sign(hexToBytes(aid2), agentPriv, AUX_RAND);

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
// 3c. Section 8.3 Nostr wrapping (kind 1990)
//     Spec REQUIRES consumers to verify BOTH the outer Nostr event signature
//     AND the inner action signature, AND event.pubkey == action.agent.
// ---------------------------------------------------------------------------
console.log('--- section 8.3 Nostr wrapping (kind 1990) ---');
// content: plain JSON (not base64), matching the counterparty vector; tags: []
const nostrContent = canonicalize({ action: actionPayload, sig: bytesToHex(sig) });
const nostrTags = [];
const nostrCreatedAt = data.checkedAt;
const nostrEvent = {
  id: '',
  pubkey: agentPubXOnly,
  created_at: nostrCreatedAt,
  kind: 1990,
  tags: nostrTags,
  content: nostrContent,
  sig: '',
};
// NIP-01 id: sha256 of the no-whitespace serialized array
const nostrSerialized = JSON.stringify([
  0,
  nostrEvent.pubkey,
  nostrEvent.created_at,
  nostrEvent.kind,
  nostrEvent.tags,
  nostrEvent.content,
]);
const nostrId = bytesToHex(sha256(new TextEncoder().encode(nostrSerialized)));
const nostrSig = bytesToHex(schnorr.sign(hexToBytes(nostrId), agentPriv, AUX_RAND));
nostrEvent.id = nostrId;
nostrEvent.sig = nostrSig;

const nostrSigOk = schnorr.verify(
  hexToBytes(nostrSig),
  hexToBytes(nostrId),
  hexToBytes(agentPubXOnly)
);
nostrSigOk
  ? pass('Nostr kind 1990 event signature verifies (outer)')
  : fail('Nostr event sig invalid');
const pubkeyMatchOk = nostrEvent.pubkey === actionPayload.agent;
pubkeyMatchOk ? pass('event.pubkey == action.agent') : fail('event.pubkey mismatch');
const contentParsed = JSON.parse(nostrContent); // plain JSON, per counterparty vector
const innerActionSigOk =
  contentParsed.sig === bytesToHex(sig) &&
  contentParsed.action.ts === actionPayload.ts &&
  schnorr.verify(hexToBytes(contentParsed.sig), hexToBytes(aid2), hexToBytes(agentPubXOnly));
innerActionSigOk
  ? pass('inner action signature re-verified from event content')
  : fail('inner action sig mismatch in event content');

// ---------------------------------------------------------------------------
// 3d. Negative vectors: tampering MUST be rejected
// ---------------------------------------------------------------------------
console.log('--- negative vectors (tamper must be rejected) ---');
const tamperedCanon = canonicalBytes(actionPayload);
tamperedCanon[3] ^= 0x01;
const tamperedId = bytesToHex(taggedHash(VRT1_ACTION_TAG, tamperedCanon));
tamperedId !== aid2
  ? pass('tampered canonical -> different action_id (rejected)')
  : fail('tamper NOT detected');
const badSig = Uint8Array.from(sig);
badSig[10] ^= 0x01;
schnorr.verify(badSig, hexToBytes(aid2), hexToBytes(agentPubXOnly))
  ? fail('bad signature accepted')
  : pass('flipped sig byte -> Schnorr rejects');
let curBad = dblSha256(concatBytes(new Uint8Array([0x00]), demoLeafA));
for (let i = 0; i < proofSiblings.length; i++) {
  curBad =
    proofDirs[i] === 0
      ? dblSha256(concatBytes(new Uint8Array([0x01]), curBad, proofSiblings[i]))
      : dblSha256(concatBytes(new Uint8Array([0x01]), proofSiblings[i], curBad));
}
bytesToHex(curBad) !== bytesToHex(batchRoot)
  ? pass('wrong leaf -> inclusion proof rejected')
  : fail('wrong leaf accepted');

// ---------------------------------------------------------------------------
// 3e. Verify-from-chain (live, read-only): parse VERITAS' real mainnet anchor
//     This is NOT our batch; it proves the on-chain payload parses per §5.1
//     and that our builder produces the same wire format as a real anchor.
// ---------------------------------------------------------------------------
console.log('--- verify-from-chain (live mainnet anchor, read-only) ---');
const VERITAS_MAINNET_ANCHOR_TXID =
  '92b2c4e434ae347f867e36a5ec7a1b608fd35ca45158caa258638c82215aafa0';
let chainVerify = null;
try {
  const res = await fetch(`https://mempool.space/api/tx/${VERITAS_MAINNET_ANCHOR_TXID}`, {
    signal: AbortSignal.timeout(15000),
  });
  const tx = await res.json();
  const opOut = (tx.vout || []).find((vo) => vo.scriptpubkey && vo.scriptpubkey.startsWith('6a'));
  if (!opOut) throw new Error('no OP_RETURN output in tx');
  const payload = Uint8Array.from(Buffer.from(opOut.scriptpubkey.slice(4), 'hex'));
  const dv = new DataView(payload.buffer);
  chainVerify = {
    txid: tx.txid,
    confirmed: tx.status && tx.status.confirmed === true,
    block_height: tx.status ? tx.status.block_height : null,
    tag: new TextDecoder().decode(payload.slice(0, 4)),
    version: payload[4],
    epoch: Number(dv.getBigUint64(5, false)),
    leaf_count: dv.getUint32(13, false),
    merkle_root_hex: bytesToHex(payload.slice(17)),
    payload_length: payload.length,
  };
  const conforms =
    chainVerify.confirmed &&
    chainVerify.tag === 'VRT1' &&
    chainVerify.version === 1 &&
    chainVerify.payload_length === 49 &&
    chainVerify.leaf_count >= 1;
  conforms
    ? pass(
        `real on-chain anchor parses per §5.1: ${chainVerify.txid.slice(0, 16)}… block ${chainVerify.block_height} epoch ${chainVerify.epoch} leaves ${chainVerify.leaf_count} root ${chainVerify.merkle_root_hex.slice(0, 16)}…`
      )
    : fail('on-chain anchor does not conform to §5.1');
} catch (e) {
  console.log(
    `  SKIP  live chain check unreachable (${e.message}); offline format check covered by op_return vector`
  );
}

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
  nostr_event: nostrEvent,
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
  chain_verify_live: chainVerify
    ? {
        txid: chainVerify.txid,
        confirmed: chainVerify.confirmed,
        block_height: chainVerify.block_height,
        epoch: chainVerify.epoch,
        leaf_count: chainVerify.leaf_count,
        merkle_root_hex: chainVerify.merkle_root_hex,
        payload_length: chainVerify.payload_length,
        note: 'VERITAS mainnet anchor (read-only parse per §5.1); NOT our batch',
      }
    : { note: 'live chain check unreachable; offline format check covered by op_return vector' },
};
writeFileSync(join(__dirname, 'vrt1-action.json'), JSON.stringify(record, null, 2));
writeFileSync(join(__dirname, 'anchor-epoch.json'), JSON.stringify(anchor, null, 2));

console.log('  wrote vrt1-action.json');
console.log('  wrote anchor-epoch.json');
console.log('');
const allOk = process.exitCode !== 1;
console.log(allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED');
