# Chainlink 页面优化实施 Spec

## Why

根据之前的分析，Chainlink 页面当前的 Tab 分类虽然基本合理，但缺少展示其核心优势的 Tab（nodes 和 data-feeds），且部分 Tab 内容为空。本次实施将完善页面，完整展示 Chainlink 作为去中心化预言机领导者的特性。

## What Changes

1. **新增 nodes Tab** - 展示 1847+ 去中心化节点分析
2. **新增 data-feeds Tab** - 展示 1243+ 数据流
3. **完善 risk Tab** - 添加具体风险指标和分析
4. **完善 cross-oracle Tab** - 整合跨预言机对比组件
5. **丰富 ecosystem Tab** - 添加集成协议、TVS 统计等
6. **添加必要的组件和数据支持**

## Impact

- 影响文件:
  - `/src/app/chainlink/page.tsx` - 主页面
  - `/src/lib/config/oracles.tsx` - Tab 配置
  - `/src/i18n/en.json` 和 `/src/i18n/zh-CN.json` - 国际化文本
  - 新增组件文件

## ADDED Requirements

### Requirement: Nodes Tab

The system SHALL provide a nodes Tab to display Chainlink decentralized node network analysis.

#### Scenario: View node analytics
- **WHEN** user clicks on the "nodes" tab
- **THEN** the system displays:
  - Node geographic distribution map/chart
  - Top performing nodes ranking
  - Node staking statistics
  - Node uptime and performance metrics
  - Node count over time trend

### Requirement: Data Feeds Tab

The system SHALL provide a data-feeds Tab to display Chainlink data feeds information.

#### Scenario: View data feeds
- **WHEN** user clicks on the "data-feeds" tab
- **THEN** the system displays:
  - Data feeds list with categories (DeFi, NFT, Gaming, etc.)
  - Data feed usage statistics
  - Recently added data feeds
  - Data feed performance metrics

### Requirement: Risk Tab Content

The system SHALL provide comprehensive risk assessment content in the risk Tab.

#### Scenario: View risk assessment
- **WHEN** user clicks on the "risk" tab
- **THEN** the system displays:
  - Risk score card
  - Historical risk events
  - Risk metrics (centralization risk, uptime risk, etc.)
  - Risk trend charts

### Requirement: Cross-Oracle Tab Content

The system SHALL provide cross-oracle comparison content.

#### Scenario: View cross-oracle comparison
- **WHEN** user clicks on the "cross-oracle" tab
- **THEN** the system displays:
  - Price comparison with other oracles
  - Performance metrics comparison
  - CrossOracleComparison component integration

### Requirement: Enhanced Ecosystem Tab

The system SHALL provide enriched ecosystem information.

#### Scenario: View ecosystem
- **WHEN** user clicks on the "ecosystem" tab
- **THEN** the system displays:
  - Integrated protocols list
  - TVS (Total Value Secured) statistics
  - Ecosystem growth metrics
  - Supported chains with usage stats

## MODIFIED Requirements

### Requirement: Tab Configuration

The system SHALL update Chainlink tab configuration to include new tabs.

#### Modified Configuration:
```typescript
tabs: [
  { id: 'market', labelKey: 'chainlink.menu.marketData' },
  { id: 'network', labelKey: 'chainlink.menu.networkHealth' },
  { id: 'nodes', labelKey: 'chainlink.menu.nodes' },
  { id: 'data-feeds', labelKey: 'chainlink.menu.dataFeeds' },
  { id: 'ecosystem', labelKey: 'chainlink.menu.ecosystem' },
  { id: 'risk', labelKey: 'chainlink.menu.riskAssessment' },
  { id: 'cross-oracle', labelKey: 'chainlink.menu.crossOracleComparison' },
]
```
