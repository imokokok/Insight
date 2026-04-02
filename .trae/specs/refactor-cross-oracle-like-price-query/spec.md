# 多预言机对比页面重构 - 参照价格查询布局 Spec

## Why
当前多预言机对比页面虽然已完成一次重构，但用户希望进一步将其布局调整为与价格查询页面类似的模式：左侧选择框、右侧查询结果。同时，查询结果需要聚焦于多预言机对比的核心定位：
1. 价格对比（多预言机间的价格差异）
2. 数据质量检测（各预言机数据质量评估）
3. 风险预警（价格异常、数据异常预警）

需要去除与套利相关的描述，让页面更符合"数据质量检测与风险预警平台"的定位。

## What Changes
- **布局调整**：采用价格查询页面的左右布局模式（左侧选择框 + 右侧查询结果）
- **查询结果重构**：右侧展示三大核心模块：价格对比、数据质量检测、风险预警
- **去除套利描述**：移除所有与套利相关的文案和功能描述
- **组件整合**：整合 RiskAlertDashboard、QualityDashboard、SimplePriceTable 到查询结果区域
- **页面结构简化**：去除 StatsOverview、StatsSection 等冗余组件

## Impact
- Affected files:
  - `src/app/[locale]/cross-oracle/page.tsx` - 重写布局结构
  - `src/app/[locale]/cross-oracle/components/QueryResults.tsx` - 新建查询结果组件
  - `src/app/[locale]/cross-oracle/components/ControlPanel.tsx` - 优化作为左侧选择框
  - `src/i18n/messages/` - 更新文案，去除套利相关描述

## ADDED Requirements

### Requirement: 查询结果组件 QueryResults
The system SHALL 提供统一的查询结果展示组件，整合三大核心功能

#### Scenario: 展示查询结果
- **GIVEN** 用户完成查询
- **THEN** 右侧展示统一的查询结果区域
- **AND** 包含风险预警、数据质量评分、价格对比三个模块
- **AND** 各模块按重要性排序展示

### Requirement: 风险预警模块
The system SHALL 在查询结果中 prominently 展示风险预警信息

#### Scenario: 检测异常
- **GIVEN** 检测到价格异常或数据异常
- **THEN** 在查询结果顶部显示风险预警卡片
- **AND** 显示异常数量、风险等级分布
- **AND** 不涉及任何套利建议

### Requirement: 数据质量检测模块
The system SHALL 展示各预言机的数据质量评分

#### Scenario: 展示质量评分
- **GIVEN** 查询结果已返回
- **THEN** 显示综合质量评分（大数字+环形图）
- **AND** 显示三个维度的分项评分（一致性、新鲜度、完整性）
- **AND** 提供改进建议

### Requirement: 价格对比模块
The system SHALL 简洁地展示多预言机价格对比

#### Scenario: 展示价格对比
- **GIVEN** 多预言机价格数据已返回
- **THEN** 显示中位数价格和价格区间
- **AND** 以表格展示各预言机价格及偏差
- **AND** 突出显示异常价格
- **AND** 不包含套利机会提示

## MODIFIED Requirements

### Requirement: 页面布局重构
**原设计**: StatsOverview + HeaderSection + StatsSection + ComparisonTabs
**新设计**:
1. **页面头部** - 简化版标题和描述
2. **主内容区域** - 左右布局
   - **左侧边栏**（固定宽度）- ControlPanel 选择框（币种、预言机、时间范围）
   - **右侧主区域** - QueryResults 查询结果
     - 风险预警模块（顶部）
     - 数据质量评分模块
     - 价格对比模块

### Requirement: 文案调整
**修改**:
- 移除所有"套利"相关文案
- 移除"套利机会"、"套利策略"等描述
- 聚焦于"数据质量"、"风险预警"、"价格对比"

### Requirement: 组件整合
**整合**:
- RiskAlertDashboard → 查询结果顶部
- QualityDashboard → 查询结果中部
- SimplePriceTable → 查询结果下部
- OracleComparisonMatrix → 查询结果底部（可选）

## REMOVED Requirements

### Requirement: StatsOverview 组件
**Reason**: 与新的查询结果布局重复
**Migration**: 功能整合到 QueryResults 的风险预警模块

### Requirement: StatsSection 组件
**Reason**: 统计信息过于复杂，与核心定位不符
**Migration**: 关键指标整合到 QueryResults 的各模块中

### Requirement: ComparisonTabs 组件
**Reason**: 单页展示更符合新的布局设计
**Migration**: 所有内容在 QueryResults 中顺序展示

### Requirement: 套利相关文案和功能
**Reason**: 与"数据质量检测与风险预警"定位不符
**Migration**: 完全移除，替换为风险预警描述
