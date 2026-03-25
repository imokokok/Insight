#!/usr/bin/env node

/**
 * 查找未使用的翻译键
 * 用法: node scripts/find-unused-translations.js
 */

const fs = require('fs');
const path = require('path');

// 配置
const MESSAGES_DIR = path.join(__dirname, '../src/i18n/messages');
const EN_MESSAGES_DIR = path.join(MESSAGES_DIR, 'en');
const ZH_MESSAGES_DIR = path.join(MESSAGES_DIR, 'zh-CN');
const SOURCE_DIRS = [
  path.join(__dirname, '../src/app'),
  path.join(__dirname, '../src/components'),
  path.join(__dirname, '../src/lib'),
  path.join(__dirname, '../src/hooks'),
];
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// 读取单个翻译文件
function loadTranslationFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

// 递归扫描目录获取所有 JSON 文件
function getJsonFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getJsonFiles(fullPath));
    } else if (entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

// 加载模块化翻译文件
function loadTranslations(messagesDir) {
  const messages = {};
  const jsonFiles = getJsonFiles(messagesDir);

  for (const filePath of jsonFiles) {
    const relativePath = path.relative(messagesDir, filePath);
    const namespace = relativePath.replace(/\.json$/, '').replace(/[/\\]/g, '/');
    const content = loadTranslationFile(filePath);

    // 对于 common.json，同时包裹在 common 键下并合并到根级别
    if (namespace === 'common') {
      messages.common = content;
      Object.assign(messages, content);
    } else if (namespace === 'components/export') {
      Object.assign(messages, content);
    } else {
      Object.assign(messages, content);
    }
  }

  return messages;
}

// 递归获取所有翻译键（扁平化）
function flattenKeys(obj, prefix = '', result = new Set()) {
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      flattenKeys(obj[key], prefix ? `${prefix}.${key}` : key, result);
    } else {
      result.add(prefix ? `${prefix}.${key}` : key);
    }
  }
  return result;
}

// 递归获取所有翻译键（保持嵌套结构用于删除）
function getNestedKeys(obj, prefix = '') {
  const result = {};
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      const nested = getNestedKeys(obj[key], fullKey);
      Object.assign(result, nested);
    } else {
      result[fullKey] = { parent: prefix || key, key, value: obj[key] };
    }
  }
  return result;
}

// 扫描源代码文件
function scanSourceFiles(dirs, extensions) {
  const files = [];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // 跳过 node_modules 和 .next
        if (entry.name !== 'node_modules' && entry.name !== '.next') {
          scanDir(fullPath);
        }
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  for (const dir of dirs) {
    scanDir(dir);
  }

  return files;
}

// 从文件中提取使用的翻译键
function extractUsedKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const usedKeys = new Set();

  // 匹配 t('key') 或 t("key") 模式
  const tRegex = /t\(['"]([^'"]+)['"]\)/g;
  let match;
  while ((match = tRegex.exec(content)) !== null) {
    usedKeys.add(match[1]);
  }

  // 匹配 label: 'key' 模式（导航配置等）
  const labelRegex = /label\s*:\s*['"]([^'"]+)['"]/g;
  while ((match = labelRegex.exec(content)) !== null) {
    // 过滤掉可能是翻译键的值（包含点号且不是路径）
    if (match[1].includes('.') && !match[1].startsWith('/')) {
      usedKeys.add(match[1]);
    }
  }

  // 匹配 description: 'key' 模式
  const descRegex = /description\s*:\s*['"]([^'"]+)['"]/g;
  while ((match = descRegex.exec(content)) !== null) {
    if (match[1].includes('.') && !match[1].startsWith('/')) {
      usedKeys.add(match[1]);
    }
  }

  // 匹配 title: 'key' 模式
  const titleRegex = /title\s*:\s*['"]([^'"]+)['"]/g;
  while ((match = titleRegex.exec(content)) !== null) {
    if (match[1].includes('.') && !match[1].startsWith('/')) {
      usedKeys.add(match[1]);
    }
  }

  // 匹配 placeholder: 'key' 模式
  const placeholderRegex = /placeholder\s*:\s*['"]([^'"]+)['"]/g;
  while ((match = placeholderRegex.exec(content)) !== null) {
    if (match[1].includes('.') && !match[1].startsWith('/')) {
      usedKeys.add(match[1]);
    }
  }

  // 匹配 error: 'key' 模式
  const errorRegex = /error\s*:\s*['"]([^'"]+)['"]/g;
  while ((match = errorRegex.exec(content)) !== null) {
    if (match[1].includes('.') && !match[1].startsWith('/')) {
      usedKeys.add(match[1]);
    }
  }

  // 匹配 message: 'key' 模式
  const messageRegex = /message\s*:\s*['"]([^'"]+)['"]/g;
  while ((match = messageRegex.exec(content)) !== null) {
    if (match[1].includes('.') && !match[1].startsWith('/')) {
      usedKeys.add(match[1]);
    }
  }

  // 匹配 header: 'key' 模式
  const headerRegex = /header\s*:\s*['"]([^'"]+)['"]/g;
  while ((match = headerRegex.exec(content)) !== null) {
    if (match[1].includes('.') && !match[1].startsWith('/')) {
      usedKeys.add(match[1]);
    }
  }

  // 匹配 cell: (info) => t('key') 模式
  const cellRegex = /cell\s*[:\(].*?t\(['"]([^'"]+)['"]\)/gs;
  while ((match = cellRegex.exec(content)) !== null) {
    usedKeys.add(match[1]);
  }

  // 匹配 accessorKey: 'key' 模式（表格列）
  const accessorRegex = /accessorKey\s*:\s*['"]([^'"]+)['"]/g;
  while ((match = accessorRegex.exec(content)) !== null) {
    if (match[1].includes('.') && !match[1].startsWith('/')) {
      usedKeys.add(match[1]);
    }
  }

  // 匹配 meta: { title: 'key' } 模式
  const metaTitleRegex = /meta\s*:\s*\{[^}]*title\s*:\s*['"]([^'"]+)['"]/g;
  while ((match = metaTitleRegex.exec(content)) !== null) {
    if (match[1].includes('.') && !match[1].startsWith('/')) {
      usedKeys.add(match[1]);
    }
  }

  return usedKeys;
}

// 检查键是否被使用（支持前缀匹配）
function isKeyUsed(key, usedKeys) {
  // 直接匹配
  if (usedKeys.has(key)) return true;

  // 检查是否有使用的键以此键为前缀
  for (const usedKey of usedKeys) {
    if (usedKey === key || usedKey.startsWith(key + '.')) {
      return true;
    }
  }

  return false;
}

// 检查键是否是另一个使用键的前缀
function isPrefixOfUsedKey(key, usedKeys) {
  for (const usedKey of usedKeys) {
    if (usedKey.startsWith(key + '.') && usedKey !== key) {
      return true;
    }
  }
  return false;
}

// 删除未使用的键
function removeUnusedKeys(obj, unusedKeys, currentPrefix = '') {
  const result = {};

  for (const key in obj) {
    const fullKey = currentPrefix ? `${currentPrefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      // 递归处理嵌套对象
      const nested = removeUnusedKeys(obj[key], unusedKeys, fullKey);
      // 只保留非空对象
      if (Object.keys(nested).length > 0) {
        result[key] = nested;
      }
    } else {
      // 只保留使用的键
      if (!unusedKeys.has(fullKey)) {
        result[key] = obj[key];
      }
    }
  }

  return result;
}

// 主函数
async function main() {
  console.log('🔍 扫描翻译键...\n');

  // 1. 加载翻译文件
  const translations = loadTranslations(EN_MESSAGES_DIR);
  const allKeys = flattenKeys(translations);
  const _nestedKeys = getNestedKeys(translations);

  console.log(`📦 总共发现 ${allKeys.size} 个翻译键\n`);

  // 2. 扫描源代码
  console.log('📂 扫描源代码文件...');
  const sourceFiles = scanSourceFiles(SOURCE_DIRS, FILE_EXTENSIONS);
  console.log(`   找到 ${sourceFiles.length} 个源文件\n`);

  // 3. 提取使用的键
  console.log('🔎 提取使用的翻译键...');
  const usedKeys = new Set();
  for (const file of sourceFiles) {
    const keys = extractUsedKeys(file);
    for (const key of keys) {
      usedKeys.add(key);
    }
  }
  console.log(`   找到 ${usedKeys.size} 个使用的翻译键\n`);

  // 4. 找出未使用的键
  const unusedKeys = new Set();
  const potentiallyUnused = [];

  for (const key of allKeys) {
    if (!isKeyUsed(key, usedKeys)) {
      // 检查是否是使用键的前缀（如果是，则可能是父级命名空间）
      if (!isPrefixOfUsedKey(key, usedKeys)) {
        unusedKeys.add(key);
        potentiallyUnused.push(key);
      }
    }
  }

  console.log('📊 分析结果:');
  console.log(`   ✅ 使用的键: ${usedKeys.size}`);
  console.log(`   ❌ 未使用的键: ${unusedKeys.size}`);
  console.log(`   📈 使用率: ${((usedKeys.size / allKeys.size) * 100).toFixed(1)}%\n`);

  // 5. 按命名空间分组显示未使用的键
  if (potentiallyUnused.length > 0) {
    console.log('🗑️  未使用的翻译键（按命名空间分组）:\n');

    const grouped = {};
    for (const key of potentiallyUnused.sort()) {
      const namespace = key.split('.')[0];
      if (!grouped[namespace]) grouped[namespace] = [];
      grouped[namespace].push(key);
    }

    for (const [namespace, keys] of Object.entries(grouped)) {
      console.log(`   [${namespace}] (${keys.length} 个)`);
      for (const key of keys.slice(0, 10)) {
        console.log(`     - ${key}`);
      }
      if (keys.length > 10) {
        console.log(`     ... 还有 ${keys.length - 10} 个`);
      }
      console.log('');
    }

    // 保存未使用的键到文件
    const outputPath = path.join(__dirname, '../unused-translations.json');
    fs.writeFileSync(outputPath, JSON.stringify(potentiallyUnused, null, 2));
    console.log(`📝 未使用的键已保存到: ${outputPath}\n`);

    // 6. 生成清理后的翻译文件
    console.log('🧹 生成清理后的翻译文件...');
    const cleanedTranslations = removeUnusedKeys(translations, unusedKeys);

    const cleanedEnDir = path.join(__dirname, '../src/i18n/messages/en.cleaned');
    const cleanedZhDir = path.join(__dirname, '../src/i18n/messages/zh-CN.cleaned');

    // 创建清理后的目录
    fs.mkdirSync(cleanedEnDir, { recursive: true });
    fs.mkdirSync(cleanedZhDir, { recursive: true });

    // 保存合并后的清理文件
    const cleanedEnPath = path.join(cleanedEnDir, 'merged.json');
    fs.writeFileSync(cleanedEnPath, JSON.stringify(cleanedTranslations, null, 2));
    console.log(`   ✅ ${cleanedEnPath}`);

    // 同时处理中文文件
    const zhTranslations = loadTranslations(ZH_MESSAGES_DIR);
    const cleanedZhTranslations = removeUnusedKeys(zhTranslations, unusedKeys);
    const cleanedZhPath = path.join(cleanedZhDir, 'merged.json');
    fs.writeFileSync(cleanedZhPath, JSON.stringify(cleanedZhTranslations, null, 2));
    console.log(`   ✅ ${cleanedZhPath}\n`);

    // 统计节省的空间
    const enJsonFiles = getJsonFiles(EN_MESSAGES_DIR);
    let originalSize = 0;
    for (const file of enJsonFiles) {
      originalSize += fs.statSync(file).size;
    }
    const cleanedSize = fs.statSync(cleanedEnPath).size;
    const savedPercent = (((originalSize - cleanedSize) / originalSize) * 100).toFixed(1);

    console.log('💾 文件大小对比:');
    console.log(`   原始大小: ${(originalSize / 1024).toFixed(1)} KB`);
    console.log(`   清理后: ${(cleanedSize / 1024).toFixed(1)} KB`);
    console.log(`   节省: ${savedPercent}%\n`);

    console.log('⚠️  注意: 请仔细检查未使用的键列表，确认后再替换原始文件！');
    console.log(`   清理后的文件位于: ${cleanedEnDir} 和 ${cleanedZhDir}`);
  } else {
    console.log('✨ 没有发现未使用的翻译键！');
  }
}

main().catch(console.error);
