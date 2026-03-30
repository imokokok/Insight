const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '../src/components');
const ORACLE_DIR = path.join(__dirname, '../src/app/[locale]');

function getAllComponentFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      getAllComponentFiles(fullPath, files);
    } else if (item.match(/\.(tsx|jsx)$/)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function searchInFile(filePath, searchTerm) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes(searchTerm);
  } catch (error) {
    return false;
  }
}

function searchInDirectory(dir, searchTerm, excludeFile) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      if (searchInDirectory(fullPath, searchTerm, excludeFile)) {
        return true;
      }
    } else if (item.isFile() && fullPath !== excludeFile) {
      if (searchInFile(fullPath, searchTerm)) {
        return true;
      }
    }
  }
  
  return false;
}

function checkComponentUsage(componentFile) {
  const fileName = path.basename(componentFile, path.extname(componentFile));
  
  if (fileName === 'index') {
    return true;
  }
  
  const srcDir = path.join(__dirname, '../src');
  const isUsed = searchInDirectory(srcDir, fileName, componentFile);
  
  return isUsed;
}

function main() {
  console.log('检查未使用的组件...\n');
  
  const componentFiles = getAllComponentFiles(COMPONENTS_DIR);
  const unusedComponents = [];
  
  for (const file of componentFiles) {
    const relativePath = path.relative(__dirname, file);
    const fileName = path.basename(file, path.extname(file));
    
    if (fileName === 'index') {
      continue;
    }
    
    const isUsed = checkComponentUsage(file);
    
    if (!isUsed) {
      unusedComponents.push(relativePath);
    }
  }
  
  if (unusedComponents.length === 0) {
    console.log('✅ 没有找到未使用的组件');
  } else {
    console.log('❌ 找到以下未使用的组件:\n');
    unusedComponents.forEach(comp => {
      console.log(`  - ${comp}`);
    });
    console.log(`\n总计: ${unusedComponents.length} 个未使用的组件`);
  }
}

main();
