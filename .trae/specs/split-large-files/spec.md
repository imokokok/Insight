# 大文件拆分规范

## Why
代码库中存在多个超过800行的大文件，这些文件难以维护、测试和理解。通过合理的拆分，可以提高代码的可读性、可维护性和可测试性，同时保持代码的内聚性。

## What Changes
- 拆分超大服务层文件（>1500行）
- 拆分超大页面组件（>1500行）
- 拆分超大图表组件（>1000行）
- 拆分超大Panel组件（>1000行）
- 拆分超大Hook文件（>1000行）
- 拆分超大工具文件（>800行）
- 拆分混合职责的文件（UI组件与业务逻辑混合）

## Impact
- Affected specs: 代码结构优化
- Affected code: 
  - `src/lib/services/marketData.ts`
  - `src/app/cross-oracle/page.tsx`
  - `src/components/oracle/charts/PriceChart.tsx`
  - `src/app/market-overview/page.tsx`
  - `src/components/oracle/charts/CrossOracleComparison.tsx`
  - `src/components/oracle/panels/ValidatorAnalyticsPanel.tsx`
  - `src/app/cross-chain/useCrossChainData.ts`
  - `src/lib/oracles/uma.tsx`
  - `src/components/oracle/panels/ValidatorPanel.tsx`
  - `src/components/oracle/panels/DisputeResolutionPanel.tsx`
  - `src/components/oracle/charts/LatencyTrendChart.tsx`
  - `src/components/oracle/panels/NetworkHealthPanel.tsx`
  - `src/components/oracle/common/AnomalyAlert.tsx`
  - `src/components/oracle/forms/ChartExportButton.tsx`
  - `src/utils/chartExport.ts`
  - `src/app/price-query/components/PriceChart.tsx`
  - `src/components/oracle/charts/DataQualityTrend.tsx`
  - `src/components/oracle/panels/DataQualityPanel.tsx`
  - `src/components/oracle/common/DataSourceTraceability.tsx`
  - `src/components/oracle/common/OraclePageTemplate.tsx`
  - `src/components/oracle/charts/ChainComparison.tsx`
  - `src/lib/export/exportConfig.ts`
  - `src/lib/oracles/bandProtocol.ts`
  - `src/lib/supabase/queries.ts`
  - `src/components/oracle/common/LatencyAnalysis.tsx`
  - `src/app/market-overview/useMarketOverviewData.ts`

## ADDED Requirements

### Requirement: 服务层文件拆分
系统 SHALL 将超大服务层文件按功能模块拆分为多个小文件，每个文件专注于单一职责。

#### Scenario: marketData.ts 拆分
- **WHEN** 服务文件超过1500行且包含多个独立功能
- **THEN** 按数据源或功能拆分为独立模块（如 defiLlamaApi.ts, priceCalculations.ts, riskCalculations.ts）

### Requirement: 页面组件拆分
系统 SHALL 将页面组件中的业务逻辑提取到自定义hooks，将UI组件提取到独立文件。

#### Scenario: cross-oracle/page.tsx 拆分
- **WHEN** 页面组件超过1500行
- **THEN** 提取自定义hook（useCrossOraclePage.ts），提取子组件到components目录

#### Scenario: market-overview/page.tsx 拆分
- **WHEN** 页面组件超过1500行
- **THEN** 提取更多子组件，简化主页面逻辑

### Requirement: 图表组件拆分
系统 SHALL 将图表组件中的配置、工具函数和子组件提取到独立文件。

#### Scenario: PriceChart.tsx 拆分
- **WHEN** 图表组件超过1500行
- **THEN** 提取配置（chartConfig.ts）、工具函数（chartUtils.ts）、子组件

#### Scenario: CrossOracleComparison.tsx 拆分
- **WHEN** 图表组件超过1000行
- **THEN** 提取配置和子组件

#### Scenario: LatencyTrendChart.tsx 拆分
- **WHEN** 图表组件超过1000行
- **THEN** 提取计算逻辑和配置

### Requirement: Panel组件拆分
系统 SHALL 将Panel组件中的子组件和配置提取到独立文件。

#### Scenario: ValidatorAnalyticsPanel.tsx 拆分
- **WHEN** Panel组件超过1000行
- **THEN** 提取子组件到独立文件

#### Scenario: ValidatorPanel.tsx 拆分
- **WHEN** Panel组件超过1000行
- **THEN** 提取模态框和子组件

#### Scenario: DisputeResolutionPanel.tsx 拆分
- **WHEN** Panel组件超过1000行
- **THEN** 提取子组件

#### Scenario: NetworkHealthPanel.tsx 拆分
- **WHEN** Panel组件超过1000行
- **THEN** 提取配置和子组件

#### Scenario: DataQualityPanel.tsx 拆分
- **WHEN** Panel组件超过800行
- **THEN** 提取子组件

### Requirement: Hook文件拆分
系统 SHALL 将超大Hook文件按功能拆分为多个小hook。

#### Scenario: useCrossChainData.ts 拆分
- **WHEN** Hook文件超过1000行
- **THEN** 拆分为多个专注的hook（useCrossChainFilters, useCrossChainChart等）

#### Scenario: useMarketOverviewData.ts 拆分
- **WHEN** Hook文件超过800行
- **THEN** 拆分为多个专注的hook

### Requirement: 混合职责文件拆分
系统 SHALL 将UI组件与业务逻辑混合的文件分离。

#### Scenario: uma.tsx 拆分
- **WHEN** 文件同时包含Oracle客户端和UI组件
- **THEN** 分离为 uma.ts（客户端逻辑）和 umaComponents.tsx（UI组件）

### Requirement: 工具文件拆分
系统 SHALL 将超大工具文件按功能拆分。

#### Scenario: chartExport.ts 拆分
- **WHEN** 工具文件超过800行
- **THEN** 拆分为导出格式处理（csvExport.ts, pdfExport.ts等）

#### Scenario: queries.ts 拆分
- **WHEN** 数据库查询文件超过800行
- **THEN** 按功能模块拆分

#### Scenario: exportConfig.ts 拆分
- **WHEN** 配置文件超过800行
- **THEN** 按功能拆分

### Requirement: 保持适度拆分
系统 SHALL 避免过度拆分，确保每个文件保持合理的职责范围。

#### Scenario: 不拆分的情况
- **WHEN** 文件虽然较大但逻辑高度内聚
- **THEN** 保持原样，不进行拆分

## MODIFIED Requirements
无

## REMOVED Requirements
无
