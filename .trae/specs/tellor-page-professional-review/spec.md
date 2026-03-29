# Tellor预言机页面专业评审与改进建议

## Why
Tellor是一个独特的去中心化预言机协议，具有质押报告机制和争议解决系统。当前实现虽然覆盖了基础功能，但未能充分展示Tellor的核心差异化特性，且大量使用模拟数据而非真实链上数据，影响用户对协议真实状态的了解。

## What Changes

### 核心功能缺失问题
- **缺少Autopay系统展示** - Tellor独特的按需付费数据请求机制
- **缺少Query Data系统** - 数据请求标识和编码信息
- **缺少Tip激励机制** - 用户激励报告者的打赏系统
- **缺少Tellor Layer信息** - Tellor自己的L1区块链（2024年推出）
- **缺少Governance治理视图** - TRB持有者治理投票

### 数据真实性问题
- **Mock数据问题** - TellorClient中大部分方法返回模拟数据
- **缺少链上数据集成** - 未连接到真实的Tellor合约
- **实时数据流未展示** - PriceStream、MarketDepth、MultiChainAggregation已定义但未在UI使用

### 已定义组件未使用
- TellorPriceStreamPanel - 已定义未使用
- TellorMarketDepthPanel - 已定义未使用
- TellorMultiChainAggregationPanel - 已定义未使用
- TellorNetworkPanel - 已定义未使用
- TellorDisputesPanel - 已定义未使用
- TellorEcosystemPanel - 已定义未使用
- TellorRiskPanel - 已定义未使用

## Impact
- Affected specs: Tellor页面所有视图组件
- Affected code: 
  - `/src/app/[locale]/tellor/` - 所有Tellor页面组件
  - `/src/lib/oracles/tellor.ts` - TellorClient数据层
  - `/src/hooks/oracles/tellor.ts` - 数据hooks
  - `/src/components/oracle/panels/Tellor*.tsx` - 已定义的Panel组件

---

## ADDED Requirements

### Requirement: Tellor Autopay System Display
The system SHALL provide a dedicated Autopay view showing:
- Active funding feeds with tip amounts
- Query ID based data requests
- Sponsor funding status
- Funding history and statistics

#### Scenario: User views Autopay funding feeds
- **WHEN** user navigates to Autopay tab
- **THEN** system displays all active funded queries with:
  - Query ID and human-readable description
  - Current tip amount and cumulative rewards
  - Time since last update
  - Number of reporters eligible

### Requirement: Query Data System Display
The system SHALL display Tellor's Query ID system information:
- Query ID to human-readable mapping
- Query data encoding/decoding
- Supported query types (SpotPrice, LegacyRequest, etc.)
- Query status and last update time

#### Scenario: User explores available query types
- **WHEN** user views Query Data section
- **THEN** system shows all supported query types with examples and encoding details

### Requirement: Tellor Layer Integration
The system SHALL display Tellor Layer blockchain information:
- Block height and validators count
- Bridge statistics (Ethereum <-> Tellor Layer)
- Native token economics
- Layer-specific data feeds

#### Scenario: User views Tellor Layer status
- **WHEN** user navigates to Network view
- **THEN** system shows Tellor Layer chain status alongside EVM chain data

### Requirement: Real-time Data Integration
The system SHALL integrate with real Tellor on-chain data:
- Connect to Tellor contracts on supported chains
- Fetch real reporter data from registry
- Display actual dispute status from governance contract
- Show real staking amounts and rewards

#### Scenario: User views reporter data
- **WHEN** user accesses Reporters view
- **THEN** system displays actual on-chain reporter addresses, stakes, and performance

### Requirement: Data Verification and Provenance
The system SHALL provide data verification features:
- Block explorer links for each data submission
- Transaction hash for price updates
- Historical data proof links

#### Scenario: User verifies price data
- **WHEN** user views a price data point
- **THEN** system shows the on-chain proof link including block number and transaction hash

### Requirement: Enhanced Dispute System Display
The system SHALL provide comprehensive dispute information:
- Dispute evidence display
- Voting progress and participation
- Slashing history
- Dispute resolution timeline

#### Scenario: User views active dispute
- **WHEN** user views an open dispute
- **THEN** system displays:
  - Disputed value vs proposed correct value
  - Current vote tally
  - Time remaining for voting
  - Block explorer link

### Requirement: Governance View
The system SHALL provide governance information view:
- Active proposals list
- Voting power distribution
- Proposal history
- Proposal details

#### Scenario: User views governance
- **WHEN** user navigates to Governance tab
- **THEN** system shows active proposals with voting status and total voting power

### Requirement: Use Existing Panel Components
The system SHALL utilize the already-defined Tellor panel components:
- TellorPriceStreamPanel in Market view
- TellorMarketDepthPanel in Market view
- TellorMultiChainAggregationPanel in Market view
- TellorNetworkPanel in Network view
- TellorDisputesPanel in Disputes view
- TellorEcosystemPanel in Ecosystem view
- TellorRiskPanel in Risk view

#### Scenario: User views Market tab
- **WHEN** user navigates to Market view
- **THEN** system displays PriceStream, MarketDepth, and MultiChainAggregation panels

---

## MODIFIED Requirements

### Requirement: Enhanced Reporters View
The existing Reporters view SHALL be enhanced with:
- Real on-chain reporter data from Tellor registry
- Reporter performance metrics over time
- Block explorer links for reporter addresses
- Historical report submissions

### Requirement: Enhanced Staking View
The existing Staking view SHALL be enhanced with:
- Real-time stake status from staking contract
- Total staked amount from chain
- Staking APR from actual rewards
- Historical staking rewards data

### Requirement: Enhanced Network View
The existing Network view SHALL be enhanced with:
- Tellor Layer blockchain metrics
- Cross-chain bridge statistics
- Real-time transaction throughput
- Gas cost analysis for data submissions

### Requirement: Enhanced Market View
The existing Market view SHALL be enhanced with:
- Price Stream real-time visualization (using existing PriceStreamPanel)
- Market Depth visualization (using existing MarketDepthPanel)
- Multi-chain price aggregation (using existing MultiChainAggregationPanel)
- Block explorer links for price data

---

## REMOVED Requirements

### Requirement: Mock Data Generation
**Reason**: Replace with real on-chain data integration
**Migration**: 
- Remove mock data generation from TellorClient
- Implement contract read calls using ethers.js/viem
- Add caching layer for RPC calls
- Implement fallback to subgraph data when RPC unavailable

---

## 专业建议总结

### 高优先级改进（核心功能覆盖）

| 功能 | 当前状态 | 重要性 | 改进建议 |
|------|----------|--------|----------|
| Autopay系统 | ❌ 缺失 | 🔴 高 | 新增Autopay视图，展示资金池和打赏数据 |
| Query Data系统 | ❌ 缺失 | 🔴 高 | 新增Query ID查询和编码展示 |
| 真实链上数据 | ⚠️ Mock | 🔴 高 | 集成Tellor合约，获取真实数据 |
| Tellor Layer | ❌ 缺失 | 🟡 中 | 在Network视图添加Layer信息 |
| 数据验证链接 | ❌ 缺失 | 🟡 中 | 添加区块浏览器链接 |
| 启用现有Panel | ⚠️ 未使用 | 🟡 中 | 在各视图中启用已定义的Panel组件 |

### 中优先级改进（用户体验）

| 功能 | 当前状态 | 重要性 | 改进建议 |
|------|----------|--------|----------|
| 治理视图 | ❌ 缺失 | 🟡 中 | 新增Governance标签页 |
| 争议详情 | ⚠️ 基础 | 🟡 中 | 增强争议证据和投票展示 |
| 报告者数据 | ⚠️ Mock | 🟡 中 | 替换为真实链上数据 |

### 当前实现评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 功能覆盖度 | 6/10 | 覆盖了基础功能，但缺少Tellor核心差异化特性 |
| 数据真实性 | 3/10 | 大量使用模拟数据，无法反映真实协议状态 |
| Tellor特色展示 | 5/10 | 展示了质押和争议，但缺少Autopay等独特功能 |
| 组件复用 | 4/10 | 已定义多个Panel组件但未使用 |
| 国际化支持 | 9/10 | 完整的中英文翻译 |
| 代码质量 | 8/10 | TypeScript类型完整，组件结构清晰 |

### 综合评价

当前Tellor页面实现**基础框架完善**，UI设计专业，代码质量良好。但存在以下核心问题：

1. **未能展示Tellor的核心差异化特性**：Autopay、Query Data系统、Tellor Layer等独特功能缺失
2. **数据真实性不足**：大量mock数据无法让用户了解协议真实状态
3. **已定义组件未使用**：多个Panel组件已创建但未集成到页面中

建议按照上述优先级逐步改进，首先解决数据真实性问题，然后补充核心功能展示，最后启用现有组件。
