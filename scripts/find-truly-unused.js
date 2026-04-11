const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function getAllFiles(dir, files = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.next')) {
        getAllFiles(fullPath, files);
      }
    } else if (item.isFile() && /\.(tsx?|jsx?)$/.test(item.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function isPageOrLayout(filePath) {
  const relativePath = path.relative(srcDir, filePath);
  return (
    relativePath.includes('/page.tsx') ||
    relativePath.includes('/page.ts') ||
    relativePath.includes('/layout.tsx') ||
    relativePath.includes('/layout.ts') ||
    relativePath.endsWith('/page.tsx') ||
    relativePath.endsWith('/page.ts') ||
    relativePath.endsWith('/layout.tsx') ||
    relativePath.endsWith('/layout.ts')
  );
}

function checkComponentUsage(componentName, allFiles, componentFile) {
  for (const file of allFiles) {
    if (file === componentFile) continue;

    try {
      const content = fs.readFileSync(file, 'utf8');

      const patterns = [
        new RegExp(`<${componentName}[\\s/>]`, 'g'),
        new RegExp(`<${componentName}\\s`, 'g'),
        new RegExp(`import\\s+${componentName}\\s+from`, 'g'),
        new RegExp(`import\\s*{[^}]*\\b${componentName}\\b[^}]*}\\s+from`, 'g'),
        new RegExp(`import\\s*{\\s*${componentName}\\s*}\\s+from`, 'g'),
        new RegExp(`import\\s*{\\s*${componentName}\\s*,`, 'g'),
        new RegExp(`import\\s*{.*,\\s*${componentName}\\s*,`, 'g'),
        new RegExp(`import\\s*{.*,\\s*${componentName}\\s*}`, 'g'),
      ];

      for (const pattern of patterns) {
        if (pattern.test(content)) {
          return true;
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }

  return false;
}

function main() {
  console.log('🔍 精确扫描真正未使用的组件...\n');

  const allFiles = getAllFiles(srcDir);
  const componentDirs = [path.join(srcDir, 'components'), path.join(srcDir, 'app/[locale]')];

  const allComponentFiles = [];
  for (const dir of componentDirs) {
    if (fs.existsSync(dir)) {
      const files = getAllFiles(dir);
      files.forEach((file) => {
        const fileName = path.basename(file);
        if (
          /\.(tsx|jsx)$/.test(fileName) &&
          fileName !== 'index.tsx' &&
          fileName !== 'index.ts' &&
          !isPageOrLayout(file)
        ) {
          allComponentFiles.push(file);
        }
      });
    }
  }

  const unusedComponents = [];
  const usedComponents = [];

  for (const file of allComponentFiles) {
    const fileName = path.basename(file, path.extname(file));
    const relativePath = path.relative(path.join(__dirname, '..'), file);

    const isUsed = checkComponentUsage(fileName, allFiles, file);

    if (!isUsed) {
      unusedComponents.push({
        name: fileName,
        file: relativePath,
      });
    } else {
      usedComponents.push({
        name: fileName,
        file: relativePath,
      });
    }
  }

  console.log('📊 扫描结果:\n');
  console.log(`✅ 已使用的组件: ${usedComponents.length} 个`);
  console.log(`❌ 未使用的组件: ${unusedComponents.length} 个\n`);

  if (unusedComponents.length > 0) {
    console.log('未使用的组件列表:\n');
    unusedComponents.forEach(({ name, file }) => {
      console.log(`  - ${name}`);
      console.log(`    文件: ${file}\n`);
    });

    // 保存到文件
    const outputPath = path.join(__dirname, '../unused-components-list.json');
    fs.writeFileSync(outputPath, JSON.stringify(unusedComponents, null, 2));
    console.log(`\n📝 未使用的组件列表已保存到: ${outputPath}`);
  }

  console.log(`\n总计: ${allComponentFiles.length} 个组件文件`);
}

main();
