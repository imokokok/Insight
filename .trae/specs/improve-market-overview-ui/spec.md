# 市场概览页面 UI 改进规范

## Why

作为专业预言机数据分析平台的核心入口，当前市场概览页面存在以下影响专业度和用户体验的问题：

### 1. 视觉层次混乱
- **统计卡片区域**：6个统计卡片平铺展示，没有主次之分，用户无法快速识别核心指标
- **信息密度不均**：部分卡片包含复杂的 breakdown 数据，导致高度不一致，视觉参差不齐
- **颜色使用不当**：所有卡片使用相同的白色背景，缺乏视觉区分度

### 2. 图表区域交互体验欠佳
- **图表类型切换混乱**：9种图表类型挤在同一行，标签过长导致换行或截断
- **工具栏重复**：ChartContainer 内有两个时间范围选择器（TIME_RANGES 和 timeRangeList），功能重复
- **对比模式指示不明显**：YoY/MoM 对比开启后，缺乏清晰的视觉反馈
- **异常阈值滑块过于简陋**：range input 样式不统一，且 5%-50% 的范围设置不够直观

### 3. 侧边栏信息过载
- **预言机列表过长**：10个预言机垂直排列，占用过多垂直空间
- **迷你图表数据不真实**：使用随机生成的 sparkline 数据，缺乏专业性
- **底部统计卡片冗余**："Total Market Share 100%" 是显而易见的固定值，浪费空间

### 4. 资产表格专业度不足
- **排名样式简陋**：仅使用灰色背景数字，缺乏专业金融平台的质感
- **价格变化缺少趋势指示**：仅有数字，没有上升/下降箭头或迷你图
- **主要预言机列交互不明确**：hover 效果仅有颜色变化，缺少可点击的视觉提示

### 5. 头部操作区布局松散
- **按钮组缺乏组织**：导出、刷新、实时状态三个功能平铺，没有逻辑分组
- **LiveStatusBar 重复**：MarketHeader 和 ChartContainer 都有实时状态显示
- **刷新控制信息过载**：倒计时、更新时间、成功状态挤在一起

## What Changes

- **重构 MarketStats 统计卡片**：区分核心指标（TVS、Chains、Protocols）和次要指标，使用不同视觉权重
- **优化 ChartContainer 图表切换**：采用分组标签页，主图表和次要图表分层展示
- **合并重复的工具栏**：统一时间范围选择器，移除冗余控件
- **改进 MarketSidebar 侧边栏**：预言机列表采用更紧凑的布局，移除冗余统计卡片
- **增强 AssetsTable 专业度**：改进排名样式，添加趋势指示器，优化交互反馈
- **精简 MarketHeader 操作区**：逻辑分组操作按钮，移除重复状态显示
- **统一置信区间和异常检测控件**：采用更专业的金融控件样式

## Impact

- Affected specs: 市场概览页面（market-overview）
- Affected code:
  - src/app/[locale]/market-overview/components/MarketStats.tsx
  - src/app/[locale]/market-overview/components/ChartContainer.tsx
  - src/app/[locale]/market-overview/components/MarketSidebar.tsx
  - src/app/[locale]/market-overview/components/AssetsTable.tsx
  - src/app/[locale]/market-overview/components/MarketHeader.tsx
  - src/app/[locale]/market-overview/components/RefreshControl.tsx

## ADDED Requirements

### Requirement: 分层统计卡片布局

The system SHALL provide 分层的统计信息展示：

#### Scenario: 核心指标突出显示

- **WHEN** 显示市场统计数据
- **THEN** 应将 TVS、Chains、Protocols 作为核心指标突出显示
- **AND** 使用更大的字号（text-2xl）和更强的视觉权重
- **AND** 核心指标卡片使用渐变背景或左侧强调色边框

#### Scenario: 次要指标折叠展示

- **WHEN** 显示次要统计（Dominance、Latency、Oracle Count）
- **THEN** 使用较小的字号（text-lg）和更 subtle 的样式
- **AND** 次要指标可以折叠，默认只显示数值和变化
- **AND** 点击后展开显示 breakdown 详情

#### Scenario: 响应式布局

- **WHEN** 在不同屏幕尺寸下显示
- **THEN** 桌面端：核心指标 3 列，次要指标 3 列
- **AND** 平板端：核心指标 3 列，次要指标折叠为可展开行
- **AND** 移动端：所有指标 2 列，breakdown 默认隐藏

### Requirement: 分组图表类型切换

The system SHALL provide 分组清晰的图表类型选择：

#### Scenario: 主图表标签页

- **WHEN** 显示图表类型切换
- **THEN** 主图表（市场份额、TVS趋势、链支持、链分布）作为一级标签
- **AND** 使用更明显的激活状态（底部边框或背景色）
- **AND** 标签文字简洁，图标+文字组合

#### Scenario: 次要图表下拉菜单

- **WHEN** 需要访问次要图表（协议、资产类别、对比等）
- **THEN** 使用下拉菜单或折叠面板收纳
- **AND** 当前选中的次要图表在按钮上显示
- **AND** 展开后显示所有次要选项

#### Scenario: 图表类型记忆

- **WHEN** 用户切换图表类型
- **THEN** 记住用户最后选择的图表类型
- **AND** 下次访问时自动恢复

### Requirement: 统一时间范围控件

The system SHALL provide 单一、清晰的时间范围选择：

#### Scenario: 统一时间选择器

- **WHEN** 显示时间范围选择
- **THEN** 只保留一组时间范围按钮（1H, 24H, 7D, 30D, 90D, 1Y, ALL）
- **AND** 移除 ChartToolbar 中的重复选择器
- **AND** 当前选中的时间范围使用主色调高亮

#### Scenario: 时间范围与图表联动

- **WHEN** 切换时间范围
- **THEN** 所有相关图表同步更新
- **AND** 显示加载状态，避免数据不一致

### Requirement: 专业异常检测控件

The system SHALL provide 专业的异常检测设置界面：

#### Scenario: 异常阈值设置

- **WHEN** 设置异常检测阈值
- **THEN** 使用分段按钮替代滑块（5%, 10%, 15%, 20%, 30%, 50%）
- **AND** 每个阈值段使用不同颜色表示严重程度（绿→黄→橙→红）
- **AND** 当前选中阈值显示为激活状态

#### Scenario: 异常指示器

- **WHEN** 图表中存在异常数据点
- **THEN** 在数据点上显示异常标记（如红点或警告图标）
- **AND** hover 时显示异常详情（数值、偏差、时间）

### Requirement: 紧凑预言机列表

The system SHALL provide 更紧凑的预言机市场列表：

#### Scenario: 列表项优化

- **WHEN** 显示预言机列表
- **THEN** 每个预言机项高度控制在 48-56px
- **AND** 信息布局：左侧（名称+颜色点）+ 中间（迷你图）+ 右侧（份额+变化）
- **AND** TVS 和链数量使用 tooltip 显示，不常驻

#### Scenario: 真实趋势数据

- **WHEN** 显示迷你趋势图
- **THEN** 使用真实的历史数据生成 sparkline
- **AND** 移除随机生成的模拟数据
- **AND** 无数据时显示占位符或水平线

#### Scenario: 选中状态优化

- **WHEN** 选中某个预言机
- **THEN** 使用左侧边框高亮替代背景色变化
- **AND** 其他未选中项降低透明度（opacity-50）
- **AND** 平滑过渡动画

### Requirement: 专业资产表格

The system SHALL provide 专业级的资产数据表格：

#### Scenario: 排名样式改进

- **WHEN** 显示资产排名
- **THEN** 使用徽章样式（圆角矩形，背景色根据排名变化）
- **AND** 前3名使用金银铜配色（#FFD700, #C0C0C0, #CD7F32）
- **AND** 其他排名使用渐变色或统一灰色

#### Scenario: 价格变化可视化

- **WHEN** 显示 24h/7d 价格变化
- **THEN** 添加上升/下降箭头图标
- **AND** 变化幅度使用背景色强度表示（热力图风格）
- **AND** 可选：添加迷你趋势图列

#### Scenario: 主要预言机交互优化

- **WHEN** 显示主要预言机列
- **THEN** 使用徽章样式展示预言机名称
- **AND** 添加预言机品牌色点
- **AND** hover 时显示 tooltip（预言机详情）
- **AND** 点击可跳转到预言机详情页

### Requirement: 精简操作区

The system SHALL provide 组织清晰的操作按钮区：

#### Scenario: 按钮分组

- **WHEN** 显示操作按钮
- **THEN** 按功能分组：数据操作（导出、刷新）、视图控制（实时、自动刷新）
- **AND** 使用分隔线或间距区分不同组
- **AND** 每组内按钮样式统一

#### Scenario: 刷新状态简化

- **WHEN** 显示刷新控制
- **THEN** 只显示刷新按钮和自动刷新开关
- **AND** 倒计时和最后更新时间移到 tooltip
- **AND** 刷新成功使用 toast 通知替代行内显示

#### Scenario: 实时状态整合

- **WHEN** 显示实时连接状态
- **THEN** 只保留一个实时状态指示器（移除 LiveStatusBar 重复）
- **AND** 使用图标+颜色点表示状态
- **AND** 断开时显示重连按钮

## MODIFIED Requirements

### Requirement: MarketStats 组件布局

**Current**: 6个统计卡片平铺，全部使用相同样式，高度不一致
**Modified**: 
- 核心指标（TVS、Chains、Protocols）使用大字号+强调色边框
- 次要指标（Dominance、Latency、Oracle Count）使用小字号+可折叠设计
- 统一卡片高度，breakdown 默认折叠

### Requirement: ChartContainer 图表切换

**Current**: 9个图表类型按钮平铺，标签过长，两行显示
**Modified**:
- 主图表（4个）作为一级标签，横向排列
- 次要图表（5个）收纳在下拉菜单中
- 标签使用图标+短文字，避免截断

### Requirement: ChartContainer 工具栏

**Current**: 两组时间范围选择器（TIME_RANGES 和 timeRangeList），功能重复
**Modified**:
- 移除 ChartToolbar 组件中的时间范围选择器
- 只保留顶部的 TIME_RANGES 选择器
- 简化工具栏，只保留图表类型切换和导出功能

### Requirement: MarketSidebar 预言机列表

**Current**: 列表项高度过高，包含过多信息，底部有冗余统计卡片
**Modified**:
- 列表项高度从 ~80px 缩减到 ~50px
- TVS 和链数量移到 tooltip
- 移除底部 "Total Market Share" 卡片
- 使用真实数据生成 sparkline

### Requirement: AssetsTable 表格样式

**Current**: 排名使用简单数字，价格变化只有文字，预言机列交互不明显
**Modified**:
- 排名使用徽章样式，前3名特殊配色
- 价格变化添加箭头和热力图背景
- 预言机列使用徽章+品牌色点

### Requirement: MarketHeader 操作区

**Current**: 按钮平铺，LiveStatusBar 重复显示，刷新控制信息过载
**Modified**:
- 按钮按功能分组，使用间距和分隔线区分
- 移除 LiveStatusBar，只保留 RealtimeIndicator
- 刷新控制简化，倒计时移到 tooltip

## REMOVED Requirements

### Requirement: LiveStatusBar 组件

**Reason**: 与 RealtimeIndicator 功能重复，且 MarketHeader 和 ChartContainer 都有实时状态显示
**Migration**: 移除 LiveStatusBar，统一使用 RealtimeIndicator

### Requirement: MarketSidebar 底部统计卡片

**Reason**: "Total Market Share 100%" 是固定值，不提供实际信息
**Migration**: 直接移除该卡片，节省垂直空间

### Requirement: ChartToolbar 时间范围选择器

**Reason**: 与 ChartContainer 顶部的时间范围选择器功能重复
**Migration**: 移除 ChartToolbar 中的时间范围选择，统一使用顶部选择器
