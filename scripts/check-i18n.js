#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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

function loadTranslationFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

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

function loadTranslationsWithNamespace(messagesDir) {
  const messages = {};
  const namespaceMap = {};
  const jsonFiles = getJsonFiles(messagesDir);

  for (const filePath of jsonFiles) {
    const relativePath = path.relative(messagesDir, filePath);
    const namespace = relativePath.replace(/\.json$/, '').replace(/[/\\]/g, '/');
    const content = loadTranslationFile(filePath);

    if (namespace === 'common') {
      messages.common = content;
      Object.assign(messages, content);
      for (const key of Object.keys(content)) {
        namespaceMap[key] = 'common.json';
      }
    } else if (namespace === 'components/export') {
      messages.unifiedExport = content;
      for (const key of Object.keys(content)) {
        namespaceMap[key] = 'components/export.json';
      }
    } else {
      Object.assign(messages, content);
      for (const key of Object.keys(content)) {
        namespaceMap[key] = namespace + '.json';
      }
    }
  }

  return { messages, namespaceMap };
}

function flattenKeys(obj, prefix = '', result = new Set()) {
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      flattenKeys(obj[key], prefix ? `${prefix}.${key}` : key, result);
    } else {
      result.add(prefix ? `${prefix}.${key}` : key);
    }
  }
  return result;
}

function scanSourceFiles(dirs, extensions) {
  const files = [];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
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

function extractUsedKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const usedKeys = new Set();
  const keyLocations = {};

  const patterns = [
    { regex: /t\(['"`]([^'"`]+)['"`]\)/g, name: 't()' },
    { regex: /label\s*:\s*['"`]([^'"`]+)['"`]/g, name: 'label' },
    { regex: /description\s*:\s*['"`]([^'"`]+)['"`]/g, name: 'description' },
    { regex: /title\s*:\s*['"`]([^'"`]+)['"`]/g, name: 'title' },
    { regex: /placeholder\s*:\s*['"`]([^'"`]+)['"`]/g, name: 'placeholder' },
    { regex: /error\s*:\s*['"`]([^'"`]+)['"`]/g, name: 'error' },
    { regex: /message\s*:\s*['"`]([^'"`]+)['"`]/g, name: 'message' },
    { regex: /header\s*:\s*['"`]([^'"`]+)['"`]/g, name: 'header' },
    { regex: /accessorKey\s*:\s*['"`]([^'"`]+)['"`]/g, name: 'accessorKey' },
  ];

  for (const { regex } of patterns) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const key = match[1];
      if (key.includes('.') && !key.startsWith('/') && !key.startsWith('http')) {
        usedKeys.add(key);
        if (!keyLocations[key]) {
          keyLocations[key] = [];
        }
        const relativePath = path.relative(path.join(__dirname, '..'), filePath);
        keyLocations[key].push(relativePath);
      }
    }
  }

  const cellRegex = /cell\s*[:\(].*?t\(['"`]([^'"`]+)['"`]\)/gs;
  let match;
  while ((match = cellRegex.exec(content)) !== null) {
    usedKeys.add(match[1]);
    if (!keyLocations[match[1]]) {
      keyLocations[match[1]] = [];
    }
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);
    keyLocations[match[1]].push(relativePath);
  }

  return { usedKeys, keyLocations };
}

function isKeyUsed(key, usedKeys) {
  if (usedKeys.has(key)) return true;

  for (const usedKey of usedKeys) {
    if (usedKey === key || usedKey.startsWith(key + '.')) {
      return true;
    }
  }

  return false;
}

function isPrefixOfUsedKey(key, usedKeys) {
  for (const usedKey of usedKeys) {
    if (usedKey.startsWith(key + '.') && usedKey !== key) {
      return true;
    }
  }
  return false;
}

function compareTranslations(enMessages, zhMessages) {
  const enKeys = flattenKeys(enMessages);
  const zhKeys = flattenKeys(zhMessages);

  const missingInZh = [];
  const missingInEn = [];

  for (const key of enKeys) {
    if (!zhKeys.has(key)) {
      missingInZh.push(key);
    }
  }

  for (const key of zhKeys) {
    if (!enKeys.has(key)) {
      missingInEn.push(key);
    }
  }

  return { missingInZh, missingInEn, enKeys, zhKeys };
}

function printReport(report) {
  const { missingInCode, unusedKeys, missingInZh, missingInEn, stats } = report;

  console.log('\n' + '='.repeat(60));
  console.log('📊 翻译验证报告');
  console.log('='.repeat(60));

  console.log('\n📈 统计概览:');
  console.log(`   📁 源文件数量: ${stats.sourceFiles}`);
  console.log(`   🔑 定义的翻译键 (EN): ${stats.enKeys}`);
  console.log(`   🔑 定义的翻译键 (ZH): ${stats.zhKeys}`);
  console.log(`   ✅ 代码中使用的键: ${stats.usedKeys}`);
  console.log(`   ❌ 未使用的键: ${stats.unusedKeys}`);
  console.log(`   ⚠️  代码中缺失的键: ${stats.missingInCode}`);

  if (missingInCode.length > 0) {
    console.log('\n❌ 代码中使用但翻译文件中缺失的键:');
    const grouped = {};
    for (const item of missingInCode) {
      const namespace = item.key.split('.')[0];
      if (!grouped[namespace]) grouped[namespace] = [];
      grouped[namespace].push(item);
    }

    for (const [namespace, items] of Object.entries(grouped)) {
      console.log(`\n   [${namespace}] (${items.length} 个)`);
      for (const item of items.slice(0, 5)) {
        console.log(`     - ${item.key}`);
        if (item.locations && item.locations.length > 0) {
          console.log(`       使用位置: ${item.locations[0]}`);
        }
      }
      if (items.length > 5) {
        console.log(`     ... 还有 ${items.length - 5} 个`);
      }
    }
  }

  if (missingInZh.length > 0) {
    console.log('\n🇨🇳 中文翻译中缺失的键 (英文有但中文没有):');
    const grouped = {};
    for (const key of missingInZh) {
      const namespace = key.split('.')[0];
      if (!grouped[namespace]) grouped[namespace] = [];
      grouped[namespace].push(key);
    }

    for (const [namespace, keys] of Object.entries(grouped)) {
      console.log(`\n   [${namespace}] (${keys.length} 个)`);
      for (const key of keys.slice(0, 5)) {
        console.log(`     - ${key}`);
      }
      if (keys.length > 5) {
        console.log(`     ... 还有 ${keys.length - 5} 个`);
      }
    }
  }

  if (missingInEn.length > 0) {
    console.log('\n🇺🇸 英文翻译中缺失的键 (中文有但英文没有):');
    const grouped = {};
    for (const key of missingInEn) {
      const namespace = key.split('.')[0];
      if (!grouped[namespace]) grouped[namespace] = [];
      grouped[namespace].push(key);
    }

    for (const [namespace, keys] of Object.entries(grouped)) {
      console.log(`\n   [${namespace}] (${keys.length} 个)`);
      for (const key of keys.slice(0, 5)) {
        console.log(`     - ${key}`);
      }
      if (keys.length > 5) {
        console.log(`     ... 还有 ${keys.length - 5} 个`);
      }
    }
  }

  if (unusedKeys.length > 0) {
    console.log('\n🗑️  未使用的翻译键:');
    const grouped = {};
    for (const key of unusedKeys) {
      const namespace = key.split('.')[0];
      if (!grouped[namespace]) grouped[namespace] = [];
      grouped[namespace].push(key);
    }

    for (const [namespace, keys] of Object.entries(grouped)) {
      console.log(`\n   [${namespace}] (${keys.length} 个)`);
      for (const key of keys.slice(0, 5)) {
        console.log(`     - ${key}`);
      }
      if (keys.length > 5) {
        console.log(`     ... 还有 ${keys.length - 5} 个`);
      }
    }
  }

  const hasIssues = missingInCode.length > 0 || missingInZh.length > 0 || missingInEn.length > 0;

  console.log('\n' + '='.repeat(60));
  if (!hasIssues && unusedKeys.length === 0) {
    console.log('✨ 翻译验证通过！所有翻译键完整且一致。');
  } else if (!hasIssues) {
    console.log('✅ 翻译键完整性检查通过！');
    console.log('💡 提示: 发现未使用的翻译键，可以考虑清理。');
  } else {
    console.log('⚠️  发现翻译问题，请检查上述报告。');
  }
  console.log('='.repeat(60) + '\n');

  return hasIssues;
}

function saveReport(report, outputPath) {
  const reportData = {
    timestamp: new Date().toISOString(),
    stats: report.stats,
    missingInCode: report.missingInCode,
    missingInZh: report.missingInZh,
    missingInEn: report.missingInEn,
    unusedKeys: report.unusedKeys,
  };

  fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2));
  console.log(`📝 详细报告已保存到: ${outputPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const outputJson = args.includes('--json');

  console.log('🔍 开始翻译验证...\n');

  const { messages: enMessages, namespaceMap: enNamespaceMap } = loadTranslationsWithNamespace(EN_MESSAGES_DIR);
  const { messages: zhMessages } = loadTranslationsWithNamespace(ZH_MESSAGES_DIR);

  const enKeys = flattenKeys(enMessages);
  const zhKeys = flattenKeys(zhMessages);

  console.log(`📦 加载翻译文件:`);
  console.log(`   英文: ${enKeys.size} 个键`);
  console.log(`   中文: ${zhKeys.size} 个键\n`);

  console.log('📂 扫描源代码文件...');
  const sourceFiles = scanSourceFiles(SOURCE_DIRS, FILE_EXTENSIONS);
  console.log(`   找到 ${sourceFiles.length} 个源文件\n`);

  console.log('🔎 提取使用的翻译键...');
  const allUsedKeys = new Set();
  const allKeyLocations = {};

  for (const file of sourceFiles) {
    const { usedKeys, keyLocations } = extractUsedKeys(file);
    for (const key of usedKeys) {
      allUsedKeys.add(key);
      if (!allKeyLocations[key]) {
        allKeyLocations[key] = [];
      }
      allKeyLocations[key].push(...(keyLocations[key] || []));
    }
  }
  console.log(`   找到 ${allUsedKeys.size} 个使用的翻译键\n`);

  const missingInCode = [];
  for (const key of allUsedKeys) {
    if (!enKeys.has(key)) {
      let found = false;
      for (const enKey of enKeys) {
        if (enKey.startsWith(key + '.') || key.startsWith(enKey + '.')) {
          found = true;
          break;
        }
      }
      if (!found) {
        missingInCode.push({
          key,
          locations: allKeyLocations[key]?.slice(0, 3),
        });
      }
    }
  }

  const unusedKeys = [];
  for (const key of enKeys) {
    if (!isKeyUsed(key, allUsedKeys) && !isPrefixOfUsedKey(key, allUsedKeys)) {
      unusedKeys.push(key);
    }
  }

  const { missingInZh, missingInEn } = compareTranslations(enMessages, zhMessages);

  const report = {
    missingInCode,
    unusedKeys,
    missingInZh,
    missingInEn,
    stats: {
      sourceFiles: sourceFiles.length,
      enKeys: enKeys.size,
      zhKeys: zhKeys.size,
      usedKeys: allUsedKeys.size,
      unusedKeys: unusedKeys.length,
      missingInCode: missingInCode.length,
    },
  };

  const hasIssues = printReport(report);

  if (outputJson) {
    const outputPath = path.join(__dirname, '../i18n-report.json');
    saveReport(report, outputPath);
  }

  process.exit(hasIssues ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ 执行失败:', error);
  process.exit(1);
});
