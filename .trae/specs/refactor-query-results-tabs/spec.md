# 多预言机对比页面查询结果 Tab 重构 Spec

## Why

当前多预言机对比页面的查询结果区域将价格对比、数据质量检测、风险预警三个功能以垂直堆叠的方式展示，导致：

1. 信息密度过高，用户难以快速定位关注的内容
2. 页面过长，需要大量滚动才能查看完整信息
3. 三个核心功能没有清晰的视觉分隔，用户认知负担重
4. 部分信息展示冗余，存在为了展示而展示的数据

通过 Tab 切换的方式重新组织这三个功能，可以显著提升用户体验和信息获取效率。

## What Changes

- **新增 Tab 导航**：在查询结果卡片顶部添加 Tab 切换栏，包含三个 Tab：
  - 价格对比 (Price Comparison)
  - 数据质量 (Data Quality)
  - 风险预警 (Risk Alert)
- **优化价格对比 Tab**：精简展示内容，保留核心的价格表格和趋势图，移除冗余统计指标
- **优化数据质量 Tab**：整合质量评分、一致性/新鲜度/完整性分析，增加可视化图表
- **优化风险预警 Tab**：突出异常预警信息，优化风险等级展示，增加处理建议
- **移除冗余信息**：删除重复展示的数据，避免为了添加而添加的无用信息
- **增加必要图标**：为关键数据和状态增加直观的图标标识

## Impact

- Affected specs: cross-oracle 页面查询结果展示区域
- Affected code:
  - `src/app/[locale]/cross-oracle/components/QueryResults.tsx`
  - `src/app/[locale]/cross-oracle/components/tabs/PriceComparisonTab.tsx`
  - `src/app/[locale]/cross-oracle/components/tabs/QualityAnalysisTab.tsx`
  - `src/app/[locale]/cross-oracle/components/RiskAlertDashboard.tsx`
  - 新增 `src/app/[locale]/cross-oracle/components/TabContentSwitcher.tsx`
  - 相关国际化文案文件

## ADDED Requirements

### Requirement: Tab 切换导航

The system SHALL 在查询结果卡片顶部提供 Tab 切换功能

#### Scenario: 用户切换 Tab

- **GIVEN** 查询结果已加载
- **WHEN** 用户点击 Tab 切换按钮
- **THEN** 显示对应的功能内容
- **AND** Tab 按钮显示当前激活状态
- **AND** 切换时有平滑的过渡动画

#### Scenario: 默认 Tab 选择

- **GIVEN** 页面首次加载或新查询执行
- **THEN** 默认显示"价格对比" Tab

### Requirement: 价格对比 Tab 优化

The system SHALL 在价格对比 Tab 中展示核心的价格对比信息

#### Scenario: 查看价格对比

- **GIVEN** 用户在价格对比 Tab
- **THEN** 显示价格对比表格（含偏差标记）
- **AND** 显示价格趋势图
- **AND** 显示关键统计指标（中位数、区间、偏差率）
- **AND** 不显示冗余的复杂统计指标

### Requirement: 数据质量 Tab 优化

The system SHALL 在数据质量 Tab 中展示综合的数据质量评估

#### Scenario: 查看数据质量

- **GIVEN** 用户在数据质量 Tab
- **THEN** 显示综合质量评分卡片
- **AND** 显示一致性/新鲜度/完整性三个维度的详细分析
- **AND** 使用进度条或仪表盘等可视化组件
- **AND** 显示改进建议（如有）
- **AND** 不重复显示价格对比 Tab 中已有的信息

### Requirement: 风险预警 Tab 优化

The system SHALL 在风险预警 Tab 中突出展示异常检测信息

#### Scenario: 查看风险预警

- **GIVEN** 用户在风险预警 Tab
- **THEN** 显示风险等级分布（高/中/低）
- **AND** 显示异常预言机列表及详细信息
- **AND** 显示最大偏差值和风险原因
- **AND** 提供处理建议或查看详情的入口
- **AND** 无异常时显示安全状态提示

### Requirement: 图标和视觉优化

The system SHALL 为关键信息和状态添加直观的图标

#### Scenario: 识别状态和信息

- **GIVEN** 用户浏览查询结果
- **THEN** 风险等级使用对应颜色的警示图标
- **AND** 数据质量使用盾牌/对勾等图标
- **AND** 价格趋势使用图表相关图标
- **AND** 状态变化使用动画效果（如脉冲）

## MODIFIED Requirements

### Requirement: QueryResults 组件重构

**原设计**: 垂直堆叠展示所有功能模块
**新设计**:

- 顶部添加 Tab 导航栏
- 内容区域根据选中 Tab 动态渲染
- 保持统一的卡片样式和头部信息

### Requirement: 信息展示精简

**原设计**: 展示大量统计指标和详细信息
**新设计**:

- 价格对比 Tab：只保留中位数、价格区间、偏差率、一致性评级
- 移除：加权均价、标准差、方差等复杂指标
- 数据质量 Tab：合并重复的质量评分展示
- 风险预警 Tab：精简异常列表，突出关键信息

## REMOVED Requirements

### Requirement: 冗余统计指标

**Reason**: 部分统计指标过于专业，普通用户使用率低，且增加了认知负担
**Migration**: 专业分析需求可通过数据导出后使用专业工具

### Requirement: 重复的质量评分展示

**Reason**: 原设计中质量评分在多个位置重复展示
**Migration**: 统一在数据质量 Tab 中展示
