const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const categorizedExports = JSON.parse(fs.readFileSync('/tmp/categorized-exports.json', 'utf8'));

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

function checkUsageInOtherFiles(filePath, exportName) {
  try {
    const result = execSync(
      `grep -r "${exportName}" src/ --include="*.ts" --include="*.tsx" --exclude-dir=node_modules | grep -v "${filePath}" | grep -v "__tests__" | head -n 10`,
      { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const lines = result
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);

    const usageLines = lines.filter((line) => {
      const match = line.match(/^(.+?):(\d+):(.+)$/);
      if (!match) return false;

      const [, file, lineNum, content] = match;

      if (
        content.includes(`import { ${exportName}`) ||
        content.includes(`import ${exportName}`) ||
        content.includes(`, ${exportName} }`) ||
        content.includes(`${name},`) ||
        content.includes(`${exportName}(`) ||
        content.includes(`.${exportName}`) ||
        content.includes(`[${exportName}]`)
      ) {
        return true;
      }

      return false;
    });

    return usageLines.length > 0;
  } catch (error) {
    return false;
  }
}

console.log('=== 深度验证未使用的工具函数 ===\n');

const trulyUnused = [];
const usedInternally = [];
const usedExternally = [];

const toCheck = categorizedExports.utils.slice(0, 30);

toCheck.forEach((item, index) => {
  console.log(`[${index + 1}/${toCheck.length}] 检查: ${item.name}`);

  const internalResult = checkUsageInFile(item.file, item.name);
  const externalUsed = checkUsageInOtherFiles(item.file, item.name);

  if (internalResult.used) {
    usedInternally.push({ ...item, ...internalResult });
    console.log(`  ✗ 在文件内部被使用 (${internalResult.count} 次)`);
  } else if (externalUsed) {
    usedExternally.push(item);
    console.log(`  ✗ 在其他文件中被使用`);
  } else {
    trulyUnused.push(item);
    console.log(`  ✓ 确实未使用`);
  }
});

console.log(`\n=== 验证结果 ===`);
console.log(`确实未使用: ${trulyUnused.length}`);
console.log(`在文件内部被使用: ${usedInternally.length}`);
console.log(`在其他文件中被使用: ${usedExternally.length}`);

if (usedInternally.length > 0) {
  console.log('\n在文件内部被使用的工具函数:');
  usedInternally.slice(0, 10).forEach((item) => {
    console.log(`  ${item.file}:${item.line} - ${item.name}`);
  });
}

if (usedExternally.length > 0) {
  console.log('\n在其他文件中被使用的工具函数:');
  usedExternally.slice(0, 10).forEach((item) => {
    console.log(`  ${item.file}:${item.line} - ${item.name}`);
  });
}

fs.writeFileSync('/tmp/truly-unused-utils.json', JSON.stringify(trulyUnused, null, 2));
console.log('\n确实未使用的工具函数已保存到 /tmp/truly-unused-utils.json');
