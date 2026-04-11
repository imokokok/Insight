const fs = require('fs');
const path = require('path');

const projectRoot = '/Users/imokokok/Documents/foresight-build/insight/src';

function findFiles(dir, extensions) {
  let results = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next')) {
        results = results.concat(findFiles(filePath, extensions));
      }
    } else if (extensions.some((ext) => file.endsWith(ext))) {
      results.push(filePath);
    }
  }

  return results;
}

function analyzeFunctions(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const functions = [];

  const functionPatterns = [
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g,
    /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=]*)\s*=>/g,
    /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(/g,
    /(\w+)\s*:\s*(?:async\s+)?(?:\([^)]*\)|[^:]*)\s*=>/g,
    /(?:export\s+)?(?:async\s+)?(\w+)\s*\([^)]*\)\s*:\s*[^{]*\{/g,
  ];

  lines.forEach((line, lineIndex) => {
    functionPatterns.forEach((pattern) => {
      pattern.lastIndex = 0;
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        const funcName = match[1];
        const startLine = lineIndex + 1;

        let braceCount = 0;
        let foundOpenBrace = false;
        let endLine = startLine;

        for (let i = lineIndex; i < lines.length; i++) {
          const currentLine = lines[i];

          for (const char of currentLine) {
            if (char === '{') {
              braceCount++;
              foundOpenBrace = true;
            } else if (char === '}') {
              braceCount--;
            }
          }

          if (foundOpenBrace && braceCount === 0) {
            endLine = i + 1;
            break;
          }
        }

        const funcLines = endLine - startLine + 1;

        if (funcLines >= 100) {
          const existingFunc = functions.find(
            (f) => f.name === funcName && Math.abs(f.startLine - startLine) < 5
          );

          if (!existingFunc) {
            functions.push({
              name: funcName,
              startLine,
              endLine,
              lines: funcLines,
              file: filePath,
            });
          }
        }
      }
    });
  });

  return functions;
}

console.log('正在扫描项目文件...\n');

const files = findFiles(projectRoot, ['.ts', '.tsx', '.js', '.jsx']);
console.log(`找到 ${files.length} 个文件\n`);

const allFunctions = [];

for (const file of files) {
  const funcs = analyzeFunctions(file);
  allFunctions.push(...funcs);
}

const longFunctions = allFunctions.filter((f) => f.lines >= 100).sort((a, b) => b.lines - a.lines);

console.log('='.repeat(80));
console.log('超过 100 行的函数列表（按行数降序排列）');
console.log('='.repeat(80));
console.log('');

longFunctions.forEach((func, index) => {
  const relativePath = func.file.replace(projectRoot, 'src');
  console.log(`${index + 1}. ${func.name}`);
  console.log(`   文件: ${relativePath}`);
  console.log(`   行数: ${func.lines} 行 (第 ${func.startLine}-${func.endLine} 行)`);
  console.log('');
});

console.log('='.repeat(80));
console.log(`总计: ${longFunctions.length} 个超过 100 行的函数`);
console.log('='.repeat(80));

const veryLongFunctions = longFunctions.filter((f) => f.lines >= 500);
if (veryLongFunctions.length > 0) {
  console.log('\n');
  console.log('!'.repeat(80));
  console.log('超过 500 行的函数（严重过长）');
  console.log('!'.repeat(80));
  veryLongFunctions.forEach((func, index) => {
    const relativePath = func.file.replace(projectRoot, 'src');
    console.log(`${index + 1}. ${func.name} - ${func.lines} 行`);
    console.log(`   文件: ${relativePath}`);
  });
}

const output = {
  timestamp: new Date().toISOString(),
  totalFiles: files.length,
  totalLongFunctions: longFunctions.length,
  functionsOver500Lines: veryLongFunctions.length,
  functions: longFunctions.map((f) => ({
    name: f.name,
    file: f.file.replace(projectRoot, 'src'),
    lines: f.lines,
    startLine: f.startLine,
    endLine: f.endLine,
  })),
};

fs.writeFileSync(
  '/Users/imokokok/Documents/foresight-build/insight/function-analysis-report.json',
  JSON.stringify(output, null, 2)
);

console.log('\n详细报告已保存到: function-analysis-report.json');
