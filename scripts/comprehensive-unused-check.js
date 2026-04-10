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

function getAllComponentFiles(dir, files = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      getAllComponentFiles(fullPath, files);
    } else if (
      item.isFile() &&
      /\.(tsx|jsx)$/.test(item.name) &&
      item.name !== 'index.tsx' &&
      item.name !== 'index.ts'
    ) {
      files.push(fullPath);
    }
  }

  return files;
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
  console.log('🔍 全面扫描未使用的组件...\n');

  const allFiles = getAllFiles(srcDir);
  const componentDirs = [path.join(srcDir, 'components'), path.join(srcDir, 'app/[locale]')];

  const allComponentFiles = [];
  for (const dir of componentDirs) {
    if (fs.existsSync(dir)) {
      allComponentFiles.push(...getAllComponentFiles(dir));
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
  }

  console.log(`\n总计: ${allComponentFiles.length} 个组件文件`);
}

main();
