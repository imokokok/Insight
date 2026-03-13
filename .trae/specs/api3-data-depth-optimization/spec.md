# API3 页面数据深度优化规格

## Why

根据之前的专业分析，API3 页面在数据深度方面评分为 8.25/10（B+），主要不足在于：
1. 缺乏链上 Gas 费用对比
2. 缺乏高级价格波动性指标（ATR、布林带）
3. 缺乏数据质量历史趋势
4. 缺乏跨预言机对比

本优化旨在将这些高级分析功能集成到 API3 页面中，提升数据深度至行业领先水平。

## What Changes

- 在 API3 页面添加 Gas 费用对比组件
- 添加 ATR 平均真实波幅指标组件
- 添加布林带 (Bollinger Bands) 技术分析组件
- 添加数据质量历史趋势组件
- 添加跨预言机性能对比功能
- 扩展 API3Client 以支持新数据源

## Impact

- Affected specs: api3-data-depth-analysis
- Affected code: 
  - src/app/api3/API3PageContent.tsx
  - src/lib/oracles/api3.ts
  - src/components/oracle/ 相关组件

## ADDED Requirements

### Requirement: Gas 费用对比功能
系统 SHALL 在 API3 页面添加 Gas 费用对比功能。

#### Scenario: Gas 费用数据展示
- **WHEN** 用户查看 API3 页面
- **THEN** 应显示各链上更新 dAPI 的 Gas 费用对比
- **AND** 应提供每小时/每日/每月成本计算
- **AND** 应提供效率评分

#### Scenario: Gas 费用可视化
- **WHEN** 用户查看 Gas 费用分析
- **THEN** 应使用柱状图展示成本对比
- **AND** 应提供数据表格展示详细数值
- **AND** 应支持按时间范围筛选

### Requirement: ATR 波动性指标
系统 SHALL 在 API3 页面添加 ATR 平均真实波幅指标。

#### Scenario: ATR 数据计算
- **WHEN** 用户查看价格分析
- **THEN** 应计算并显示 ATR (14周期)
- **AND** 应显示 ATR 百分比
- **AND** 应提供波动等级评估（低/中/高/极高）

#### Scenario: ATR 可视化
- **WHEN** 用户查看 ATR 分析
- **THEN** 应显示价格与 ATR 通道图表
- **AND** 应显示 ATR 趋势图
- **AND** 应显示真实波幅 (TR) 柱状图

### Requirement: 布林带技术分析
系统 SHALL 在 API3 页面添加布林带技术分析。

#### Scenario: 布林带计算
- **WHEN** 用户查看技术分析
- **THEN** 应计算并显示布林带 (20周期, 2倍标准差)
- **AND** 应显示中轨 (SMA)、上轨、下轨
- **AND** 应检测挤压 (Squeeze) 和突破 (Breakout) 信号

#### Scenario: 布林带可视化
- **WHEN** 用户查看布林带分析
- **THEN** 应显示布林带价格通道图
- **AND** 应显示带宽百分比趋势
- **AND** 应显示价格位置系数

### Requirement: 数据质量历史趋势
系统 SHALL 在 API3 页面添加数据质量历史趋势分析。

#### Scenario: 质量评分历史
- **WHEN** 用户查看数据质量
- **THEN** 应显示质量评分历史趋势图
- **AND** 应显示更新延迟历史
- **AND** 应显示价格偏离历史
- **AND** 应显示心跳合规率历史

#### Scenario: 质量统计
- **WHEN** 用户查看质量分析
- **THEN** 应提供平均质量分、趋势方向
- **AND** 应显示异常率和过期率
- **AND** 应提供质量等级分布

### Requirement: 跨预言机对比
系统 SHALL 在 API3 页面添加与其他预言机的对比功能。

#### Scenario: 性能对比
- **WHEN** 用户查看对比分析
- **THEN** 应支持选择多个预言机进行对比
- **AND** 应对比响应时间、准确性、可用性
- **AND** 应提供综合性能评分

#### Scenario: 对比可视化
- **WHEN** 用户查看对比数据
- **THEN** 应使用雷达图展示多维度对比
- **AND** 应使用折线图展示历史对比
- **AND** 应提供排名展示

## MODIFIED Requirements

### Requirement: API3Client 扩展
系统 SHALL 扩展 API3Client 以支持新数据源。

#### Scenario: Gas 费用数据获取
- **WHEN** 调用 getGasFeeData 方法
- **THEN** 应返回各链 Gas 费用数据
- **AND** 应包含更新成本、频率、Gas价格

#### Scenario: 价格历史数据增强
- **WHEN** 调用 getHistoricalPrices 方法
- **THEN** 应返回包含 high/low/close 的完整 OHLC 数据
- **AND** 应支持更长的时间范围（最多90天）

#### Scenario: 质量历史数据
- **WHEN** 调用 getQualityHistory 方法
- **THEN** 应返回历史质量数据点
- **AND** 应包含延迟、偏离、异常值标记

## REMOVED Requirements

无移除需求。
