# 代码规范合规性检查 Spec

## Why
项目已有完善的代码规范文档 (`project_rules.md`)，需要全面检查现有代码是否符合这些规范，发现并修复不符合规范的代码，确保代码质量和一致性。

## What Changes
- 检查 TypeScript 规范合规性（枚举、类型定义、any 使用等）
- 检查 React 组件规范合规性（组件结构、Props 定义、Client/Server Components）
- 检查状态管理规范合规性（React Query、Zustand 使用）
- 检查样式规范合规性（Tailwind CSS、cn 函数使用）
- 检查 API 规范合规性（API Route 结构、错误处理）
- 检查错误处理规范合规性（错误类层次结构）
- 检查导入导出规范合规性（导入顺序、导出模式）
- 检查命名约定合规性（文件命名、变量命名、组件 Props 命名）

## Impact
- Affected specs: 所有代码规范相关的能力
- Affected code: 整个 `src/` 目录下的所有 `.ts` 和 `.tsx` 文件

## ADDED Requirements

### Requirement: TypeScript 枚举规范检查
系统应检查所有枚举定义是否符合规范，应使用 `const enum` 提高性能。

#### Scenario: 发现非 const enum
- **WHEN** 代码中存在普通 `enum` 定义
- **THEN** 应标记为不符合规范，建议改为 `const enum`

### Requirement: TypeScript 类型定义规范检查
系统应检查类型定义是否正确使用 `interface` 和 `type`。

#### Scenario: 对象形状使用 type
- **WHEN** 对象形状使用 `type` 定义而非 `interface`
- **THEN** 应标记为不符合规范，建议改为 `interface`

#### Scenario: 联合类型使用 interface
- **WHEN** 联合类型或交叉类型使用 `interface` 定义
- **THEN** 应标记为不符合规范，建议改为 `type`

### Requirement: any 类型使用检查
系统应检查代码中是否存在 `any` 类型使用。

#### Scenario: 发现 any 类型
- **WHEN** 代码中存在显式或隐式的 `any` 类型
- **THEN** 应标记为不符合规范，建议使用具体类型或 `unknown`

### Requirement: React 组件 Client/Server 标记检查
系统应检查组件是否正确标记为 `'use client'` 或保持为 Server Component。

#### Scenario: 交互式组件缺少 use client
- **WHEN** 组件使用了 `useState`、`useEffect` 等客户端 hooks 但缺少 `'use client'` 标记
- **THEN** 应标记为不符合规范

#### Scenario: 纯展示组件标记 use client
- **WHEN** 纯展示组件不必要地标记了 `'use client'`
- **THEN** 应标记为不符合规范，建议移除

### Requirement: Props 接口命名规范检查
系统应检查组件 Props 接口是否遵循命名规范。

#### Scenario: Props 接口命名不规范
- **WHEN** Props 接口未使用 `ComponentNameProps` 格式命名
- **THEN** 应标记为不符合规范

### Requirement: 导入顺序规范检查
系统应检查导入语句是否按正确顺序组织。

#### Scenario: 导入顺序不正确
- **WHEN** 导入语句未按 React/Next.js -> 第三方库 -> 项目内部 -> 相对导入 -> 类型导入的顺序组织
- **THEN** 应标记为不符合规范

### Requirement: Tailwind CSS 类名顺序检查
系统应检查 Tailwind CSS 类名是否按正确顺序组织。

#### Scenario: 类名顺序不正确
- **WHEN** Tailwind CSS 类名未按布局 -> 尺寸 -> 背景 -> 边框 -> 文字 -> 效果 -> 交互 -> 响应式的顺序组织
- **THEN** 应标记为不符合规范

### Requirement: React Query Query Keys 规范检查
系统应检查 React Query 的 Query Keys 是否符合规范。

#### Scenario: Query Keys 未使用工厂模式
- **WHEN** Query Keys 未使用工厂函数模式定义
- **THEN** 应标记为不符合规范

### Requirement: 错误处理规范检查
系统应检查错误处理是否符合规范。

#### Scenario: 未使用自定义错误类
- **WHEN** 代码中直接抛出 `new Error()` 而非使用自定义错误类
- **THEN** 应标记为不符合规范

### Requirement: 文件命名规范检查
系统应检查文件命名是否符合规范。

#### Scenario: 组件文件命名不规范
- **WHEN** 组件文件未使用 PascalCase 命名
- **THEN** 应标记为不符合规范

#### Scenario: Hook 文件命名不规范
- **WHEN** Hook 文件未使用 camelCase + use 前缀命名
- **THEN** 应标记为不符合规范

### Requirement: 变量命名规范检查
系统应检查变量命名是否符合规范。

#### Scenario: 布尔值命名不规范
- **WHEN** 布尔值变量未使用 `is/has/should` 前缀
- **THEN** 应标记为不符合规范

#### Scenario: 函数命名不规范
- **WHEN** 函数未使用动词开头命名
- **THEN** 应标记为不符合规范

### Requirement: 注释规范检查
系统应检查注释是否符合规范。

#### Scenario: 缺少文件头注释
- **WHEN** 重要文件缺少文件头注释
- **THEN** 应标记为不符合规范

#### Scenario: 缺少函数文档
- **WHEN** 公共函数缺少 JSDoc 文档
- **THEN** 应标记为不符合规范

## MODIFIED Requirements
无

## REMOVED Requirements
无
