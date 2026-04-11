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
    relativePath.includes('/route.ts') ||
    relativePath.includes('/route.ts')
  );
}

function extractExports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const exports = [];

    const namedExportRegex = /export\s+(?:const|function|class|interface|type|enum)\s+(\w+)/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
      exports.push({ name: match[1], type: 'named' });
    }

    const exportFromRegex = /export\s+\{\s*([^}]+)\s*\}\s+from/g;
    while ((match = exportFromRegex.exec(content)) !== null) {
      const names = match[1].split(',').map((n) => n.trim().split(' as ')[0].trim());
      names.forEach((name) => {
        if (name && !name.startsWith('type')) {
          exports.push({ name, type: 're-export' });
        }
      });
    }

    const defaultExportRegex = /export\s+default\s+(\w+)/g;
    while ((match = defaultExportRegex.exec(content)) !== null) {
      exports.push({ name: match[1], type: 'default' });
    }

    return exports;
  } catch {
    return [];
  }
}

function checkUsage(name, allFiles, sourceFile) {
  for (const file of allFiles) {
    if (file === sourceFile) continue;

    try {
      const content = fs.readFileSync(file, 'utf8');

      const patterns = [new RegExp(`\\b${name}\\b`, 'g')];

      for (const pattern of patterns) {
        if (pattern.test(content)) {
          return true;
        }
      }
    } catch {
      // skip
    }
  }
  return false;
}

function checkHookUsage(hookName, allFiles) {
  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes(hookName)) {
        return true;
      }
    } catch {
      // skip
    }
  }
  return false;
}

function checkTypeUsage(typeName, allFiles) {
  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const patterns = [
        new RegExp(`:\\s*${typeName}\\b`),
        new RegExp(`<${typeName}>`),
        new RegExp(`\\b${typeName}\\s*\\|`),
        new RegExp(`\\b${typeName}\\s*&`),
        new RegExp(`extends\\s+${typeName}\\b`),
        new RegExp(`implements\\s+${typeName}\\b`),
        new RegExp(`type\\s+\\w+\\s*=\\s*${typeName}\\b`),
      ];

      for (const pattern of patterns) {
        if (pattern.test(content)) {
          return true;
        }
      }
    } catch {
      // skip
    }
  }
  return false;
}

function main() {
  console.log('🔍 深度扫描未使用的代码...\n');

  const allFiles = getAllFiles(srcDir);
  const results = {
    components: [],
    hooks: [],
    types: [],
    utils: [],
    constants: [],
  };

  console.log('📂 扫描文件...');

  for (const file of allFiles) {
    const relativePath = path.relative(path.join(__dirname, '..'), file);
    const fileName = path.basename(file);
    const fileNameWithoutExt = path.basename(file, path.extname(file));

    if (isPageOrLayout(file)) continue;
    if (fileName === 'index.ts' || fileName === 'index.tsx') continue;

    const exports = extractExports(file);

    for (const exp of exports) {
      const isUsed = checkUsage(exp.name, allFiles, file);

      if (!isUsed) {
        const item = {
          name: exp.name,
          file: relativePath,
        };

        if (relativePath.includes('/hooks/') || exp.name.startsWith('use')) {
          if (checkHookUsage(exp.name, allFiles)) continue;
          results.hooks.push(item);
        } else if (
          exp.name[0] === exp.name[0].toUpperCase() &&
          (fileName.endsWith('.tsx') || fileName.endsWith('.jsx'))
        ) {
          results.components.push(item);
        } else if (
          exp.name[0] === exp.name[0].toUpperCase() &&
          (fileName.endsWith('.ts') || fileName.endsWith('.ts'))
        ) {
          if (checkTypeUsage(exp.name, allFiles)) continue;
          results.types.push(item);
        } else if (
          exp.name === exp.name.toUpperCase() ||
          relativePath.includes('/constants') ||
          relativePath.includes('/config')
        ) {
          results.constants.push(item);
        } else {
          results.utils.push(item);
        }
      }
    }
  }

  console.log('\n📊 扫描结果:\n');

  console.log(`📦 组件:`);
  console.log(`   未使用: ${results.components.length} 个`);
  if (results.components.length > 0) {
    results.components.slice(0, 10).forEach((c) => {
      console.log(`   - ${c.name} (${c.file})`);
    });
    if (results.components.length > 10) {
      console.log(`   ... 还有 ${results.components.length - 10} 个`);
    }
  }

  console.log(`\n🪝 Hooks:`);
  console.log(`   未使用: ${results.hooks.length} 个`);
  if (results.hooks.length > 0) {
    results.hooks.slice(0, 10).forEach((h) => {
      console.log(`   - ${h.name} (${h.file})`);
    });
    if (results.hooks.length > 10) {
      console.log(`   ... 还有 ${results.hooks.length - 10} 个`);
    }
  }

  console.log(`\n📝 类型定义:`);
  console.log(`   未使用: ${results.types.length} 个`);
  if (results.types.length > 0) {
    results.types.slice(0, 10).forEach((t) => {
      console.log(`   - ${t.name} (${t.file})`);
    });
    if (results.types.length > 10) {
      console.log(`   ... 还有 ${results.types.length - 10} 个`);
    }
  }

  console.log(`\n🔧 工具函数:`);
  console.log(`   未使用: ${results.utils.length} 个`);
  if (results.utils.length > 0) {
    results.utils.slice(0, 10).forEach((u) => {
      console.log(`   - ${u.name} (${u.file})`);
    });
    if (results.utils.length > 10) {
      console.log(`   ... 还有 ${results.utils.length - 10} 个`);
    }
  }

  console.log(`\n⚙️  常量:`);
  console.log(`   未使用: ${results.constants.length} 个`);
  if (results.constants.length > 0) {
    results.constants.slice(0, 10).forEach((c) => {
      console.log(`   - ${c.name} (${c.file})`);
    });
    if (results.constants.length > 10) {
      console.log(`   ... 还有 ${results.constants.length - 10} 个`);
    }
  }

  const outputPath = path.join(__dirname, '../deep-unused-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 详细报告已保存到: ${outputPath}`);

  const total =
    results.components.length +
    results.hooks.length +
    results.types.length +
    results.utils.length +
    results.constants.length;
  console.log(`\n总计: ${total} 个未使用的导出`);
}

main();
