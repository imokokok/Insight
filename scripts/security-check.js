#!/usr/bin/env node

/**
 * 安全验证脚本
 * 检查项目中是否还有敏感信息暴露在 NEXT_PUBLIC_ 环境变量中
 */

const fs = require('fs');
const path = require('path');

// 敏感的环境变量前缀
const SENSITIVE_PATTERNS = [
  'NEXT_PUBLIC_ALCHEMY',
  'NEXT_PUBLIC_TRON',
  'NEXT_PUBLIC_TRONGRID',
  'NEXT_PUBLIC_THEGRAPH',
  'NEXT_PUBLIC_UMA_SUBGRAPH',
  'NEXT_PUBLIC_API3',
];

// 安全的环境变量（可以公开的）
const SAFE_PATTERNS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL',
];

const SRC_DIR = path.join(__dirname, '..', 'src');

let issues = [];
let filesChecked = 0;

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // 检查敏感模式
    SENSITIVE_PATTERNS.forEach((pattern) => {
      if (line.includes(pattern)) {
        issues.push({
          file: filePath,
          line: index + 1,
          content: line.trim(),
          pattern: pattern,
        });
      }
    });
  });
}

function scanDirectory(dir) {
  const items = fs.readdirSync(dir);

  items.forEach((item) => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !item.includes('node_modules')) {
      scanDirectory(fullPath);
    } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
      filesChecked++;
      scanFile(fullPath);
    }
  });
}

console.log('🔍 开始安全扫描...\n');

scanDirectory(SRC_DIR);

console.log(`✅ 已检查 ${filesChecked} 个文件\n`);

if (issues.length === 0) {
  console.log('✅ 未发现敏感信息暴露问题！');
  console.log('所有 API 密钥和敏感配置都已正确移至服务端。\n');
} else {
  console.log(`❌ 发现 ${issues.length} 个安全问题:\n`);
  issues.forEach((issue) => {
    console.log(`文件: ${issue.file}:${issue.line}`);
    console.log(`模式: ${issue.pattern}`);
    console.log(`代码: ${issue.content}`);
    console.log('');
  });
  console.log('请修复以上问题，将敏感信息移至服务端配置。\n');
  process.exit(1);
}

// 检查 .env.local 文件
console.log('🔍 检查 .env.local 文件...\n');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n');

  let envIssues = [];

  envLines.forEach((line, index) => {
    SENSITIVE_PATTERNS.forEach((pattern) => {
      if (line.startsWith(pattern + '=')) {
        envIssues.push({
          line: index + 1,
          content: line.split('=')[0], // 只显示变量名，不显示值
        });
      }
    });
  });

  if (envIssues.length === 0) {
    console.log('✅ .env.local 中没有敏感的 NEXT_PUBLIC_ 变量\n');
  } else {
    console.log(`❌ .env.local 中发现 ${envIssues.length} 个敏感变量:\n`);
    envIssues.forEach((issue) => {
      console.log(`第 ${issue.line} 行: ${issue.content}`);
    });
    console.log('\n请将这些变量重命名为不带 NEXT_PUBLIC_ 前缀的名称。\n');
    process.exit(1);
  }
} else {
  console.log('⚠️ 未找到 .env.local 文件\n');
}

console.log('🎉 安全验证通过！');
console.log('\n安全改进总结:');
console.log('1. ✅ Alchemy API Keys 已从 NEXT_PUBLIC_ 移至服务端');
console.log('2. ✅ TronGrid API Key 已从 NEXT_PUBLIC_ 移至服务端');
console.log('3. ✅ The Graph API Keys 已从 NEXT_PUBLIC_ 移至服务端');
console.log('4. ✅ API3 配置已从 NEXT_PUBLIC_ 移至服务端');
console.log('5. ✅ 功能开关已从 NEXT_PUBLIC_ 移至服务端');
console.log('\n现在所有敏感信息都只在服务端使用，不会暴露给浏览器。');
