const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function searchInDirectory(dir, searchTerm, excludeFiles = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      if (searchInDirectory(fullPath, searchTerm, excludeFiles)) {
        return true;
      }
    } else if (item.isFile() && !excludeFiles.includes(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes(searchTerm)) {
          return true;
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }

  return false;
}

function checkExportedComponents() {
  const unusedExports = [];

  function processDirectory(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        processDirectory(fullPath);
      } else if (item.name === 'index.ts' || item.name === 'index.tsx') {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');

          for (const line of lines) {
            const exportMatch = line.match(/export\s+(?:\{([^}]+)\}|(\w+))/);
            if (exportMatch) {
              const exports = exportMatch[1]
                ? exportMatch[1].split(',').map((e) => e.trim().split(' as ')[0].trim())
                : [exportMatch[2]];

              for (const exportName of exports) {
                if (!exportName || exportName.startsWith('type')) continue;

                const isUsed = searchInDirectory(srcDir, exportName, [fullPath]);

                if (!isUsed) {
                  const relativePath = path.relative(path.join(__dirname, '..'), fullPath);
                  unusedExports.push({
                    file: relativePath,
                    export: exportName,
                  });
                }
              }
            }
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
  }

  processDirectory(srcDir);

  if (unusedExports.length === 0) {
    console.log('✅ 所有导出的组件都被使用了');
  } else {
    console.log('❌ 找到以下未使用的导出:\n');
    const groupedByFile = {};
    unusedExports.forEach(({ file, export: exp }) => {
      if (!groupedByFile[file]) {
        groupedByFile[file] = [];
      }
      groupedByFile[file].push(exp);
    });

    Object.entries(groupedByFile).forEach(([file, exports]) => {
      console.log(`📄 ${file}`);
      exports.forEach((exp) => {
        console.log(`   - ${exp}`);
      });
      console.log('');
    });

    console.log(`总计: ${unusedExports.length} 个未使用的导出`);
  }
}

checkExportedComponents();
