const fs = require('fs');

const report = JSON.parse(fs.readFileSync('/tmp/knip-report.json', 'utf8'));

const summary = {
  unusedDependencies: [],
  unusedDevDependencies: [],
  unusedFiles: [],
  unusedExports: [],
  unusedTypes: [],
  duplicateExports: [],
  unlistedDependencies: [],
};

report.issues.forEach((issue) => {
  if (issue.dependencies && issue.dependencies.length > 0) {
    issue.dependencies.forEach((dep) => {
      summary.unusedDependencies.push({
        file: issue.file,
        name: dep.name,
      });
    });
  }

  if (issue.devDependencies && issue.devDependencies.length > 0) {
    issue.devDependencies.forEach((dep) => {
      summary.unusedDevDependencies.push({
        file: issue.file,
        name: dep.name,
      });
    });
  }

  if (issue.files && issue.files.length > 0) {
    issue.files.forEach((file) => {
      summary.unusedFiles.push({
        file: issue.file,
        unused: file.name,
      });
    });
  }

  if (issue.exports && issue.exports.length > 0) {
    issue.exports.forEach((exp) => {
      summary.unusedExports.push({
        file: issue.file,
        name: exp.name,
        line: exp.line,
      });
    });
  }

  if (issue.types && issue.types.length > 0) {
    issue.types.forEach((type) => {
      summary.unusedTypes.push({
        file: issue.file,
        name: type.name,
        line: type.line,
      });
    });
  }

  if (issue.duplicates && issue.duplicates.length > 0) {
    issue.duplicates.forEach((dup) => {
      summary.duplicateExports.push({
        file: issue.file,
        name: dup.name,
      });
    });
  }

  if (issue.unlisted && issue.unlisted.length > 0) {
    issue.unlisted.forEach((unlisted) => {
      summary.unlistedDependencies.push({
        file: issue.file,
        name: unlisted.name,
      });
    });
  }
});

console.log('=== 未使用代码分析报告 ===\n');
console.log(`未使用的依赖: ${summary.unusedDependencies.length}`);
console.log(`未使用的开发依赖: ${summary.unusedDevDependencies.length}`);
console.log(`未使用的文件: ${summary.unusedFiles.length}`);
console.log(`未使用的导出: ${summary.unusedExports.length}`);
console.log(`未使用的类型: ${summary.unusedTypes.length}`);
console.log(`重复的导出: ${summary.duplicateExports.length}`);
console.log(`未列出的依赖: ${summary.unlistedDependencies.length}`);

console.log('\n=== 详细信息 ===\n');

if (summary.unusedDependencies.length > 0) {
  console.log('\n--- 未使用的依赖 ---');
  summary.unusedDependencies.forEach((item) => {
    console.log(`  - ${item.name} (在 ${item.file})`);
  });
}

if (summary.unusedDevDependencies.length > 0) {
  console.log('\n--- 未使用的开发依赖 ---');
  summary.unusedDevDependencies.forEach((item) => {
    console.log(`  - ${item.name} (在 ${item.file})`);
  });
}

if (summary.unusedFiles.length > 0) {
  console.log('\n--- 未使用的文件 ---');
  summary.unusedFiles.forEach((item) => {
    console.log(`  - ${item.unused} (在 ${item.file})`);
  });
}

if (summary.unusedExports.length > 0) {
  console.log('\n--- 未使用的导出 (前50个) ---');
  summary.unusedExports.slice(0, 50).forEach((item) => {
    console.log(`  - ${item.name} (在 ${item.file}:${item.line})`);
  });
  if (summary.unusedExports.length > 50) {
    console.log(`  ... 还有 ${summary.unusedExports.length - 50} 个未使用的导出`);
  }
}

if (summary.unusedTypes.length > 0) {
  console.log('\n--- 未使用的类型 (前50个) ---');
  summary.unusedTypes.slice(0, 50).forEach((item) => {
    console.log(`  - ${item.name} (在 ${item.file}:${item.line})`);
  });
  if (summary.unusedTypes.length > 50) {
    console.log(`  ... 还有 ${summary.unusedTypes.length - 50} 个未使用的类型`);
  }
}

if (summary.duplicateExports.length > 0) {
  console.log('\n--- 重复的导出 (前30个) ---');
  summary.duplicateExports.slice(0, 30).forEach((item) => {
    console.log(`  - ${item.name} (在 ${item.file})`);
  });
  if (summary.duplicateExports.length > 30) {
    console.log(`  ... 还有 ${summary.duplicateExports.length - 30} 个重复的导出`);
  }
}

if (summary.unlistedDependencies.length > 0) {
  console.log('\n--- 未列出的依赖 ---');
  const uniqueUnlisted = [...new Set(summary.unlistedDependencies.map((d) => d.name))];
  uniqueUnlisted.forEach((name) => {
    console.log(`  - ${name}`);
  });
}

fs.writeFileSync('/tmp/knip-summary.json', JSON.stringify(summary, null, 2));
console.log('\n完整报告已保存到 /tmp/knip-summary.json');
