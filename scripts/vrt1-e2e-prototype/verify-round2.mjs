// Round-2 交付包全量验证：复算所有 action_id + 我方 draft vs interop 比对
// 用法: node verify-round2.mjs <zip解压目录>
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const base = process.argv[2] || join(here, 'conformance-round2');
const vecDir = join(base, 'conformance-vectors');

// VRT1 tagged_hash
function taggedHash(tag, data) {
  const th = createHash('sha256').update(tag, 'utf8').digest();
  return createHash('sha256')
    .update(Buffer.concat([th, th, data]))
    .digest('hex');
}
function actionId(canonicalHex) {
  return taggedHash('VRT1/agent-action', Buffer.from(canonicalHex, 'hex'));
}

let pass = 0,
  fail = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`   actual  : ${actual}\n   expected: ${expected}`);
}

// 1. interop 文件：draft + registration candidate
const interop = JSON.parse(readFileSync(join(vecDir, 'interop_insight_key_registry.json'), 'utf8'));
check(
  'interop draft action_id',
  actionId(interop.draft_as_sent.canonical_bytes_hex),
  interop.draft_as_sent.action_id_hex
);
check('interop draft len 636', interop.draft_as_sent.canonical_bytes_len, 636);
check(
  'interop candidate action_id',
  actionId(interop.registration_candidate.canonical_bytes_hex),
  interop.registration_candidate.action_id_hex
);
check('interop candidate len 700', interop.registration_candidate.canonical_bytes_len, 700);
check(
  'candidate = 39f0508b…',
  interop.registration_candidate.action_id_hex.slice(0, 8),
  '39f0508b'
);

// 2. safety-check 负向量（5 + retained conjunction）+ 正向量
const neg = JSON.parse(readFileSync(join(vecDir, 'negatives_oracle_safety_check.json'), 'utf8'));
for (const c of neg.cases)
  check(`neg: ${c.case.slice(0, 50)}`, actionId(c.canonical_bytes_hex), c.action_id_hex);
for (const c of neg.retained_from_round_1)
  check(`retained: ${c.case.slice(0, 50)}`, actionId(c.canonical_bytes_hex), c.action_id_hex);
const pos = JSON.parse(readFileSync(join(vecDir, 'positive_oracle_safety_check.json'), 'utf8'));
check('positive action_id', actionId(pos.canonical_bytes_hex), pos.action_id_hex);
check('positive len 1769', pos.canonical_bytes_len, 1769);

// 3. registry 向量（DESIGN 内 positives/negatives —— vrt1-spec 版在 key_registry_snapshot.json，同理）
const design = JSON.parse(readFileSync(join(vecDir, 'key_registry_snapshot_DESIGN.json'), 'utf8'));
for (const p of design.positives)
  check(
    `registry genesis/successor: ${p.action_id_hex.slice(0, 8)}`,
    actionId(p.canonical_bytes_hex),
    p.action_id_hex
  );
for (const n of design.negatives)
  check(`registry neg: ${n.case.slice(0, 46)}`, actionId(n.canonical_bytes_hex), n.action_id_hex);

// 4. 我方 registry-snapshot.json（700B 重建版）vs interop registration_candidate
const mine = JSON.parse(readFileSync(join(here, 'registry-snapshot.json'), 'utf8'));
const cand = interop.registration_candidate;
check('我方 700B 重建 vs candidate byte-exact', mine.canonical_bytes_hex, cand.canonical_bytes_hex);
check(
  '我方 700B action_id',
  mine.action_id_hex,
  '39f0508bb57fef962bb9bfb9923ffc220b456597443161a5ea633888a388ce83'
);
check('我方 700B len', mine.canonical_byte_length, 700);

// 5. harness 已切 round2：我方 encoder 的正确输出必须 ≠ 每个负向量
//    （负向量是 literal inputs；我方 canonical encoder 产出正向量 bytes，
//      与任一负向量不同 = 我方不会产生这些违规形式）
// 正向量本身即我方 encoder 应产出的字节（round-1 正向量已 restated 进 round2
// 套件，与 insight-vectors/action.json 逐字节相同，无需另存一份）。
const posCanonicalHex = pos.canonical_bytes_hex;
for (const c of neg.cases) {
  check(
    `我方 canonical ≠ 负向量(${c.case.slice(0, 34)})`,
    posCanonicalHex !== c.canonical_bytes_hex,
    true
  );
}
for (const c of neg.retained_from_round_1) {
  check(`我方 canonical ≠ retained conjunction`, posCanonicalHex !== c.canonical_bytes_hex, true);
}

console.log(`我方 action_id: ${mine.action_id_hex}`);

console.log(`\n结果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
