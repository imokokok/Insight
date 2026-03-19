# 市场概览页面样式优化规格

## Why
市场概览页面目前的基础架构已经比较完善（使用了 `bg-dune` 背景和卡片式布局），但在视觉细节和用户体验方面仍有提升空间：
1. MarketStats 区域目前缺乏视觉焦点，所有统计项平铺直叙
2. 卡片间的层次感和空间节奏可以进一步优化
3. 交互反馈（hover 状态、选中状态）可以更加细腻
4. 与首页 BentoMetricsGrid 的精致程度相比，市场概览页面略显朴素

## What Changes
- **优化**: MarketStats 统计区域增加视觉层次，突出核心指标（TVS）
- **优化**: 卡片容器增加微妙的 hover 效果和过渡动画
- **优化**: 图表区域和侧边栏的视觉权重分配
- **优化**: 资产表格的表头和行 hover 效果
- **优化**: 整体间距和留白节奏
- **影响范围**: `/src/app/[locale]/market-overview/` 目录下的组件

## Impact
- Affected specs: 市场概览页面视觉设计
- Affected code: 
  - `src/app/[locale]/market-overview/page.tsx`
  - `src/app/[locale]/market-overview/components/MarketStats.tsx`
  - `src/app/[locale]/market-overview/components/MarketHeader.tsx`
  - `src/app/[locale]/market-overview/components/ChartContainer.tsx`
  - `src/app/[locale]/market-overview/components/MarketSidebar.tsx`
  - `src/app/[locale]/market-overview/components/AssetsTable.tsx`

## ADDED Requirements
### Requirement: 统计区域视觉层次
The system SHALL provide visual hierarchy for market statistics with emphasized primary metric.

#### Scenario: TVS 作为主要指标突出显示
- **WHEN** 渲染 MarketStats 组件
- **THEN** TVS 统计项应该有更强的视觉权重（更大的字号或特殊背景）
- **AND** 其他统计项保持统一的次要视觉层级

#### Scenario: 统计项 hover 效果
- **WHEN** 用户 hover 在统计项上
- **THEN** 应该有微妙的背景色变化反馈

### Requirement: 卡片容器交互优化
The system SHALL provide subtle interaction feedback for card containers.

#### Scenario: 卡片 hover 效果
- **WHEN** 用户 hover 在卡片容器上
- **THEN** 边框颜色应该有微妙变化（过渡到更深的灰色）
- **AND** 应该有平滑的过渡动画（200-300ms）

#### Scenario: 卡片间距节奏
- **WHEN** 页面布局渲染
- **THEN** 主要卡片区块之间保持一致的 24px (gap-6) 间距
- **AND** 卡片内部保持适当的留白（p-6）

### Requirement: 资产表格视觉优化
The system SHALL provide refined visual styling for the assets table.

#### Scenario: 表格行 hover 效果
- **WHEN** 用户 hover 在表格行上
- **THEN** 背景色应该有平滑的过渡效果
- **AND** 当前行的数据应该更加突出

#### Scenario: 表头样式
- **WHEN** 渲染表格表头
- **THEN** 应该有清晰的视觉分隔（底部边框）
- **AND** 文字样式应该与表格内容有明显区分

### Requirement: 图表区域标签优化
The system SHALL provide improved tab navigation styling.

#### Scenario: 标签切换视觉反馈
- **WHEN** 用户切换图表类型标签
- **THEN** 激活状态应该有明确的视觉指示（底部边框 + 文字颜色变化）
- **AND** 标签之间的分隔应该清晰但不突兀

## MODIFIED Requirements
### Requirement: 保持现有功能
All existing functionality SHALL remain unchanged after the visual optimization.

#### Scenario: 功能完整性
- **WHEN** 视觉样式更新后
- **THEN** 所有交互功能（图表切换、数据刷新、导出等）应正常工作
- **AND** 响应式布局应保持不变
- **AND** 性能不应有明显下降
