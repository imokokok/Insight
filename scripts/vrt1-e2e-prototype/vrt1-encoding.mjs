// VRT1 canonical encoding shared module.
//
// Single source of truth for the canonical encoding rules agreed with
// Tutankhamun (VERITAS) on 2026-08-27:
//
//   Class A (hex-encoded byte fields) -> strip 0x, lowercase:
//     the four evidence hashes (reasonCodesHash, requestHash,
//     evaluatedAssetIdsHash, providerObservationsHash), the uid, the attester
//     address and the EIP-712 signature.
//
//   CAIP-19 identifiers -> byte-identical, casing preserved:
//     eip155:1/erc20:0xA0b8... : the 0x is part of the identifier and the
//     EIP-55 mixed casing carries meaning. Lowercasing does not normalise an
//     encoding, it changes an identifier.
//
//   uint256 -> decimal strings (spec §5.1).
//
// Used by prototype.mjs (real path), registry-snapshot.mjs and build-genesis.mjs.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import canonicalize from 'canonicalize';
import { schnorr } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes, concatBytes } from '@noble/hashes/utils';

const __dirname = dirname(fileURLToPath(import.meta.url));
export { canonicalize };

export const VRT1_ACTION_TAG = 'VRT1/agent-action';
// Per Tutankhamun (2026-08-27): the aux_rand for the Schnorr signatures is
// thirty two zero bytes. Without it you produce a valid signature that is not
// the same signature.
export const AUX_RAND = new Uint8Array(32); // 32 zero bytes

// ---- encoding rule classes (two literal sets, as in the counterparty generator) ----
export const HEX_BYTE_FIELDS = new Set([
  'reasonCodesHash',
  'requestHash',
  'evaluatedAssetIdsHash',
  'providerObservationsHash',
  'uid',
  'attester',
  'signature',
]);
export const CAIP19_FIELDS = new Set(['sourceAssetId', 'destinationAssetId']);

export const normalizeHex = (v) => String(v).toLowerCase().replace(/^0x/, '');
export const toDecimalString = (v) => String(BigInt(v));

// tagged_hash(tag, msg) = SHA256(SHA256(tag) || SHA256(tag) || msg)
export function taggedHash(tag, msg) {
  const t = sha256(new TextEncoder().encode(tag));
  return sha256(concatBytes(t, t, msg));
}

// Merkle: RFC-6962 prefixes + Bitcoin-style odd-leaf duplication, d = double SHA-256
export function dblSha256(b) {
  return sha256(sha256(b));
}

export function merkleRoot(leaves /* array of Uint8Array 32B */) {
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
export function buildOpReturn(epoch, leafCount, rootHex) {
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

// Build a VRT1 agent action payload object (per §8.1)
export function buildActionPayload(overrides) {
  return {
    action_type: overrides.action_type || 'insight.oracle-safety-check',
    agent: overrides.agent,
    outcome: overrides.outcome,
    params: overrides.params,
    target: overrides.target,
    ts: overrides.ts,
    v: 1,
  };
}

export function canonicalBytes(payload) {
  return new TextEncoder().encode(canonicalize(payload));
}

// action_id := hex(tagged_hash("VRT1/agent-action", canonical_json(payload)))
export function actionId(payload) {
  return bytesToHex(taggedHash(VRT1_ACTION_TAG, canonicalBytes(payload)));
}

// Build the canonical payload from a production receipt, byte-exact to the
// counterparty generator (gen-insight-vectors.py, Tutankhamun 2026-08-27):
//   - agent key: DEMO 0x55..55 (published so vectors are reproducible)
//   - eip712_attestation: {attester, signature, uid, signedAt, domain, primary_type}
//     (no verify_url; domain.chainId as decimal STRING)
//   - outcome.schema_version: NUMBER (schemaVersion, not a decimal string)
// `encode` lets the acceptance harness deliberately violate a rule to build a
// negative vector (default = canonical).
export function buildCanonicalPayload(receipt, agentPubXOnly, encode = 'canonical') {
  const att = receipt.attestation;
  const data = att.data;

  // per-field application of the class rules
  const applyValue = (f, raw) => {
    if (f.type === 'bytes32') {
      if (encode === 'neg-hex-0x') return raw; // negative: leave 0x + casing
      return normalizeHex(raw);
    }
    if (f.type === 'uint256') {
      if (encode === 'neg-uint-number') return Number(raw); // negative: JSON number
      return toDecimalString(raw);
    }
    if (encode === 'neg-caip19-lower' && CAIP19_FIELDS.has(f.name)) {
      // negative: wrongly lowercase a CAIP-19 identifier (field-type scoped,
      // per Tutankhamun 2026-08-28: only CAIP-19 fields, nothing else)
      return String(raw).toLowerCase();
    }
    return raw; // string: CAIP-19 etc, byte-identical
  };

  const structFields = {};
  for (const f of att.eip712.types.OracleSafetyCheck) {
    structFields[f.name] = applyValue(f, data[f.name]);
  }

  const eip = (v) => (encode === 'neg-hex-0x' ? v : normalizeHex(v));
  return buildActionPayload({
    agent: agentPubXOnly,
    outcome: { verdict: data.verdict, schema_version: data.schemaVersion }, // NUMBER
    params: {
      oracle_safety_check_v2: structFields,
      eip712_attestation: {
        attester: eip(att.attester),
        signature: eip(att.signature),
        uid: eip(att.uid),
        signedAt: att.signedAt,
        domain: {
          name: att.eip712.domain.name,
          version: att.eip712.domain.version,
          chainId: String(att.eip712.domain.chainId), // decimal STRING
        },
        primary_type: att.eip712.primaryType,
      },
    },
    target: `${structFields.sourceAssetId}->${structFields.destinationAssetId}`, // CAIP-19, casing preserved; built from the MUTATED struct so negatives exercise it (Tutankhamun 2026-08-28)
    ts: data.checkedAt,
  });
}

// DEMO agent key per the counterparty vectors (0x55..55, published deliberately).
export function demoAgentPubXOnly() {
  const seck = new Uint8Array(32).fill(0x55);
  return bytesToHex(schnorr.getPublicKey(seck));
}

// Load the bundled production sample receipt
export function loadSampleReceipt() {
  return JSON.parse(readFileSync(join(__dirname, 'sample-receipt.json'), 'utf8'));
}

export { schnorr, bytesToHex, hexToBytes };
