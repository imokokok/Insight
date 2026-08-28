// Build the VRT1 §8.5 key_registry_snapshot GENESIS for Insight.
//
// Per VRT1 §8.5:
//   - the signing agent key MUST appear in params.snapshot.keys (key_type
//     secp256k1_xonly) or the registry still has nothing binding the signer
//     to Insight — the circularity moves up one level instead of going away
//   - a second, air-gapped recovery key is listed from genesis (cheap now,
//     impossible later; the design has no recovery path otherwise)
//   - genesis: no parent_action (omitted, never null), signed by the agent key
//   - integer Unix timestamps; custody declared honestly
//
// Keys:
//   - agent key:   ~/.workbuddy/veritas_deliverable/vrt1-agent-keys/agent-key.priv.hex
//   - recovery key: same dir /recovery-key.priv.hex
//   - attester keys: live production registry (oracleinsight.xyz)
//
// Run:
//   node build-genesis.mjs [--ts <unix_seconds>] [--out <path>]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { schnorr } from '@noble/curves/secp256k1';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import {
  buildActionPayload,
  canonicalBytes,
  actionId,
  normalizeHex,
  AUX_RAND,
} from '../src/vrt1-encoding.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};
const tsOverride = arg('--ts');
const outPath = arg('--out') || join(__dirname, '../evidence/registry-genesis.json');
const REGISTRY_URL = 'https://www.oracleinsight.xyz/.well-known/oracle-keys.json';

const REGISTRY = await (async () => {
  const res = await fetch(REGISTRY_URL, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`registry fetch failed: ${res.status}`);
  return res.json();
})();

const keyDir = join(homedir(), '.workbuddy/veritas_deliverable/vrt1-agent-keys');
const agentPriv = hexToBytes(readFileSync(join(keyDir, 'agent-key.priv.hex'), 'utf8').trim());
const agentPub = bytesToHex(schnorr.getPublicKey(agentPriv));
const recoveryPub = bytesToHex(
  schnorr.getPublicKey(
    hexToBytes(readFileSync(join(keyDir, 'recovery-key.priv.hex'), 'utf8').trim())
  )
);

const attesters = (REGISTRY.public_keys || REGISTRY.keys || []).map((k) => ({
  key_id: k.key_id,
  key_type: 'eth_address',
  public_key: normalizeHex(k.public_key || k.attester),
  custody: 'hot_process', // honest: Vercel env var / process memory, signs per request
  revoked: false,
  valid_from: Math.floor(Date.parse(k.validFrom) / 1000),
  valid_until: k.validUntil ? Math.floor(Date.parse(k.validUntil) / 1000) : null,
}));

const keys = [
  ...attesters,
  {
    key_id: 'vrt1-agent',
    key_type: 'secp256k1_xonly',
    public_key: agentPub,
    // honest: generated on a local machine, held offline, never on the request
    // path. Declared `offline`, not `air_gapped`, because it touched a networked
    // host at generation time.
    custody: 'offline',
    revoked: false,
    valid_from: Math.floor(Date.now() / 1000),
    valid_until: null,
  },
  {
    key_id: 'vrt1-agent-recovery',
    key_type: 'secp256k1_xonly',
    public_key: recoveryPub,
    custody: 'offline',
    revoked: false,
    valid_from: Math.floor(Date.now() / 1000),
    valid_until: null,
  },
];

const ts = tsOverride ? Number(tsOverride) : Math.floor(Date.now() / 1000);
const payload = buildActionPayload({
  agent: agentPub,
  action_type: 'key_registry_snapshot',
  outcome: {
    active_count: keys.filter((k) => !k.revoked).length,
    revoked_count: keys.filter((k) => k.revoked).length,
  },
  params: { snapshot: { keys, schema_version: 1, ts } },
  target: 'insight.key-registry',
  ts,
});

const canonHex = bytesToHex(canonicalBytes(payload));
const aid = actionId(payload);
// Production signing: fresh randomness for aux_rand (32 zero bytes is the
// vectors' reproducibility convention, not a production rule).
const sig = bytesToHex(schnorr.sign(hexToBytes(aid), agentPriv, randomBytes(32)));

const genesis = {
  // No draft flag: the genesis is anchored (block 964,407), a "draft" label on
  // the trust root of the whole key history would be wrong.
  // NOTE: do not re-run this script for the real
  // genesis - a fresh ts would change the action_id away from the anchored
  // 87b750e4...
  record_type: 'key_registry_snapshot',
  action: payload,
  action_id_hex: aid,
  canonical_bytes_hex: canonHex,
  canonical_byte_length: canonHex.length / 2,
  agent_pubkey_xonly_hex: agentPub,
  sig_hex: sig,
  note: 'Genesis snapshot. No parent_action (omitted, never null). Agent key listed in keys (secp256k1_xonly) so the registry binds its own signer; a second recovery key is listed from genesis because the design has no recovery path otherwise. Signed by the agent key with fresh aux_rand.',
};
writeFileSync(outPath, JSON.stringify(genesis, null, 2));
console.log(`agent pubkey   : ${agentPub}`);
console.log(`recovery pubkey: ${recoveryPub}`);
console.log(`keys: ${keys.length} (${keys.map((k) => `${k.key_type}/${k.custody}`).join(', ')})`);
console.log(`action_id: ${aid}`);
console.log(`canonical: ${genesis.canonical_byte_length} bytes`);
console.log(`sig (outer Schnorr): ${sig.slice(0, 32)}…`);
console.log(`wrote ${outPath}`);
