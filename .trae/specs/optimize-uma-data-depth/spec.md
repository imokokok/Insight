# UMA 页面数据深度优化 Spec

## Why

根据专业数据分析评估报告，UMA 预言机详情页面在争议分析深度、验证者历史追踪、经济模型展示和链上数据透明度方面存在改进空间。本次优化将针对这些不足进行改进，提升平台的专业性和数据可信度。

## What Changes

- 在争议解决面板添加争议类型分类和筛选功能
- 在争议列表中添加链上交易链接，增强数据可验证性
- 在验证者分析面板添加历史表现趋势图
- 添加质押收益计算器组件，帮助用户评估经济激励

## Impact

- Affected specs: uma-data-depth-assessment
- Affected code:
  - src/components/oracle/DisputeResolutionPanel.tsx
  - src/components/oracle/ValidatorAnalyticsPanel.tsx
  - src/lib/oracles/uma.ts
  - src/components/oracle/ 新增组件

## ADDED Requirements

### Requirement: 争议类型分类
系统 SHALL 在争议解决面板中添加争议类型分类功能。

#### Scenario: 争议类型展示
- **WHEN** 用户查看争议列表
- **THEN** 应显示每个争议的类型标签
- **AND** 支持按类型筛选争议

#### Scenario: 争议类型定义
- **GIVEN** UMA 支持多种争议类型
- **THEN** 系统应支持以下类型：
  - 价格争议 (Price Dispute)
  - 状态争议 (State Dispute)
  - 清算争议 (Liquidation Dispute)
  - 其他争议 (Other)

### Requirement: 链上交易链接
系统 SHALL 在争议和验证者数据中添加上链交易链接。

#### Scenario: 争议链上链接
- **WHEN** 用户查看争议列表
- **THEN** 每个争议应显示链上交易链接
- **AND** 点击链接应在新标签页打开区块链浏览器

#### Scenario: 验证者链上链接
- **WHEN** 用户查看验证者列表
- **THEN** 每个验证者应显示其地址链接
- **AND** 支持跳转到区块链浏览器查看详情

### Requirement: 验证者历史趋势
系统 SHALL 在验证者分析面板中添加历史表现趋势图。

#### Scenario: 成功率趋势
- **WHEN** 用户查看验证者详情
- **THEN** 应显示该验证者成功率的历史趋势图（30天）
- **AND** 支持切换时间范围（7天/30天/90天）

#### Scenario: 响应时间趋势
- **WHEN** 用户查看验证者详情
- **THEN** 应显示该验证者响应时间的历史趋势图
- **AND** 显示平均响应时间的变化趋势

#### Scenario: 声誉变化追踪
- **WHEN** 用户查看验证者详情
- **THEN** 应显示验证者声誉分数的历史变化曲线
- **AND** 标记重要的声誉变动事件

### Requirement: 质押收益计算器
系统 SHALL 添加质押收益计算器组件。

#### Scenario: 收益估算
- **WHEN** 用户输入质押金额
- **THEN** 系统应计算并显示：
  - 预估日收益
  - 预估月收益
  - 预估年收益
  - 年化收益率 (APR)

#### Scenario: 参数调整
- **GIVEN** 收益计算器显示在验证者面板
- **THEN** 用户应能调整以下参数：
  - 质押金额（UMA）
  - 验证者类型（影响收益率）
  - 预期参与争议频率

#### Scenario: 收益可视化
- **WHEN** 用户计算收益
- **THEN** 应显示收益增长曲线图
- **AND** 显示复利增长效果

## MODIFIED Requirements

### Requirement: DisputeResolutionPanel 组件
**Current**: 争议列表仅显示基础信息
**Modified**: 添加争议类型列、链上链接列
**Migration**: 更新 DisputeData 接口，添加 type 和 transactionHash 字段

### Requirement: ValidatorAnalyticsPanel 组件
**Current**: 仅显示验证者当前状态
**Modified**: 添加历史趋势图和收益计算器入口
**Migration**: 新增历史数据获取方法，集成收益计算器组件

### Requirement: UMAClient 类
**Current**: 基础争议和验证者数据
**Modified**: 添加历史趋势数据获取方法
**Migration**: 新增 getValidatorHistory() 和 getDisputeTypes() 方法
