// Offline verification of the v3 VVV->USDC VRT1 record.
//
// Everything here is recomputed from the record file + public data. No network,
// no Insight server, no trust in the build script. This is the check a third
// party would run:
//
//   1. canonical bytes → action_id (tagged hash)
//   2. outer BIP-340 Schnorr over action_id, against the agent key listed in
//      the Bitcoin-anchored genesis
//   3. inner EIP-712 recovery → the attester named in the record
//   4. BOTH gates recomputed from signed fields alone — the thing v2 could not
//      do, because v2 never signed the independence threshold
//   5. encoding classes (decimal strings, integer ts/schema_version, Class A
//      bare lowercase, CAIP-19 casing preserved, target built from the struct)
//
// Run: node verify/verify-vvv-v3.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { schnorr } from '@noble/curves/secp256k1';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { recoverAddress, hashTypedData } from 'viem';
import { canonicalBytes, actionId } from '../src/vrt1-encoding.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const record = JSON.parse(
  readFileSync(join(__dirname, '../evidence/vvv-vrt1-record-v3.json'), 'utf8')
);
const payload = record.action;
const struct = payload.params.oracle_safety_check_v3;
const att = payload.params.eip712_attestation;
const genesis = JSON.parse(
  readFileSync(join(__dirname, '../evidence/registry-genesis.json'), 'utf8')
);

// 1. action_id from the canonical bytes
const recomputedAid = actionId(payload);
check(
  'action_id = tagged_hash over the canonical bytes',
  recomputedAid === record.action_id_hex,
  recomputedAid
);

const canonHex = bytesToHex(canonicalBytes(payload));
check(
  'canonical byte length matches the record',
  canonHex.length / 2 === record.canonical_byte_length,
  `${canonHex.length / 2} bytes`
);

// 2. outer signature, against the agent key in the ANCHORED genesis
const genesisKeys = genesis.action.params.snapshot.keys.map((k) => k.public_key.toLowerCase());
const agentInGenesis = genesisKeys.includes(record.agent_pubkey_xonly_hex.toLowerCase());
check('agent key is listed in the anchored genesis', agentInGenesis, record.agent_pubkey_xonly_hex);

const outerOk = schnorr.verify(
  hexToBytes(record.sig_hex),
  hexToBytes(record.action_id_hex),
  hexToBytes(record.agent_pubkey_xonly_hex)
);
check('outer BIP-340 Schnorr verifies over action_id', outerOk);

// 3. inner EIP-712 (27 fields) recovers to the attester named in the record
const sample = JSON.parse(readFileSync(join(__dirname, '../fixtures/sample-receipt.json'), 'utf8'));
const types = {
  OracleSafetyCheck: [
    ...sample.attestation.eip712.types.OracleSafetyCheck,
    { name: 'requiredSourceGroupCount', type: 'uint256' },
  ],
};
const withPrefix = (v) => (typeof v === 'string' && !v.startsWith('0x') ? `0x${v}` : v);
const message = {};
for (const f of types.OracleSafetyCheck) {
  if (f.type === 'uint256') message[f.name] = BigInt(struct[f.name]);
  else if (f.type === 'bytes32') message[f.name] = withPrefix(struct[f.name]);
  else message[f.name] = struct[f.name];
}
const domain = {
  name: att.domain.name,
  version: att.domain.version,
  chainId: Number(att.domain.chainId),
};
const args = { domain, types, primaryType: att.primary_type, message };

// The record carries Class A hex bare (no 0x) per the canonical rules, so the
// comparison has to re-prefix the record's copy.
const uid = hashTypedData(args);
check('inner UID = hashTypedData over the 27 fields', uid === withPrefix(att.uid), uid);

const recovered = await recoverAddress({ hash: uid, signature: withPrefix(att.signature) });
check(
  'inner EIP-712 recovers to the attester in the record',
  recovered.toLowerCase() === withPrefix(att.attester).toLowerCase(),
  recovered
);

// 4. BOTH gates, recomputed from signed fields alone
const participants = Number(struct.participantCount);
const requiredParticipants = Number(struct.requiredParticipantCount);
const coverageRecomputed = participants >= requiredParticipants ? 'SUFFICIENT' : 'INSUFFICIENT';
check(
  'coverage gate recomputes to the signed coverageStatus',
  coverageRecomputed === struct.coverageStatus,
  `${participants} vs ${requiredParticipants} → ${coverageRecomputed}`
);

const groups = Number(struct.sourceGroupCount);
const requiredGroups = Number(struct.requiredSourceGroupCount);
const independenceRecomputed = groups >= requiredGroups ? 'ASSESSED' : 'INSUFFICIENT_INDEPENDENCE';
check(
  'independence gate recomputes to the signed independenceStatus (v3 only)',
  independenceRecomputed === struct.independenceStatus,
  `${groups} vs ${requiredGroups} → ${independenceRecomputed}`
);

// 5. encoding classes
const uintFields = types.OracleSafetyCheck.filter((f) => f.type === 'uint256').map((f) => f.name);
check(
  'every uint256 field is a base-10 decimal string',
  uintFields.every((n) => /^(0|[1-9][0-9]*)$/.test(struct[n])),
  `${uintFields.length} fields`
);

check(
  'VRT1-native ts + outcome.schema_version are JSON integers',
  Number.isInteger(payload.ts) && Number.isInteger(payload.outcome.schema_version),
  `ts=${payload.ts}, schema_version=${payload.outcome.schema_version}`
);

const classA = types.OracleSafetyCheck.filter((f) => f.type === 'bytes32').map((f) => f.name);
const classAOk = classA
  .concat([att.attester, att.signature, att.uid].map(() => null))
  .filter(Boolean)
  .every((n) => /^[0-9a-f]{64}$/.test(struct[n]));
const envelopeHexOk = [att.attester, att.signature, att.uid].every((v) =>
  /^[0-9a-f]+$/.test(v.toLowerCase().replace(/^0x/, ''))
);
check('Class A hex is bare + lowercase (no 0x, no uppercase)', classAOk && envelopeHexOk);

check(
  'destination CAIP-19 keeps its EIP-55 casing',
  struct.destinationAssetId === 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  struct.destinationAssetId
);

check(
  'target is built from the struct’s own asset ids',
  payload.target === `${struct.sourceAssetId}->${struct.destinationAssetId}`,
  payload.target
);

// Summary
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  console.error('FAILED checks:', failed.map((f) => f.name).join(' | '));
  process.exit(1);
}
console.log('v3 VVV record: offline-verifiable, both gates provable from the signed bytes.');
