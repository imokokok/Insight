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
    } else if (item.isFile() && /\.(tsx|jsx)$/.test(item.name) && item.name !== 'index.tsx' && item.name !== 'index.ts') {
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

function shouldExclude(filePath, fileName) {
  const relativePath = path.relative(srcDir, filePath);

  const excludePatterns = [
    /\/page\.tsx?$/,
    /\/layout\.tsx?$/,
    /\/error\.tsx?$/,
    /\/not-found\.tsx?$/,
    /\/global-error\.tsx?$/,
    /\/loading\.tsx?$/,
    /\/not-found\.tsx?$/,
  ];

  for (const pattern of excludePatterns) {
    if (pattern.test(relativePath)) {
      return true;
    }
  }

  const excludeFiles = [
    'ErrorBoundaries',
    'ErrorBoundary',
    'BaseErrorBoundary',
    'ComponentErrorBoundary',
    'GlobalErrorFallback',
    'SectionErrorFallback',
  ];

  if (excludeFiles.includes(fileName)) {
    return true;
  }

  return false;
}

function main() {
  console.log('🔍 过滤真正未使用的组件...\n');

  const allFiles = getAllFiles(srcDir);
  const componentDirs = [
    path.join(srcDir, 'components'),
  ];

  const allComponentFiles = [];
  for (const dir of componentDirs) {
    if (fs.existsSync(dir)) {
      allComponentFiles.push(...getAllComponentFiles(dir));
    }
  }

  const unusedComponents = [];

  for (const file of allComponentFiles) {
    const fileName = path.basename(file, path.extname(file));
    const relativePath = path.relative(path.join(__dirname, '..'), file);

    if (shouldExclude(file, fileName)) {
      continue;
    }

    const isUsed = checkComponentUsage(fileName, allFiles, file);

    if (!isUsed) {
      unusedComponents.push({
        name: fileName,
        file: relativePath,
      });
    }
  }

  console.log('📊 过滤结果:\n');
  console.log(`❌ 真正未使用的组件: ${unusedComponents.length} 个\n`);

  if (unusedComponents.length > 0) {
    console.log('未使用的组件列表:\n');
    unusedComponents.forEach(({ name, file }) => {
      console.log(`  ${file}`);
    });

    console.log('\n\n准备删除的文件路径:\n');
    unusedComponents.forEach(({ file }) => {
      console.log(file);
    });
  }
}

main();
