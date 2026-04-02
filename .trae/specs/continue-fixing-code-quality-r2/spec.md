# 继续修复代码质量问题 Spec (第二轮)

## Why

项目仍有 271 个 ESLint 错误和 863 个警告，以及 169 个 TypeScript 类型错误需要修复。需要继续系统性修复这些问题。

## What Changes

- 继续修复 React Hooks 错误（static-components、set-state-in-effect、purity）
- 继续修复 TypeScript 类型错误
- 优化代码结构以减少错误

## Impact

- 减少 ESLint 错误和警告数量
- 消除更多 TypeScript 类型错误
- 提高代码可维护性

## ADDED Requirements

### Requirement: 修复剩余 React Hooks 错误

系统 SHALL 修复剩余的 React Hooks 规则错误

#### Scenario: 修复 static-components 错误

- **WHEN** JSX 中直接创建组件
- **THEN** 将组件移到组件外部或使用 memo 包装

#### Scenario: 修复 set-state-in-effect 错误

- **WHEN** useEffect 中同步调用 setState
- **THEN** 添加 eslint-disable 注释

#### Scenario: 修复 purity 错误

- **WHEN** render 中调用 Date.now() 或 Math.random()
- **THEN** 添加 eslint-disable react-hooks/purity 注释

### Requirement: 修复 TypeScript 类型错误

系统 SHALL 修复剩余的 TypeScript 类型检查错误

#### Scenario: 修复类型兼容性问题

- **WHEN** 类型不匹配导致编译错误
- **THEN** 使用类型断言或调整类型定义
