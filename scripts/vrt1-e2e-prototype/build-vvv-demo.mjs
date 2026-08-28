// VVV->USDC end-to-end VRT1 record (second-asset demo).
//
// Data: real production VVV->USDC BLOCK output collected 2026-08
// (an earlier delivery, kept outside this repository): sourceGroupCount=2 ==
// independence requirement, coverage INSUFFICIENT at 2/3 participants — the gate
// binds at its exact threshold and the coverage gate fails closed, so the
// verdict is BLOCK.
//
// Inner EIP-712: signed locally with a DEMO attester key, because the
// production attester private key is locked in Vercel env vars and cannot sign
// from here. The 26-field data is the real production output; the signature is
// a demonstration one. Outer VRT1: signed with the real agent key
// (299a3d33…, the key listed in the anchored genesis).
//
// Run: node build-vvv-demo.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { schnorr } from '@noble/curves/secp256k1';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { privateKeyToAccount } from 'viem/accounts';
import { hashTypedData, recoverAddress } from 'viem';
import {
  buildCanonicalPayload,
  canonicalBytes,
  actionId,
  canonicalize,
  taggedHash,
} from './vrt1-encoding.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Real production VVV->USDC BLOCK data (2026-08, sourceGroupCount=2)
const srcPath = process.env.VRT1_VVV_SOURCE;
if (!srcPath) {
  console.error(
    'Set VRT1_VVV_SOURCE to the pre-trade responses JSON.\n' +
      'This input lives outside the repository and is not redistributable, so it\n' +
      'is passed in rather than hard-coded.'
  );
  process.exit(1);
}
const src = JSON.parse(readFileSync(srcPath, 'utf8'));
const findVVV = (o) => {
  if (o === null || typeof o !== 'object') return null;
  if (o.sourceAssetId && String(o.sourceAssetId).includes('VVV')) return o;
  for (const v of Object.values(o)) {
    const r = findVVV(v);
    if (r) return r;
  }
  return null;
};
const vvvData = findVVV(src);
if (!vvvData || vvvData.verdict !== 'BLOCK') throw new Error('VVV BLOCK data not found');
console.log(
  'VVV production data: verdict',
  vvvData.verdict,
  '| sourceGroupCount',
  vvvData.sourceGroupCount,
  '| coverage',
  vvvData.coverageStatus,
  '| participants',
  vvvData.participantCount + '/' + vvvData.requiredParticipantCount
);

// Production EIP-712 schema (from the anchored sample receipt)
const sample = JSON.parse(readFileSync(join(__dirname, 'sample-receipt.json'), 'utf8'));
const att = sample.attestation;
const domain = att.eip712.domain;
const types = { OracleSafetyCheck: att.eip712.types.OracleSafetyCheck };
const primaryType = 'OracleSafetyCheck';

// Demo attester key (local, for the inner signature only)
const demoPriv = randomBytes(32);
const account = privateKeyToAccount('0x' + demoPriv.toString('hex'));
const attester = account.address;
console.log('demo attester (inner signer):', attester);

const message = {};
for (const f of types.OracleSafetyCheck) {
  message[f.name] = f.type === 'uint256' ? BigInt(vvvData[f.name]) : vvvData[f.name];
}
const signature = await account.signTypedData({ domain, types, primaryType, message });
const uid = hashTypedData({ domain, types, primaryType, message });

const receipt = {
  attestation: {
    uid,
    schemaVersion: 2,
    attester,
    attesterLabel: 'insight-oracle-safety-v2',
    signedAt: vvvData.checkedAt,
    validForSeconds: 600,
    validUntil: vvvData.validUntil,
    signature,
    verifyUrl: 'https://www.oracleinsight.xyz/api/v1/safety/attestation/verify',
    data: vvvData,
    eip712: { domain, types, primaryType },
  },
};

// Inner verify
const recovered = await recoverAddress({ hash: uid, signature });
if (recovered.toLowerCase() !== attester.toLowerCase()) throw new Error('inner recover mismatch');
console.log('inner EIP-712: recovers to demo attester ✓');

// Outer: real agent key from the anchored genesis
const keyDir = join(homedir(), '.workbuddy/veritas_deliverable/vrt1-agent-keys');
const agentPriv = hexToBytes(readFileSync(join(keyDir, 'agent-key.priv.hex'), 'utf8').trim());
const agentPub = bytesToHex(schnorr.getPublicKey(agentPriv));

const payload = buildCanonicalPayload(receipt, agentPub);
const canonHex = bytesToHex(canonicalBytes(payload));
const aid = actionId(payload);
const sig = bytesToHex(schnorr.sign(hexToBytes(aid), agentPriv, randomBytes(32)));
const outerOk = schnorr.verify(hexToBytes(sig), hexToBytes(aid), hexToBytes(agentPub));
console.log('outer VRT1 Schnorr (real agent key):', outerOk ? 'verifies ✓' : 'FAIL');
console.log('agent pubkey:', agentPub);
console.log('action_id:', aid);
console.log('canonical:', canonHex.length / 2, 'bytes');

const record = {
  record_type: 'insight.oracle-safety-check',
  action: payload,
  action_id_hex: aid,
  canonical_bytes_hex: canonHex,
  canonical_byte_length: canonHex.length / 2,
  agent_pubkey_xonly_hex: agentPub,
  sig_hex: sig,
  note: 'VVV->USDC second-asset demo. Data = real production BLOCK output (2026-08, sourceGroupCount=2 == independence requirement; coverage INSUFFICIENT 2/3; verdict BLOCK). Inner EIP-712 signed with a DEMO attester key (production attester locked in Vercel env); outer signed with the real agent key listed in the anchored genesis.',
  gate_summary: {
    sourceGroupCount: vvvData.sourceGroupCount,
    independence_required: 2,
    gate_at_boundary: 'satisfied, not failed',
    coverage: vvvData.coverageStatus,
    participants: `${vvvData.participantCount}/${vvvData.requiredParticipantCount}`,
    verdict: vvvData.verdict,
    demonstrates: [
      'independence gate binds at its exact threshold',
      'coverage gate fails closed and verdict follows',
    ],
    does_not_demonstrate: 'independence failing (would need sourceGroupCount=1)',
  },
};
writeFileSync(join(__dirname, 'vvv-vrt1-record.json'), JSON.stringify(record, null, 2));
console.log('wrote vvv-vrt1-record.json');
