const fs = require('fs');
const path = require('path');

const categorizedExports = JSON.parse(fs.readFileSync('/tmp/categorized-exports.json', 'utf8'));

function checkIfUsed(name, filePath) {
  const allExports = [
    ...categorizedExports.types,
    ...categorizedExports.interfaces,
    ...categorizedExports.functions,
    ...categorizedExports.constants,
    ...categorizedExports.components,
    ...categorizedExports.hooks,
    ...categorizedExports.utils,
    ...categorizedExports.other,
  ];

  const isUnused = allExports.some((exp) => exp.name === name && exp.file === filePath);
  return !isUnused;
}

const safeToDelete = {
  constants: [],
  utils: [],
  components: [],
  hooks: [],
  types: [],
};

console.log('=== 分析可安全删除的代码 ===\n');

categorizedExports.constants.forEach((item) => {
  if (
    !item.name.includes('DEFAULT') &&
    !item.name.includes('CONFIG') &&
    !item.file.includes('__tests__')
  ) {
    safeToDelete.constants.push(item);
  }
});

categorizedExports.utils.forEach((item) => {
  if (
    !item.file.includes('__tests__') &&
    !item.name.startsWith('create') &&
    !item.name.includes('validate')
  ) {
    safeToDelete.utils.push(item);
  }
});

categorizedExports.components.forEach((item) => {
  if (item.name === 'default' && item.file.includes('/components/')) {
    safeToDelete.components.push(item);
  }
});

categorizedExports.hooks.forEach((item) => {
  if (item.name === 'default' && item.file.includes('/hooks/')) {
    safeToDelete.hooks.push(item);
  }
});

categorizedExports.types.forEach((item) => {
  if (
    item.name.includes('Props') &&
    !item.file.includes('__tests__') &&
    !item.name.includes('Component')
  ) {
    safeToDelete.types.push(item);
  }
});

console.log(`可安全删除的常量: ${safeToDelete.constants.length}`);
console.log(`可安全删除的工具函数: ${safeToDelete.utils.length}`);
console.log(`可安全删除的组件 (default exports): ${safeToDelete.components.length}`);
console.log(`可安全删除的 hooks (default exports): ${safeToDelete.hooks.length}`);
console.log(`可安全删除的类型: ${safeToDelete.types.length}`);

console.log('\n=== 建议删除的常量 ===');
safeToDelete.constants.slice(0, 15).forEach((item) => {
  console.log(`  ${item.file}:${item.line} - ${item.name}`);
});

console.log('\n=== 建议删除的工具函数 ===');
safeToDelete.utils.slice(0, 15).forEach((item) => {
  console.log(`  ${item.file}:${item.line} - ${item.name}`);
});

fs.writeFileSync('/tmp/safe-to-delete.json', JSON.stringify(safeToDelete, null, 2));
console.log('\n完整列表已保存到 /tmp/safe-to-delete.json');
