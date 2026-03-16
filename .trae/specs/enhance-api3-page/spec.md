# API3 页面改造规格文档

## Why
API3 页面目前虽然功能完整，但存在 Tab 功能混杂（advanced Tab 包含 Gas、技术指标、质量趋势等多个不相关内容）、缺少风险评估 Tab、以及 cross-oracle 对比数据未展示等问题。通过改造，让 API3 的第一方预言机特性、Airnode/dAPI 核心功能得到更清晰的展示。

## What Changes
- 拆分 `advanced` Tab 为独立的 `analytics` 和 `gas` Tab
- 新增 `risk` Tab 展示风险评估面板
- 新增 `cross-oracle` Tab 展示跨预言机对比数据
- 优化 Tab 顺序，让核心功能更突出
- 在 market Tab 添加更多 API3 特色数据展示

## Impact
- Affected specs: API3 页面展示逻辑、Tab 导航配置
- Affected code: 
  - `src/app/api3/page.tsx`
  - `src/lib/config/oracles.tsx`
  - `src/components/oracle/common/TabNavigation.tsx`
  - 新增 `RiskAssessmentPanel` 组件
  - 新增 `CrossOracleComparisonPanel` 组件

## ADDED Requirements

### Requirement: Advanced Tab 拆分
The system SHALL 将 advanced Tab 拆分为两个独立的 Tab：

#### Scenario: Analytics Tab
- **WHEN** 用户点击 analytics Tab
- **THEN** 展示布林带指标和数据质量趋势图表

#### Scenario: Gas Tab
- **WHEN** 用户点击 gas Tab  
- **THEN** 展示 Gas 费用对比数据

### Requirement: 新增 Risk Tab
The system SHALL 提供风险评估面板：

#### Scenario: Risk Assessment Display
- **WHEN** 用户点击 risk Tab
- **THEN** 展示 API3 网络的风险指标，包括：
  - 覆盖池风险评分
  - 数据源集中度风险
  - 网络健康风险指标
  - 质押风险分析

### Requirement: 新增 Cross-Oracle Tab
The system SHALL 展示跨预言机对比数据：

#### Scenario: Cross-Oracle Comparison
- **WHEN** 用户点击 cross-oracle Tab
- **THEN** 展示 API3 与其他预言机的对比数据，包括：
  - 响应时间对比
  - 数据准确性对比
  - 可用性对比
  - 成本效率对比
  - 更新频率对比

### Requirement: 优化 Market Tab
The system SHALL 在 market Tab 增强 API3 特色展示：

#### Scenario: Enhanced Market Data
- **WHEN** 用户访问 market Tab
- **THEN** 除了现有功能外，还展示：
  - API3 第一方预言机优势简介卡片
  - 质押 APR 趋势图表

## MODIFIED Requirements

### Requirement: Tab 配置更新
**Current**: 8个 Tab (market, network, airnode, dapi, staking, advantages, advanced, ecosystem)
**Modified**: 10个 Tab，优化顺序：
1. market - 市场数据
2. network - 网络健康
3. airnode - Airnode 部署
4. dapi - dAPI 覆盖
5. staking - 质押数据
6. advantages - 第一方优势
7. analytics - 技术分析
8. gas - Gas 对比
9. risk - 风险评估
10. cross-oracle - 跨预言机对比
11. ecosystem - 生态系统

### Requirement: Features 配置更新
**Current**: hasQuantifiableSecurity, hasFirstPartyOracle 为 true
**Modified**: 新增 hasRiskAssessment: true

## REMOVED Requirements
无移除功能，仅重新组织 Tab 结构
