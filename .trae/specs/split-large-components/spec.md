# 大组件拆分规范

## Why
项目中存在多个超过 300 行的大组件文件，这些文件违反了单一职责原则，导致：
- 代码可读性和可维护性下降
- 组件难以测试和复用
- 团队协作时容易产生冲突
- 性能优化困难（无法按需加载）

## What Changes
- 拆分最大的页面组件（超过 800 行）：cross-oracle/page.tsx、market-overview/page.tsx、price-query/page.tsx
- 拆分明细复杂的面板组件（超过 700 行）：DataQualityPanel、AnomalyAlert、PriceChart 等
- 拆分复杂的 Hook（超过 400 行）：useChartExport、useChartZoom
- 提取公共类型定义到独立文件

## Impact
- Affected specs: 跨预言机对比页面、市场概览页面、价格查询页面
- Affected code: 
  - `src/app/[locale]/cross-oracle/`
  - `src/app/[locale]/market-overview/`
  - `src/app/[locale]/price-query/`
  - `src/components/oracle/panels/`
  - `src/components/oracle/charts/`
  - `src/hooks/`

## ADDED Requirements

### Requirement: 组件拆分原则
系统 SHALL 遵循以下拆分原则：
- 单个组件文件不超过 400 行（避免过度拆分）
- 单个 Hook 文件不超过 300 行
- 每个文件只负责一个核心功能
- 相关文件放在同一目录下
- 保持组件的 cohesion（内聚性），不要为拆而拆

#### Scenario: 组件拆分成功
- **WHEN** 组件包含多个独立功能模块
- **THEN** 将每个功能模块拆分为独立组件
- **AND** 通过 props 传递必要的数据和回调

### Requirement: cross-oracle/page.tsx 拆分
系统 SHALL 将 cross-oracle/page.tsx (1329行) 拆分为以下模块：

#### Scenario: 拆分子组件
- **WHEN** 页面包含多个独立功能区块
- **THEN** 提取为独立组件：
  - `HeaderSection.tsx` - 页面头部和标题
  - `StatsOverview.tsx` - 统计概览卡片
  - `ComparisonTabs.tsx` - 对比标签页内容
  - `ExportSection.tsx` - 导出功能区块

#### Scenario: 拆分 Hook 逻辑
- **WHEN** 页面包含复杂的状态管理
- **THEN** 提取到 `useCrossOracleData.ts` Hook

### Requirement: market-overview/page.tsx 拆分
系统 SHALL 将 market-overview/page.tsx (1016行) 拆分为以下模块：

#### Scenario: 拆分子组件
- **WHEN** 页面包含多个独立功能区块
- **THEN** 提取为独立组件：
  - `MarketHeader.tsx` - 市场概览头部
  - `AssetGrid.tsx` - 资产网格展示
  - `MarketFilters.tsx` - 市场筛选器
  - `MarketStats.tsx` - 市场统计数据

#### Scenario: 拆分 Hook 逻辑
- **WHEN** 页面包含复杂的数据处理
- **THEN** 提取到 `useMarketData.ts` Hook

### Requirement: price-query/page.tsx 拆分
系统 SHALL 将 price-query/page.tsx (948行) 拆分为以下模块：

#### Scenario: 拆分子组件
- **WHEN** 页面包含多个独立功能区块
- **THEN** 提取为独立组件：
  - `QueryForm.tsx` - 查询表单
  - `QueryResults.tsx` - 查询结果展示
  - `PriceDisplay.tsx` - 价格显示组件

#### Scenario: 拆分 Hook 逻辑
- **WHEN** 页面包含复杂的查询逻辑
- **THEN** 提取到 `usePriceQuery.ts` Hook

### Requirement: PriceChart 组件拆分
系统 SHALL 将 PriceChart/index.tsx (1269行) 拆分为以下模块：

#### Scenario: 拆分子组件
- **WHEN** 组件包含多个独立功能
- **THEN** 提取为独立组件：
  - `ChartCanvas.tsx` - 图表画布渲染
  - `ChartControls.tsx` - 图表控制按钮
  - `ChartLegend.tsx` - 图表图例
  - `ChartTooltip.tsx` - 图表提示框

#### Scenario: 拆分工具函数
- **WHEN** 组件包含复杂的数据处理
- **THEN** 提取到 `chartUtils.ts`

### Requirement: DataQualityPanel 组件拆分
系统 SHALL 将 DataQualityPanel.tsx (984行) 拆分为以下模块：

#### Scenario: 拆分子组件
- **WHEN** 面板包含多个独立指标
- **THEN** 提取为独立组件：
  - `QualityScoreCard.tsx` - 质量评分卡片
  - `DataSourceList.tsx` - 数据源列表
  - `QualityMetrics.tsx` - 质量指标展示

### Requirement: AnomalyAlert 组件拆分
系统 SHALL 将 AnomalyAlert.tsx (1087行) 拆分为以下模块：

#### Scenario: 拆分子组件
- **WHEN** 组件包含多种告警类型
- **THEN** 提取为独立组件：
  - `AlertItem.tsx` - 单个告警项
  - `AlertFilters.tsx` - 告警筛选器
  - `AlertStats.tsx` - 告警统计

### Requirement: useChartExport Hook 拆分
系统 SHALL 将 useChartExport.ts (770行) 拆分为以下模块：

#### Scenario: 拆分导出格式逻辑
- **WHEN** Hook 支持多种导出格式
- **THEN** 提取为独立函数：
  - `exportToPNG.ts` - PNG 导出
  - `exportToCSV.ts` - CSV 导出
  - `exportToJSON.ts` - JSON 导出

### Requirement: useChartZoom Hook 拆分
系统 SHALL 将 useChartZoom.ts (769行) 拆分为以下模块：

#### Scenario: 拆分红能逻辑
- **WHEN** Hook 包含多种缩放功能
- **THEN** 提取为独立 Hook：
  - `usePan.ts` - 平移功能
  - `useScale.ts` - 缩放比例功能
  - `useBrush.ts` - 刷选功能

## MODIFIED Requirements
无

## REMOVED Requirements
无
