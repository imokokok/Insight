# UMA 页面数据可视化优化 Spec

## Why
基于 UMA 页面数据可视化专业分析，当前页面在验证者分析和争议机制方面覆盖全面，但在争议投票可视化、验证者收益归因、实时数据流等关键领域存在不足。本次优化旨在提升数据深度和实时性，增强平台专业竞争力。

## What Changes
- 新增争议投票分布可视化组件
- 新增验证者收益归因分析面板
- 新增实时数据流支持（WebSocket）
- 优化争议类型图标区分度
- 新增争议金额分布分析
- 新增评分算法透明度说明

## Impact
- Affected specs: uma-data-depth-assessment
- Affected code: 
  - src/components/oracle/DisputeResolutionPanel.tsx
  - src/components/oracle/ValidatorAnalyticsPanel.tsx
  - src/components/oracle/UMADataQualityScoreCard.tsx
  - src/lib/oracles/uma.ts
  - src/lib/realtime/websocket.ts

## ADDED Requirements

### Requirement: 争议投票可视化
The system SHALL provide 争议投票分布可视化功能

#### Scenario: 查看争议投票分布
- **WHEN** 用户访问争议详情或争议列表
- **THEN** 系统展示该争议的投票分布（支持/反对比例、各验证者投票立场）

#### Scenario: 投票趋势追踪
- **WHEN** 用户查看活跃争议
- **THEN** 系统展示投票随时间变化的趋势

### Requirement: 验证者收益归因
The system SHALL provide 验证者收益来源拆解功能

#### Scenario: 查看收益构成
- **WHEN** 用户查看验证者详情或验证者列表
- **THEN** 系统展示收益来源分布（基础奖励、争议奖励、其他奖励）

#### Scenario: 收益效率对比
- **WHEN** 用户对比多个验证者
- **THEN** 系统展示单位质押收益效率指标

### Requirement: 实时数据流
The system SHALL provide UMA 实时价格和争议状态更新

#### Scenario: 实时价格更新
- **WHEN** 用户停留在市场页面
- **THEN** 价格数据通过 WebSocket 实时推送更新

#### Scenario: 争议状态实时通知
- **WHEN** 争议状态发生变化（新增、解决、投票更新）
- **THEN** 系统自动刷新争议列表并显示通知

### Requirement: 争议金额分布分析
The system SHALL provide 争议金额和奖励效率分析

#### Scenario: 查看金额分布
- **WHEN** 用户访问争议分析页面
- **THEN** 系统展示争议金额分布直方图

#### Scenario: 奖励效率分析
- **WHEN** 用户查看争议统计
- **THEN** 系统展示争议奖励与投入成本的比例分析

## MODIFIED Requirements

### Requirement: 争议类型可视化
**现有**: 争议类型使用文字标签区分
**修改**: 争议类型使用独立图标+颜色区分，增强视觉识别度

### Requirement: 数据质量评分透明度
**现有**: 仅展示综合评分和各维度评分
**修改**: 新增评分算法说明，展示权重配置和计算逻辑

## REMOVED Requirements

无移除需求
