# 市场概览页面 Dune 风格重设计 Spec

## Why
当前市场概览页面使用了过多的卡片样式、渐变和阴影，与其他页面的扁平化设计风格不一致。需要参考 Dune 的简洁扁平化设计，使市场概览页面与其他页面保持一致的视觉风格。

## What Changes
- 移除所有卡片的过度阴影和渐变效果
- 采用扁平化设计风格，使用简洁的边框和背景色
- 统一使用 rounded-lg 圆角，与跨链/跨预言机页面一致
- 简化关键指标统计栏，采用更简洁的展示方式
- 重构图表控制区域，使用更简洁的按钮样式
- 优化预言机列表的展示，移除卡片样式
- 统一风险指标、异常预警、价格预警的样式
- 简化导出配置和定时导出区域的样式
- 优化热门资产表格的样式

## Impact
- 受影响文件:
  - `/src/app/market-overview/page.tsx` - 主页面样式重构
- 用户体验提升: 更简洁、专业的视觉效果，与整体设计风格一致

## ADDED Requirements
### Requirement: Dune 风格扁平化设计
The system SHALL provide a flat, clean design consistent with other pages.

#### Scenario: 页面整体风格
- **WHEN** 用户访问市场概览页面
- **THEN** 页面应采用扁平化设计风格
- **AND** 使用简洁的边框代替阴影
- **AND** 使用纯色背景代替渐变
- **AND** 统一使用 rounded-lg 圆角

#### Scenario: 关键指标统计栏
- **WHEN** 页面加载完成
- **THEN** 关键指标应以简洁的卡片形式展示
- **AND** 使用纯色背景和简单边框
- **AND** 图标使用纯色背景（无渐变）

#### Scenario: 图表控制区域
- **WHEN** 用户查看图表
- **THEN** 控制按钮使用简洁的样式
- **AND** 使用 bg-gray-100 作为按钮背景
- **AND** 选中状态使用 bg-white 和简单边框

#### Scenario: 预言机列表
- **WHEN** 用户查看预言机详情
- **THEN** 列表项使用简洁的边框分隔
- **AND** 移除卡片阴影效果
- **AND** 使用悬停背景色代替阴影

## MODIFIED Requirements
### Requirement: 保持现有功能
The system SHALL maintain all existing functionality including:
- 所有图表类型和交互功能
- 所有数据导出功能
- 所有实时功能
- 所有预警功能
- 所有配置功能

## REMOVED Requirements
- 移除过度使用的阴影效果 (shadow-lg, shadow-xl)
- 移除渐变背景 (bg-gradient-to-br)
- 移除 rounded-2xl 圆角，统一使用 rounded-lg
