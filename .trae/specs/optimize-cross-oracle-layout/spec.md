# 跨预言机比较页面布局优化 Spec

## Why
跨预言机比较页面目前在一个长页面中展示了过多的功能模块（15+个组件），包括统计卡片、价格表格、多种图表、快照管理、性能分析等。这导致：
1. 页面过长，用户需要大量滚动才能看到所有内容
2. 信息密度过高，用户难以快速找到需要的功能
3. 部分高级分析功能与核心价格比较功能混在一起，主次不分
4. 移动端体验较差，小屏幕下内容堆叠严重

## What Changes
- **新增**: 标签页导航系统，将页面内容按功能分组
- **新增**: 核心概览标签页 - 包含最重要的价格比较信息
- **新增**: 图表分析标签页 - 整合所有可视化图表
- **新增**: 快照与对比标签页 - 快照管理和历史对比功能
- **新增**: 性能分析标签页 - 延迟、稳定性、排名等深度分析
- **修改**: 优化默认显示内容，优先展示核心价格数据
- **修改**: 保留浮动操作按钮，确保核心操作始终可访问

## Impact
- Affected specs: enhance-cross-oracle-interaction
- Affected code: 
  - src/app/cross-oracle/page.tsx
  - src/app/cross-oracle/components/（可能需要新增标签容器组件）

## ADDED Requirements

### Requirement: 标签页导航系统
The system SHALL provide a tab-based navigation system to organize page content.

#### Scenario: 标签切换
- **GIVEN** 用户在跨预言机比较页面
- **WHEN** 用户点击不同的标签页
- **THEN** 页面显示对应标签的内容，其他标签内容隐藏
- **AND** 当前激活的标签有视觉高亮标识

#### Scenario: 标签状态保持
- **GIVEN** 用户已经切换到某个标签页
- **WHEN** 用户刷新页面或返回页面
- **THEN** 系统 SHALL 记住用户最后选择的标签（通过 localStorage）

#### Scenario: 移动端标签适配
- **GIVEN** 用户在移动设备上访问
- **WHEN** 页面加载时
- **THEN** 标签导航支持横向滑动，确保所有标签可访问

### Requirement: 核心概览标签页
The system SHALL provide a "核心概览" tab containing the most essential price comparison information.

#### Scenario: 核心内容显示
- **GIVEN** 用户打开核心概览标签
- **THEN** 页面显示：
  - 数据质量评分卡（DataQualityScoreCard）
  - 统计卡片（StatsCards/MobileStatsCards）
  - 当前价格比较表格（PriceTable）
  - 价格趋势图表（主要趋势图）

### Requirement: 图表分析标签页
The system SHALL provide a "图表分析" tab containing all visualization charts.

#### Scenario: 图表内容显示
- **GIVEN** 用户打开图表分析标签
- **THEN** 页面显示：
  - 价格趋势图表（详细版，带更多控制选项）
  - 价格偏差热力图（PriceDeviationHeatmap）
  - 价格分布箱线图（PriceDistributionBoxPlot）
  - 价格波动率图表（PriceVolatilityChart）

### Requirement: 快照与对比标签页
The system SHALL provide a "快照与对比" tab for snapshot management and comparison.

#### Scenario: 快照功能显示
- **GIVEN** 用户打开快照与对比标签
- **THEN** 页面显示：
  - 快照管理器（SnapshotManager）
  - 快照对比视图（SnapshotComparison）
  - 保存快照按钮（从浮动按钮移至此处或保留两者）

### Requirement: 性能分析标签页
The system SHALL provide a "性能分析" tab for advanced performance metrics.

#### Scenario: 性能内容显示
- **GIVEN** 用户打开性能分析标签
- **THEN** 页面显示：
  - 延迟分布直方图（LatencyDistributionHistogram）
  - 预言机性能摘要
  - 价格相关性矩阵（PriceCorrelationMatrix）
  - 预言机性能排名（OraclePerformanceRanking）

### Requirement: 异常值提示全局显示
The system SHALL display outlier warnings globally regardless of active tab.

#### Scenario: 异常值提示位置
- **GIVEN** 页面存在异常值
- **WHEN** 用户在任何标签页
- **THEN** 异常值提示条显示在页面顶部（标题下方）
- **AND** 点击"查看详情"自动切换到核心概览标签并高亮异常行

## MODIFIED Requirements

### Requirement: 页面标题和操作栏
**Current**: 所有操作按钮（筛选、导出、刷新）都在标题栏
**Modified**: 
- 筛选器保留在标题栏（影响所有标签）
- 刷新按钮保留在标题栏
- 导出按钮移至浮动操作按钮或各标签页内
- 自动刷新设置移至浮动操作按钮菜单

### Requirement: 浮动操作按钮
**Current**: 包含刷新、导出CSV/JSON/Excel、返回顶部
**Modified**:
- 移除刷新功能（已在标题栏）
- 保留导出功能（根据当前标签导出相关内容）
- 保留返回顶部功能
- 添加"保存快照"功能（从快照标签页外移至此）

## REMOVED Requirements
无移除的功能，仅重新组织布局。
