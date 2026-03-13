# 市场概览页面重构规范

## Why
当前市场概览页面功能丰富但布局较为混乱，信息密度过高导致视觉疲劳。需要通过重新布局来提升用户体验，使页面更加专业、美观，同时保持所有现有功能不变。

## What Changes
- 重新设计页面整体布局结构，采用更清晰的视觉层次
- 优化关键指标统计栏的展示方式
- 重构图表控制区域，使其更加紧凑和易用
- 改进详情卡片和预言机列表的展示
- 优化风险指标、异常预警和价格预警的布局
- 改进导出配置和定时导出区域的布局
- 优化热门资产表格的展示
- 保持所有现有功能不变

## Impact
- 受影响文件:
  - `/src/app/market-overview/page.tsx` - 主页面布局重构
  - `/src/app/market-overview/components/` - 相关组件样式调整
- 用户体验提升: 更清晰的视觉层次、更合理的空间利用、更专业的视觉效果

## ADDED Requirements
### Requirement: 页面布局重构
The system SHALL provide a more professional and visually appealing layout for the market overview page.

#### Scenario: 页面头部区域
- **WHEN** 用户访问市场概览页面
- **THEN** 页面头部应包含面包屑导航、页面标题和操作按钮组
- **AND** 操作按钮应按功能分组，更加紧凑

#### Scenario: 关键指标统计栏
- **WHEN** 页面加载完成
- **THEN** 关键指标应以卡片网格形式展示，每个指标包含图标、标签和数值
- **AND** 指标卡片应有悬停效果，提升交互体验

#### Scenario: 图表控制区域
- **WHEN** 用户查看图表
- **THEN** 图表类型切换应以标签页或下拉菜单形式呈现，节省空间
- **AND** 时间范围选择、对比模式等控制项应合理分组

#### Scenario: 主内容区域
- **WHEN** 用户浏览主内容
- **THEN** 图表和详情面板应采用更合理的网格布局
- **AND** 预言机详情卡片应更紧凑，信息层次更清晰

#### Scenario: 功能模块区域
- **WHEN** 用户查看风险指标、异常预警、价格预警
- **THEN** 这三个模块应采用统一的卡片样式
- **AND** 导出配置和定时导出应采用并排布局

#### Scenario: 资产列表区域
- **WHEN** 用户查看热门资产
- **THEN** 表格应有更好的表头样式和行悬停效果
- **AND** 表格应支持横向滚动，适应移动端

## MODIFIED Requirements
### Requirement: 保持现有功能
The system SHALL maintain all existing functionality including:
- 所有图表类型（市场份额、TVS趋势、链支持、链分布、协议、资产类别、多预言机对比、行业基准、相关性）
- 所有交互功能（图表联动、对比模式、异常检测、置信区间）
- 所有数据导出功能（CSV、JSON、图片导出）
- 所有实时功能（WebSocket连接、自动刷新）
- 所有预警功能（价格预警、异常预警）
- 所有配置功能（导出配置、定时导出）

## REMOVED Requirements
无功能移除，仅布局调整。
