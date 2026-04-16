const fs = require('fs');
const path = require('path');

function checkUsageInFile(filePath, exportName) {
  const absolutePath = path.join('/Users/imokokok/Documents/insight', filePath);

  if (!fs.existsSync(absolutePath)) {
    return { used: false, reason: '文件不存在' };
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  const lines = content.split('\n');

  let usageCount = 0;
  const usages = [];

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    if (
      line.includes(`export const ${exportName}`) ||
      line.includes(`export let ${exportName}`) ||
      line.includes(`export var ${exportName}`) ||
      line.includes(`export function ${exportName}`) ||
      line.includes(`export class ${exportName}`) ||
      line.includes(`export interface ${exportName}`) ||
      line.includes(`export type ${exportName}`) ||
      line.includes(`export enum ${exportName}`)
    ) {
      return;
    }

    if (line.includes(`export {`) && line.includes(exportName)) {
      return;
    }

    const patterns = [
      new RegExp(`\\b${exportName}\\b(?=\\s*\\()`),
      new RegExp(`\\b${exportName}\\b(?=\\s*\\.)`),
      new RegExp(`\\b${exportName}\\b(?=\\s*\\[)`),
      new RegExp(`\\b${exportName}\\b(?=\\s*,)`),
      new RegExp(`\\b${exportName}\\b(?=\\s*;)`),
      new RegExp(`\\b${exportName}\\b(?=\\s*\\})`),
      new RegExp(`\\b${exportName}\\b(?=\\s*:)`),
      new RegExp(`\\.${exportName}\\b`),
      new RegExp(`\\[${exportName}\\]`),
      new RegExp(`,\\s*${exportName}\\b`),
      new RegExp(`\\b${exportName}\\s*,`),
      new RegExp(`\\b${exportName}\\s*\\(`),
    ];

    for (const pattern of patterns) {
      if (pattern.test(line)) {
        usageCount++;
        usages.push({ line: lineNum, content: line.trim() });
        break;
      }
    }
  });

  return { used: usageCount > 0, count: usageCount, usages };
}

const safeToDelete = JSON.parse(fs.readFileSync('/tmp/safe-to-delete.json', 'utf8'));

console.log('=== 深度验证未使用的常量 ===\n');

const trulyUnused = [];
const usedInternally = [];

const toCheck = safeToDelete.constants.slice(0, 20);

toCheck.forEach((item, index) => {
  console.log(`[${index + 1}/${toCheck.length}] 检查: ${item.name}`);

  const result = checkUsageInFile(item.file, item.name);

  if (result.used) {
    usedInternally.push({ ...item, ...result });
    console.log(`  ✗ 在文件内部被使用 (${result.count} 次)`);
    result.usages.slice(0, 3).forEach((usage) => {
      console.log(`    行 ${usage.line}: ${usage.content.substring(0, 60)}...`);
    });
  } else {
    trulyUnused.push(item);
    console.log(`  ✓ 确实未使用`);
  }
});

console.log(`\n=== 验证结果 ===`);
console.log(`确实未使用: ${trulyUnused.length}`);
console.log(`在文件内部被使用: ${usedInternally.length}`);

if (usedInternally.length > 0) {
  console.log('\n在文件内部被使用的常量:');
  usedInternally.forEach((item) => {
    console.log(`  ${item.file}:${item.line} - ${item.name} (${item.count} 次使用)`);
  });
}

fs.writeFileSync('/tmp/truly-unused-verified.json', JSON.stringify(trulyUnused, null, 2));
console.log('\n确实未使用的常量已保存到 /tmp/truly-unused-verified.json');
