# Pyth Network 页面交互优化 Spec

## Why
作为专业预言机数据分析平台，Pyth Network 页面已有基础可视化功能，但缺少针对专业用户的**关键预警机制**和**数据质量评估**功能。需要在不过度复杂化的前提下，提升平台对异常情况的感知能力和数据洞察深度。

## What Changes
- 新增置信区间实时预警组件
- 新增 Publisher 异常检测与预警功能
- 新增数据质量综合评分面板
- 新增价格更新延迟趋势图
- 优化价格流组件，添加关键指标快捷筛选

## Impact
- Affected specs: Pyth Network 页面数据展示能力
- Affected code:
  - `src/components/oracle/PriceStream.tsx`
  - `src/components/oracle/PublisherAnalysisPanel.tsx`
  - `src/components/oracle/ConfidenceIntervalChart.tsx`
  - 新增组件: `ConfidenceAlertPanel.tsx`, `DataQualityScorePanel.tsx`, `LatencyTrendChart.tsx`

## ADDED Requirements

### Requirement: 置信区间实时预警
系统应在置信区间出现异常时及时预警，帮助专业用户快速识别数据质量问题。

#### Scenario: 置信区间突然扩大预警
- **WHEN** 置信区间宽度在短时间内（如5分钟）扩大超过50%
- **THEN** 系统显示预警通知，提示可能存在市场波动或数据源异常

#### Scenario: 置信区间持续高位预警
- **WHEN** 置信区间宽度连续10分钟以上超过阈值（如0.3%）
- **THEN** 系统显示持续异常预警，建议用户谨慎使用该价格数据

### Requirement: Publisher 异常检测
系统应监控各 Publisher 的价格偏差，及时发现异常数据源。

#### Scenario: Publisher 价格偏差异常
- **WHEN** 某个 Publisher 的价格偏差超过平均偏差的2倍标准差
- **THEN** 系统高亮显示该 Publisher，并在 Publisher 列表中标记异常状态

#### Scenario: Publisher 响应延迟异常
- **WHEN** 某个 Publisher 的响应延迟突然增加超过历史平均值的2倍
- **THEN** 系统显示延迟预警，提示该 Publisher 可能存在连接问题

### Requirement: 数据质量综合评分
系统应提供基于多维度指标的数据质量综合评分，帮助用户快速评估数据可靠性。

#### Scenario: 数据质量评分展示
- **WHEN** 用户查看 Pyth Network 市场数据面板
- **THEN** 系统显示综合数据质量评分（0-100分），包含置信区间质量、Publisher 可靠性、更新延迟、跨链一致性等维度

#### Scenario: 数据质量下降预警
- **WHEN** 数据质量评分从"优秀"降至"良好"或更低
- **THEN** 系统显示质量下降趋势，并提示用户关注具体下降维度

### Requirement: 价格更新延迟趋势
系统应展示价格更新的延迟趋势，帮助用户了解 Pyth 的实时性能。

#### Scenario: 延迟趋势图展示
- **WHEN** 用户查看网络标签页
- **THEN** 系统显示过去1小时的延迟趋势图，标注延迟峰值和平均值

#### Scenario: 延迟异常预警
- **WHEN** 延迟超过正常范围（如 >200ms）
- **THEN** 系统在趋势图中高亮显示异常时段

### Requirement: 关键指标快捷筛选
系统应允许用户快速筛选和关注特定指标，提升专业用户效率。

#### Scenario: 指标筛选
- **WHEN** 用户点击价格流组件中的筛选按钮
- **THEN** 系统显示筛选面板，允许用户选择关注的资产、置信区间阈值、预警条件等

#### Scenario: 快捷预警设置
- **WHEN** 用户设置置信区间预警阈值
- **THEN** 系统保存用户偏好，并在后续访问时应用该设置

## MODIFIED Requirements

### Requirement: PriceStream 组件增强
现有 PriceStream 组件应增加预警和筛选功能。

#### Scenario: 价格流预警显示
- **WHEN** 价格流中出现置信区间异常
- **THEN** 在价格流表格中高亮显示该条记录，并显示预警图标

#### Scenario: 价格流筛选
- **WHEN** 用户设置筛选条件（如只显示置信区间 > 0.2% 的记录）
- **THEN** 价格流表格只显示符合条件的记录

## REMOVED Requirements
无移除的需求。
