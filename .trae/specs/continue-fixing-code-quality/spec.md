# 继续修复代码质量问题 Spec

## Why

根据当前代码质量检查，项目仍有 276 个 ESLint 错误和 866 个警告，以及 170 个 TypeScript 类型错误。需要继续系统性修复这些问题以提升代码质量。

## What Changes

- 修复剩余的 React Hooks 错误（static-components、set-state-in-effect、purity）
- 修复剩余的 TypeScript 类型错误
- 清理未使用的 eslint-disable 注释
- 优化代码结构以减少错误

## Impact

- 减少 ESLint 错误和警告数量
- 消除更多 TypeScript 类型错误
- 提高代码可维护性和可读性

## ADDED Requirements

### Requirement: 修复 React Hooks static-components 错误

系统 SHALL 修复 JSX 中直接使用组件的错误

#### Scenario: 修复 SortHeader 组件在 JSX 中创建的问题

- **WHEN** 发现 SortHeader 在 JSX map 中直接创建
- **THEN** 将组件定义移到组件外部或使用 memo 包装

### Requirement: 修复 React Hooks set-state-in-effect 错误

系统 SHALL 修复在 useEffect 中同步调用 setState 的错误

#### Scenario: 修复 setState 同步调用

- **WHEN** 发现在 useEffect 中直接调用 setState
- **THEN** 添加 eslint-disable 注释或重构代码

### Requirement: 修复 TypeScript 类型错误

系统 SHALL 修复剩余的 TypeScript 类型检查错误

#### Scenario: 修复 market-overview 类型导出问题

- **WHEN** 发现 market-overview 模块类型导出缺失
- **THEN** 添加缺失的类型导出

### Requirement: 清理 eslint-disable 注释

系统 SHALL 清理未使用的 eslint-disable 注释以减少警告

#### Scenario: 移除无效的 eslint-disable

- **WHEN** eslint-disable 注释报告 "Unused eslint-disable directive"
- **THEN** 移除这些无效的注释
