const { execSync } = require('child_process');
const fs = require('fs');

const safeToDelete = JSON.parse(fs.readFileSync('/tmp/safe-to-delete.json', 'utf8'));

function isActuallyUsed(name, filePath) {
  try {
    const result = execSync(
      `grep -r "${name}" src/ --include="*.ts" --include="*.tsx" --exclude-dir=node_modules | grep -v "${filePath}" | head -n 5`,
      { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
    );

    const lines = result
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);

    const usageLines = lines.filter((line) => {
      const match = line.match(/^(.+?):(\d+):(.+)$/);
      if (!match) return false;

      const [, file, lineNum, content] = match;

      if (file.includes('__tests__')) return false;

      if (
        content.includes(`import { ${name}`) ||
        content.includes(`import ${name}`) ||
        content.includes(`, ${name} }`) ||
        content.includes(`${name},`) ||
        content.includes(`${name}(`) ||
        content.includes(`.${name}`) ||
        content.includes(`[${name}]`)
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

console.log('=== 验证未使用的常量 ===\n');

const trulyUnused = [];
const actuallyUsed = [];

const toCheck = safeToDelete.constants.slice(0, 20);

toCheck.forEach((item, index) => {
  console.log(`[${index + 1}/${toCheck.length}] 检查: ${item.name}`);

  const isUsed = isActuallyUsed(item.name, item.file);

  if (isUsed) {
    actuallyUsed.push(item);
    console.log(`  ✗ 实际被使用`);
  } else {
    trulyUnused.push(item);
    console.log(`  ✓ 确实未使用`);
  }
});

console.log(`\n=== 验证结果 ===`);
console.log(`确实未使用: ${trulyUnused.length}`);
console.log(`实际被使用: ${actuallyUsed.length}`);

if (actuallyUsed.length > 0) {
  console.log('\n实际被使用的常量:');
  actuallyUsed.forEach((item) => {
    console.log(`  ${item.file}:${item.line} - ${item.name}`);
  });
}

fs.writeFileSync('/tmp/truly-unused.json', JSON.stringify(trulyUnused, null, 2));
console.log('\n确实未使用的常量已保存到 /tmp/truly-unused.json');
