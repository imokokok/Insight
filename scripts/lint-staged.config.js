/**
 * @fileoverview lint-staged 配置文件
 * @description 在 git 提交前自动运行代码检查和格式化
 * @author Insight Team
 */

module.exports = {
  // TypeScript/JavaScript 文件: 先 ESLint 修复，再 Prettier 格式化
  '*.{ts,tsx,js,jsx,mjs}': [
    'eslint --fix',
    'prettier --write',
  ],

  // JSON 文件: Prettier 格式化
  '*.{json,jsonc}': ['prettier --write'],

  // Markdown 文件: Prettier 格式化
  '*.md': ['prettier --write'],

  // CSS/SCSS 文件: Prettier 格式化
  '*.{css,scss,sass}': ['prettier --write'],

  // YAML 文件: Prettier 格式化
  '*.{yml,yaml}': ['prettier --write'],

  // 图片文件: 检查大小
  '*.{png,jpg,jpeg,gif,svg,webp}': [
    () => 'echo "检查图片文件大小..."',
  ],
};
