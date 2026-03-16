# UMA 页面改造 Spec

## Why

基于之前的评估结果，UMA 页面需要改造以充分展示其独特的 Optimistic Oracle 特性。当前页面虽然基础功能完整，但缺少 Network Tab、Risk Tab 内容过于通用，且没有展示 UMA 核心的乐观预言机机制。

## What Changes

- 添加 Network Tab，展示 UMA 网络健康状态
- 优化 Risk Tab，添加 UMA 特定的风险评估指标
- 添加 Optimistic Oracle 机制展示组件
- 添加争议生命周期可视化
- 添加 Cross-Oracle 对比 Tab
- 优化现有 Panel 组件，增强数据展示

## Impact

- 修改文件:
  - `src/lib/config/oracles.tsx` - 添加 network 和 cross-oracle tabs
  - `src/components/oracle/common/OraclePageTemplate.tsx` - 添加新 Tab 的渲染逻辑
  - `src/components/oracle/common/TabNavigation.tsx` - 添加新 Tab 的图标和标签
- 新增组件:
  - `UMANetworkPanel` - UMA 网络健康面板
  - `UMARiskPanel` - UMA 定制化风险评估
  - `OptimisticOraclePanel` - 乐观预言机机制展示
  - `DisputeLifecyclePanel` - 争议生命周期可视化

## ADDED Requirements

### Requirement: Network Tab

The system SHALL provide a Network Tab for UMA that displays network health metrics.

#### Scenario: Display network health

- **WHEN** user navigates to Network Tab
- **THEN** display active validators count, validator uptime, average response time, update frequency, total staked amount, data sources count, total disputes, dispute success rate, active disputes

#### Scenario: Display network trends

- **WHEN** user views Network Tab
- **THEN** show verification activity chart, dispute trends, earnings trends

### Requirement: Optimistic Oracle Mechanism Display

The system SHALL provide a visual representation of the Optimistic Oracle workflow.

#### Scenario: Show OO workflow

- **WHEN** user views the mechanism display
- **THEN** show the 3-stage process: Request → Propose → Verify (with dispute option)

#### Scenario: Interactive explanation

- **WHEN** user clicks on each stage
- **THEN** show detailed explanation of that stage

### Requirement: Dispute Lifecycle Visualization

The system SHALL provide a visual timeline of dispute resolution process.

#### Scenario: Show dispute stages

- **WHEN** user views dispute lifecycle
- **THEN** display: Dispute Filed → Voting Period → Vote Revealed → Resolution

#### Scenario: Show time estimates

- **WHEN** user views lifecycle
- **THEN** display estimated time for each stage

### Requirement: UMA-Specific Risk Assessment

The system SHALL provide UMA-specific risk metrics in Risk Tab.

#### Scenario: Display validator concentration risk

- **WHEN** user views Risk Tab
- **THEN** show validator distribution by type (institution/independent/community)

#### Scenario: Display dispute risk metrics

- **WHEN** user views Risk Tab
- **THEN** show dispute success rate trends, resolution time distribution

#### Scenario: Display economic security metrics

- **WHEN** user views Risk Tab
- **THEN** show total staked value, slashing risk, reward consistency

### Requirement: Cross-Oracle Comparison Tab

The system SHALL provide a Cross-Oracle Tab for UMA.

#### Scenario: Compare with other oracles

- **WHEN** user navigates to Cross-Oracle Tab
- **THEN** display comparison metrics: price accuracy, update frequency, dispute mechanism, decentralization score

## MODIFIED Requirements

### Requirement: Enhanced Dispute Resolution Panel

The existing DisputeResolutionPanel SHALL be enhanced with additional visualizations.

#### Scenario: Show dispute type distribution

- **WHEN** user views disputes
- **THEN** display pie/bar chart of dispute types (price/state/liquidation/other)

#### Scenario: Show dispute amount analysis

- **WHEN** user views disputes
- **THEN** display amount distribution with ROI analysis

### Requirement: Enhanced Validator Analytics Panel

The existing ValidatorAnalyticsPanel SHALL show additional metrics.

#### Scenario: Show validator voting history

- **WHEN** user views validator details
- **THEN** display voting participation rate and consistency

#### Scenario: Show earnings breakdown

- **WHEN** user views validators
- **THEN** display base/dispute/other earnings attribution

## REMOVED Requirements

无移除需求
