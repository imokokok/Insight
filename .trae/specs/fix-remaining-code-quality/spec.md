# 修复剩余代码质量问题 Spec

## Why

根据当前代码质量检查，项目仍存在 324 个 ESLint 错误和 873 个警告，以及大量 TypeScript 未使用变量的类型错误。需要系统性地修复这些问题以提升代码质量和可维护性。

## What Changes

- 自动修复可自动修复的 ESLint 问题（32 个可自动修复）
- 手动修复 React Hooks 相关问题（purity、set-state-in-effect、preserve-manual-memoization）
- 修复未使用变量和导入的 TypeScript 错误
- 修复类型不兼容问题

## Impact

- 减少 ESLint 错误和警告数量
- 消除 TypeScript 类型错误
- 提高代码可维护性和可读性
- 为后续开发提供干净的代码基础

## ADDED Requirements

### Requirement: 自动修复 ESLint 问题

系统 SHALL 自动修复所有可自动修复的 ESLint 问题

#### Scenario: 运行自动修复

- **WHEN** 执行 `npm run lint:fix`
- **THEN** 自动修复所有可自动修复的问题

#### Scenario: 验证修复结果

- **WHEN** 再次运行 `npm run lint`
- **THEN** 错误和警告数量显著减少

### Requirement: 修复 React Hooks 错误

系统 SHALL 修复所有 React Hooks 相关的 ESLint 错误

#### Scenario: 修复 hooks purity 错误

- **WHEN** 识别到 `react-hooks/purity` 错误（如 Date.now 在 render 中调用）
- **THEN** 使用 useState 初始化或 useEffect 延迟执行来修复

#### Scenario: 修复 set-state-in-effect 错误

- **WHEN** 识别到 `react-hooks/set-state-in-effect` 错误
- **THEN** 重构代码避免在 effect 中直接调用 setState

#### Scenario: 修复 preserve-manual-memoization 错误

- **WHEN** 识别到 `react-hooks/preserve-manual-memoization` 错误
- **THEN** 调整 useMemo 依赖数组以匹配实际依赖

### Requirement: 修复 TypeScript 类型错误

系统 SHALL 修复 TypeScript 类型检查错误

#### Scenario: 修复未使用变量

- **WHEN** 识别到未使用的变量或导入（TS6133）
- **THEN** 删除未使用的代码或添加下划线前缀

#### Scenario: 修复类型不兼容

- **WHEN** 识别到类型不兼容错误（TS2322）
- **THEN** 调整类型定义或添加类型断言

### Requirement: 验证修复结果

系统 SHALL 验证所有修复后的代码通过质量检查

#### Scenario: 完整验证

- **WHEN** 运行 `npm run validate`
- **THEN** ESLint 和 TypeScript 检查通过
