#!/usr/bin/env node

/**
 * UI 优化批量应用脚本
 * 将所有 UI 优化应用到整个项目
 */

const fs = require('fs');
const path = require('path');

// 统计
let stats = {
  totalFiles: 0,
  updatedFiles: 0,
  skippedFiles: 0,
  errors: []
};

// 递归获取所有 tsx/ts 文件
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'dist' && file !== 'scripts') {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

// 更新文件 - 添加必要的导入
function updateImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let hasChanges = false;

  // 检查是否使用了 Typography 组件但没有导入
  const typographyComponents = ['Display', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'Body', 'BodyLarge', 'BodySmall', 'Caption', 'Overline'];
  const usedTypography = typographyComponents.filter(comp => content.includes(`<${comp}`) || content.includes(`</${comp}>`));
  
  if (usedTypography.length > 0 && !content.includes('@/components/ui')) {
    // 添加 Typography 导入
    const importStatement = `import { ${usedTypography.join(', ')} } from '@/components/ui';\n`;
    
    // 找到最后一个 import 语句的位置
    const lastImportMatch = content.match(/^(import\s+.*?from\s+['"].*?['"];?\s*)$/gm);
    if (lastImportMatch) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1];
      content = content.replace(lastImport, lastImport + '\n' + importStatement);
      hasChanges = true;
    }
  }

  // 检查是否使用了新组件但没有导入
  const newComponents = ['Input', 'Select', 'Checkbox', 'Radio', 'Textarea', 'Tooltip', 'Badge', 'Skeleton', 'Spinner', 'FadeIn', 'SlideUp', 'EmptyState', 'ErrorState', 'Icon'];
  const usedComponents = newComponents.filter(comp => {
    const regex = new RegExp(`<${comp}[\\s>]`, 'g');
    return regex.test(content) && !content.includes(`import.*${comp}.*from.*@/components/ui`);
  });

  if (usedComponents.length > 0) {
    // 检查是否已经有 @/components/ui 的导入
    const uiImportMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+['"]@\/components\/ui['"];?/);
    if (uiImportMatch) {
      // 更新现有的导入
      const existingImports = uiImportMatch[1].split(',').map(s => s.trim());
      const newImports = [...new Set([...existingImports, ...usedComponents])];
      content = content.replace(
        uiImportMatch[0],
        `import { ${newImports.join(', ')} } from '@/components/ui';`
      );
      hasChanges = true;
    } else {
      // 添加新的导入
      const importStatement = `import { ${usedComponents.join(', ')} } from '@/components/ui';\n`;
      const lastImportMatch = content.match(/^(import\s+.*?from\s+['"].*?['"];?\s*)$/gm);
      if (lastImportMatch) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1];
        content = content.replace(lastImport, lastImport + '\n' + importStatement);
        hasChanges = true;
      }
    }
  }

  // 如果内容有变化，写回文件
  if (hasChanges && content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

// 更新图表文件使用新配色
function updateChartColors(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let hasChanges = false;

  // 检查是否是图表文件
  if (content.includes('recharts') || content.includes('<LineChart') || content.includes('<BarChart') || content.includes('<AreaChart')) {
    // 添加 chartColors 导入
    if (!content.includes('chartColors') && !content.includes('@/lib/chartColors')) {
      const importStatement = `import { chartColors, getChartColor } from '@/lib/chartColors';\n`;
      const lastImportMatch = content.match(/^(import\s+.*?from\s+['"].*?['"];?\s*)$/gm);
      if (lastImportMatch) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1];
        content = content.replace(lastImport, lastImport + '\n' + importStatement);
        hasChanges = true;
      }
    }
  }

  if (hasChanges && content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

// 主函数
function main() {
  console.log('🚀 UI 优化批量应用脚本\n');
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
  console.log('开始应用 UI 优化...\n');

  files.forEach(file => {
    try {
      let updated = false;
      
      // 更新导入
      if (updateImports(file)) {
        updated = true;
      }
      
      // 更新图表颜色
      if (updateChartColors(file)) {
        updated = true;
      }

      if (updated) {
        stats.updatedFiles++;
        console.log(`✓ ${file}`);
      } else {
        stats.skippedFiles++;
      }
    } catch (error) {
      stats.errors.push({ file, error: error.message });
      console.error(`✗ ${file}: ${error.message}`);
    }
  });

  console.log('\n================================');
  console.log('✅ 应用完成!');
  console.log('================================');
  console.log(`总文件数: ${stats.totalFiles}`);
  console.log(`已更新: ${stats.updatedFiles}`);
  console.log(`跳过: ${stats.skippedFiles}`);
  console.log(`错误: ${stats.errors.length}`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ 错误详情:');
    stats.errors.forEach(({ file, error }) => {
      console.log(`  ${file}: ${error}`);
    });
  }
  
  console.log('\n💡 提示:');
  console.log('  - 请检查更新后的文件是否有语法错误');
  console.log('  - 运行 npm run build 验证项目');
  console.log('  - 手动检查关键页面的样式');
}

main();
