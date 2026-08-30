// 注册 pin（scale declaration）自洽性验证：仓库原文 / 公开 URL 载荷 / 已验证 sha 三者必须一致
// 用法: node verify-scale-pin.mjs
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');
const source = join(
  repoRoot,
  'scripts',
  'vrt1-e2e-prototype',
  'registration',
  'scale-declaration.json'
);
const generated = join(
  repoRoot,
  'src',
  'app',
  '.well-known',
  'vrt1-scale-declaration.json',
  'declaration.generated.ts'
);

// 2026-08-30 更新：status 行去掉 "awaiting registration submission"（VERITAS 指出该提法不成立），
// 改为记录「无提交待办 + 已选择列入 vrt1-spec vendor type 目录」。sha 随之改变，须重新送核。
const EXPECTED_SHA256 = '035144d0456d87066935a507ce8d3ed8bde8ea8c68d85fb64001c0cb8861594d';
const EXPECTED_BYTES = 7006;
const EXPECTED_FIELD_COUNT = 27;

let pass = 0,
  fail = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ` (got ${actual}, want ${expected})`}`);
  ok ? pass++ : fail++;
}

const raw = readFileSync(source, 'utf8');
const sha = createHash('sha256').update(raw, 'utf8').digest('hex');

check('pin 字节数', Buffer.byteLength(raw, 'utf8'), EXPECTED_BYTES);
check('pin sha256', sha, EXPECTED_SHA256);

const decl = JSON.parse(raw);
check('record_type', decl.record_type, 'insight.oracle-safety-check');
check('schema_version', decl.schema_version, 3);
check('signed_field_count', decl.eip712?.signed_field_count, EXPECTED_FIELD_COUNT);
const constant = (name) => (decl.policy_constants || []).find((c) => c.name === name)?.value;
check('policy constant: requiredParticipantCount', constant('requiredParticipantCount'), 3);
check('policy constant: requiredSourceGroupCount', constant('requiredSourceGroupCount'), 2);

// 公开 URL 载荷必须与仓库原文逐字节一致（否则 fetch 到的 sha 与已核对值不符）
const gen = readFileSync(generated, 'utf8');
const shaLine = gen.match(/export const SCALE_DECLARATION_SHA256: string =\s*'([0-9a-f]{64})';/);
check('生成文件含 sha 常量', Boolean(shaLine), true);
check('生成文件 sha 与原文一致', shaLine?.[1], sha);

const payloadMatch = gen.match(/^export const SCALE_DECLARATION_JSON: string = (".*");$/m);
check('生成文件含 JSON 载荷', Boolean(payloadMatch), true);
const payload = payloadMatch ? JSON.parse(payloadMatch[1]) : '';
check('载荷与原文逐字节一致', payload, raw);
check('载荷 sha256', createHash('sha256').update(payload, 'utf8').digest('hex'), EXPECTED_SHA256);

console.log(`\n结果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
