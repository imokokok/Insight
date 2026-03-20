# 代码规范违规修复 Spec

## Why
根据代码规范合规性检查结果，发现多处代码不符合 `project_rules.md` 规范，需要修复以确保代码质量和一致性。

## What Changes
- 修复枚举定义，使用 `const enum` 提高性能
- 修复 `any` 类型使用，替换为具体类型
- 修复类型导入，使用 `import type` 语法
- 修复对象形状定义，使用 `interface` 替代 `type`
- 修复错误处理，使用自定义错误类
- 修复 React Query Query Keys，使用工厂模式
- 修复布尔值变量命名，使用 `is/has/should` 前缀
- 添加文件头注释和 JSDoc 文档

## Impact
- Affected specs: TypeScript 规范、错误处理规范、状态管理规范、命名约定、注释规范
- Affected code: 
  - `src/types/oracle/enums.ts` - 枚举定义
  - `src/types/oracle/constants.ts` - 枚举定义
  - `src/lib/oracles/bandProtocol.ts` - 枚举定义
  - `src/hooks/*.ts` - any 类型、错误处理、布尔值命名
  - `src/lib/queries/queryKeys.ts` - Query Keys 工厂模式扩展
  - 多个组件文件 - 类型导入、any 类型

## ADDED Requirements

### Requirement: 枚举定义修复
系统应将所有普通 `enum` 改为 `const enum`。

#### Scenario: 修复枚举定义
- **WHEN** 代码中存在普通 `enum` 定义
- **THEN** 应改为 `const enum`

### Requirement: any 类型修复
系统应将所有 `any` 类型替换为具体类型。

#### Scenario: 修复 any 类型
- **WHEN** 代码中存在 `any` 类型使用
- **THEN** 应替换为具体类型或使用 Recharts 提供的类型

### Requirement: 类型导入修复
系统应将纯类型导入改为 `import type` 语法。

#### Scenario: 修复类型导入
- **WHEN** 导入仅用于类型注解
- **THEN** 应使用 `import type` 或 `import { type X }` 语法

### Requirement: 错误处理修复
系统应将原生 `Error` 替换为自定义错误类。

#### Scenario: 修复错误处理
- **WHEN** 抛出错误时使用 `new Error()`
- **THEN** 应使用对应的自定义错误类（ValidationError, PriceFetchError 等）

### Requirement: Query Keys 工厂模式扩展
系统应扩展 Query Keys 工厂模式以覆盖所有使用场景。

#### Scenario: 扩展 Query Keys
- **WHEN** 使用内联数组定义 queryKey
- **THEN** 应使用工厂函数模式定义

### Requirement: 布尔值变量命名修复
系统应将布尔值变量改为使用 `is/has/should` 前缀。

#### Scenario: 修复布尔值命名
- **WHEN** 布尔值变量未使用 `is/has/should` 前缀
- **THEN** 应添加正确的前缀

## MODIFIED Requirements
无

## REMOVED Requirements
无
