#!/usr/bin/env node

/**
 * Insight UI 批量更新脚本
 * 自动更新项目中的颜色类和样式
 */

const fs = require('fs');
const path = require('path');

// 颜色映射
const colorMappings = {
  // 蓝色 -> Primary
  'bg-blue-50': 'bg-primary-50',
  'bg-blue-100': 'bg-primary-100',
  'bg-blue-200': 'bg-primary-200',
  'bg-blue-300': 'bg-primary-300',
  'bg-blue-400': 'bg-primary-400',
  'bg-blue-500': 'bg-primary-500',
  'bg-blue-600': 'bg-primary-600',
  'bg-blue-700': 'bg-primary-700',
  'bg-blue-800': 'bg-primary-800',
  'bg-blue-900': 'bg-primary-900',
  'text-blue-50': 'text-primary-50',
  'text-blue-100': 'text-primary-100',
  'text-blue-200': 'text-primary-200',
  'text-blue-300': 'text-primary-300',
  'text-blue-400': 'text-primary-400',
  'text-blue-500': 'text-primary-500',
  'text-blue-600': 'text-primary-600',
  'text-blue-700': 'text-primary-700',
  'text-blue-800': 'text-primary-800',
  'text-blue-900': 'text-primary-900',
  'border-blue-50': 'border-primary-50',
  'border-blue-100': 'border-primary-100',
  'border-blue-200': 'border-primary-200',
  'border-blue-300': 'border-primary-300',
  'border-blue-400': 'border-primary-400',
  'border-blue-500': 'border-primary-500',
  'border-blue-600': 'border-primary-600',
  'border-blue-700': 'border-primary-700',
  'border-blue-800': 'border-primary-800',
  'border-blue-900': 'border-primary-900',
  'hover:bg-blue-50': 'hover:bg-primary-50',
  'hover:bg-blue-100': 'hover:bg-primary-100',
  'hover:bg-blue-600': 'hover:bg-primary-600',
  'hover:bg-blue-700': 'hover:bg-primary-700',
  'hover:text-blue-600': 'hover:text-primary-600',
  'hover:text-blue-700': 'hover:text-primary-700',
  'hover:border-blue-600': 'hover:border-primary-600',
  'focus:ring-blue-500': 'focus:ring-primary-500',
  'focus:border-blue-500': 'focus:border-primary-500',
  'ring-blue-500': 'ring-primary-500',

  // 红色 -> Danger
  'bg-red-50': 'bg-danger-50',
  'bg-red-100': 'bg-danger-100',
  'bg-red-200': 'bg-danger-200',
  'bg-red-500': 'bg-danger-500',
  'bg-red-600': 'bg-danger-600',
  'bg-red-700': 'bg-danger-700',
  'bg-red-800': 'bg-danger-800',
  'bg-red-900': 'bg-danger-900',
  'text-red-50': 'text-danger-50',
  'text-red-100': 'text-danger-100',
  'text-red-200': 'text-danger-200',
  'text-red-500': 'text-danger-500',
  'text-red-600': 'text-danger-600',
  'text-red-700': 'text-danger-700',
  'text-red-800': 'text-danger-800',
  'text-red-900': 'text-danger-900',
  'border-red-50': 'border-danger-50',
  'border-red-100': 'border-danger-100',
  'border-red-200': 'border-danger-200',
  'border-red-500': 'border-danger-500',
  'border-red-600': 'border-danger-600',
  'hover:bg-red-50': 'hover:bg-danger-50',
  'hover:bg-red-100': 'hover:bg-danger-100',
  'hover:text-red-600': 'hover:text-danger-600',
  'hover:text-red-700': 'hover:text-danger-700',
  'focus:ring-red-500': 'focus:ring-danger-500',

  // 绿色 -> Success
  'bg-green-50': 'bg-success-50',
  'bg-green-100': 'bg-success-100',
  'bg-green-200': 'bg-success-200',
  'bg-green-500': 'bg-success-500',
  'bg-green-600': 'bg-success-600',
  'bg-green-700': 'bg-success-700',
  'text-green-50': 'text-success-50',
  'text-green-100': 'text-success-100',
  'text-green-200': 'text-success-200',
  'text-green-500': 'text-success-500',
  'text-green-600': 'text-success-600',
  'text-green-700': 'text-success-700',
  'border-green-500': 'border-success-500',
  'border-green-600': 'border-success-600',
  'hover:bg-green-50': 'hover:bg-success-50',
  'hover:text-green-600': 'hover:text-success-600',

  // 黄色/橙色 -> Warning
  'bg-yellow-50': 'bg-warning-50',
  'bg-yellow-100': 'bg-warning-100',
  'bg-yellow-200': 'bg-warning-200',
  'bg-yellow-500': 'bg-warning-500',
  'bg-yellow-600': 'bg-warning-600',
  'bg-yellow-700': 'bg-warning-700',
  'bg-orange-50': 'bg-warning-50',
  'bg-orange-100': 'bg-warning-100',
  'bg-orange-500': 'bg-warning-500',
  'bg-orange-600': 'bg-warning-600',
  'text-yellow-500': 'text-warning-500',
  'text-yellow-600': 'text-warning-600',
  'text-yellow-700': 'text-warning-700',
  'text-orange-500': 'text-warning-500',
  'text-orange-600': 'text-warning-600',
  'border-yellow-500': 'border-warning-500',
  'border-yellow-600': 'border-warning-600',
  'hover:bg-yellow-50': 'hover:bg-warning-50',
  'hover:text-yellow-600': 'hover:text-warning-600',

  // 灰色 -> Gray (保持一致)
  'bg-gray-50': 'bg-gray-50',
  'bg-gray-100': 'bg-gray-100',
  'bg-gray-200': 'bg-gray-200',
  'bg-gray-300': 'bg-gray-300',
  'bg-gray-400': 'bg-gray-400',
  'bg-gray-500': 'bg-gray-500',
  'bg-gray-600': 'bg-gray-600',
  'bg-gray-700': 'bg-gray-700',
  'bg-gray-800': 'bg-gray-800',
  'bg-gray-900': 'bg-gray-900',
};

// 统计
let stats = {
  totalFiles: 0,
  updatedFiles: 0,
  skippedFiles: 0,
  totalReplacements: 0
};

// 递归获取所有 tsx/ts 文件
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      // 跳过 node_modules 和 .next
      if (file !== 'node_modules' && file !== '.next' && file !== 'dist') {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

// 更新文件内容
function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let fileReplacements = 0;

  // 替换颜色类
  Object.entries(colorMappings).forEach(([oldClass, newClass]) => {
    if (oldClass !== newClass) {
      const regex = new RegExp(`\\b${oldClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        fileReplacements += matches.length;
        content = content.replace(regex, newClass);
      }
    }
  });

  // 如果内容有变化，写回文件
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    stats.updatedFiles++;
    stats.totalReplacements += fileReplacements;
    console.log(`✓ ${filePath} (${fileReplacements} 处替换)`);
    return true;
  }

  stats.skippedFiles++;
  return false;
}

// 主函数
function main() {
  console.log('🚀 Insight UI 批量更新脚本\n');
  console.log('================================\n');

  const srcDir = path.join(__dirname, '..', 'src');

  if (!fs.existsSync(srcDir)) {
    console.error('❌ 错误: 找不到 src 目录');
    process.exit(1);
  }

  console.log('📁 扫描文件中...\n');
  const files = getAllFiles(srcDir);
  stats.totalFiles = files.length;

  console.log(`找到 ${files.length} 个文件\n`);
  console.log('开始更新...\n');

  files.forEach(file => {
    updateFile(file);
  });

  console.log('\n================================');
  console.log('✅ 更新完成!');
  console.log('================================');
  console.log(`总文件数: ${stats.totalFiles}`);
  console.log(`已更新: ${stats.updatedFiles}`);
  console.log(`跳过: ${stats.skippedFiles}`);
  console.log(`总替换数: ${stats.totalReplacements}`);
  console.log('\n💡 提示:');
  console.log('  - 请检查更新后的文件是否有语法错误');
  console.log('  - 运行 npm run build 验证项目');
  console.log('  - 复杂的组件可能需要手动调整');
}

main();
