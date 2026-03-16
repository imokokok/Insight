# 市场概览页面UI优化规格

## Why
当前市场概览页面存在以下问题：
1. 图表类型切换方式不够直观 - 下拉选择器和图标按钮同时存在，造成混淆
2. 统计数据卡片（总TVS、支持链数等）显示样式不够突出，信息层次不清晰
3. 市场份额和链支持的切换体验不够流畅
4. 统计数据的视觉呈现缺乏重点，用户难以快速获取关键信息

## What Changes
- **优化图表类型切换**：整合下拉选择器和图标按钮，采用更直观的标签页式切换
- **重构统计数据展示**：重新设计统计卡片布局，增强视觉层次和信息可读性
- **改进交互体验**：统一切换动效，提供更清晰的选中状态反馈
- **优化数据格式化**：改进TVS、链数等数据的显示格式，增加趋势指示

## Impact
- Affected specs: 市场概览页面UI交互
- Affected code: 
  - `/src/app/market-overview/page.tsx`
  - `/src/app/market-overview/components/ChartRenderer.tsx`
  - `/src/app/market-overview/components/ChainBreakdownChart.tsx`

## ADDED Requirements
### Requirement: 优化图表类型切换
The system SHALL provide a unified chart type selector that combines dropdown and icon buttons into a tab-style interface.

#### Scenario: 用户切换图表类型
- **WHEN** 用户查看市场概览页面
- **THEN** 图表类型切换器以标签页形式展示，包含：市场份额、TVS趋势、链支持、链分布四个主要选项
- **AND** 每个选项显示图标和文字标签
- **AND** 选中状态有清晰的视觉反馈

### Requirement: 重构统计数据卡片
The system SHALL display market statistics in a redesigned card layout with improved visual hierarchy.

#### Scenario: 用户查看统计数据
- **WHEN** 用户查看页面顶部统计区域
- **THEN** 统计数据以卡片形式展示，包含：总TVS、支持链数、协议数量、市场主导率
- **AND** 每个卡片显示图标、标签、数值和变化趋势
- **AND** 数值使用合适的格式化（如 $15.2B）
- **AND** 变化趋势使用颜色编码（绿色上涨、红色下跌）

### Requirement: 优化链支持展示
The system SHALL improve the chain support visualization with better data presentation.

#### Scenario: 用户查看链支持图表
- **WHEN** 用户选择链支持图表类型
- **THEN** 柱状图清晰展示各预言机支持的链数量
- **AND** 悬停时显示详细数据（链数、协议数、市场份额）
- **AND** 表格视图下数据列对齐，易于阅读

## MODIFIED Requirements
### Requirement: 页面布局优化
**Current**: 统计卡片使用网格布局，但样式较为简单
**Modified**: 
- 统计卡片采用更现代的设计风格
- 增加图标背景和颜色区分
- 数值字体加粗加大，标签字体缩小
- 变化趋势显示在卡片右上角

### Requirement: 图表切换交互
**Current**: 同时存在下拉选择器和图标按钮两种切换方式
**Modified**:
- 统一为标签页式切换
- 移除重复的下拉选择器
- 保留图标+文字的组合按钮
- 增加平滑的切换动画

## REMOVED Requirements
### Requirement: 重复的下拉选择器
**Reason**: 与图标按钮功能重复，造成界面混乱
**Migration**: 完全移除下拉选择器，仅保留图标按钮组
