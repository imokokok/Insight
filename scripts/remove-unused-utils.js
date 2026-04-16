const fs = require('fs');
const path = require('path');

const trulyUnusedUtils = JSON.parse(fs.readFileSync('/tmp/truly-unused-utils.json', 'utf8'));

function removeExportFromFile(filePath, exportName, lineNumber) {
  const absolutePath = path.join('/Users/imokokok/Documents/insight', filePath);

  if (!fs.existsSync(absolutePath)) {
    console.log(`文件不存在: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  const lines = content.split('\n');

  if (lineNumber > lines.length) {
    console.log(`行号超出范围: ${filePath}:${lineNumber}`);
    return false;
  }

  const targetLine = lines[lineNumber - 1];

  if (!targetLine.includes(exportName)) {
    console.log(`未找到导出: ${filePath}:${lineNumber} - ${exportName}`);
    return false;
  }

  const exportPatterns = [
    new RegExp(`^export\\s+const\\s+${exportName}\\s*=`),
    new RegExp(`^export\\s+let\\s+${exportName}\\s*=`),
    new RegExp(`^export\\s+var\\s+${exportName}\\s*=`),
    new RegExp(`^export\\s+function\\s+${exportName}\\s*\\(`),
    new RegExp(`^export\\s+async\\s+function\\s+${exportName}\\s*\\(`),
    new RegExp(`^export\\s+class\\s+${exportName}\\s*`),
  ];

  let isExport = false;
  for (const pattern of exportPatterns) {
    if (pattern.test(targetLine.trim())) {
      isExport = true;
      break;
    }
  }

  if (!isExport) {
    console.log(`不是导出语句: ${filePath}:${lineNumber} - ${exportName}`);
    return false;
  }

  let startLine = lineNumber - 1;
  let endLine = lineNumber - 1;

  let braceCount = 0;
  let parenCount = 0;
  let foundStart = false;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];

    for (const char of line) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
    }

    if (i === startLine) {
      foundStart = true;
    }

    if (foundStart && braceCount === 0 && parenCount === 0) {
      if (line.trim().endsWith(';') || line.trim().endsWith('}')) {
        endLine = i;
        break;
      }
    }
  }

  for (let i = startLine; i <= endLine; i++) {
    lines[i] = '';
  }

  const newContent = lines.join('\n');
  fs.writeFileSync(absolutePath, newContent, 'utf8');

  console.log(`✓ 已删除: ${filePath}:${lineNumber} - ${exportName}`);
  return true;
}

console.log('=== 开始删除未使用的工具函数 ===\n');

let deletedCount = 0;
let failedCount = 0;

const groupedByFile = {};
trulyUnusedUtils.forEach((item) => {
  if (!groupedByFile[item.file]) {
    groupedByFile[item.file] = [];
  }
  groupedByFile[item.file].push(item);
});

Object.keys(groupedByFile).forEach((file) => {
  const items = groupedByFile[file].sort((a, b) => b.line - a.line);

  items.forEach((item) => {
    const success = removeExportFromFile(item.file, item.name, item.line);
    if (success) {
      deletedCount++;
    } else {
      failedCount++;
    }
  });
});

console.log(`\n=== 删除完成 ===`);
console.log(`成功删除: ${deletedCount} 个工具函数`);
console.log(`删除失败: ${failedCount} 个工具函数`);
