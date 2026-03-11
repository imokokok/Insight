# 首页重构 V2 规格文档

## Why
当前首页设计过于简单，只是功能区域的线性堆叠，缺乏专业数据平台的深度和层次感。需要重新设计为一个真正的数据仪表盘式首页，像 Dune Analytics 那样具有数据密度和专业视觉层次。

## What Changes
- **全新仪表盘式布局**：左侧导航 + 主内容区的专业数据平台布局
- **Hero 区域重构**：更紧凑的专业头部，包含实时状态指示器
- **数据密度提升**：多列数据展示，信息更丰富
- **可视化图表**：添加真正的数据图表而非简单的 sparkline
- **实时数据流**：模拟实时数据更新的效果
- **专业配色**：深色主题，数据高亮
- **交互式元素**：可展开的数据详情、筛选器

## Impact
- 受影响文件：`src/app/page.tsx`
- 新增依赖：可能需要图表库 (recharts)
- 样式更新：大量自定义 CSS

## ADDED Requirements

### Requirement: 仪表盘式布局
The system SHALL provide 专业数据平台的仪表盘式布局。

#### Scenario: 用户访问首页
- **WHEN** 用户访问首页
- **THEN** 看到左侧固定导航栏 + 右侧主内容区的布局
- **AND** 导航栏包含平台 Logo 和主要功能入口
- **AND** 主内容区展示数据仪表盘

### Requirement: 专业 Hero 头部
The system SHALL provide 紧凑专业的 Hero 头部区域。

#### Scenario: 用户查看头部
- **WHEN** 页面加载
- **THEN** 看到紧凑的头部区域（高度约 200px）
- **AND** 包含平台标题和简短描述
- **AND** 右侧显示系统状态指示器（在线/数据更新状态）
- **AND** 背景使用 subtle 的渐变效果

### Requirement: 数据概览卡片网格
The system SHALL provide 多列数据概览卡片网格。

#### Scenario: 用户查看数据概览
- **WHEN** 用户滚动到数据概览区域
- **THEN** 看到 4 列网格布局的关键指标卡片
- **AND** 每个卡片显示：指标名称、当前值、变化趋势、迷你图表
- **AND** 卡片包含：总数据源数、活跃预言机、24h 更新数、平均响应时间

### Requirement: 预言机性能对比表
The system SHALL provide 详细的预言机性能对比表格。

#### Scenario: 用户查看预言机对比
- **WHEN** 用户查看对比表
- **THEN** 看到类似 Dune 的详细数据表格
- **AND** 包含列：预言机名称、价格、24h 变化、市值、更新频率、准确性评分
- **AND** 表格支持排序和筛选
- **AND** 行可点击展开详情

### Requirement: 链上数据可视化
The system SHALL provide 链上数据的可视化图表。

#### Scenario: 用户查看图表
- **WHEN** 用户查看可视化区域
- **THEN** 看到面积图展示价格趋势
- **AND** 看到柱状图展示各链数据量
- **AND** 图表具有交互提示框

### Requirement: 实时数据流
The system SHALL provide 实时数据更新效果。

#### Scenario: 数据更新
- **WHEN** 新数据到达
- **THEN** 相关数值有闪烁/高亮动画
- **AND** 更新时间戳实时更新
- **AND** 显示数据更新指示器

### Requirement: 最新活动流
The system SHALL provide 最新活动/交易流展示。

#### Scenario: 用户查看最新活动
- **WHEN** 用户查看活动区域
- **THEN** 看到类似区块链浏览器的实时活动流
- **AND** 显示：时间、预言机、价格、链
- **AND** 活动自动滚动更新

## MODIFIED Requirements

### Requirement: 首页整体结构
**修改内容**: 完全重构为仪表盘式布局，不再是简单的区域堆叠

#### Scenario: 首页渲染
- **WHEN** 首页组件渲染
- **THEN** 使用左侧导航 + 主内容区的布局
- **AND** 主内容区包含多个数据密集的区域
- **AND** 所有数据区域具有统一的视觉风格

## REMOVED Requirements

### Requirement: 简单的功能导航卡片
**Reason**: 改为左侧导航栏，不再需要在主内容区展示功能卡片
**Migration**: 功能入口移至左侧导航

### Requirement: 独立的功能展示区域
**Reason**: 仪表盘式布局下，功能通过数据和图表自然展示
**Migration**: 功能整合到数据展示中
