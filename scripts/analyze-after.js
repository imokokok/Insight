const fs = require('fs');

const data = JSON.parse(fs.readFileSync('lint-report-after.json', 'utf8'));
let totalErrors = 0;
let totalWarnings = 0;
const errorTypes = {};

data.forEach((file) => {
  totalErrors += file.errorCount;
  totalWarnings += file.warningCount;

  file.messages.forEach((msg) => {
    const rule = msg.ruleId || 'unknown';
    if (!errorTypes[rule]) {
      errorTypes[rule] = { count: 0, type: msg.severity === 2 ? 'error' : 'warning' };
    }
    errorTypes[rule].count++;
  });
});

console.log('=== 修复后 ESLint 统计 ===');
console.log('总错误数:', totalErrors);
console.log('总警告数:', totalWarnings);
console.log('总问题数:', totalErrors + totalWarnings);
console.log('\n=== 问题类型分布 (Top 15) ===');
Object.entries(errorTypes)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 15)
  .forEach(([rule, info]) => {
    console.log(`${rule}: ${info.count} (${info.type})`);
  });

// Save comparison
const before = { errors: 359, warnings: 923 };
const after = { errors: totalErrors, warnings: totalWarnings };

console.log('\n=== 修复对比 ===');
console.log(
  `错误: ${before.errors} → ${after.errors} (${before.errors - after.errors > 0 ? '-' : '+'}${Math.abs(before.errors - after.errors)})`
);
console.log(
  `警告: ${before.warnings} → ${after.warnings} (${before.warnings - after.warnings > 0 ? '-' : '+'}${Math.abs(before.warnings - after.warnings)})`
);
console.log(
  `总计: ${before.errors + before.warnings} → ${after.errors + after.warnings} (${before.errors + before.warnings - (after.errors + after.warnings) > 0 ? '-' : '+'}${Math.abs(before.errors + before.warnings - (after.errors + after.warnings))})`
);
