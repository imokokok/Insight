# Chainlink 页面增强改造 Spec

## Why

当前 Chainlink 页面虽然已覆盖核心功能，但缺少对 Chainlink 生态系统中重要服务的展示，如 CCIP（跨链互操作协议）、Functions（智能合约函数服务）、Automation（自动化服务）、VRF（可验证随机数）等。通过添加 Services Tab 和增强现有面板，可以更全面地展示 Chainlink 的技术优势和生态完整性。

## What Changes

- 新增 `services` Tab 展示 Chainlink 核心服务（CCIP、Functions、Automation、VRF、Proof of Reserve）
- 增强 `ecosystem` Tab，添加 CCIP 跨链桥接数据展示
- 在 `nodes` Tab 中添加质押 v0.2 升级信息
- 优化 Tab 顺序，将 `services` 放在 `data-feeds` 之后
- 增强 `risk` Tab，添加服务级别风险评估

## Impact

- Affected specs: Chainlink 页面展示能力
- Affected code:
  - `src/app/chainlink/page.tsx`
  - `src/lib/config/oracles.tsx`
  - `src/components/oracle/common/TabNavigation.tsx`
  - 新增 `src/components/oracle/panels/ChainlinkServicesPanel.tsx`

## ADDED Requirements

### Requirement: Services Tab

The system SHALL provide a dedicated Services Tab to showcase Chainlink's core services beyond data feeds.

#### Scenario: View CCIP Information

- **WHEN** user clicks on "Services" tab
- **THEN** the system SHALL display CCIP cross-chain messaging statistics including:
  - Total messages transferred
  - Supported source chains (15+)
  - Supported destination chains (15+)
  - Average transfer time (< 30 minutes)
  - Total value transferred

#### Scenario: View Functions Information

- **WHEN** user views Services tab
- **THEN** the system SHALL display Chainlink Functions metrics including:
  - Total function calls executed
  - Supported data sources (APIs)
  - Average execution time
  - Use case categories (DeFi, NFT, Gaming, etc.)

#### Scenario: View Automation Information

- **WHEN** user views Services tab
- **THEN** the system SHALL display Chainlink Automation metrics including:
  - Total automation tasks registered
  - Tasks executed per day
  - Gas savings compared to traditional solutions
  - Supported trigger types (time-based, custom logic)

#### Scenario: View VRF Information

- **WHEN** user views Services tab
- **THEN** the system SHALL display Chainlink VRF metrics including:
  - Total randomness requests fulfilled
  - VRF V2 vs V2.5 usage distribution
  - Gaming/NFT use case statistics
  - Average fulfillment time

#### Scenario: View Proof of Reserve Information

- **WHEN** user views Services tab
- **THEN** the system SHALL display Proof of Reserve metrics including:
  - Total assets monitored
  - Supported asset types (stablecoins, wrapped assets)
  - Total value attested
  - Audit frequency

### Requirement: Enhanced Ecosystem Tab

The system SHALL enhance the ecosystem tab to include CCIP cross-chain bridge data.

#### Scenario: View CCIP Bridge Data

- **WHEN** user clicks on "Ecosystem" tab
- **THEN** the system SHALL display:
  - CCIP integrated protocols list
  - Cross-chain message volume by chain
  - Top CCIP use cases

### Requirement: Enhanced Nodes Tab

The system SHALL enhance the nodes tab with staking v0.2 information.

#### Scenario: View Staking v0.2 Info

- **WHEN** user clicks on "Nodes" tab
- **THEN** the system SHALL display:
  - Staking v0.2 migration status
  - Total LINK staked in v0.2
  - Staking APR history
  - Slashing conditions summary

### Requirement: Enhanced Risk Tab

The system SHALL enhance the risk tab with service-level risk assessment.

#### Scenario: View Service Risk Metrics

- **WHEN** user clicks on "Risk" tab
- **THEN** the system SHALL display:
  - Service availability metrics (CCIP, Functions, Automation, VRF)
  - Service-specific risk factors
  - Incident history by service

## MODIFIED Requirements

### Requirement: Tab Navigation Order

The system SHALL reorganize Chainlink page tabs in the following order:

1. market - 市场数据
2. network - 网络健康
3. nodes - 节点分析
4. data-feeds - 数据喂送
5. services - 核心服务 **(NEW)**
6. ecosystem - 生态系统
7. risk - 风险评估
8. cross-oracle - 跨预言机对比

## REMOVED Requirements

None
