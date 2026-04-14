# Tasks

- [ ] Task 1: 图表配色统一 - 替换所有硬编码颜色为 chartColors 配置
  - [ ] SubTask 1.1: 修改 PriceChart.tsx - 将 `getSeriesColor` 改为使用 `chartColors.sequence`，网格线/坐标轴/刻度使用 `chartColors.recharts.*`
  - [ ] SubTask 1.2: 修改 CustomTooltip.tsx - Tooltip 背景和边框使用 `chartColors.recharts.white` 和 `chartColors.recharts.border`
  - [ ] SubTask 1.3: 修改 PriceDistributionHistogram.tsx - 替换硬编码的 `#3B82F6`/`#EF4444`/`#f0f0f0`/`#6b7280`/`#e5e7eb` 为 chartColors 配置
  - [ ] SubTask 1.4: 修改 MultiOracleTrendChart.tsx - 替换硬编码颜色为 chartColors 配置
  - [ ] SubTask 1.5: 修改 DeviationScatterChart.tsx - 替换硬编码颜色为 chartColors 配置
  - [ ] SubTask 1.6: 修改 MarketDepthSimulator.tsx - 替换硬编码颜色为 chartColors 配置
  - [ ] SubTask 1.7: 修改 DispersionGauge.tsx - 替换 `#E5E7EB` 为 chartColors 配置
  - [ ] SubTask 1.8: 修改 InteractivePriceChart.tsx - 替换硬编码颜色为 chartColors 配置

- [ ] Task 2: 十字线光标（Crosshair Cursor）
  - [ ] SubTask 2.1: 在 PriceChart.tsx 中添加 Recharts `Cursor` 组件实现十字线效果（垂直线 + 自定义水平线渲染）
  - [ ] SubTask 2.2: 在 MultiOracleTrendChart.tsx 中添加十字线光标
  - [ ] SubTask 2.3: 在 InteractivePriceChart.tsx 中添加十字线光标（改进现有 Tooltip 为十字线 + 数值面板模式）
  - [ ] SubTask 2.4: 在 PriceDistributionHistogram.tsx 中添加垂直十字线

- [ ] Task 3: ChartToolbar 集成与 K 线图支持
  - [ ] SubTask 3.1: 在 PriceChart.tsx 中集成 ChartToolbar 组件，替换现有的简单工具栏
  - [ ] SubTask 3.2: 将 PriceChart 的 selectedTimeRange 与 ChartToolbar 的 timeRange 联动
  - [ ] SubTask 3.3: 在 PriceChart 中添加 chartType 状态（line/area/candle）
  - [ ] SubTask 3.4: 实现折线图模式（LineChart）- 使用现有逻辑
  - [ ] SubTask 3.5: 实现面积图模式（AreaChart）- 在 LineChart 基础上添加 Area 组件
  - [ ] SubTask 3.6: 实现 K 线图模式（CandlestickChart）- 使用 Recharts ComposedChart + 自定义 Bar 渲染 OHLC 数据
  - [ ] SubTask 3.7: 当数据源不提供 OHLC 数据时，K 线图按钮显示为禁用状态

- [ ] Task 4: Brush 组件优化
  - [ ] SubTask 4.1: 将 PriceChart 中 Brush 组件高度从 30 增加到 40
  - [ ] SubTask 4.2: 将 Brush 的 travellerWidth 从 8 增加到 12
  - [ ] SubTask 4.3: Brush 使用 chartColors.recharts.primary 作为 stroke 颜色

- [ ] Task 5: 价格闪烁动画
  - [ ] SubTask 5.1: 创建 PriceFlash 组件，支持 flash-up（绿色闪烁）和 flash-down（红色闪烁）两种动画
  - [ ] SubTask 5.2: PriceFlash 动画持续 500ms，使用 CSS transition 实现背景色渐变
  - [ ] SubTask 5.3: PriceFlash 尊重 prefers-reduced-motion 设置
  - [ ] SubTask 5.4: 在 QueryResults.tsx 的价格显示处集成 PriceFlash 组件
  - [ ] SubTask 5.5: 在 MarketConsensusCard.tsx 的中位数价格处集成 PriceFlash 组件

- [ ] Task 6: 统计指标上下文解释
  - [ ] SubTask 6.1: 在 CompactStatCard 中增加 `description` 可选属性，当提供时在 Tooltip 中显示指标含义解释
  - [ ] SubTask 6.2: 在 CompactStatCard 中增加 `rating` 可选属性（类型为 'excellent' | 'good' | 'attention' | 'danger'），显示定性评级标签和对应颜色
  - [ ] SubTask 6.3: 创建 `getStatRating` 工具函数，根据指标类型和数值自动计算评级
  - [ ] SubTask 6.4: 在价格查询页的统计卡片中添加 description 和 rating 属性
  - [ ] SubTask 6.5: 在跨预言机页的 MarketConsensusCard 和 PriceDispersionCard 中添加指标解释

# Task Dependencies

- [Task 1] 应最先完成（配色统一是基础，后续任务都依赖统一配色）
- [Task 2] 和 [Task 3] 可以并行（十字线和 K 线图互不依赖）
- [Task 4] 依赖 [Task 1]（Brush 配色需要使用 chartColors）
- [Task 5] 独立，可并行
- [Task 6] 独立，可并行
