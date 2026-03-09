# 代码清理规格文档

## 为什么
项目存在大量代码质量问题，包括格式化问题（365个）、未使用变量（55个）和类型问题（3个），影响代码可维护性和开发体验。

## 什么变化
- 修复所有 Prettier 格式问题（365个）
- 移除所有未使用的变量和导入（55个）
- 修复 TypeScript 类型问题（3个）
- 确保代码符合 ESLint 规则

## 影响
- 受影响的规格: 无
- 受影响的代码: 整个项目的 TypeScript/React 文件

## 要求

### 要求: 完整代码清理
项目 SHALL 通过运行 `npm run lint` 验证，无任何 error 或 warning。

#### 场景: 格式化修复
- **WHEN** 运行 `npm run lint` 检测到 Prettier 格式问题
- **THEN** 自动修复格式问题

#### 场景: 未使用变量清理
- **WHEN** 检测到未使用的变量或导入
- **THEN** 移除相关代码

#### 场景: 类型问题修复
- **WHEN** 检测到 TypeScript 类型错误
- **THEN** 修复类型定义

## 验收标准
- [ ] `npm run lint` 执行无任何 error
- [ ] `npm run lint` 执行无任何 warning
