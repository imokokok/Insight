# Tellor 页面 Tab 功能优化规格文档

## Why

Tellor 预言机页面各个 Tab 的功能展示过于简陋，主要存在以下问题：
1. **过度使用卡片样式** - 每个区块都使用白色卡片包裹，导致视觉层次混乱，信息密度低
2. **数据展示单一** - 各 Tab 主要以简单的统计卡片为主，缺乏深度数据分析和可视化
3. **功能简陋** - 缺少交互功能如筛选、排序、图表等，无法充分展示 Tellor 的特性
4. **缺乏数据密度** - 相比 Chainlink 页面，Tellor 页面的信息密度明显不足

参考 Chainlink 页面的设计风格：
- 减少卡片使用，采用更简洁的内联布局
- 增加数据表格、图表等丰富的数据展示形式
- 使用分隔线和空白来组织内容层次
- 以数据为核心，提供更有价值的信息展示

## What Changes

### Market Tab (市场)
- 保持现有的价格图表和快速统计布局
- 优化数据来源展示，采用更简洁的内联布局
- 增加交易对信息展示区域

### Network Tab (网络)
- **BREAKING**: 移除卡片式布局，改为简洁的统计行展示
- 增加网络性能指标进度条
- 优化每小时活动图表展示
- 增加网络概览统计摘要

### Reporters Tab (报告者)
- **BREAKING**: 新增数据表格展示报告者列表
- 增加报告者统计概览行
- 新增区域分布展示
- 保留成为报告者的指南和奖励说明

### Disputes Tab (争议)
- **BREAKING**: 优化争议统计展示，改为内联布局
- 改进争议表格展示
- 优化争议流程说明展示

### Staking Tab (质押)
- **BREAKING**: 优化质押统计展示
- 改进质押等级展示，减少卡片使用
- 保留质押计算器功能

### Ecosystem Tab (生态)
- **BREAKING**: 新增 TVL 趋势分析图表
- 新增项目分布图表
- 优化生态统计展示

### Risk Tab (风险)
- **BREAKING**: 优化风险评分展示
- 改进风险类别展示
- 优化风险因素说明

## Impact

- Affected files:
  - `src/app/[locale]/tellor/components/TellorMarketView.tsx`
  - `src/app/[locale]/tellor/components/TellorNetworkView.tsx`
  - `src/app/[locale]/tellor/components/TellorReportersView.tsx`
  - `src/app/[locale]/tellor/components/TellorDisputesView.tsx`
  - `src/app/[locale]/tellor/components/TellorStakingView.tsx`
  - `src/app/[locale]/tellor/components/TellorEcosystemView.tsx`
  - `src/app/[locale]/tellor/components/TellorRiskView.tsx`
  - `src/app/[locale]/tellor/types.ts` (可能需要新增类型)

## ADDED Requirements

### Requirement: Network Tab 优化
The system SHALL provide a redesigned Network tab with:
- Clean inline statistics display without card wrappers
- Network performance metrics with progress bars
- Hourly activity chart with simplified container
- Network overview summary with key metrics

#### Scenario: Network statistics display
- **WHEN** user views the Network tab
- **THEN** they see key metrics (active reporters, data feeds, response time, uptime) in a clean inline layout with icons and trend indicators

#### Scenario: Network performance metrics
- **WHEN** user views the Network tab
- **THEN** they see performance metrics (success rate, availability, latency) displayed as progress bars with percentage values

### Requirement: Reporters Tab 优化
The system SHALL provide a redesigned Reporters tab with:
- Data table displaying reporter list with sortable columns
- Reporter statistics overview row with key metrics
- Regional distribution display with progress bars
- Guide for becoming a reporter

#### Scenario: Reporter list display
- **WHEN** user views the Reporters tab
- **THEN** they see a data table showing reporters with columns: address, reports, accuracy, stake, rewards

#### Scenario: Reporter statistics
- **WHEN** user views the Reporters tab
- **THEN** they see inline statistics: total reporters, active reporters, average stake, total reports

### Requirement: Ecosystem Tab 优化
The system SHALL provide a redesigned Ecosystem tab with:
- TVL trend analysis with area chart
- Chain filter for TVL breakdown
- Project distribution bar chart
- Ecosystem growth metrics

#### Scenario: TVL trend display
- **WHEN** user views the Ecosystem tab
- **THEN** they see a stacked area chart showing TVL trends across different chains with time range selector

#### Scenario: Project distribution
- **WHEN** user views the Ecosystem tab
- **THEN** they see a horizontal bar chart showing project distribution across chains

## MODIFIED Requirements

### Requirement: Market Tab 布局优化
The existing Market tab SHALL be modified to:
- Use cleaner inline layouts instead of card wrappers for statistics
- Add trading pair information section
- Maintain price chart and quick stats layout

### Requirement: Disputes Tab 布局优化
The existing Disputes tab SHALL be modified to:
- Use inline layout for dispute statistics
- Improve dispute table presentation
- Maintain dispute process explanation

### Requirement: Staking Tab 布局优化
The existing Staking tab SHALL be modified to:
- Use inline layout for staking statistics
- Reduce card usage in staking tiers display
- Maintain staking calculator functionality

### Requirement: Risk Tab 布局优化
The existing Risk tab SHALL be modified to:
- Improve overall risk score display
- Use cleaner layout for risk categories
- Maintain risk factors explanation

## REMOVED Requirements

None - all existing functionality will be preserved, only layout and presentation will be improved.
