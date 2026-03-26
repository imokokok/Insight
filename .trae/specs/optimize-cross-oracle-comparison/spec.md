# 多预言机对比页面优化规范

## Why

当前多预言机对比页面（cross-oracle）在视觉层次、数据可视化专业性、交互体验等方面存在不足，影响用户数据分析的效率和平台专业形象。需要按照金融数据分析平台的最佳实践进行全面优化，提升用户体验和数据可信度。

## What Changes

- 重构页面头部信息架构，优化视觉层次
- 增强统计卡片组件，添加趋势指示和 Sparkline 图表
- 改进数据可视化，添加异常高亮和置信度展示
- 优化表格交互，添加排序反馈和条件格式
- 改进移动端适配，确保响应式体验
- 添加数据质量指标展示
- 优化图表颜色对比度和可访问性

## Impact

- Affected specs: 多预言机对比页面（cross-oracle）
- Affected code:
  - src/app/[locale]/cross-oracle/components/
  - src/components/comparison/
  - src/components/ui/ (新增/修改组件)
  - src/i18n/messages/ (国际化文本)

## ADDED Requirements

### Requirement: 页面头部信息架构重构

The system SHALL provide 清晰的信息层次结构：

#### Scenario: 头部布局优化

- **WHEN** 用户访问多预言机对比页面
- **THEN** 头部区域应显示：
  1. Live 状态徽章（带脉冲动画）
  2. 交易对主信息（大字显示价格，小字显示变化率）
  3. 关键指标摘要（Oracle数量、数据质量、更新时间）
  4. 数据质量评分卡片

### Requirement: 增强统计卡片组件

The system SHALL provide 专业的统计卡片组件：

#### Scenario: StatCard 功能

- **WHEN** 展示统计数据
- **THEN** 卡片应显示：
  - 标题和图标
  - 当前数值（大字突出）
  - 变化率和趋势（带颜色指示）
  - 24小时 Sparkline 趋势图
  - 置信度指示器（进度条形式）
  - 悬停效果显示详细信息

### Requirement: 数据异常高亮

The system SHALL provide 数据偏离警告机制：

#### Scenario: 异常检测显示

- **WHEN** 某个预言机价格偏离平均值超过阈值
- **THEN** 系统应：
  - 在表格中高亮显示异常行（黄色/红色背景）
  - 显示偏离百分比和方向
  - 添加警告图标
  - 在图表中标记异常点

### Requirement: 表格交互优化

The system SHALL provide 直观的排序和筛选体验：

#### Scenario: 排序反馈

- **WHEN** 用户点击表头排序
- **THEN** 应显示：
  - 当前排序字段高亮
  - 排序方向图标（↑↓）
  - 排序优先级指示

#### Scenario: 条件格式

- **WHEN** 表格展示数据
- **THEN** 应根据数值应用条件格式：
  - 正偏离显示绿色渐变
  - 负偏离显示红色渐变
  - 偏离越大颜色越深

### Requirement: 数据质量指标展示

The system SHALL provide 数据质量可视化：

#### Scenario: 质量评分卡片

- **WHEN** 展示数据质量
- **THEN** 应显示：
  - 新鲜度评分（最后更新时间）
  - 完整度评分（成功率）
  - 可靠性评分（历史准确率）
  - 综合质量仪表盘

### Requirement: 移动端适配优化

The system SHALL provide 良好的移动端体验：

#### Scenario: 响应式布局

- **WHEN** 用户在移动设备访问
- **THEN** 页面应：
  - 统计卡片垂直堆叠
  - 表格支持横向滚动
  - 图表自适应宽度
  - 控制面板可折叠

### Requirement: 图表可访问性优化

The system SHALL provide 高对比度的图表配色：

#### Scenario: 颜色对比度

- **WHEN** 渲染图表
- **THEN** 应确保：
  - 颜色对比度符合 WCAG AA 标准
  - 支持色盲友好配色
  - 提供图案填充选项
  - 添加图例交互

## MODIFIED Requirements

### Requirement: OracleComparisonView 组件重构

**Current**: 简单的统计展示和基础图表
**Modified**: 专业的数据对比视图，包含异常检测、趋势分析、质量评估

### Requirement: StatsSection 组件重构

**Current**: 信息密度过高，缺乏层次
**Modified**: 清晰的信息架构，主次分明的指标展示

### Requirement: 表格组件增强

**Current**: 基础表格，简单排序
**Modified**: 条件格式、异常高亮、交互式排序

## REMOVED Requirements

### Requirement: 简化统计展示

**Reason**: 需要更专业的数据展示
**Migration**: 使用新的增强统计组件
