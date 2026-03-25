# Chainlink 页面样式重构规格

## Why
当前 Chainlink 页面的各个 Tab 使用了大量重复的卡片样式（bg-white border border-gray-200 rounded-lg），导致界面看起来单调、拥挤，缺乏层次感和现代感。需要通过更简洁、更有层次的设计来提升用户体验。

## What Changes
- **移除大量卡片边框**：改用更简洁的分隔方式
- **使用更现代的布局**：采用列表式、表格式、网格式等多样化布局
- **优化视觉层次**：通过字体大小、颜色深浅、间距来区分信息层级
- **减少圆角使用**：从大量使用 rounded-lg 改为更克制的圆角
- **增加留白**：让界面更通透，减少拥挤感

## Impact
- 受影响文件:
  - `src/app/[locale]/chainlink/components/ChainlinkMarketView.tsx`
  - `src/app/[locale]/chainlink/components/ChainlinkNetworkView.tsx`
  - `src/app/[locale]/chainlink/components/ChainlinkNodesView.tsx`
  - `src/app/[locale]/chainlink/components/ChainlinkDataFeedsView.tsx`
  - `src/app/[locale]/chainlink/components/ChainlinkServicesView.tsx`
  - `src/app/[locale]/chainlink/components/ChainlinkEcosystemView.tsx`
  - `src/app/[locale]/chainlink/components/ChainlinkRiskView.tsx`

## ADDED Requirements

### Requirement: Market Tab 样式重构
The system SHALL redesign Market Tab with cleaner, modern styling.

#### Scenario: 移除卡片堆砌
- **GIVEN** 当前 Market Tab 有大量卡片
- **WHEN** 重构后
- **THEN** 使用简洁的分隔线替代卡片边框
- **AND** 采用列表式布局展示统计数据
- **AND** 图表区域使用更克制的边框

### Requirement: Services Tab 样式重构
The system SHALL redesign Services Tab with modern, minimal styling.

#### Scenario: 服务展示优化
- **GIVEN** 当前 Services Tab 使用大量卡片展示5个服务
- **WHEN** 重构后
- **THEN** 使用图标+文字的简洁列表式布局
- **AND** 统计数据使用内联展示而非独立卡片
- **AND** 图表区域保持简洁

### Requirement: Ecosystem Tab 样式重构
The system SHALL redesign Ecosystem Tab with cleaner visual hierarchy.

#### Scenario: 统计数据展示优化
- **GIVEN** 当前使用多个 bg-gray-50 卡片展示统计
- **WHEN** 重构后
- **THEN** 使用纯文字+数字的简洁展示
- **AND** 通过字体大小和颜色区分层级
- **AND** 移除不必要的背景色块

### Requirement: 全局样式优化
The system SHALL apply consistent styling across all tabs.

#### Scenario: 统一的视觉语言
- **GIVEN** 所有 Tab 需要一致的样式
- **WHEN** 重构后
- **THEN** 使用统一的分隔线替代卡片边框
- **AND** 统一使用简洁的标题样式
- **AND** 统一间距和留白
