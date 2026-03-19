# 市场概览页面背景色优化规格

## Why
市场概览页面目前使用与其他页面不同的背景色设计（白色背景），而 cross-oracle、price-query 等其他页面使用 `bg-dune` (#fafafa) 作为页面背景色。这种不一致导致：
1. 用户体验不统一，页面间切换有视觉跳跃感
2. 市场概览页面的组件没有卡片化的视觉层次，内容融入背景中难以区分
3. 与其他页面的设计语言不一致

## What Changes
- **修改**: 为市场概览页面添加 `bg-dune` 背景色，与其他页面保持一致
- **修改**: 为市场概览页面的主要内容区块添加卡片式容器（白色背景、边框），提升视觉层次感
- **修改**: 优化 MarketStats、ChartContainer、MarketSidebar、AssetsTable 等组件的容器样式
- **影响范围**: `/src/app/[locale]/market-overview/page.tsx` 及其相关组件

## Impact
- Affected specs: 市场概览页面视觉设计
- Affected code: 
  - `src/app/[locale]/market-overview/page.tsx`
  - `src/app/[locale]/market-overview/components/MarketStats.tsx`
  - `src/app/[locale]/market-overview/components/ChartContainer.tsx`
  - `src/app/[locale]/market-overview/components/MarketSidebar.tsx`
  - `src/app/[locale]/market-overview/components/AssetsTable.tsx`

## ADDED Requirements
### Requirement: 统一的页面背景色
The system SHALL provide consistent page background color across all pages.

#### Scenario: 页面背景统一
- **WHEN** 用户访问市场概览页面
- **THEN** 页面背景色应为 `bg-dune` (#fafafa)，与 cross-oracle、price-query 等页面一致

### Requirement: 卡片化内容容器
The system SHALL wrap main content sections in card-like containers for better visual hierarchy.

#### Scenario: 统计区域卡片化
- **WHEN** 渲染市场统计数据 (MarketStats)
- **THEN** 应显示在白色背景、带边框的卡片容器中

#### Scenario: 图表区域卡片化
- **WHEN** 渲染图表区域 (ChartContainer)
- **THEN** 应显示在白色背景、带边框的卡片容器中

#### Scenario: 侧边栏卡片化
- **WHEN** 渲染侧边栏 (MarketSidebar)
- **THEN** 应显示在白色背景、带边框的卡片容器中

#### Scenario: 资产表格卡片化
- **WHEN** 渲染资产表格 (AssetsTable)
- **THEN** 应显示在白色背景、带边框的卡片容器中

## MODIFIED Requirements
### Requirement: 保持原有功能
All existing functionality SHALL remain unchanged after the visual optimization.

#### Scenario: 功能完整性
- **WHEN** 背景色和容器样式更新后
- **THEN** 所有交互功能（图表切换、数据刷新、导出等）应正常工作
- **AND** 响应式布局应保持不变
