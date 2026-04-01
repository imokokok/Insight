# 市场概览页面代码改进 Spec

## Why

根据之前的代码审查报告，市场概览页面存在以下需要改进的地方：
1. ChartContainer 组件 props 过多，需要减少 props drilling
2. useMarketPage hook 返回属性过多，需要按功能模块拆分
3. 存在 Magic Numbers 和 Magic Strings 需要提取为常量
4. types.ts 文件过大，需要按功能模块拆分
5. MarketSidebar 中的计算逻辑可以提取为自定义 hook

## What Changes

- 创建 ChartContext 来管理图表相关状态，减少 props drilling
- 拆分 useMarketPage hook 为多个专注于单一功能的 hook
- 提取 Magic Numbers 和 Magic Strings 为常量
- 拆分 types.ts 为多个按功能组织的类型文件
- 创建 useMarketInsights hook 封装 MarketSidebar 的计算逻辑
- 优化 AssetsTable 的 columns 定义，避免每次渲染重新创建

## Impact

- Affected specs: 无
- Affected code:
  - `/src/app/[locale]/market-overview/page.tsx`
  - `/src/app/[locale]/market-overview/useMarketPage.ts`
  - `/src/app/[locale]/market-overview/components/ChartContainer.tsx`
  - `/src/app/[locale]/market-overview/components/MarketSidebar.tsx`
  - `/src/app/[locale]/market-overview/components/AssetsTable.tsx`
  - `/src/app/[locale]/market-overview/types.ts`
  - 新增类型文件目录 `/src/app/[locale]/market-overview/types/`
  - 新增常量文件 `/src/app/[locale]/market-overview/constants.ts`
  - 新增 hooks 文件 `/src/app/[locale]/market-overview/hooks/useMarketInsights.ts`

## ADDED Requirements

### Requirement: ChartContext 状态管理

The system SHALL provide a ChartContext to manage chart-related state and reduce props drilling.

#### Scenario: Context 提供状态

- **WHEN** 用户访问市场概览页面
- **THEN** ChartProvider 包裹图表相关组件
- **AND** 子组件通过 useChartContext 获取需要的状态
- **AND** 减少 ChartContainer 的 props 数量

### Requirement: Hook 拆分

The system SHALL split useMarketPage into multiple focused hooks.

#### Scenario: 按功能拆分 Hook

- **WHEN** 组件需要使用特定功能
- **THEN** 可以只导入需要的 hook（如 useChartState、useFilterState）
- **AND** 每个 hook 职责单一，易于测试和维护

### Requirement: 常量提取

The system SHALL extract Magic Numbers and Magic Strings into constants.

#### Scenario: 常量定义

- **WHEN** 代码中使用固定数值或字符串
- **THEN** 从 constants.ts 导入预定义的常量
- **AND** 提高代码可读性和可维护性

### Requirement: 类型定义拆分

The system SHALL split types.ts into multiple files organized by functionality.

#### Scenario: 类型文件组织

- **WHEN** 开发者需要查找类型定义
- **THEN** 可以在 types/ 目录下按功能找到对应的类型文件
- **AND** 通过 types/index.ts 统一导出所有类型

### Requirement: MarketSidebar 计算逻辑提取

The system SHALL extract calculation logic from MarketSidebar into a custom hook.

#### Scenario: useMarketInsights Hook

- **WHEN** MarketSidebar 需要计算市场洞察数据
- **THEN** 使用 useMarketInsights hook 获取计算结果
- **AND** 计算逻辑使用 useMemo 进行缓存优化

## MODIFIED Requirements

无

## REMOVED Requirements

无
