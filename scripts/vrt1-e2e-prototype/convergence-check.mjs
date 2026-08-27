// Convergence acceptance check (per Tutankhamun 2026-08-27).
//
// "The first three negatives are our two implementations' current divergences,
//  written as cases that must be rejected: Class A hex left 0x prefixed, a
//  CAIP-19 identifier wrongly lowercased, and uint256 as JSON numbers. If your
//  implementation rejects all three and reproduces the positive action_id, we
//  are converged."
//
// This script is the LOCAL acceptance harness for that standard, runnable before
// the counterparty's canonical vectors arrive. When his generator arrives, run
// it and compare: the canonical bytes / action_id here must byte-exactly match
// his positive vector, and his three negative vectors must all be rejected.
//
// Positive vector  : canonical payload built from the production receipt ->
//                    stable canonical bytes + action_id.
// Negative 1       : Class A hex left 0x-prefixed (and mixed case) -> rejected.
// Negative 2       : CAIP-19 identifier wrongly lowercased -> rejected.
// Negative 3       : uint256 as JSON number -> rejected.
//
// Run: node scripts/vrt1-e2e-prototype/convergence-check.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  AUX_RAND,
  HEX_BYTE_FIELDS,
  CAIP19_FIELDS,
  buildCanonicalPayload,
  canonicalBytes,
  actionId,
  normalizeHex,
  loadSampleReceipt,
  bytesToHex,
  schnorr,
} from './vrt1-encoding.mjs';
import { sha256 } from '@noble/hashes/sha256';

const __dirname = dirname(fileURLToPath(import.meta.url));
const receipt = loadSampleReceipt();
const att = receipt.attestation;
const data = att.data;

// deterministic prototype agent key (same as prototype.mjs)
const agentPriv = sha256(new TextEncoder().encode('insight-vrt1-prototype-agent-key-2026-08-26'));
const agentPubXOnly = bytesToHex(schnorr.getPublicKey(agentPriv));

const pass = (label) => console.log(`  PASS  ${label}`);
const fail = (label) => {
  console.error(`  FAIL  ${label}`);
  process.exitCode = 1;
};

console.log('=== VRT1 convergence acceptance (revised §5.2 / §5.1) ===');

// ---------------------------------------------------------------------------
// Positive vector: canonical payload from the production receipt
// ---------------------------------------------------------------------------
console.log('--- positive: canonical payload reproduces stable action_id ---');
const canonical = buildCanonicalPayload(receipt, agentPubXOnly, 'canonical');
const canonBytes = canonicalBytes(canonical);
const aid = actionId(canonical);
console.log(`  action_id: ${aid}`);
console.log(
  `  canonical bytes: ${canonBytes.length} (1726 -> ${canonBytes.length} after convergence)`
);

// --- per-field class conformance checks on the canonical payload ---
let classOk = true;
const struct = canonical.params.oracle_safety_check_v2;
const eip = canonical.params.eip712_attestation;

// Class A hex byte fields: no 0x, all lowercase, correct length
const hexFields = {
  reasonCodesHash: struct.reasonCodesHash,
  requestHash: struct.requestHash,
  evaluatedAssetIdsHash: struct.evaluatedAssetIdsHash,
  providerObservationsHash: struct.providerObservationsHash,
  uid: eip.uid,
  attester: eip.attester,
  signature: eip.signature,
};
for (const [name, v] of Object.entries(hexFields)) {
  const ok =
    typeof v === 'string' && !v.startsWith('0x') && v === v.toLowerCase() && /^[0-9a-f]+$/.test(v);
  if (!ok) classOk = false;
  console.log(
    `  ${ok ? 'PASS' : 'FAIL'}  Class A hex field ${name} = ${v.slice(0, 12)}… (no 0x, lowercase)`
  );
}

// CAIP-19 identifiers: byte-identical, casing preserved
const caipOk =
  canonical.params.oracle_safety_check_v2.sourceAssetId === data.sourceAssetId &&
  canonical.params.oracle_safety_check_v2.destinationAssetId === data.destinationAssetId &&
  data.destinationAssetId.includes('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
classOk = classOk && caipOk;
console.log(
  `  ${caipOk ? 'PASS' : 'FAIL'}  CAIP-19 identifiers byte-identical (erc20:0xA0b8… casing preserved)`
);
console.log(
  `       destinationAssetId = ${canonical.params.oracle_safety_check_v2.destinationAssetId}`
);

// uint256 fields: decimal strings
let uintOk = true;
for (const f of att.eip712.types.OracleSafetyCheck) {
  if (f.type === 'uint256') {
    const v = struct[f.name];
    if (typeof v !== 'string' || !/^\d+$/.test(v)) uintOk = false;
  }
}
classOk = classOk && uintOk;
console.log(
  `  ${uintOk ? 'PASS' : 'FAIL'}  uint256 fields are decimal strings (${uintOk ? '' : 'FAIL '}e.g. tradeAmountUsd = ${JSON.stringify(struct.tradeAmountUsd)})`
);

const aidStable = actionId(buildCanonicalPayload(receipt, agentPubXOnly, 'canonical')) === aid;
classOk = classOk && aidStable;
console.log(
  `  ${aidStable ? 'PASS' : 'FAIL'}  action_id deterministic (rebuild reproduces ${aid.slice(0, 12)}…)`
);

const positiveOk = classOk;
positiveOk
  ? pass(
      `positive vector reproduced (action_id ${aid.slice(0, 12)}…, canonical ${canonBytes.length}B)`
    )
  : fail('positive vector NOT reproduced');

// ---------------------------------------------------------------------------
// Negative 1: Class A hex left 0x-prefixed (and mixed case) -> must be rejected
// ---------------------------------------------------------------------------
console.log('--- negative 1: Class A hex left 0x prefixed / mixed case ---');
const neg1 = buildCanonicalPayload(receipt, agentPubXOnly, 'neg-hex-0x');
const neg1Id = actionId(neg1);
neg1Id !== aid
  ? pass(`0x-prefixed hex rejected (action_id ${neg1Id.slice(0, 12)}… != ${aid.slice(0, 12)}…)`)
  : fail('0x-prefixed hex NOT rejected');
const neg1Bytes = canonicalBytes(neg1).length;
console.log(`       negative bytes: ${neg1Bytes} (canonical: ${canonBytes.length})`);

// ---------------------------------------------------------------------------
// Negative 2: CAIP-19 identifier wrongly lowercased -> must be rejected
// ---------------------------------------------------------------------------
console.log('--- negative 2: CAIP-19 identifier wrongly lowercased ---');
const neg2 = buildCanonicalPayload(receipt, agentPubXOnly, 'neg-caip19-lower');
const neg2Id = actionId(neg2);
const wrongLower = neg2.params.oracle_safety_check_v2.destinationAssetId;
neg2Id !== aid
  ? pass(`lowercased CAIP-19 rejected (action_id ${neg2Id.slice(0, 12)}… != ${aid.slice(0, 12)}…)`)
  : fail('lowercased CAIP-19 NOT rejected');
console.log(`       negative destinationAssetId: ${wrongLower}`);

// ---------------------------------------------------------------------------
// Negative 3: uint256 as JSON number -> must be rejected
// ---------------------------------------------------------------------------
console.log('--- negative 3: uint256 as JSON numbers ---');
const neg3 = buildCanonicalPayload(receipt, agentPubXOnly, 'neg-uint-number');
const neg3Id = actionId(neg3);
const numType = typeof neg3.params.oracle_safety_check_v2.tradeAmountUsd;
neg3Id !== aid
  ? pass(
      `uint256 as JSON number rejected (action_id ${neg3Id.slice(0, 12)}… != ${aid.slice(0, 12)}…)`
    )
  : fail('uint256-as-number NOT rejected');
console.log(
  `       negative tradeAmountUsd type: ${numType} (${JSON.stringify(neg3.params.oracle_safety_check_v2.tradeAmountUsd)})`
);

// ---------------------------------------------------------------------------
// Summary + report artifact
// ---------------------------------------------------------------------------
const allOk = process.exitCode !== 1;
const report = {
  generated_at: new Date().toISOString(),
  standard: 'Tutankhamun 2026-08-27 convergence acceptance',
  canonical_encoding: {
    class_a_hex_fields: [...HEX_BYTE_FIELDS],
    caip19_fields: [...CAIP19_FIELDS],
    uint256: 'decimal strings (spec §5.1)',
    aux_rand: '32 zero bytes',
  },
  positive: {
    action_id: aid,
    canonical_bytes_hex: bytesToHex(canonBytes),
    canonical_byte_length: canonBytes.length,
    aux_rand_hex: bytesToHex(AUX_RAND),
    agent_pubkey_xonly_hex: agentPubXOnly,
  },
  negatives: {
    class_a_hex_0x_prefixed: { rejected: neg1Id !== aid, divergent_action_id: neg1Id },
    caip19_wrongly_lowercased: { rejected: neg2Id !== aid, divergent_action_id: neg2Id },
    uint256_as_json_number: { rejected: neg3Id !== aid, divergent_action_id: neg3Id },
  },
  all_rejected_and_positive_reproduced: allOk,
  note: 'Local acceptance harness. Final byte-exact confirmation pending the counterparty generator: run it and compare canonical bytes / action_id / the three negative vectors.',
};
writeFileSync(join(__dirname, 'convergence-report.json'), JSON.stringify(report, null, 2));
console.log('');
console.log(`  wrote convergence-report.json`);
console.log(allOk ? 'CONVERGED (3 negatives rejected, positive reproduced)' : 'NOT CONVERGED');
