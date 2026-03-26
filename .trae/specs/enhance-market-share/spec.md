# 市场份额分布功能增强规范

## Why

当前市场份额分布页面（pie 图表）存在以下问题：

1. **空间利用率低** - 左侧只有一个简单的环形图，大量空白区域未使用
2. **信息展示单一** - 只显示当前份额百分比，缺乏历史趋势、变化分析等深度信息
3. **交互性不足** - 点击图表仅高亮选中，缺乏更丰富的数据探索功能
4. **对比功能缺失** - 无法直观对比不同预言机的表现差异

需要充分利用页面空白，打造一个信息丰富、交互性强的市场份额分析中心。

## What Changes

- **左侧图表区域增强** - 在环形图下方添加时间趋势缩略图、份额变化指示器
- **右侧信息面板扩展** - 添加详细数据表格、历史趋势迷你图、关键指标对比
- **新增交互功能** - 支持点击图表项查看详情、悬停显示更多信息、时间范围切换
- **添加洞察卡片** - 在底部添加市场洞察卡片（增长最快、份额变化最大等）

## Impact

- Affected specs: 市场概览页面 - 市场份额分布功能
- Affected code:
  - src/app/[locale]/market-overview/components/ChartRenderer.tsx (renderPieChart)
  - src/app/[locale]/market-overview/components/MarketSidebar.tsx
  - src/app/[locale]/market-overview/page.tsx

## ADDED Requirements

### Requirement: 左侧图表区域增强

The system SHALL provide 更丰富的图表展示：

#### Scenario: 环形图增强

- **WHEN** 显示市场份额环形图
- **THEN** 在环形图中心显示总 TVS 数值
- **AND** 环形图添加悬停效果（扇形放大、显示详细数据）
- **AND** 点击扇形可高亮并显示该预言机的详细信息

#### Scenario: 时间趋势缩略图

- **WHEN** 显示市场份额图表
- **THEN** 在环形图下方添加时间趋势缩略图（最近 30 天份额变化）
- **AND** 缩略图高度约 80-100px
- **AND** 点击缩略图可切换到趋势图表视图

#### Scenario: 份额变化指示器

- **WHEN** 显示市场份额图表
- **THEN** 在环形图右侧或下方显示份额变化指示器
- **AND** 显示 24h/7d/30d 的份额变化趋势（上升/下降箭头 + 百分比）

### Requirement: 右侧信息面板扩展

The system SHALL provide 更详细的数据展示：

#### Scenario: 详细数据表格

- **WHEN** 显示预言机列表
- **THEN** 在列表中添加更多列：TVS、支持链数、协议数、24h变化、7d变化
- **AND** 表格支持排序（点击表头排序）
- **AND** 表格行支持点击选中/取消选中

#### Scenario: 历史趋势迷你图

- **WHEN** 显示预言机列表
- **THEN** 在列表中添加迷你趋势图列（最近 30 天份额趋势）
- **AND** 迷你图宽度约 80-100px，高度约 30px
- **AND** 迷你图使用预言机品牌色

#### Scenario: 关键指标对比

- **WHEN** 选中某个预言机
- **THEN** 在右侧显示该预言机的详细指标卡片
- **AND** 显示：TVS、市场份额、支持链数、协议数、平均响应时间
- **AND** 显示与行业平均的对比（高于/低于平均百分比）

### Requirement: 底部洞察卡片

The system SHALL provide 市场洞察信息：

#### Scenario: 洞察卡片布局

- **WHEN** 显示市场份额页面
- **THEN** 在图表下方添加 3-4 个洞察卡片
- **AND** 卡片水平排列，占据整行宽度

#### Scenario: 洞察内容

- **WHEN** 显示洞察卡片
- **THEN** 显示以下内容：
  1. **增长最快**：过去 7 天份额增长最多的预言机
  2. **份额变化最大**：过去 24h 份额变化最大的预言机
  3. **新进入者**：最近 30 天内新支持的协议数量
  4. **市场集中度**：CR4（前 4 名份额总和）指标

### Requirement: 交互功能增强

The system SHALL provide 更丰富的交互体验：

#### Scenario: 图表交互

- **WHEN** 用户悬停在环形图扇形上
- **THEN** 扇形放大 5-10%，显示 tooltip（名称、份额、TVS）
- **AND** 右侧列表对应项高亮

- **WHEN** 用户点击环形图扇形
- **THEN** 选中该预言机，右侧显示详细信息
- **AND** 其他扇形降低透明度（opacity-40）

#### Scenario: 列表交互

- **WHEN** 用户悬停在列表项上
- **THEN** 环形图对应扇形高亮
- **AND** 显示更多操作按钮（查看详情、对比）

## MODIFIED Requirements

### Requirement: 市场份额图表布局

**Current**: 左侧环形图 + 右侧简单列表
**Modified**:
- 左侧：环形图（占 60% 高度）+ 时间趋势缩略图（占 40% 高度）
- 右侧：详细数据表格（带排序）+ 选中预言机详情卡片
- 底部：3-4 个洞察卡片横向排列

### Requirement: 数据展示维度

**Current**: 仅显示当前份额百分比
**Modified**:
- 添加历史趋势数据（24h/7d/30d 变化）
- 添加 TVS、链数、协议数等多维度数据
- 添加与行业平均的对比数据

## REMOVED Requirements

无
