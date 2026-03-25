# Chainlink 跨预言机分析功能优化规格

## Why

Chainlink 页面中的"跨预言机分析"功能当前设计过于简单，数据展示不够专业，且使用了卡片样式与其他 tab 不一致。需要提升数据密度，移除卡片样式，参照其他 tab 的扁平化设计风格，同时添加真正有用的数据分析功能。

## What Changes

### 1. 样式统一
- 移除所有卡片样式（阴影、圆角）
- 统一使用 `bg-slate-50/30` 背景色
- 使用细边框分隔区域
- 参照 ChartsTab 和 DataTab 的设计风格

### 2. OverviewTab 优化
- 核心指标区域：4 列紧凑网格展示关键数据
- 移除冗余的高级统计指标，只保留真正有用的：
  - 一致性评分
  - 平均价格
  - 最大价格差异
  - 数据点数量
- 价格对比图表与偏差分布并排显示
- 添加选中预言机标签列表

### 3. PriceComparisonTable 优化
- 保留核心列：预言机、价格、偏差
- 添加有用的列：
  - 置信度（带进度条）
  - 响应时间
  - 趋势指示器
- 移除 Z-Score 和置信区间（过于复杂，用户难以理解）
- 异常值高亮显示

### 4. DataTab 优化
- 保持现有的 3 个可折叠面板结构
- 优化表格样式，与其他 tab 一致

### 5. 新增实用功能
- 价格偏差预警（当偏差超过阈值时显示）
- 数据质量指示器
- 实时更新状态

## Impact

### 受影响文件
- `src/components/oracle/charts/CrossOracleComparison/OverviewTab.tsx`
- `src/components/oracle/charts/CrossOracleComparison/PriceComparisonTable.tsx`
- `src/components/oracle/charts/CrossOracleComparison/DataTab.tsx`

## ADDED Requirements

### Requirement: 样式统一
系统 SHALL 统一跨预言机分析功能的样式，与其他 tab 保持一致。

#### Scenario: 样式一致性
- **WHEN** 用户查看跨预言机分析功能
- **THEN** 界面风格与 ChartsTab、DataTab 保持一致
- **AND** 使用 `bg-slate-50/30` 背景
- **AND** 无卡片阴影和圆角

### Requirement: 数据密度提升
系统 SHALL 在有限空间内展示更多有用的数据。

#### Scenario: 核心指标展示
- **WHEN** 用户查看概览页面
- **THEN** 在 4 列网格中展示：一致性评分、平均价格、最大差异、数据点数
- **AND** 每个指标显示当前值和简要说明

#### Scenario: 价格对比表格
- **WHEN** 用户查看价格对比表格
- **THEN** 表格包含：预言机名称、价格、偏差、置信度、响应时间、趋势
- **AND** 置信度使用进度条可视化
- **AND** 异常值自动高亮

### Requirement: 实用功能
系统 SHALL 提供真正有用的数据分析功能。

#### Scenario: 偏差预警
- **WHEN** 某个预言机价格偏差超过 1%
- **THEN** 在页面顶部显示预警提示
- **AND** 列出所有异常预言机及其偏差值

#### Scenario: 数据质量指示
- **WHEN** 用户查看数据
- **THEN** 显示数据质量评分
- **AND** 显示数据更新时间和实时状态

## MODIFIED Requirements

### Requirement: OverviewTab 重构
**原需求**: 展示基础统计信息和图表
**修改后**:
- 使用扁平化布局，移除卡片样式
- 核心指标使用 4 列紧凑网格
- 移除 CV、SEM、IQR、偏度等过于复杂的指标
- 价格对比图表与偏差分布并排显示
- 添加选中预言机标签列表

### Requirement: PriceComparisonTable 重构
**原需求**: 展示价格对比数据
**修改后**:
- 移除 Z-Score 和置信区间列
- 保留核心列：预言机、价格、偏差、置信度、响应时间、趋势
- 置信度使用进度条可视化
- 异常值高亮显示
- 扁平化表格样式

## REMOVED Requirements

### Requirement: 复杂统计指标
**原因**: Z-Score、偏度、峰度等指标过于专业，普通用户难以理解
**迁移**: 移除这些指标，只保留直观易懂的数据

### Requirement: 卡片样式
**原因**: 与其他 tab 风格不一致
**迁移**: 全部改为扁平化设计
