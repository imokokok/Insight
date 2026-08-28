// Round-3 自检：genesis 合规性 + 对方 round3 向量复算
// 用法: node verify-round3.mjs
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { schnorr } from '@noble/curves/secp256k1';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

const proto = '/Users/imokokok/Documents/insight/scripts/vrt1-e2e-prototype';
const r3 = join(proto, 'conformance-round3');

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}  ${detail}`); }
};

const th = createHash('sha256').update('VRT1/agent-action').digest();
const aid = (hex) => createHash('sha256').update(Buffer.concat([th, th, Buffer.from(hex, 'hex')])).digest('hex');

// 1. 我方 genesis 合规性
const g = JSON.parse(readFileSync(join(proto, 'registry-genesis.json'), 'utf8'));
check('genesis: action_id 复算', aid(g.canonical_bytes_hex) === g.action_id_hex);
check('genesis: 外层 Schnorr verify', schnorr.verify(hexToBytes(g.sig_hex), hexToBytes(g.action_id_hex), hexToBytes(g.agent_pubkey_xonly_hex)));
check('genesis: 无 parent_action', g.action.parent_action === undefined);
const kk = g.action.params.snapshot.keys;
check('genesis: agent 在 keys(secp256k1_xonly)', kk.some((k) => k.key_type === 'secp256k1_xonly' && k.public_key === g.agent_pubkey_xonly_hex));
check('genesis: recovery 在 keys', kk.some((k) => k.key_id === 'vrt1-agent-recovery' && k.key_type === 'secp256k1_xonly'));
check('genesis: counts == keys 分区', g.action.outcome.active_count === kk.filter((k) => !k.revoked).length && g.action.outcome.revoked_count === kk.filter((k) => k.revoked).length);
check('genesis: 全整数时间戳', kk.every((k) => Number.isInteger(k.valid_from) && (k.valid_until === null || Number.isInteger(k.valid_until))) && Number.isInteger(g.action.params.snapshot.ts) && Number.isInteger(g.action.ts));
check('genesis: snapshot.ts <= action.ts', g.action.params.snapshot.ts <= g.action.ts);
check('genesis: target 稳定', g.action.target === 'insight.key-registry');

// 2. 对方 round3 向量复算
const v = JSON.parse(readFileSync(join(r3, 'key_registry_snapshot.json'), 'utf8'));
for (const p of v.positives) check(`r3 正向量 ${p.action_id_hex.slice(0, 8)} (${p.canonical_bytes_len}B)`, aid(p.canonical_bytes_hex) === p.action_id_hex);
for (const n of v.negatives) check(`r3 负向量 ${n.action_id_hex.slice(0, 8)}: ${(n.case || '').slice(0, 40)}`, aid(n.canonical_bytes_hex) === n.action_id_hex);
for (const c of v.chain_negatives || []) check(`r3 chain negative ${c.action_id_hex.slice(0, 8)}: ${(c.case || '').slice(0, 40)}`, aid(c.canonical_bytes_hex) === c.action_id_hex);

console.log(`\n结果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
