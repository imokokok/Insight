# 跨链价格对比功能优化 Spec

## Why

跨链价格对比功能（cross-chain）和跨预言机价格对比功能（cross-oracle）存在严重的架构和功能问题：God Hook 反模式导致性能隐患、大量重复/死代码增加维护成本、数据准确性问题（双重百分比转换、模拟数据误导用户）、测试大面积失效、跨链比较仅支持 Pyth 且测量的是 API 延迟而非真正的链上数据差异。这些问题降低了功能的可信度和实用性，亟需优化。

## What Changes

- 拆分 `useCrossChainData` God Hook 为多个独立 Hook，组件按需订阅
- 移除不必要的代理 Hook（`useCrossChainSelector`、`useCrossChainUI`、`useCrossChainStatistics`、`useCrossChainChart`）
- 将纯函数从 Hook 包装中提取（`useDataValidation`、`useAnomalyDetection`）
- 瞬时 UI 状态（`hoveredCell`、`selectedCell`、`tooltipPosition`）从 Zustand Store 移至组件本地状态
- 清理所有死代码（未导出函数、未使用组件、未使用类型）
- 修复 DispersionGauge 双重百分比 bug
- 统一两套偏差阈值定义（`constants.tsx` vs `thresholds.ts`）
- 修复所有失效测试
- 提取重复代码（`getTimeRangeInMs`、`getConsistencyRating`、`chainColors` 映射）
- 移除 `crossChainDataStore` 中无效的 persist 中间件
- 为 MarketDepthSimulator 添加"模拟数据"标识
- 拆分超大组件文件（InteractivePriceChart 829行、PriceSpreadHeatmap 703行、CrossChainFilters 412行）
- 扩展跨链比较至多 Oracle 提供商（不仅限于 Pyth）
- 修复 Pyth 跨链比较测量 API 延迟而非链上数据新鲜度的问题
- 修复 `selectedBaseChain` 不持久化导致页面刷新后状态不一致的问题
- 修复 `useOracleData` 中 `prices.push` 在并行回调中的不安全模式
- 统一 `constants.tsx` 文件扩展名为 `.ts`

## Impact

- Affected specs: 跨链价格对比、跨预言机价格对比、Oracle 数据层
- Affected code:
  - `src/app/cross-chain/useCrossChainData.ts` - 拆分为多个独立 Hook
  - `src/app/cross-chain/hooks/` - 移除代理 Hook，提取纯函数
  - `src/app/cross-chain/types.ts` - 拆分巨型接口
  - `src/app/cross-chain/components/InteractivePriceChart.tsx` - 拆分子组件
  - `src/app/cross-chain/components/PriceSpreadHeatmap.tsx` - 拆分子组件
  - `src/app/cross-chain/components/CrossChainFilters.tsx` - 拆分子组件
  - `src/app/cross-chain/utils/` - 清理死代码，提取重复代码
  - `src/stores/crossChain*.ts` - 移除无效 persist，调整持久化配置
  - `src/app/cross-oracle/hooks/useOracleData.ts` - 修复不安全模式
  - `src/app/cross-oracle/components/price-comparison/DispersionGauge.tsx` - 修复双重百分比
  - `src/app/cross-oracle/constants.tsx` - 统一阈值，改扩展名
  - `src/app/cross-oracle/thresholds.ts` - 统一阈值
  - `src/app/cross-oracle/components/__tests__/` - 修复失效测试
  - `src/lib/oracles/pyth/crossChain.ts` - 修复跨链比较逻辑

## ADDED Requirements

### Requirement: 拆分 God Hook 为独立 Hook

系统 SHALL 将 `useCrossChainData`（125+ 字段）拆分为多个独立 Hook，组件 SHALL 按需订阅所需数据，SHALL NOT 通过单一巨型对象传递所有数据。

#### Scenario: 组件按需订阅数据

- **WHEN** 组件只需要价格统计信息
- **THEN** 仅订阅 `useStatistics` Hook，不触发其他数据计算

#### Scenario: 数据变化局部更新

- **WHEN** 某个子 Hook 的返回值变化
- **THEN** 仅订阅该 Hook 的组件重渲染，不影响其他组件

### Requirement: 移除不必要的 Hook 代理层

系统 SHALL 移除 `useCrossChainSelector`、`useCrossChainUI`、`useCrossChainStatistics`、`useCrossChainChart` 等 1:1 代理 Hook，组件 SHALL 直接使用底层 Store 或 Hook。

#### Scenario: 组件直接访问 Store

- **WHEN** 组件需要读取 `selectedProvider`
- **THEN** 直接通过 `useCrossChainSelectorStore(s => s.selectedProvider)` 获取，而非通过代理 Hook

### Requirement: 纯函数不使用 Hook 包装

系统 SHALL 将 `useDataValidation` 和 `useAnomalyDetection` 中的纯函数逻辑提取为普通工具函数，SHALL NOT 使用 Hook 包装不依赖 React 状态的纯函数。

#### Scenario: 数据验证作为工具函数调用

- **WHEN** 需要验证价格数据
- **THEN** 直接调用 `validatePriceData()` 工具函数，而非 `useDataValidation()` Hook

### Requirement: 瞬时 UI 状态使用组件本地状态

系统 SHALL 将 `hoveredCell`、`selectedCell`、`tooltipPosition` 等瞬时交互状态从 Zustand Store 移至组件本地 `useState`，SHALL NOT 将鼠标交互状态放入全局 Store。

#### Scenario: 鼠标悬停状态管理

- **WHEN** 用户在热力图上移动鼠标
- **THEN** 悬停状态由组件本地 `useState` 管理，不触发 Store 更新

### Requirement: 修复 DispersionGauge 双重百分比 Bug

系统 SHALL 确保 `DispersionGauge` 接收的 `cv` 值只被转换为百分比一次，SHALL NOT 在 `PriceDispersionCard` 和 `DispersionGauge` 中分别乘以 100。

#### Scenario: CV 值正确显示

- **WHEN** 实际变异系数为 0.5%
- **THEN** DispersionGauge 显示 0.50%，而非 50.00%

### Requirement: 统一偏差阈值定义

系统 SHALL 将 `constants.tsx` 中的 `deviationThresholds` 和 `thresholds.ts` 中的阈值合并为单一来源，SHALL NOT 在两个文件中维护不一致的阈值定义。

#### Scenario: 阈值单一来源

- **WHEN** 开发者需要修改偏差阈值
- **THEN** 只需修改 `thresholds.ts` 中的定义，`constants.tsx` 从中导入

### Requirement: 跨链比较扩展至多 Oracle 提供商

系统 SHALL 支持多个 Oracle 提供商的跨链价格比较，SHALL NOT 仅限于 Pyth 提供商。

#### Scenario: Chainlink 跨链比较

- **WHEN** 用户选择 Chainlink 作为 Oracle 提供商
- **THEN** 系统获取 Chainlink 在不同链上的价格并进行跨链比较

#### Scenario: 多 Oracle 跨链对比

- **WHEN** 用户同时选择多个 Oracle 提供商
- **THEN** 系统展示每个 Oracle 在各链上的价格，支持 Oracle 间和链间双重对比

### Requirement: 跨链比较测量真实链上数据新鲜度

系统 SHALL 测量各链上价格数据的真实新鲜度（基于链上最新区块时间戳），SHALL NOT 仅测量 API 响应延迟。

#### Scenario: 链上数据新鲜度

- **WHEN** Pyth 在 Ethereum 上发布了价格更新
- **THEN** 跨链比较展示该价格在链上的确认时间，而非 API 请求耗时

### Requirement: 修复 selectedBaseChain 持久化问题

系统 SHALL 将 `selectedBaseChain` 纳入 `crossChainSelectorStore` 的 `partialize` 配置，确保页面刷新后基准链选择不丢失。

#### Scenario: 页面刷新后基准链保持

- **WHEN** 用户选择 Arbitrum 作为基准链后刷新页面
- **THEN** 基准链仍为 Arbitrum，而非重置为默认值

### Requirement: 清理死代码

系统 SHALL 移除以下死代码：

- `colorUtils.ts` 中未导出的 `getDiffTextColor`、`getCorrelationColor`、`getVolatilityColor`
- `correlationUtils.ts` 中未导出的 `calculateRollingCorrelation`
- `statisticsUtils.ts` 中未使用的 `calculateStandardDeviationFromValues`
- `volatilityUtils.ts` 中未导出的 `calculateRollingVolatility`、`calculateVolatilityCone`
- `constants.ts` 中未导出的 `PriceDifference` 接口
- `cross-oracle/UnifiedExportSection.tsx` 未被引用的组件
- `cross-oracle/PriceTable.tsx` 未被当前页面使用的组件
- `constants.tsx` 中未导出的 `deviationThresholds`、`chartConfig`、`cacheConfig`
- `thresholds.ts` 中未导出的延迟/偏差阈值
- `charts.ts` 中未导出的类型接口
- Store 文件底部未导出的 selector hooks

#### Scenario: 代码库无死代码

- **WHEN** 在代码库中搜索上述函数/组件/类型
- **THEN** 找不到匹配项，它们已被移除

### Requirement: 提取重复代码为共享工具函数

系统 SHALL 将以下重复代码提取为共享工具函数：

- `getTimeRangeInMs`（在 3 个组件中重复定义）→ `src/app/cross-chain/utils/timeUtils.ts`
- `getConsistencyRating`（在 `colorUtils.ts` 和 `useExport.ts` 中重复）→ 保留 `colorUtils.ts` 版本
- `chainColors` 映射（在 `CrossChainFilters.tsx` 中硬编码）→ 使用 `@/lib/config/colors` 的配置
- Pearson 相关性计算中的时间戳匹配逻辑 → 提取为内部共享函数

#### Scenario: 时间范围转换统一

- **WHEN** 组件需要将时间范围字符串转换为毫秒数
- **THEN** 从 `@/app/cross-chain/utils/timeUtils` 导入 `getTimeRangeInMs`

### Requirement: 拆分超大组件文件

系统 SHALL 将以下超大组件拆分为更小的子组件：

- `InteractivePriceChart.tsx`（829行）→ 拆出 `ChartToolbar`、`ReferenceLineManager`、`ChartLegend`
- `PriceSpreadHeatmap.tsx`（703行）→ 拆出 `HeatmapTooltip`、`SelectedCellDetail` 为独立文件
- `CrossChainFilters.tsx`（412行）→ 拆出 `ChainSelector`、`TechnicalIndicators`、`AnomalyConfig`

#### Scenario: 组件文件行数合理

- **WHEN** 检查组件文件行数
- **THEN** 单个组件文件不超过 300 行

### Requirement: 修复失效测试

系统 SHALL 修复以下失效测试：

- `RiskAlertBanner.test.tsx`：Props 接口与实际组件不匹配
- `ControlPanel.test.tsx`：Props 包含不存在的 `symbols` 字段
- `PriceTable.test.tsx`：mock 签名与实际函数不一致
- `TabNavigation.test.tsx`：包含占位符断言

#### Scenario: 测试全部通过

- **WHEN** 运行 `npm run test`
- **THEN** 跨链和跨预言机相关测试全部通过

### Requirement: MarketDepthSimulator 标识模拟数据

系统 SHALL 在 `MarketDepthSimulator` 组件中明确标识数据为模拟数据，SHALL NOT 将模拟数据呈现为真实订单簿数据。

#### Scenario: 模拟数据标识

- **WHEN** 用户查看 Consensus Depth 图表
- **THEN** 图表标题或说明中包含"Simulated"或"模拟"标识

### Requirement: 修复 useOracleData 并行回调不安全模式

系统 SHALL 将 `useOracleData` 中 `prices.push` 在 `Promise.all` 回调中的不安全模式改为使用 `map` + 解构赋值。

#### Scenario: 并行数据获取安全

- **WHEN** 多个预言机数据并行获取完成
- **THEN** 结果通过 `Promise.all` 返回的数组直接解构，而非通过共享数组的 push 操作

### Requirement: 移除无效 persist 中间件

系统 SHALL 移除 `crossChainDataStore` 中 `partialize` 返回空对象的 persist 中间件，SHALL NOT 使用 persist 但不持久化任何数据。

#### Scenario: Store 无无效中间件

- **WHEN** 检查 `crossChainDataStore` 的中间件配置
- **THEN** 不包含 persist 中间件，或 persist 正确配置了需要持久化的字段

## MODIFIED Requirements

### Requirement: Cross-Chain Store 架构

`crossChainSelectorStore` SHALL 将 `selectedBaseChain` 纳入 `partialize` 持久化配置。`crossChainDataStore` SHALL 移除无效 persist 中间件。瞬时 UI 状态 SHALL 从 `crossChainUIStore` 移至组件本地状态。

### Requirement: 跨链数据获取架构

跨链数据获取 SHALL 支持多 Oracle 提供商，SHALL NOT 仅限于 Pyth。数据新鲜度 SHALL 基于链上时间戳计算，SHALL NOT 仅测量 API 响应延迟。

## REMOVED Requirements

### Requirement: God Hook 单一返回值模式

**Reason**: 125+ 字段的单一返回值导致所有消费组件在任何数据变化时重渲染，性能隐患严重
**Migration**: 拆分为多个独立 Hook，组件按需订阅

### Requirement: 纯函数 Hook 包装

**Reason**: `useDataValidation` 和 `useAnomalyDetection` 不依赖任何 React 状态，Hook 包装增加了不必要的复杂度
**Migration**: 提取为普通工具函数

### Requirement: 瞬时 UI 状态全局 Store 管理

**Reason**: `hoveredCell`、`selectedCell`、`tooltipPosition` 等鼠标交互状态不需要跨组件共享，放入 Store 增加了不必要的状态管理复杂度和重渲染风险
**Migration**: 移至组件本地 `useState`
