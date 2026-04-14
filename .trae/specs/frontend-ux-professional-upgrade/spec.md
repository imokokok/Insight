# 数据可视化专业化升级 Spec

## Why

当前平台的图表交互能力不足（缺少十字线、缩放拖拽、K线图），价格更新无视觉反馈，图表颜色大量硬编码未使用统一配色系统，统计指标缺乏上下文解释。与专业金融数据终端（TradingView、Dune Analytics）体验差距明显，影响平台专业感和用户信任度。

## What Changes

- **图表交互升级**：为所有价格图表添加十字线光标（Crosshair Cursor）、改进缩放/拖拽交互、集成 ChartToolbar 组件
- **K 线图支持**：在价格查询页的 PriceChart 组件中增加 K 线图/折线图/面积图切换
- **价格闪烁动画**：价格数据更新时显示上涨绿色/下跌红色闪烁效果
- **图表配色统一**：将所有图表中硬编码的颜色替换为 `chartColors` 配置系统
- **统计指标上下文**：为统计卡片增加指标含义 Tooltip 和定性评级（优秀/良好/需关注/危险）
- **Brush 组件优化**：改进价格查询页图表的时间范围选择器

## Impact

- Affected code:
  - `src/app/[locale]/price-query/components/PriceChart.tsx` - 图表交互升级、K线图、配色统一
  - `src/app/[locale]/price-query/components/CustomTooltip.tsx` - 配色统一
  - `src/app/[locale]/price-query/components/QueryResults.tsx` - 价格闪烁、统计指标上下文
  - `src/app/[locale]/cross-oracle/components/price-comparison/PriceDistributionHistogram.tsx` - 配色统一、十字线
  - `src/app/[locale]/cross-oracle/components/price-comparison/MultiOracleTrendChart.tsx` - 配色统一、十字线、缩放
  - `src/app/[locale]/cross-oracle/components/price-comparison/DeviationScatterChart.tsx` - 配色统一
  - `src/app/[locale]/cross-oracle/components/price-comparison/MarketDepthSimulator.tsx` - 配色统一
  - `src/app/[locale]/cross-oracle/components/price-comparison/DispersionGauge.tsx` - 配色统一
  - `src/app/[locale]/cross-oracle/components/price-comparison/MarketConsensusCard.tsx` - 价格闪烁
  - `src/app/[locale]/cross-oracle/components/tabs/SimplePriceComparisonTab.tsx` - 统计指标上下文
  - `src/components/ui/CompactStatCard.tsx` - 指标含义 Tooltip 和定性评级
  - `src/app/[locale]/cross-chain/components/InteractivePriceChart.tsx` - 十字线、配色统一

## ADDED Requirements

### Requirement: 十字线光标（Crosshair Cursor）

系统 SHALL 在所有价格折线图和面积图中提供十字线光标。

#### Scenario: 用户悬停在价格图表上

- **WHEN** 用户将鼠标移到价格图表的数据区域
- **THEN** 显示垂直和水平十字线跟随鼠标位置
- **AND** 十字线与数据点对齐（snap to data points）
- **AND** 在十字线交叉处显示精确的价格和时间数值
- **AND** 鼠标移出图表区域时十字线消失

### Requirement: K 线图支持

系统 SHALL 在价格查询页的价格图表中支持 K 线图（蜡烛图）显示模式。

#### Scenario: 用户切换到 K 线图模式

- **WHEN** 用户在图表工具栏中点击 K 线图按钮
- **THEN** 图表从折线图切换为 K 线图显示
- **AND** K 线图显示开盘价、收盘价、最高价、最低价
- **AND** 上涨蜡烛为绿色（或空心），下跌蜡烛为红色（或实心）
- **AND** 用户可在折线图、面积图、K 线图之间自由切换

#### Scenario: K 线图数据不可用

- **WHEN** 当前数据源不提供 OHLC 数据
- **THEN** K 线图按钮显示为禁用状态
- **AND** Tooltip 提示"当前数据源不支持 K 线图"

### Requirement: 价格闪烁动画

系统 SHALL 在价格数据更新时提供视觉闪烁反馈。

#### Scenario: 价格上涨更新

- **WHEN** 价格数据更新且新价格高于旧价格
- **THEN** 价格数字显示绿色闪烁动画（背景短暂变为浅绿色）
- **AND** 动画持续约 500ms 后恢复常态
- **AND** 尊重用户的 `prefers-reduced-motion` 设置

#### Scenario: 价格下跌更新

- **WHEN** 价格数据更新且新价格低于旧价格
- **THEN** 价格数字显示红色闪烁动画（背景短暂变为浅红色）
- **AND** 动画持续约 500ms 后恢复常态

### Requirement: 图表配色统一

系统 SHALL 使用统一的 `chartColors` 配置系统管理所有图表颜色。

#### Scenario: 图表颜色使用

- **WHEN** 任何图表组件需要使用颜色
- **THEN** 从 `chartColors` 配置中获取颜色值，而非硬编码 hex 值
- **AND** 网格线使用 `chartColors.recharts.grid`
- **AND** 坐标轴使用 `chartColors.recharts.axis`
- **AND** 刻度文字使用 `chartColors.recharts.tick`
- **AND** Tooltip 背景使用 `chartColors.recharts.white` 和 `chartColors.recharts.border`
- **AND** 数据系列颜色使用 `chartColors.sequence` 或 `chartColors.oracle`

### Requirement: 统计指标上下文解释

系统 SHALL 为统计指标卡片提供含义解释和定性评级。

#### Scenario: 用户查看统计指标

- **WHEN** 用户将鼠标悬停在统计指标卡片上
- **THEN** 显示 Tooltip 解释该指标的含义和计算方式
- **AND** 指标值旁显示定性评级标签（如"优秀"/"良好"/"需关注"/"危险"）
- **AND** 评级标签使用对应颜色（绿色/蓝色/橙色/红色）

#### Scenario: 标准差指标评级

- **WHEN** 用户查看标准差指标
- **THEN** 标准差百分比 < 0.1% 显示"优秀"（绿色）
- **AND** 标准差百分比 0.1%-0.5% 显示"良好"（蓝色）
- **AND** 标准差百分比 0.5%-1% 显示"需关注"（橙色）
- **AND** 标准差百分比 > 1% 显示"危险"（红色）

### Requirement: ChartToolbar 集成

系统 SHALL 在价格查询页的 PriceChart 中集成 ChartToolbar 组件。

#### Scenario: 用户使用图表工具栏

- **WHEN** 用户查看价格查询页的图表
- **THEN** 图表顶部显示 ChartToolbar，包含时间范围选择和图表类型切换
- **AND** 时间范围选择与现有的 selectedTimeRange 联动
- **AND** 图表类型切换支持折线图、面积图、K 线图

### Requirement: Brush 组件优化

系统 SHALL 优化价格查询页图表底部的时间范围选择器（Brush）。

#### Scenario: 用户使用 Brush 选择时间范围

- **WHEN** 用户查看价格查询页的图表
- **THEN** Brush 组件高度从 30px 增加到 40px
- **AND** Brush 的 traveller 宽度从 8px 增加到 12px，便于拖拽
- **AND** Brush 使用 `chartColors.recharts.primary` 作为主题色
- **AND** Brush 区域显示缩略折线图预览

## MODIFIED Requirements

### Requirement: PriceChart 组件

PriceChart 组件 SHALL 支持十字线光标、ChartToolbar 集成、K 线图/折线图/面积图切换，并使用 chartColors 配色系统替代硬编码颜色。

### Requirement: CompactStatCard 组件

CompactStatCard 组件 SHALL 增加必填的 `description` 属性用于 Tooltip 解释指标含义，增加可选的 `rating` 属性用于显示定性评级标签。

## REMOVED Requirements

无
