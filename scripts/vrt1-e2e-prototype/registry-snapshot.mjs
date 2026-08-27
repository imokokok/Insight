// Candidate canonical form for the anchored key registry snapshot.
//
// Proposal (Tutankhamun 2026-08-27, "the thing rotation does not fix"):
//   "A key registry snapshot is a small record, it changes rarely, and anchoring
//    it turns your key history into something a verifier can check against
//    Bitcoin instead of against your web server. It would make a clean second
//    record type alongside the safety check."
//
// This script builds that second record type as a VRT1 agent action, reusing
// the exact same canonical encoding rules as the safety check (vrt1-encoding.mjs).
// It is a DRAFT candidate for discussion, not a registration.
//
// action_type: insight.key-registry-snapshot   (namespaced, per agreed §8.4)
// params:      { keys: [ {key_id, public_key, valid_from, valid_until,
//                          revoked} ... ], schema_version }
// outcome:     { active_count, next_rotation_hint }  (compact summary)
// target:      "insight.key-registry"          (what the record is about)
//
// Run:
//   node scripts/vrt1-e2e-prototype/registry-snapshot.mjs \
//     [--registry <path|url>] [--out <path>]
//
// Default input: the live production registry at oracleinsight.xyz (read-only).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildActionPayload,
  canonicalBytes,
  actionId,
  bytesToHex,
  demoAgentPubXOnly,
} from './vrt1-encoding.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const REGISTRY_URL = 'https://www.oracleinsight.xyz/.well-known/oracle-keys.json';
const input = arg('--registry');
const outPath = arg('--out') || join(__dirname, 'registry-snapshot.json');

async function loadRegistry() {
  if (input && !input.startsWith('http')) {
    return JSON.parse(readFileSync(input, 'utf8'));
  }
  const url = input || REGISTRY_URL;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`registry fetch failed: ${res.status}`);
  return res.json();
}

const registry = await loadRegistry();
const keys = (registry.public_keys || registry.keys || []).map((k) => ({
  key_id: k.key_id,
  public_key: k.public_key || k.attester,
  valid_from: k.validFrom ?? null,
  valid_until: k.validUntil ?? null,
  revoked: k.revoked ?? false,
}));

// DEMO agent key per the counterparty vectors (0x55..55, published deliberately)
const agentPubXOnly = demoAgentPubXOnly();

const ts = Math.floor(Date.now() / 1000);
const snapshot = {
  keys,
  schema_version: 1,
  ts,
};
const payload = buildActionPayload({
  agent: agentPubXOnly,
  action_type: 'insight.key-registry-snapshot',
  outcome: {
    active_count: keys.filter((k) => !k.revoked).length,
    revoked_count: keys.filter((k) => k.revoked).length,
  },
  params: { snapshot },
  target: 'insight.key-registry',
  ts,
});

const canonHex = bytesToHex(canonicalBytes(payload));
const aid = actionId(payload);
const record = {
  record_type: 'insight.key-registry-snapshot:v1',
  action: payload,
  action_id_hex: aid,
  canonical_bytes_hex: canonHex,
  canonical_byte_length: canonHex.length / 2,
  agent_pubkey_xonly_hex: agentPubXOnly,
  draft: true,
  note: 'Candidate canonical form for the anchored key registry (2nd record type). For discussion with VERITAS; not a registration.',
};
writeFileSync(outPath, JSON.stringify(record, null, 2));

console.log(`registry source: ${input || REGISTRY_URL}`);
console.log(
  `  keys: ${keys.length} (active ${record.action.outcome.active_count}, revoked ${record.action.outcome.revoked_count})`
);
for (const k of keys) {
  console.log(
    `    ${k.key_id}: ${k.public_key.slice(0, 10)}… valid_until=${k.valid_until ?? '∞'} revoked=${k.revoked}`
  );
}
console.log(`action_type: insight.key-registry-snapshot`);
console.log(`action_id:   ${aid}`);
console.log(`canonical:   ${canonHex.length / 2} bytes`);
console.log(`  wrote ${outPath}`);
