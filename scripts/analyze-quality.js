const fs = require('fs');

const data = JSON.parse(fs.readFileSync('lint-report.json', 'utf8'));
let totalErrors = 0;
let totalWarnings = 0;
const errorTypes = {};
const fileStats = [];

data.forEach((file) => {
  if (file.errorCount > 0 || file.warningCount > 0) {
    totalErrors += file.errorCount;
    totalWarnings += file.warningCount;
    fileStats.push({
      path: file.filePath.replace('/Users/imokokok/Documents/foresight-build/insight/', ''),
      errors: file.errorCount,
      warnings: file.warningCount,
    });

    file.messages.forEach((msg) => {
      const rule = msg.ruleId || 'unknown';
      if (!errorTypes[rule]) {
        errorTypes[rule] = { count: 0, type: msg.severity === 2 ? 'error' : 'warning' };
      }
      errorTypes[rule].count++;
    });
  }
});

console.log('=== ESLint 统计 ===');
console.log('总错误数:', totalErrors);
console.log('总警告数:', totalWarnings);
console.log('\n=== 问题类型分布 (Top 20) ===');
Object.entries(errorTypes)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 20)
  .forEach(([rule, info]) => {
    console.log(`${rule}: ${info.count} (${info.type})`);
  });

console.log('\n=== 问题最多的文件 (Top 20) ===');
fileStats
  .sort((a, b) => b.errors + b.warnings - (a.errors + a.warnings))
  .slice(0, 20)
  .forEach((f) => {
    console.log(`${f.path}: ${f.errors} 错误, ${f.warnings} 警告`);
  });

// Save detailed report
const report = {
  summary: {
    totalErrors,
    totalWarnings,
    totalFiles: data.length,
    filesWithIssues: fileStats.length,
  },
  errorTypes: Object.entries(errorTypes)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([rule, info]) => ({ rule, ...info })),
  topFiles: fileStats.sort((a, b) => b.errors + b.warnings - (a.errors + a.warnings)).slice(0, 50),
};

fs.writeFileSync('quality-analysis.json', JSON.stringify(report, null, 2));
console.log('\n详细报告已保存到 quality-analysis.json');
