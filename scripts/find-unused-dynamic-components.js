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

function checkUnusedDynamicComponents() {
  const dynamicComponentsFile = path.join(
    __dirname,
    '../src/components/oracle/charts/DynamicChartComponents.tsx'
  );
  
  const content = fs.readFileSync(dynamicComponentsFile, 'utf8');
  const lines = content.split('\n');
  
  const unusedDynamicExports = [];
  
  for (const line of lines) {
    const match = line.match(/^export\s+const\s+(\w+)\s*=/);
    if (match) {
      const exportName = match[1];
      
      const isUsed = searchInDirectory(
        srcDir,
        exportName,
        [dynamicComponentsFile]
      );
      
      if (!isUsed) {
        unusedDynamicExports.push(exportName);
      }
    }
  }
  
  if (unusedDynamicExports.length === 0) {
    console.log('✅ 所有动态组件都被使用了');
    return;
  }
  
  console.log('❌ 找到以下未使用的动态组件:\n');
  unusedDynamicExports.forEach(comp => {
    console.log(`  - ${comp}`);
  });
  
  console.log(`\n总计: ${unusedDynamicExports.length} 个未使用的动态组件`);
}

checkUnusedDynamicComponents();
