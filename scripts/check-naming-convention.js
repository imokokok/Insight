#!/usr/bin/env node

/**
 * @fileoverview 命名规范检查脚本
 * @description 检查项目中的命名规范是否符合 Insight 项目规范
 * @author Insight Team
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// 命名规范正则
const patterns = {
  // PascalCase: 组件文件、类型定义
  pascalCase: /^[A-Z][a-zA-Z0-9]*$/,
  // camelCase: hooks、工具函数
  camelCase: /^[a-z][a-zA-Z0-9]*$/,
  // SCREAMING_SNAKE_CASE: 常量
  screamingSnakeCase: /^[A-Z][A-Z0-9_]*$/,
  // kebab-case: 配置文件
  kebabCase: /^[a-z][a-z0-9-]*$/,
};

// 检查结果
const results = {
  passed: [],
  warnings: [],
  errors: [],
};

/**
 * 检查文件名是否符合规范
 */
function checkFileName(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);
  const dirName = path.dirname(filePath);

  // 只检查 ts/tsx 文件
  if (!['.ts', '.tsx'].includes(ext)) {
    return null;
  }

  // 忽略的文件
  const ignorePatterns = [
    /^index\.(ts|tsx)$/,
    /^layout\.(ts|tsx)$/,
    /^page\.(ts|tsx)$/,
    /^route\.(ts|tsx)$/,
    /^loading\.(ts|tsx)$/,
    /^error\.(ts|tsx)$/,
    /^not-found\.(ts|tsx)$/,
    /^global\.(ts|tsx)$/,
  ];

  for (const pattern of ignorePatterns) {
    if (pattern.test(fileName)) return null;
  }

  // 检查是否在 hooks 目录
  if (dirName.includes('/hooks') || dirName.includes('\\hooks')) {
    if (!/^use[a-zA-Z0-9]+$/.test(baseName)) {
      return {
        type: 'error',
        file: filePath,
        message: `Hook 文件 "${fileName}" 必须以 "use" 开头并使用 camelCase`,
        suggestion: `建议重命名为: use${baseName.charAt(0).toUpperCase() + baseName.slice(1)}.ts`,
      };
    }
    return { type: 'passed', file: filePath, message: `Hook 文件 "${fileName}" 命名正确` };
  }

  // 检查是否在 components 目录
  if (dirName.includes('/components') || dirName.includes('\\components')) {
    if (ext === '.tsx') {
      if (!patterns.pascalCase.test(baseName)) {
        return {
          type: 'error',
          file: filePath,
          message: `组件文件 "${fileName}" 必须使用 PascalCase`,
          suggestion: `建议重命名为: ${baseName.charAt(0).toUpperCase() + baseName.slice(1).replace(/[-_](.)/g, (_, c) => c.toUpperCase())}.tsx`,
        };
      }
      return { type: 'passed', file: filePath, message: `组件文件 "${fileName}" 命名正确` };
    }
  }

  // 检查是否在 types 目录
  if (dirName.includes('/types') || dirName.includes('\\types')) {
    if (baseName === 'types' || patterns.pascalCase.test(baseName)) {
      return { type: 'passed', file: filePath, message: `类型文件 "${fileName}" 命名正确` };
    }
    return {
      type: 'warning',
      file: filePath,
      message: `类型文件 "${fileName}" 建议使用 PascalCase 或 types.ts`,
    };
  }

  // 检查常量文件
  if (dirName.includes('/constants') || dirName.includes('/config')) {
    if (patterns.screamingSnakeCase.test(baseName)) {
      return { type: 'passed', file: filePath, message: `常量文件 "${fileName}" 命名正确` };
    }
  }

  // 检查工具函数
  if (dirName.includes('/utils') || dirName.includes('/lib')) {
    if (patterns.camelCase.test(baseName)) {
      return { type: 'passed', file: filePath, message: `工具文件 "${fileName}" 命名正确` };
    }
    if (!patterns.pascalCase.test(baseName)) {
      return {
        type: 'warning',
        file: filePath,
        message: `工具文件 "${fileName}" 建议使用 camelCase`,
      };
    }
  }

  return null;
}

/**
 * 递归遍历目录
 */
function traverseDirectory(dir, callback) {
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (err) {
    return;
  }

  for (const file of files) {
    const filePath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (err) {
      continue;
    }

    if (stat.isDirectory()) {
      // 忽略的目录
      const ignoreDirs = ['node_modules', '.next', 'out', 'build', 'dist', 'coverage', '.git'];
      if (!ignoreDirs.includes(file)) {
        traverseDirectory(filePath, callback);
      }
    } else {
      callback(filePath);
    }
  }
}

/**
 * 打印报告
 */
function printReport() {
  console.log('\n' + colors.cyan + '='.repeat(60) + colors.reset);
  console.log(colors.cyan + '       Insight 项目命名规范检查报告' + colors.reset);
  console.log(colors.cyan + '='.repeat(60) + colors.reset + '\n');

  // 统计
  const total = results.passed.length + results.warnings.length + results.errors.length;

  console.log(colors.green + `✓ 通过: ${results.passed.length}` + colors.reset);
  console.log(colors.yellow + `⚠ 警告: ${results.warnings.length}` + colors.reset);
  console.log(colors.red + `✗ 错误: ${results.errors.length}` + colors.reset);
  console.log(colors.blue + `总计: ${total}` + colors.reset + '\n');

  // 详细错误
  if (results.errors.length > 0) {
    console.log(colors.red + '【错误详情】' + colors.reset);
    results.errors.forEach((error, index) => {
      console.log(`\n${index + 1}. ${colors.red}${error.message}${colors.reset}`);
      console.log(`   文件: ${error.file}`);
      if (error.suggestion) {
        console.log(`   ${colors.green}建议: ${error.suggestion}${colors.reset}`);
      }
    });
    console.log('');
  }

  // 详细警告
  if (results.warnings.length > 0) {
    console.log(colors.yellow + '【警告详情】' + colors.reset);
    results.warnings.forEach((warning, index) => {
      console.log(`\n${index + 1}. ${colors.yellow}${warning.message}${colors.reset}`);
      console.log(`   文件: ${warning.file}`);
    });
    console.log('');
  }

  // 命名规范参考
  console.log(colors.cyan + '【命名规范参考】' + colors.reset);
  console.log(`
文件类型              命名规则                    示例
─────────────────────────────────────────────────────────────
组件文件              PascalCase.tsx              PriceCard.tsx
Hooks                 camelCase (use 前缀)        usePriceData.ts
工具函数              camelCase.ts                formatPrice.ts
类型定义              PascalCase.ts               OracleTypes.ts
常量                  SCREAMING_SNAKE_CASE.ts     API_ENDPOINTS.ts
配置文件              camelCase/kebab-case        next.config.ts
─────────────────────────────────────────────────────────────`);

  console.log('\n' + colors.cyan + '='.repeat(60) + colors.reset);

  // 返回退出码
  return results.errors.length > 0 ? 1 : 0;
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const targetDir = args[0] || 'src';
  const projectRoot = process.cwd();
  const fullPath = path.resolve(projectRoot, targetDir);

  console.log(colors.blue + `\n开始检查目录: ${fullPath}` + colors.reset);

  if (!fs.existsSync(fullPath)) {
    console.log(colors.red + `错误: 目录不存在 ${fullPath}` + colors.reset);
    process.exit(1);
  }

  // 遍历目录
  traverseDirectory(fullPath, (filePath) => {
    const result = checkFileName(filePath);
    if (result) {
      results[result.type === 'passed' ? 'passed' : result.type === 'warning' ? 'warnings' : 'errors'].push(result);
    }
  });

  // 打印报告
  const exitCode = printReport();
  process.exit(exitCode);
}

// 运行
main();
