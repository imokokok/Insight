# 删除冗余代码 Spec

## Why
代码库中存在大量重复、未使用的代码，包括重复的 hooks 文件、重复的技术指标计算函数、重复的组件定义等。这些冗余代码增加了维护成本，降低了代码可读性，并可能导致混淆和错误。

## What Changes
- 删除 4 对重复的 hooks 文件（约 600 行代码）
- 统一技术指标计算函数，删除 10 个文件中的重复实现（约 800 行代码）
- 删除重复的 ErrorBoundary 组件（约 170 行代码）
- 替换 console 日志为统一的 logger 调用（45 处）
- 删除未使用的导出和类型定义
- 删除未使用的常量定义
- **BREAKING**: 可能影响某些导入路径，需要更新所有引用

## Impact
- Affected specs: 代码质量、可维护性
- Affected code: 
  - `src/hooks/` 目录下的重复文件
  - `src/lib/indicators/` 目录下的技术指标计算
  - `src/components/` 目录下的 ErrorBoundary 组件
  - 整个 `src/` 目录下的 console 日志

## ADDED Requirements

### Requirement: 统一 Hooks 文件
系统 SHALL 只保留一套 hooks 实现，删除重复文件。

#### Scenario: 删除重复的 hooks
- **WHEN** 存在功能相同的 hooks 文件（如 `useOracleData.ts` 和 `useOracleDataQuery.ts`）
- **THEN** 保留命名更规范、使用更广泛的版本，删除重复版本
- **AND** 更新所有导入引用

### Requirement: 统一技术指标计算
系统 SHALL 提供统一的技术指标计算函数，避免重复实现。

#### Scenario: 统一技术指标计算函数
- **WHEN** 多个文件中存在相同的技术指标计算逻辑
- **THEN** 保留 `src/lib/indicators/` 中的实现
- **AND** 删除其他文件中的重复实现
- **AND** 更新所有引用使用统一的导入路径

### Requirement: 统一错误边界组件
系统 SHALL 只保留一个 ErrorBoundary 组件实现。

#### Scenario: 删除重复的 ErrorBoundary
- **WHEN** 存在多个 ErrorBoundary 组件实现
- **THEN** 保留功能更完整、使用更广泛的版本
- **AND** 删除重复版本
- **AND** 更新所有引用

### Requirement: 统一日志输出
系统 SHALL 使用统一的 logger 进行日志输出，而不是 console 直接调用。

#### Scenario: 替换 console 日志
- **WHEN** 代码中存在 console.log/warn/error 调用
- **THEN** 替换为 logger 对应的方法调用
- **AND** 保持日志信息的完整性

### Requirement: 清理未使用的代码
系统 SHALL 不包含未使用的导出、类型定义和常量。

#### Scenario: 删除未使用的导出
- **WHEN** 存在未被任何文件引用的导出
- **THEN** 删除该导出
- **AND** 如果整个文件都未使用，删除整个文件

## MODIFIED Requirements
无

## REMOVED Requirements
无
