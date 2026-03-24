# Tellor 页面重构规范

## Why

当前 Tellor 页面采用传统的标签页布局，信息展示较为分散，数据密度较低。为了提升用户体验，需要将 Tellor 页面重构为类似 Chainlink 页面的侧边栏导航布局，减少不必要的信息展示，提升数据密度，并充分展示 Tellor 预言机的核心特性（Reporter 机制、争议解决、质押挖矿等）。

## What Changes

- **布局重构**: 从顶部标签页导航改为左侧边栏导航（类似 Chainlink 页面）
- **页面结构**: 采用 Hero Section + Sidebar + Content Area 的三段式布局
- **数据密度优化**: 减少冗余信息，提升关键数据的展示密度
- **特性展示**: 突出 Tellor 特有的 Reporter、Dispute、Staking 等核心机制
- **导航优化**: 合并相似标签，减少标签数量，提升导航效率
- **组件化**: 将各视图拆分为独立的组件文件

## Impact

- Affected specs: Tellor 页面展示、导航交互、数据展示
- Affected code: 
  - `src/app/[locale]/tellor/page.tsx`
  - `src/app/[locale]/tellor/components/` (新增)
  - `src/app/[locale]/tellor/hooks/` (新增)
  - `src/app/[locale]/tellor/types.ts` (新增)
  - `src/lib/config/oracles.tsx` (修改 tabs 配置)

## ADDED Requirements

### Requirement: 侧边栏导航
The system SHALL provide a left sidebar navigation for Tellor page.

#### Scenario: Desktop view
- **WHEN** user visits Tellor page on desktop
- **THEN** a sticky left sidebar with navigation items is displayed
- **AND** active tab is highlighted with visual indicator

#### Scenario: Mobile view
- **WHEN** user visits Tellor page on mobile
- **THEN** a hamburger menu button is displayed
- **AND** clicking it opens a slide-in sidebar

### Requirement: Hero Section
The system SHALL display a hero section with key metrics.

#### Scenario: Page load
- **WHEN** Tellor page loads
- **THEN** hero section shows:
  - Live status bar with connection status
  - Tellor logo and title
  - Current TRB price and 24h change
  - Refresh and Export buttons
  - 4 key stats cards (Active Reporters, Supported Chains, Data Feeds, Total Value Secured)

### Requirement: Market View
The system SHALL provide a market data view.

#### Scenario: Market tab selected
- **WHEN** user selects "Market Data" tab
- **THEN** display:
  - Price trend chart (2/3 width)
  - Quick stats panel (1/3 width)
  - Network status panel
  - Data source status

### Requirement: Network View
The system SHALL provide network health view.

#### Scenario: Network tab selected
- **WHEN** user selects "Network" tab
- **THEN** display network health metrics and visualizations

### Requirement: Reporters View
The system SHALL provide reporters analytics view.

#### Scenario: Reporters tab selected
- **WHEN** user selects "Reporters" tab
- **THEN** display reporter statistics and performance data

### Requirement: Disputes View
The system SHALL provide disputes view.

#### Scenario: Disputes tab selected
- **WHEN** user selects "Disputes" tab
- **THEN** display dispute statistics and history

### Requirement: Staking View
The system SHALL provide staking calculator view.

#### Scenario: Staking tab selected
- **WHEN** user selects "Staking" tab
- **THEN** display staking calculator and rewards estimation

### Requirement: Ecosystem View
The system SHALL provide ecosystem view.

#### Scenario: Ecosystem tab selected
- **WHEN** user selects "Ecosystem" tab
- **THEN** display ecosystem partners and integrations

### Requirement: Risk View
The system SHALL provide risk assessment view.

#### Scenario: Risk tab selected
- **WHEN** user selects "Risk" tab
- **THEN** display risk metrics and assessment

## MODIFIED Requirements

### Requirement: Tellor Tabs Configuration
The system SHALL update Tellor tabs to match new navigation structure.

**Current tabs:**
- market, network, reporters, disputes, staking, price-stream, market-depth, multi-chain, ecosystem, cross-oracle, risk

**New tabs:**
- market, network, reporters, disputes, staking, ecosystem, cross-oracle, risk

**Changes:**
- Remove: price-stream, market-depth, multi-chain (合并到 Market 或 Network 视图)
- Keep: market, network, reporters, disputes, staking, ecosystem, cross-oracle, risk

## REMOVED Requirements

### Requirement: Top Tab Navigation
**Reason**: Replaced with sidebar navigation
**Migration**: Remove TabNavigation component usage from Tellor page

### Requirement: Separate Price Stream Panel
**Reason**: Merged into Market view
**Migration**: Integrate price stream data into MarketView component

### Requirement: Separate Market Depth Panel
**Reason**: Merged into Market view
**Migration**: Integrate market depth data into MarketView component

### Requirement: Separate Multi-Chain Panel
**Reason**: Merged into Network view
**Migration**: Integrate multi-chain data into NetworkView component
