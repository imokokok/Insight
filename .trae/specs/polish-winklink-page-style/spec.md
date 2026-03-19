# WINkLink 页面样式优化 Spec

## Why
WINkLink 作为 TRON 生态的预言机，具有独特的游戏和 DeFi 特色。当前页面虽然功能完整，但在视觉层次、品牌一致性、交互体验等方面还有优化空间。本次优化将在保持现有 Dune 风格的基础上，适度提升页面的专业感和用户体验。

## What Changes
- **统计卡片布局优化**: 将 7 列统计卡片调整为更合理的 4 列布局，与 Chainlink 页面保持一致
- **主题色统一**: 强化粉色主题色的运用，提升品牌识别度
- **面板视觉层次优化**: 调整 DashboardCard 的间距、边框和背景，增强可读性
- **图标风格统一**: 将内联 SVG 替换为 Lucide 图标，保持与其他页面一致
- **数据展示优化**: 改进数字格式化和标签对齐
- **交互细节优化**: 添加悬停效果、过渡动画等微交互

## Impact
- 受影响文件:
  - `src/app/[locale]/winklink/page.tsx`
  - `src/components/oracle/panels/WINkLinkStakingPanel.tsx`
  - `src/components/oracle/panels/WINkLinkGamingDataPanel.tsx`
  - `src/components/oracle/panels/WINkLinkTRONEcosystemPanel.tsx`
  - `src/components/oracle/panels/WINkLinkRiskPanel.tsx`

## ADDED Requirements

### Requirement: 统计卡片布局统一
The system SHALL 将 WINkLink 页面的统计卡片从 7 列调整为 4 列布局，与 Chainlink 页面保持一致。

#### Scenario: 页面加载
- **WHEN** 用户访问 WINkLink 页面
- **THEN** 统计卡片显示为 4 列网格布局
- **AND** 卡片样式与 Chainlink 页面的 StatCard 一致

### Requirement: 主题色强化
The system SHALL 在 WINkLink 页面中统一使用粉色系主题色。

#### Scenario: 视觉识别
- **WHEN** 用户浏览 WINkLink 页面
- **THEN** 关键元素（图标、高亮、标签）使用粉色系
- **AND** 粉色使用与品牌一致的色调

### Requirement: Lucide 图标统一
The system SHALL 将 WINkLink 页面中的内联 SVG 图标替换为 Lucide 图标。

#### Scenario: 图标展示
- **WHEN** 页面渲染统计卡片和面板
- **THEN** 使用 Lucide 图标库中的图标
- **AND** 图标风格与其他预言机页面保持一致

## MODIFIED Requirements

### Requirement: 页面布局优化
**当前实现**: 7 列统计卡片网格
**修改后**: 4 列统计卡片网格，与 Chainlink 页面一致

### Requirement: 面板样式优化
**当前实现**: 基础 DashboardCard 样式
**修改后**: 
- 添加一致的间距和边框
- 优化标题和内容的视觉层次
- 改进数据展示的对齐方式

## REMOVED Requirements
无
