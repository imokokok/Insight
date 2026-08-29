// VVV->USDC end-to-end VRT1 record, rebuilt at schema v3.
//
// Why this exists: VERITAS (2026-08-29) verified the v2 record and confirmed
// the coverage gate is provable from the signed bytes, but the independence
// gate is not — v2 signs `sourceGroupCount` (2) without signing the threshold
// it is compared against. "2 against a requirement of 2" was an assertion
// resting on our source code, not on the bytes.
//
// v3 adds exactly one signed field, `requiredSourceGroupCount`, next to
// `sourceGroupCount`. This script rebuilds the SAME production BLOCK data as
// `oracle_safety_check_v3` so the independence gate becomes checkable by
// anyone holding the record.
//
// Data: the real production VVV->USDC BLOCK output, read back out of the v2
// record this replaces (`evidence/vvv-vrt1-record.json`) — identical values,
// not a re-collection.
//
// Inner EIP-712: signed locally with a DEMO attester key (the production
// attester private key is locked in Vercel env vars). Outer VRT1: signed with
// the real agent key (299a3d33…, the key listed in the anchored genesis).
//
// Run: node build-vvv-v3-demo.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { schnorr } from '@noble/curves/secp256k1';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { privateKeyToAccount } from 'viem/accounts';
import { hashTypedData, recoverAddress } from 'viem';
import { buildCanonicalPayload, canonicalBytes, actionId } from '../src/vrt1-encoding.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Independence floor. MUST equal the constant the production engine enforces
// (V2_REQUIRED_NON_DERIVED_GROUPS = 2). If these ever drift, the signed field
// would be a lie, so assert it against the shipped source.
const V3_REQUIRED_SOURCE_GROUP_COUNT = 2;
const v2Src = readFileSync(
  join(__dirname, '../../../src/lib/attestations/oracleSafetyAttestationV2.ts'),
  'utf8'
);
const engineMatch = v2Src.match(/V2_REQUIRED_NON_DERIVED_GROUPS\s*=\s*(\d+)/);
if (!engineMatch) throw new Error('could not read V2_REQUIRED_NON_DERIVED_GROUPS from source');
if (Number(engineMatch[1]) !== V3_REQUIRED_SOURCE_GROUP_COUNT) {
  throw new Error(
    `signed threshold ${V3_REQUIRED_SOURCE_GROUP_COUNT} != engine constant ${engineMatch[1]}`
  );
}

// Production data: the 26 v2 fields, read back from the v2 record.
const v2Record = JSON.parse(
  readFileSync(join(__dirname, '../evidence/vvv-vrt1-record.json'), 'utf8')
);
const v2Data = v2Record.action.params.oracle_safety_check_v2;
if (v2Data.verdict !== 'BLOCK') throw new Error('expected the VVV BLOCK data');
console.log(
  'VVV production data: verdict',
  v2Data.verdict,
  '| sourceGroupCount',
  v2Data.sourceGroupCount,
  '| coverage',
  v2Data.coverageStatus,
  '| participants',
  `${v2Data.participantCount}/${v2Data.requiredParticipantCount}`
);

// v3 type layout = v2's 26 fields (same order, taken from the production
// sample receipt) + the threshold appended. Derived rather than re-typed so it
// cannot drift from the shipped schema.
const sample = JSON.parse(readFileSync(join(__dirname, '../fixtures/sample-receipt.json'), 'utf8'));
const types = {
  OracleSafetyCheck: [
    ...sample.attestation.eip712.types.OracleSafetyCheck,
    { name: 'requiredSourceGroupCount', type: 'uint256' },
  ],
};
if (types.OracleSafetyCheck.length !== 27) throw new Error('v3 must have 27 fields');

// Guard: every signed field must have a value in the production data.
for (const f of types.OracleSafetyCheck) {
  if (!(f.name in v2Data) && f.name !== 'requiredSourceGroupCount') {
    throw new Error(`v3 type names a field the production data lacks: ${f.name}`);
  }
}

// Domain: v3 bumps the EIP-712 domain version so a v2 verifier cannot be
// tricked into reading v3 bytes.
const domain = { name: 'Insight Oracle Safety', version: '3', chainId: 1 };
const primaryType = 'OracleSafetyCheck';

// v3 data = the same production evidence + threshold + schemaVersion 3.
const data = {
  ...v2Data,
  requiredSourceGroupCount: String(V3_REQUIRED_SOURCE_GROUP_COUNT),
  // NUMBER, not a decimal string: the VRT1-native `outcome.schema_version` is
  // a JSON integer (VRT1-native payloads). The struct's own uint256 field is decimal string.
  schemaVersion: 3,
  // Same reason: the record carries `ts` from checkedAt, and VRT1-native
  // integers stay JSON integers. The struct field stays a decimal
  // string (the encoder re-widens it).
  checkedAt: Number(v2Data.checkedAt),
};

// Demo attester key (local, for the inner signature only)
const demoPriv = randomBytes(32);
const account = privateKeyToAccount('0x' + demoPriv.toString('hex'));
const attester = account.address;

// The record stores hashes in canonical VRT1 form (bare 64 hex, no 0x);
// viem's EIP-712 layer needs them 0x-prefixed bytes32.
const withPrefix = (v) => (typeof v === 'string' && !v.startsWith('0x') ? `0x${v}` : v);

const message = {};
for (const f of types.OracleSafetyCheck) {
  if (f.type === 'uint256') message[f.name] = BigInt(data[f.name]);
  else if (f.type === 'bytes32') message[f.name] = withPrefix(data[f.name]);
  else message[f.name] = data[f.name];
}
const signature = await account.signTypedData({ domain, types, primaryType, message });
const uid = hashTypedData({ domain, types, primaryType, message });

const receipt = {
  attestation: {
    uid,
    schemaVersion: 3,
    attester,
    attesterLabel: 'insight-oracle-safety-v3',
    signedAt: Number(data.checkedAt),
    validForSeconds: 600,
    validUntil: Number(data.validUntil),
    signature,
    verifyUrl: 'https://www.oracleinsight.xyz/api/v1/safety/attestation/verify',
    data,
    eip712: { domain, types, primaryType },
  },
};

// Inner verify
const recovered = await recoverAddress({ hash: uid, signature });
if (recovered.toLowerCase() !== attester.toLowerCase()) throw new Error('inner recover mismatch');
console.log('inner EIP-712 (27 fields): recovers to demo attester ✓');

// Outer: real agent key from the anchored genesis
const keyDir = join(homedir(), '.workbuddy/veritas_deliverable/vrt1-agent-keys');
const agentPriv = hexToBytes(readFileSync(join(keyDir, 'agent-key.priv.hex'), 'utf8').trim());
const agentPub = bytesToHex(schnorr.getPublicKey(agentPriv));

const payload = buildCanonicalPayload(receipt, agentPub, 'canonical', 'oracle_safety_check_v3');
const canonHex = bytesToHex(canonicalBytes(payload));
const aid = actionId(payload);
const sig = bytesToHex(schnorr.sign(hexToBytes(aid), agentPriv, randomBytes(32)));
const outerOk = schnorr.verify(hexToBytes(sig), hexToBytes(aid), hexToBytes(agentPub));
if (!outerOk) throw new Error('outer Schnorr signature failed');
console.log('outer VRT1 Schnorr (real agent key): verifies ✓');
console.log('agent pubkey:', agentPub);
console.log('action_id:', aid);
console.log('canonical:', canonHex.length / 2, 'bytes');

// The claim this record is meant to make checkable: recompute the gate from
// the signed bytes alone, with no access to the Insight codebase.
const sgc = Number(data.sourceGroupCount);
const req = Number(data.requiredSourceGroupCount);
const recomputed = sgc >= req ? 'ASSESSED' : 'INSUFFICIENT_INDEPENDENCE';
if (recomputed !== data.independenceStatus) {
  throw new Error(`gate recompute mismatch: ${recomputed} != ${data.independenceStatus}`);
}
console.log(`independence gate recomputed from signed bytes: ${sgc} >= ${req} → ${recomputed} ✓`);

const record = {
  record_type: 'insight.oracle-safety-check',
  action: payload,
  action_id_hex: aid,
  canonical_bytes_hex: canonHex,
  canonical_byte_length: canonHex.length / 2,
  agent_pubkey_xonly_hex: agentPub,
  sig_hex: sig,
  note: 'VVV->USDC rebuilt at schema v3 (27 signed fields). Data = the same real production BLOCK output as the v2 record (sourceGroupCount=2; coverage INSUFFICIENT 2/3; verdict BLOCK), plus requiredSourceGroupCount=2 INSIDE the signed struct, so the independence gate is checkable from the bytes alone. Inner EIP-712 signed with a DEMO attester key (production attester locked in Vercel env); outer signed with the real agent key listed in the anchored genesis (block 964,407).',
  gate_summary: {
    sourceGroupCount: sgc,
    requiredSourceGroupCount: req,
    gate_at_boundary: 'satisfied, not failed',
    coverage: data.coverageStatus,
    participants: `${data.participantCount}/${data.requiredParticipantCount}`,
    verdict: data.verdict,
    demonstrates: [
      'coverage gate fails closed and verdict follows',
      'independence gate binds at its exact threshold, proven from the signed bytes',
    ],
    does_not_demonstrate: 'independence failing (would need sourceGroupCount=1)',
  },
  supersedes: {
    v2_action_id: v2Record.action_id_hex,
    v2_canonical_byte_length: v2Record.canonical_byte_length,
    why: 'v2 signed sourceGroupCount without the threshold it is compared against, so the independence gate was not verifiable by a third party.',
  },
};
writeFileSync(
  join(__dirname, '../evidence/vvv-vrt1-record-v3.json'),
  JSON.stringify(record, null, 2)
);
console.log('wrote vvv-vrt1-record-v3.json');
