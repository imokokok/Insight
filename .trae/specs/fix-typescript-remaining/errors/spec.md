# 继续修复 TypeScript 类型错误 Spec

## Why

根据当前代码质量检查，项目仍有约 178 个 TypeScript 类型错误需要修复。这些错误主要集中在 cross-oracle、market-overview、price-query 等模块的类型兼容性问题。

## What Changes

- 修复 cross-oracle 模块的 Tooltip formatter 类型问题
- 修复 market-overview 模块的类型导出问题
- 修复 price-query 模块的类型问题
- 修复 API routes 的类型问题

## Impact

- 消除 TypeScript 类型错误
- 提高代码类型安全性
- 为后续开发提供坚实的基础

## MODIFIED Requirements

### Requirement: 修复 cross-oracle 类型错误

系统 SHALL 修复 cross-oracle 模块中的类型错误

#### Scenario: 修复 MultiOracleTrendChart Tooltip 类型

- **WHEN** 发现 Tooltip formatter 类型不匹配
- **THEN** 使用类型断言修复类型问题

#### Scenario: 修复 OracleQualityTable props 类型

- **WHEN** 发现组件 props 类型不匹配
- **THEN** 调整组件类型定义

### Requirement: 修复 market-overview 类型错误

系统 SHALL 修复 market-overview 模块中的类型错误

#### Scenario: 修复类型导出缺失

- **WHEN** 发现 market-overview/types 模块缺少导出
- **THEN** 添加缺失的类型导出

#### Scenario: 修复 possibly undefined 错误

- **WHEN** 发现可能为 undefined 的变量
- **THEN** 添加适当的类型检查

### Requirement: 修复 price-query 类型错误

系统 SHALL 修复 price-query 模块中的类型错误

#### Scenario: 修复组件 props 类型

- **WHEN** 发现组件 props 类型不匹配
- **THEN** 调整 props 类型定义

### Requirement: 修复 API routes 类型错误

系统 SHALL 修复 API routes 中的类型错误

#### Scenario: 修复 API handler 类型

- **WHEN** 发现 API handler 类型不匹配
- **THEN** 调整 handler 类型定义
