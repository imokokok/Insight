const fs = require('fs');

const report = JSON.parse(fs.readFileSync('/tmp/knip-summary.json', 'utf8'));

const categorized = {
  types: [],
  interfaces: [],
  functions: [],
  constants: [],
  components: [],
  hooks: [],
  utils: [],
  other: [],
};

report.unusedExports.forEach((item) => {
  const name = item.name;

  if (name.startsWith('use') && name.length > 3 && name[3] === name[3].toUpperCase()) {
    categorized.hooks.push(item);
  } else if (name[0] === name[0].toUpperCase() && name.includes('Props')) {
    categorized.types.push(item);
  } else if (
    name[0] === name[0].toUpperCase() &&
    (name.includes('Config') || name.includes('Options'))
  ) {
    categorized.types.push(item);
  } else if (name[0] === name[0].toUpperCase() && name !== name.toUpperCase()) {
    if (name.includes('Component') || item.file.includes('/components/')) {
      categorized.components.push(item);
    } else {
      categorized.types.push(item);
    }
  } else if (name === name.toUpperCase() && name.includes('_')) {
    categorized.constants.push(item);
  } else if (item.file.includes('/hooks/')) {
    categorized.hooks.push(item);
  } else if (item.file.includes('/utils/')) {
    categorized.utils.push(item);
  } else if (item.file.includes('/components/')) {
    categorized.components.push(item);
  } else {
    categorized.other.push(item);
  }
});

console.log('=== 未使用导出分类统计 ===\n');
console.log(`类型定义: ${categorized.types.length}`);
console.log(`接口: ${categorized.interfaces.length}`);
console.log(`函数: ${categorized.functions.length}`);
console.log(`常量: ${categorized.constants.length}`);
console.log(`组件: ${categorized.components.length}`);
console.log(`Hooks: ${categorized.hooks.length}`);
console.log(`工具函数: ${categorized.utils.length}`);
console.log(`其他: ${categorized.other.length}`);

console.log('\n=== 建议删除的代码 ===\n');

console.log('\n--- 常量 (通常可以安全删除) ---');
categorized.constants.slice(0, 20).forEach((item) => {
  console.log(`  - ${item.name} (${item.file}:${item.line})`);
});
if (categorized.constants.length > 20) {
  console.log(`  ... 还有 ${categorized.constants.length - 20} 个常量`);
}

console.log('\n--- 工具函数 (需要验证是否真的未使用) ---');
categorized.utils.slice(0, 20).forEach((item) => {
  console.log(`  - ${item.name} (${item.file}:${item.line})`);
});
if (categorized.utils.length > 20) {
  console.log(`  ... 还有 ${categorized.utils.length - 20} 个工具函数`);
}

console.log('\n--- Hooks (需要验证是否真的未使用) ---');
categorized.hooks.slice(0, 20).forEach((item) => {
  console.log(`  - ${item.name} (${item.file}:${item.line})`);
});
if (categorized.hooks.length > 20) {
  console.log(`  ... 还有 ${categorized.hooks.length - 20} 个 hooks`);
}

console.log('\n--- 组件 (需要验证是否真的未使用) ---');
categorized.components.slice(0, 20).forEach((item) => {
  console.log(`  - ${item.name} (${item.file}:${item.line})`);
});
if (categorized.components.length > 20) {
  console.log(`  ... 还有 ${categorized.components.length - 20} 个组件`);
}

fs.writeFileSync('/tmp/categorized-exports.json', JSON.stringify(categorized, null, 2));
console.log('\n分类结果已保存到 /tmp/categorized-exports.json');
