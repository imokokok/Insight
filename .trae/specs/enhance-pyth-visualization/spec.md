# Pyth Network 数据可视化优化 Spec

## Why
Pyth Network 页面作为专业数据分析平台的核心页面，当前已有基础可视化功能，但缺少对 Pyth 核心特性（置信区间、Publisher 贡献权重、跨链一致性）的深度可视化展示。需要在不增加过度复杂度的前提下，提升数据可视化的专业性和洞察深度。

## What Changes
- 在市场数据面板中集成置信区间可视化组件
- 新增置信区间历史趋势图表组件
- 新增 Publisher 贡献权重可视化组件
- 新增跨链价格一致性监控面板
- 优化现有 PriceStream 组件，添加置信区间实时显示

## Impact
- Affected specs: Pyth Network 页面数据展示能力
- Affected code:
  - `src/components/oracle/MarketDataPanel.tsx`
  - `src/components/oracle/PriceStream.tsx`
  - `src/components/oracle/OraclePageTemplate.tsx`
  - 新增组件: `ConfidenceIntervalChart.tsx`, `PublisherContributionPanel.tsx`, `CrossChainPriceConsistency.tsx`

## ADDED Requirements

### Requirement: 置信区间可视化增强
系统应在 Pyth Network 市场数据面板中实时展示价格置信区间，包括：
- 当前价格的 Bid/Ask 区间
- 置信区间宽度百分比
- 宽度过大时的警告提示

#### Scenario: 置信区间正常显示
- **WHEN** 用户查看 Pyth Network 市场数据面板
- **THEN** 系统显示当前价格的置信区间条形图，包含 Bid、Ask 价格和区间宽度

#### Scenario: 置信区间过宽警告
- **WHEN** 置信区间宽度超过阈值（默认 0.5%）
- **THEN** 系统显示警告标识，提示用户数据不确定性较高

### Requirement: 置信区间历史趋势图表
系统应提供置信区间宽度的历史趋势可视化，帮助用户了解数据质量变化。

#### Scenario: 查看置信区间历史
- **WHEN** 用户切换到置信区间趋势视图
- **THEN** 系统展示过去 24 小时置信区间宽度的变化趋势图

### Requirement: Publisher 贡献权重可视化
系统应展示各 Publisher 对聚合价格的贡献权重和可靠性指标。

#### Scenario: Publisher 贡献权重展示
- **WHEN** 用户查看 Publisher 分析面板
- **THEN** 系统以饼图或条形图展示各 Publisher 的贡献权重百分比

### Requirement: 跨链价格一致性监控
系统应监控并展示 Pyth 在不同链上的价格一致性。

#### Scenario: 跨链价格一致性正常
- **WHEN** 用户查看跨链一致性面板
- **THEN** 系统展示各链上价格与基准价格的偏差百分比，偏差小于阈值时显示绿色

#### Scenario: 跨链价格偏差过大
- **WHEN** 某链上价格偏差超过阈值
- **THEN** 系统高亮显示该链，并提示可能存在套利机会或数据异常

## MODIFIED Requirements

### Requirement: PriceStream 组件增强
现有 PriceStream 组件应增加置信区间实时显示功能。

#### Scenario: 实时价格流显示置信区间
- **WHEN** 用户查看实时价格流
- **THEN** 每条价格更新记录同时显示对应的置信区间宽度
