# 市场概览页面 UI 优化 Spec

## Why
市场概览页面中，市场份额(pie)和链支持(bar)等核心功能的切换方式不够直观，图表显示效果也有改进空间。用户需要更清晰、更流畅的数据可视化体验。

## What Changes
- 优化图表类型切换控件的布局和交互
- 改进市场份额饼图(pie)的视觉呈现
- 优化链支持柱状图(bar)的显示效果
- 统一图表/表格视图切换的样式
- 提升整体视觉层次和信息密度

## Impact
- Affected specs: 无
- Affected code: 
  - `src/app/market-overview/page.tsx`
  - `src/app/market-overview/components/ChartRenderer.tsx`
  - `src/app/market-overview/constants.ts`

## ADDED Requirements

### Requirement: 图表切换控件优化
The system SHALL provide 更直观的图表类型切换方式

#### Scenario: 切换图表类型
- **GIVEN** 用户在市场概览页面
- **WHEN** 用户需要切换不同图表视图
- **THEN** 控件应该清晰展示当前选中状态，并提供流畅的切换动画

### Requirement: 市场份额饼图优化
The system SHALL 提供更清晰的市场份额可视化

#### Scenario: 查看市场份额
- **GIVEN** 用户选择市场份额视图
- **WHEN** 饼图渲染时
- **THEN** 应该显示清晰的标签、百分比和悬停交互效果

### Requirement: 链支持柱状图优化
The system SHALL 提供更直观的链支持对比

#### Scenario: 查看链支持
- **GIVEN** 用户选择链支持视图
- **WHEN** 柱状图渲染时
- **THEN** 应该清晰展示各预言机支持的链数量对比

## MODIFIED Requirements
无

## REMOVED Requirements
无
