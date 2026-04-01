# 市场概览侧边栏卡片融合优化 Spec

## Why

当前市场概览页面的侧边栏中，"市场集中度"和"增长最快"这两个功能分别放在两个独立的卡片中，导致卡片之间留白过多，信息密度较低。通过将这两个功能融合到一个大的卡片中，可以减少留白，提高信息展示效率，让用户在一屏内看到更多关键信息。

## What Changes

- 将"市场集中度"和"增长最快 (24h)"两个独立卡片融合为一个统一的"市场洞察"卡片
- 移除两个卡片之间的冗余间距和重复的边框
- 使用内部分区方式展示两个功能模块，保持视觉层次清晰
- 保持原有功能逻辑和数据展示不变
- 优化整体布局，减少留白，提升信息密度

## Impact

- Affected specs: 无
- Affected code:
  - `/src/app/[locale]/market-overview/components/MarketSidebar.tsx`
  - 相关样式文件

## ADDED Requirements

### Requirement: 市场洞察卡片融合

The system SHALL provide a unified market insights card that combines market concentration and top gainers.

#### Scenario: 融合卡片展示

- **WHEN** 用户访问市场概览页面
- **THEN** 侧边栏显示一个统一的"市场洞察"卡片
- **AND** 卡片内部分为两个区域：市场集中度区域和增长最快区域
- **AND** 两个区域之间使用分隔线或间距区分
- **AND** 整体卡片只有一个边框和圆角

#### Scenario: 市场集中度区域

- **WHEN** 市场集中度数据加载完成
- **THEN** 显示前4名份额百分比和进度条
- **AND** 显示集中度等级标签
- **AND** 显示前4名预言机列表及其份额

#### Scenario: 增长最快区域

- **WHEN** 增长数据加载完成
- **THEN** 显示24小时内增长最快的3个预言机
- **AND** 每个预言机显示排名、名称、颜色标识和增长率

## MODIFIED Requirements

无

## REMOVED Requirements

无
