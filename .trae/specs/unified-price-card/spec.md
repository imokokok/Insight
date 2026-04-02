# 统一价格信息卡片展示 Spec

## Why
当前价格查询页面的右侧结果区域使用了多个独立的卡片展示信息（价格详情卡片、统计网格、价格图表等），视觉上显得分散且不够统一。用户希望将所有相关信息整合到一个大的卡片中，以获得更集中、更美观的信息展示效果。

## What Changes
- 创建一个新的统一卡片组件，整合所有价格相关信息
- 将当前价格、统计数据、价格图表整合到单一卡片中
- 保持数据源和导出功能在卡片外部
- **BREAKING**: 移除独立的 StatsGrid 展示，将其数据整合到统一卡片中

## Impact
- Affected specs: 价格查询页面展示逻辑
- Affected code: 
  - QueryResults.tsx - 主要重构目标
  - StatsGrid.tsx - 可能作为内部组件使用
  - PriceChart.tsx - 需要适配新的容器

## ADDED Requirements
### Requirement: 统一价格信息卡片
The system SHALL provide a unified card component that displays all price-related information in a cohesive layout.

#### Scenario: 成功展示价格信息
- **WHEN** 用户完成价格查询
- **THEN** 系统展示一个包含当前价格、统计数据、价格图表的统一卡片
- **AND** 卡片具有清晰的视觉层次和美观的样式

## MODIFIED Requirements
### Requirement: QueryResults 组件重构
The system SHALL reorganize the QueryResults component to use a unified card layout.

#### Scenario: 整合展示
- **WHEN** 查询结果返回
- **THEN** 当前价格、统计数据、图表在同一个卡片中展示
- **AND** 数据源和导出功能保持在卡片外部

## REMOVED Requirements
### Requirement: 独立统计网格展示
**Reason**: 统计数据将整合到统一卡片中
**Migration**: StatsGrid 组件将作为内部组件或数据展示方式整合
