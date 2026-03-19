# Chainlink 预言机页面样式优化规格

## Why
Chainlink 作为项目中最重要、功能最丰富的预言机页面，目前的视觉呈现还有提升空间。在保持现有 Dune Style 扁平化设计的基础上，通过微调视觉层次、统一细节样式、优化信息密度，可以让页面更加专业、易读，同时不过度设计。

## What Changes
- 优化统计卡片（StatCard）的视觉层次和间距
- 统一 DashboardCard 的标题样式和边框处理
- 改进服务面板（ServicesPanel）的色彩一致性
- 优化标签页导航的视觉反馈
- 微调数据展示的信息密度
- **BREAKING**: 无破坏性变更

## Impact
- Affected specs: Chainlink 页面展示、跨预言机对比
- Affected code: 
  - `src/app/[locale]/chainlink/page.tsx`
  - `src/components/oracle/common/DashboardCard.tsx`
  - `src/components/oracle/panels/ChainlinkServicesPanel.tsx`
  - `src/components/oracle/common/OraclePageTemplate.tsx`
  - `src/app/globals.css`

## ADDED Requirements

### Requirement: 统计卡片视觉优化
统计卡片 SHALL 具有更清晰的视觉层次。

#### Scenario: 展示统计数据
- **WHEN** 用户查看 Chainlink 页面顶部的统计卡片
- **THEN** 卡片应具有统一的高度、清晰的数字层级、适度的间距
- **AND** 变化指示器（↑↓）应与数值对齐
- **AND** 图标区域应有微妙的背景色区分

### Requirement: DashboardCard 标题样式统一
DashboardCard SHALL 使用统一的标题样式。

#### Scenario: 卡片标题展示
- **WHEN** 页面渲染 DashboardCard 组件
- **THEN** 标题区域应有统一的底部边框
- **AND** 标题文字大小、字重应一致
- **AND** 标题与内容区域应有合适的间距

### Requirement: 服务面板色彩优化
ChainlinkServicesPanel SHALL 使用更协调的色彩方案。

#### Scenario: 服务卡片展示
- **WHEN** 用户查看 Services 标签页
- **THEN** 服务卡片的颜色主题应与 Chainlink 品牌色协调
- **AND** 状态标签（active/beta）应有统一的样式
- **AND** 悬停效果应微妙且不突兀

### Requirement: 标签页导航优化
标签页导航 SHALL 提供更清晰的当前状态指示。

#### Scenario: 切换标签页
- **WHEN** 用户在不同标签页之间切换
- **THEN** 当前激活的标签应有明显的视觉指示
- **AND** 标签文字与下划线/背景应有合适的间距
- **AND** 悬停状态应提供微妙的反馈

### Requirement: 信息密度微调
页面 SHALL 具有合适的信息密度，不过于拥挤。

#### Scenario: 内容展示
- **WHEN** 页面渲染各类数据和图表
- **THEN** 元素之间应有足够的呼吸空间
- **AND** 关键数据应易于扫描
- **AND** 移动端应有适当的间距调整

## MODIFIED Requirements
无

## REMOVED Requirements
无
