# 大文件拆分规范

## Why
项目中存在多个超过1000行的大文件，这些文件违反了单一职责原则，导致：
- 代码可读性和可维护性下降
- 组件/Hook 难以测试和复用
- 团队协作时容易产生冲突
- 性能优化困难（无法按需加载）

## What Changes
- 拆分 `CrossOracleComparison/index.tsx` (1237行) 为多个子组件和 Hook
- 拆分 `NetworkHealthPanel.tsx` (1092行) 为多个独立组件
- 拆分 `useCrossOraclePage.ts` (1001行) 为多个专注的小 Hook
- 拆分 `useMarketOverviewData.ts` (800行) 为多个功能模块
- 提取公共类型定义到独立文件

## Impact
- Affected specs: 市场概览页面、跨预言机比较页面、网络健康面板
- Affected code: 
  - `src/components/oracle/charts/CrossOracleComparison/`
  - `src/components/oracle/panels/`
  - `src/app/[locale]/cross-oracle/`
  - `src/app/[locale]/market-overview/`

## ADDED Requirements

### Requirement: 组件拆分原则
系统 SHALL 遵循以下拆分原则：
- 单个组件文件不超过300行
- 单个 Hook 文件不超过200行
- 每个文件只负责一个核心功能
- 相关文件放在同一目录下

#### Scenario: 组件拆分成功
- **WHEN** 组件包含多个独立功能模块
- **THEN** 将每个功能模块拆分为独立组件
- **AND** 通过 props 传递必要的数据和回调

### Requirement: CrossOracleComparison 组件拆分
系统 SHALL 将 CrossOracleComparison 组件拆分为以下模块：

#### Scenario: 拆分统计计算逻辑
- **WHEN** 组件包含大量 useMemo 计算逻辑
- **THEN** 提取到 `useComparisonStats.ts` Hook

#### Scenario: 拆分表格组件
- **WHEN** 组件包含多个表格渲染
- **THEN** 提取为独立的 `DeviationTable.tsx`、`PriceComparisonTable.tsx`、`PerformanceTable.tsx`

#### Scenario: 拆分图表组件
- **WHEN** 组件包含多个图表渲染
- **THEN** 提取为独立的 `ComparisonCharts.tsx`

### Requirement: NetworkHealthPanel 组件拆分
系统 SHALL 将 NetworkHealthPanel 组件拆分为以下模块：

#### Scenario: 拆分类型定义
- **WHEN** 组件包含大量类型定义
- **THEN** 提取到 `./types.ts` 文件

#### Scenario: 拆分子组件
- **WHEN** 组件包含多个独立子组件
- **THEN** 提取为独立文件：
  - `NetworkStatusIndicator.tsx`
  - `MetricCard.tsx`
  - `ActivityHeatmap.tsx`
  - `BandProtocolMetricsCard.tsx`
  - `SolanaNetworkStatusCard.tsx`
  - `DataFreshnessIndicator.tsx`

### Requirement: useCrossOraclePage Hook 拆分
系统 SHALL 将 useCrossOraclePage Hook 拆分为以下模块：

#### Scenario: 拆分类型定义
- **WHEN** Hook 包含大量类型定义
- **THEN** 提取到 `./types.ts` 文件

#### Scenario: 拆分计算逻辑
- **WHEN** Hook 包含多个 useMemo 计算
- **THEN** 提取到专门的 Hook：
  - `usePriceStats.ts` - 价格统计计算
  - `useChartData.ts` - 图表数据处理
  - `useTechnicalIndicators.ts` - 技术指标计算

#### Scenario: 拆分功能逻辑
- **WHEN** Hook 包含多个独立功能
- **THEN** 提取到专门的 Hook：
  - `useFilterSort.ts` - 过滤和排序
  - `useExport.ts` - 导出功能

### Requirement: useMarketOverviewData Hook 拆分
系统 SHALL 将 useMarketOverviewData Hook 拆分为以下模块：

#### Scenario: 拆分数据获取逻辑
- **WHEN** Hook 包含复杂的数据获取逻辑
- **THEN** 提取到 `useDataFetching.ts`

#### Scenario: 拆分导出功能
- **WHEN** Hook 包含导出功能
- **THEN** 提取到 `useExport.ts`

#### Scenario: 拆分 WebSocket 处理
- **WHEN** Hook 包含 WebSocket 消息处理
- **THEN** 提取到 `useWebSocketHandler.ts`
