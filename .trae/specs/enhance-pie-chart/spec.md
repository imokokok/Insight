# 环形图周围空白区域利用规范

## Why

当前市场份额环形图只显示了简单的颜色区块，周围有大量空白区域未被利用：

1. **环形图中心空白** - 中心区域只显示背景色，可以展示总 TVS 等关键指标
2. **环形图外围空白** - 环形图外侧有大量空间，可以添加标签、数值、趋势指示器
3. **图表下方空白** - 环形图下方有大片空白，可以添加图例、洞察信息
4. **整体信息密度低** - 用户需要看右侧列表才能获取详细信息，不够直观

需要直接在环形图组件内充分利用所有空白区域，提高信息密度。

## What Changes

- **环形图中心区域** - 显示总 TVS、预言机数量、时间范围等核心指标
- **环形图外围标签** - 在环形图周围直接显示预言机名称和份额百分比
- **环形图交互增强** - 悬停时扇形放大并显示详细信息
- **图表下方区域** - 添加迷你趋势图、关键洞察、图例等

## Impact

- Affected specs: 市场概览页面 - 市场份额环形图
- Affected code:
  - src/app/[locale]/market-overview/components/ChartRenderer.tsx (renderPieChart)

## ADDED Requirements

### Requirement: 环形图中心信息展示

The system SHALL provide 在环形图中心显示关键指标：

#### Scenario: 中心总览信息

- **WHEN** 显示市场份额环形图
- **THEN** 在环形图中心显示以下信息：
  - 总 TVS（大字号，如 "$27.6B"）
  - 预言机数量（小字，如 "10 Oracles"）
  - 当前时间范围（小字，如 "30D"）
- **AND** 中心文字使用深色，清晰可读
- **AND** 当悬停在某个扇形上时，中心显示该预言机的信息

#### Scenario: 悬停时中心信息切换

- **WHEN** 用户悬停在某个扇形上
- **THEN** 中心区域临时显示该预言机的信息：
  - 预言机名称
  - 份额百分比（大字号）
  - TVS 数值
  - 24h 变化
- **AND** 鼠标移开后恢复显示总览信息

### Requirement: 环形图外围标签

The system SHALL provide 在环形图周围显示标签：

#### Scenario: 外围标签布局

- **WHEN** 显示市场份额环形图
- **THEN** 在环形图外围显示预言机标签
- **AND** 标签位置对应扇形位置（顺时针排列）
- **AND** 标签包含：颜色点 + 名称 + 份额百分比

#### Scenario: 标签样式

- **WHEN** 显示外围标签
- **THEN** 使用小字号（text-xs 或 text-sm）
- **AND** 名称使用灰色（text-gray-600）
- **AND** 份额使用深色（text-gray-900 font-medium）
- **AND** 颜色点使用预言机品牌色（w-2 h-2 rounded）

#### Scenario: 标签交互

- **WHEN** 用户悬停在标签上
- **THEN** 对应扇形高亮（放大或增加亮度）
- **AND** 中心区域显示该预言机信息

### Requirement: 环形图扇形交互增强

The system SHALL provide 更丰富的扇形交互：

#### Scenario: 扇形悬停效果

- **WHEN** 用户悬停在扇形上
- **THEN** 扇形向外偏移（explode）5-10px
- **AND** 扇形放大（scale 1.05）
- **AND** 显示 tooltip（名称、份额、TVS、24h变化）
- **AND** 其他扇形降低透明度（opacity-50）

#### Scenario: 扇形点击效果

- **WHEN** 用户点击扇形
- **THEN** 选中该预言机
- **AND** 扇形保持偏移状态
- **AND** 中心区域持续显示该预言机信息
- **AND** 再次点击取消选中

### Requirement: 图表下方信息区域

The system SHALL provide 在环形图下方显示补充信息：

#### Scenario: 迷你趋势图

- **WHEN** 显示市场份额环形图
- **THEN** 在环形图下方添加迷你趋势图（高度 60-80px）
- **AND** 显示最近 30 天的份额变化趋势
- **AND** 使用 sparkline 样式
- **AND** 点击可切换到趋势图表视图

#### Scenario: 关键洞察行

- **WHEN** 显示市场份额环形图
- **THEN** 在迷你趋势图下方添加一行关键洞察
- **AND** 显示 3-4 个关键指标：
  - 增长最快：Chainlink +2.4%
  - 份额最大变化：Pyth +5.8%
  - 市场集中度：CR4 = 89.2%

#### Scenario: 紧凑图例

- **WHEN** 显示市场份额环形图
- **THEN** 在洞察行下方添加紧凑图例
- **AND** 使用横向排列，每行显示 5 个预言机
- **AND** 每个图例项：颜色点 + 名称（缩写）+ 份额

## MODIFIED Requirements

### Requirement: 环形图尺寸和布局

**Current**: 环形图 outerRadius=120, innerRadius=70，周围空白多
**Modified**:
- 增大环形图尺寸：outerRadius=140-150, innerRadius=80-90
- 调整布局，让环形图占据更多空间
- 在环形图周围直接显示标签，不依赖右侧列表

### Requirement: 环形图数据展示

**Current**: 只显示扇形颜色，详细信息在右侧列表
**Modified**:
- 扇形上直接显示份额百分比（大于 5% 的扇形）
- 中心区域显示动态信息
- 周围标签显示完整信息

## REMOVED Requirements

无
