# 价格查询页面 UI 改进规范

## Why
当前价格查询页面作为专业预言机数据分析平台的核心功能，存在以下影响专业度的问题：
1. 统计卡片布局过于紧凑，对比模式的差异指示器与主数值挤在一起，信息层次不清晰
2. 价格图表缺少专业金融平台的关键功能（十字准星、成交量、缩放平移）
3. 图表 Tooltip 信息过于简单，缺少涨跌幅、偏差等专业指标
4. 选择器面板视觉权重过高，边框嵌套过多显得"厚重"
5. 实时状态栏信息过载，6项信息挤在一行
6. 价格偏差展示不够直观，仅使用颜色文字

## What Changes
- 重构 StatsGrid 统计卡片布局，分层展示核心指标与次要指标
- 优化对比模式的差异显示，使用更明显的视觉区分
- 增强 PriceChart 专业金融图表功能（Brush 时间范围选择、十字准星）
- 丰富 CustomTooltip 内容，添加涨跌幅、偏差等指标
- 优化 Selectors 选择器面板视觉设计，减少嵌套边框
- 精简 LiveStatusBar 信息密度，次要信息移到 Tooltip
- 改进 PriceResultsTable 价格偏差可视化，添加热力图风格背景

## Impact
- Affected specs: 价格查询页面（price-query）
- Affected code:
  - src/app/[locale]/price-query/components/StatsGrid.tsx
  - src/app/[locale]/price-query/components/PriceChart.tsx
  - src/app/[locale]/price-query/components/CustomTooltip.tsx
  - src/app/[locale]/price-query/components/Selectors.tsx
  - src/app/[locale]/price-query/components/LiveStatusBar.tsx
  - src/app/[locale]/price-query/components/PriceResultsTable.tsx
  - src/app/[locale]/price-query/components/QueryResults.tsx

## ADDED Requirements

### Requirement: 统计卡片分层布局
The system SHALL provide 分层的统计信息展示：

#### Scenario: 核心指标展示
- **WHEN** 显示统计数据
- **THEN** 应将平均价格、24h变化、波动率作为核心指标突出显示
- **AND** 使用更大的字号和更强的视觉权重

#### Scenario: 对比模式差异显示
- **WHEN** 启用对比模式
- **THEN** 差异指示器应使用卡片边框颜色变化或背景渐变来区分
- **AND** 差异百分比使用独立的颜色编码（上涨绿色/下跌红色）

### Requirement: 专业金融图表功能
The system SHALL provide 专业级价格图表：

#### Scenario: Brush 时间范围选择
- **WHEN** 用户查看价格图表
- **THEN** 应提供 Brush 组件允许用户拖动选择查看的时间范围
- **AND** Brush 应显示在图表底部，高度约 60px

#### Scenario: 十字准星追踪
- **WHEN** 用户鼠标悬停在图表上
- **THEN** 应显示十字准星线（水平和垂直）
- **AND** 准星线应与当前数据点精确对齐

#### Scenario: 价格精度自适应
- **WHEN** 显示 Y 轴价格标签
- **THEN** 应根据价格大小自动调整小数位数
- **AND** 价格 >= $100 显示 2 位小数，$1-$100 显示 4 位，< $1 显示 6 位

### Requirement: 丰富的 Tooltip 信息
The system SHALL provide 信息丰富的数据提示：

#### Scenario: 多维度数据展示
- **WHEN** 用户悬停查看 Tooltip
- **THEN** 应显示：
  1. 精确时间（含日期）
  2. 价格数值（自适应精度）
  3. 与平均价格的偏差百分比
  4. 与上一时间点的涨跌幅
  5. 数据源标识（预言机+链）

#### Scenario: 视觉层次
- **WHEN** 显示 Tooltip 内容
- **THEN** 应使用视觉层次区分信息重要性
- **AND** 价格使用最大字号，次要信息使用灰色小字

### Requirement: 精简的选择器面板
The system SHALL provide 轻量化的选择器界面：

#### Scenario: 减少视觉噪音
- **WHEN** 渲染选择器面板
- **THEN** 应减少嵌套边框和背景色块
- **AND** 使用更 subtle 的分隔方式（如分割线替代边框）

#### Scenario: 高级选项分离
- **WHEN** 用户需要高级功能
- **THEN** 对比模式、基准线等选项应可折叠
- **AND** 默认收起，减少初始视觉复杂度

### Requirement: 精简的实时状态栏
The system SHALL provide 信息密度适中的状态显示：

#### Scenario: 核心状态突出
- **WHEN** 显示实时状态
- **THEN** 只显示：连接状态、数据新鲜度、最后更新时间
- **AND** UTC时间、延迟等次要信息移到 Tooltip

#### Scenario: 响应式信息密度
- **WHEN** 屏幕宽度不足
- **THEN** 应自动隐藏次要信息，保留核心状态指示

### Requirement: 直观的价格偏差可视化
The system SHALL provide 直观的价格偏差展示：

#### Scenario: 热力图背景
- **WHEN** 显示价格偏差
- **THEN** 应使用背景色强度表示偏差大小
- **AND** 偏差 < 0.1% 浅绿，0.1-0.5% 黄，> 0.5% 红

#### Scenario: 迷你柱状图
- **WHEN** 空间允许
- **THEN** 可在偏差列显示迷你柱状图
- **AND** 柱状图长度与偏差大小成正比

## MODIFIED Requirements

### Requirement: StatsGrid 组件布局
**Current**: 4列紧凑网格，所有指标平级显示
**Modified**: 2层布局，核心指标（平均价格、24h变化、波动率、数据点）突出显示，次要指标（最高/最低价格、价格区间、标准差、查询耗时）折叠展示

**Current**: 对比差异使用小标签显示在主数值下方
**Modified**: 对比差异使用卡片边框颜色或左侧边框条区分，差异百分比独立显示

### Requirement: PriceChart 组件功能
**Current**: 基础折线图，仅显示价格线和简单 Tooltip
**Modified**: 添加 Brush 组件、十字准星、自适应价格精度、丰富的 Tooltip

### Requirement: CustomTooltip 组件内容
**Current**: 仅显示时间和价格
**Modified**: 添加偏差百分比、涨跌幅、数据源标识，优化视觉层次

### Requirement: Selectors 组件视觉设计
**Current**: 每个选择器使用 bg-gray-50/50 + border 嵌套
**Modified**: 移除嵌套边框，使用分割线分隔，简化视觉层次

### Requirement: LiveStatusBar 组件信息密度
**Current**: 显示6项信息（UTC时间、延迟、更新时间、新鲜度、连接状态）
**Modified**: 精简为3项核心信息，次要信息移到 Tooltip

### Requirement: PriceResultsTable 偏差显示
**Current**: 仅使用文字颜色表示偏差
**Modified**: 添加热力图背景色，可选迷你柱状图
