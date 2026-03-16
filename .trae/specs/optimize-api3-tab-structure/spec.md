# API3页面Tab分类优化 Spec

## Why
当前API3页面的tab分类存在内容混杂、命名不够直观的问题。例如"airnode" tab同时包含节点部署、dAPI覆盖和数据源追溯三个不同领域的内容；"advanced" tab混合了技术指标、数据质量趋势和跨预言机对比等功能。通过重新组织tab结构，可以让用户更清晰地了解API3的各项特性，提升用户体验。

## What Changes
- **重构tab分类结构**：将原有的6个tab优化为7个更清晰的分类
- **重新分配面板内容**：将混杂在"airnode" tab中的内容按功能领域重新分配
- **拆分"advanced" tab**：将技术指标和对比分析分离到不同tab
- **新增"生态" tab**：展示API3的协议集成和生态系统
- **更新i18n翻译键**：为新的tab标签添加对应的国际化翻译

## Impact
- Affected specs: API3页面展示、预言机配置、国际化翻译
- Affected code: 
  - `src/lib/config/oracles.tsx` - tab配置
  - `src/app/api3/page.tsx` - 页面渲染逻辑
  - `src/i18n/en.json` 和 `src/i18n/zh-CN.json` - 翻译文件

## ADDED Requirements

### Requirement: 新的Tab分类结构
The system SHALL provide a reorganized tab structure for API3 page with the following tabs:

#### Tab: market (市场数据)
- **WHEN** user clicks on "市场数据" tab
- **THEN** display market data panel, price trend chart, quick stats, data quality score card, and dAPI price deviation monitor

#### Tab: network (网络健康)
- **WHEN** user clicks on "网络健康" tab
- **THEN** display network health panel with node status, uptime, and activity metrics

#### Tab: airnode (Airnode部署)
- **WHEN** user clicks on "Airnode部署" tab
- **THEN** display Airnode deployment panel only

#### Tab: dapi (dAPI服务)
- **WHEN** user clicks on "dAPI服务" tab
- **THEN** display dAPI coverage panel and data source traceability panel

#### Tab: staking (质押与覆盖)
- **WHEN** user clicks on "质押与覆盖" tab
- **THEN** display staking metrics panel, coverage pool panel, and coverage pool timeline

#### Tab: advantages (核心优势)
- **WHEN** user clicks on "核心优势" tab
- **THEN** display first-party oracle advantages panel

#### Tab: advanced (技术分析)
- **WHEN** user clicks on "技术分析" tab
- **THEN** display technical indicators including ATR, Bollinger Bands, and data quality trend

#### Tab: ecosystem (生态系统)
- **WHEN** user clicks on "生态系统" tab
- **THEN** display ecosystem integrations and protocol partnerships (reuse EcosystemPanel component)

## MODIFIED Requirements

### Requirement: 原有Tab配置
**Current State:**
```typescript
tabs: [
  { id: 'market', labelKey: 'api3.tabs.overview' },
  { id: 'network', labelKey: 'api3.tabs.networkHealth' },
  { id: 'airnode', labelKey: 'api3.tabs.airnodes' },
  { id: 'coverage', labelKey: 'api3.tabs.coveragePool' },
  { id: 'advantages', labelKey: 'api3.tabs.firstPartyOracles' },
  { id: 'advanced', labelKey: 'api3.tabs.advanced' },
]
```

**New State:**
```typescript
tabs: [
  { id: 'market', labelKey: 'api3.tabs.market' },
  { id: 'network', labelKey: 'api3.tabs.network' },
  { id: 'airnode', labelKey: 'api3.tabs.airnode' },
  { id: 'dapi', labelKey: 'api3.tabs.dapi' },
  { id: 'staking', labelKey: 'api3.tabs.staking' },
  { id: 'advantages', labelKey: 'api3.tabs.advantages' },
  { id: 'advanced', labelKey: 'api3.tabs.advanced' },
  { id: 'ecosystem', labelKey: 'api3.tabs.ecosystem' },
]
```

### Requirement: 页面渲染逻辑更新
**Current State:** 
- "airnode" tab renders: AirnodeDeploymentPanel, DapiCoveragePanel, DataSourceTraceabilityPanel
- "coverage" tab renders: CoveragePoolPanel, StakingMetricsPanel, CoveragePoolTimeline
- "advanced" tab renders: GasFeeComparison, ATRIndicator, BollingerBands, DataQualityTrend, CrossOracleComparison

**New State:**
- "market" tab: MarketDataPanel, DataQualityScoreCard, DapiPriceDeviationMonitor, PriceChart, QuickStats
- "network" tab: NetworkHealthPanel
- "airnode" tab: AirnodeDeploymentPanel only
- "dapi" tab: DapiCoveragePanel, DataSourceTraceabilityPanel
- "staking" tab: StakingMetricsPanel, CoveragePoolPanel, CoveragePoolTimeline
- "advantages" tab: FirstPartyOracleAdvantages
- "advanced" tab: ATRIndicator, BollingerBands, DataQualityTrend, GasFeeComparison
- "ecosystem" tab: EcosystemPanel (展示API3生态系统)

## REMOVED Requirements

### Requirement: CrossOracleComparison from advanced tab
**Reason**: CrossOracleComparison更适合作为全局功能或放在跨预言机对比页面，而非单个预言机的技术分析tab中
**Migration**: 从advanced tab中移除CrossOracleComparison组件
