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
//
// action_type: key_registry_snapshot          (GENERIC per Tutankhamun 2026-08-28:
//   registered in VRT1 §8.5 as spec infrastructure, NOT namespaced under insight.* —
//   the registry problem is shared by every attester, namespacing would make
//   two identical records non-interoperable; type credited to Insight in §8.5)
// params:      { snapshot: { keys: [ {key_id, key_type, public_key, custody,
//                                     revoked, valid_from, valid_until} ... ],
//                             schema_version, ts } }
// outcome:     { active_count, revoked_count }   (MUST equal partition of keys on revoked)
// target:      "insight.key-registry"            (operator-chosen, stable across chain)
//
// Per VRT1 §8.5 (three calls adopted 2026-08-28, YuTao → Tutankhamun):
//   - valid_from / valid_until / ts are INTEGER Unix seconds (one instant, one spelling;
//     the draft's RFC 3339 strings had two formats in one field → two action_ids).
//   - key_type is required per key (eth_address: an Ethereum address is a hash of a
//     public key, and membership is not mechanisable without knowing which is held).
//   - custody is required per key (property of the key, anchored + chained for free;
//     vocabulary hot_process|kms|hsm|offline|air_gapped|unknown, unordered, no ranking).
//
// Run:
//   node scripts/vrt1-e2e-prototype/registry-snapshot.mjs \
//     [--registry <path|url>] [--out <path>] [--ts <unix_seconds>]
//
// Default input: the live production registry at oracleinsight.xyz (read-only).
// --ts pins the record timestamp so the output (and action_id) is deterministic.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildActionPayload,
  canonicalBytes,
  actionId,
  bytesToHex,
  demoAgentPubXOnly,
  normalizeHex,
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
const tsOverride = arg('--ts');

async function loadRegistry() {
  if (input && !input.startsWith('http')) {
    return JSON.parse(readFileSync(input, 'utf8'));
  }
  const url = input || REGISTRY_URL;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`registry fetch failed: ${res.status}`);
  return res.json();
}

// §8.5: integer Unix seconds — one instant, exactly one spelling. Accepts either
// a bare number (already canonical) or an RFC 3339 string (draft format, normalised
// here). "2026-08-05" is parsed as UTC midnight by Date.parse.
const toUnixSeconds = (s) => {
  if (s === null || s === undefined) return null;
  if (typeof s === 'number') return Math.floor(s);
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) throw new Error(`unparseable timestamp: ${s}`);
  return Math.floor(ms / 1000);
};

const registry = await loadRegistry();
const keys = (registry.public_keys || registry.keys || []).map((k) => ({
  key_id: k.key_id,
  // §8.5: key_type required — Insight's keys are bare Ethereum addresses.
  key_type: 'eth_address',
  // Class A per the converged rules (Tutankhamun 2026-08-28): public_key is a
  // bare Ethereum address, same class as `attester` in the safety check —
  // strip 0x, lowercase. (Was shipped once as `0xa268676C…`, mixed case.)
  public_key: normalizeHex(k.public_key || k.attester),
  // §8.5: custody required per key — declared honestly: Vercel env var / process
  // memory, i.e. a hot process key (see 01 §5.2 / reply 2026-08-26).
  custody: 'hot_process',
  revoked: k.revoked ?? false,
  valid_from: toUnixSeconds(k.validFrom ?? k.valid_from),
  valid_until: toUnixSeconds(k.validUntil ?? k.valid_until),
}));

// DEMO agent key per the counterparty vectors (0x55..55, published deliberately)
const agentPubXOnly = demoAgentPubXOnly();

const ts = tsOverride ? Number(tsOverride) : Math.floor(Date.now() / 1000);
const snapshot = {
  keys,
  schema_version: 1,
  ts,
};
const payload = buildActionPayload({
  agent: agentPubXOnly,
  action_type: 'key_registry_snapshot',
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
  // §8.5 note (Tutankhamun 2026-08-28): schema_version inside the signed payload is
  // authoritative; a ':v1' suffix on record_type would be file metadata living outside
  // the signature, so it is dropped here to keep a single version dial.
  record_type: 'key_registry_snapshot',
  action: payload,
  action_id_hex: aid,
  canonical_bytes_hex: canonHex,
  canonical_byte_length: canonHex.length / 2,
  agent_pubkey_xonly_hex: agentPubXOnly,
  draft: true,
  note: 'VRT1 §8.5 key_registry_snapshot (generic, credited to Insight). Integer Unix timestamps + key_type + custody per §8.5 calls adopted 2026-08-28. Interop: action_id 39f0508bb57fef962bb9bfb9923ffc220b456597443161a5ea633888a388ce83 (700B) matches counterparty registration_candidate.',
};
writeFileSync(outPath, JSON.stringify(record, null, 2));

console.log(`registry source: ${input || REGISTRY_URL}`);
console.log(
  `  keys: ${keys.length} (active ${record.action.outcome.active_count}, revoked ${record.action.outcome.revoked_count})`
);
for (const k of keys) {
  console.log(
    `    ${k.key_id}: ${k.public_key.slice(0, 10)}… ${k.key_type}/${k.custody} valid_until=${k.valid_until ?? '∞'} revoked=${k.revoked}`
  );
}
console.log(`action_type: key_registry_snapshot (generic, VRT1 §8.5, credited to Insight)`);
console.log(`action_id:   ${aid}`);
console.log(`canonical:   ${canonHex.length / 2} bytes`);
console.log(`  wrote ${outPath}`);
