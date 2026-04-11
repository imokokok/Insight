const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

// 从分析结果中读取未使用的组件
const unusedComponents = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../unused-components-list.json'), 'utf8')
);

console.log('🗑️  开始删除未使用的组件...\n');

let deletedCount = 0;
let notFoundCount = 0;
let errorCount = 0;
const deletedFiles = [];
const errors = [];

for (const component of unusedComponents) {
  const filePath = path.join(projectRoot, component.file);

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ 已删除: ${component.file}`);
      deletedCount++;
      deletedFiles.push(component.file);
    } catch (error) {
      console.log(`❌ 删除失败: ${component.file} - ${error.message}`);
      errorCount++;
      errors.push({ file: component.file, error: error.message });
    }
  } else {
    console.log(`⚠️  文件不存在: ${component.file}`);
    notFoundCount++;
  }
}

console.log(`\n📊 删除统计:`);
console.log(`✅ 已删除: ${deletedCount} 个文件`);
console.log(`⚠️  未找到: ${notFoundCount} 个文件`);
console.log(`❌ 失败: ${errorCount} 个文件`);
console.log(`📝 总计: ${unusedComponents.length} 个文件`);

// 保存删除记录
const deleteRecord = {
  timestamp: new Date().toISOString(),
  deletedCount,
  notFoundCount,
  errorCount,
  deletedFiles,
  errors: errors.length > 0 ? errors : undefined,
};

const recordPath = path.join(__dirname, '../deleted-components-record.json');
fs.writeFileSync(recordPath, JSON.stringify(deleteRecord, null, 2));
console.log(`\n📝 删除记录已保存到: ${recordPath}`);

if (deletedCount > 0) {
  console.log(`\n💾 释放了 ${deletedCount} 个未使用组件文件的空间`);
}
