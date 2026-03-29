# Chronicle 预言机页面功能增强

## Why
根据专业评估报告，当前 Chronicle 页面功能覆盖度仅 47.5%，缺少多个核心功能。需要实施 P0 和 P1 优先级的改进，提升页面专业性和功能完整性。

## What Changes
- 新增 Scuttlebutt 协议深度展示视图
- 新增 MakerDAO 金库状态监控视图
- 新增跨链价格一致性分析视图
- 新增价格偏差监控视图
- 增强验证者详情展示
- 改进数据层，减少 Mock 数据依赖

## Impact
- Affected specs: Chronicle 页面所有视图组件
- Affected code: `/src/app/[locale]/chronicle/` 目录下所有组件

---

## ADDED Requirements

### Requirement: Scuttlebutt 协议深度展示
The system SHALL provide a deep dive view into the Scuttlebutt security protocol, including consensus mechanism visualization, identity verification status, and anti-Sybil attack mechanisms.

#### Scenario: User views Scuttlebutt deep view
- **WHEN** user navigates to Scuttlebutt tab
- **THEN** system displays consensus mechanism visualization
- **AND** system shows validator identity verification status
- **AND** system displays anti-Sybil attack protection details
- **AND** system shows real-time monitoring panel

### Requirement: MakerDAO Vault Status Monitoring
The system SHALL provide comprehensive vault status monitoring including vault overview, liquidation monitoring, and risk parameters.

#### Scenario: User views MakerDAO vault status
- **WHEN** user navigates to MakerDAO tab
- **THEN** system displays vault overview statistics
- **AND** system shows vault type distribution
- **AND** system displays liquidation monitoring panel
- **AND** system shows risk parameters for each asset

### Requirement: Cross-Chain Price Consistency Analysis
The system SHALL provide cross-chain price comparison and consistency analysis across all supported chains.

#### Scenario: User views cross-chain price analysis
- **WHEN** user navigates to cross-chain view
- **THEN** system displays price comparison across chains
- **AND** system shows price deviation between chains
- **AND** system displays chain latency analysis

### Requirement: Price Deviation Monitoring
The system SHALL provide real-time price deviation monitoring comparing Chronicle prices with other oracles and CEX prices.

#### Scenario: User views price deviation
- **WHEN** user views market data
- **THEN** system displays price deviation from other sources
- **AND** system shows deviation threshold alerts
- **AND** system displays deviation history trends

### Requirement: Enhanced Validator Details
The system SHALL provide detailed validator information including performance analysis and staking details.

#### Scenario: User views validator details
- **WHEN** user clicks on a validator
- **THEN** system displays validator detail modal/panel
- **AND** system shows performance history
- **AND** system displays staking details

---

## Implementation Details

### Phase 1: Core Views (P0)

#### 1.1 ChronicleScuttlebuttDeepView Component
```
Location: /src/app/[locale]/chronicle/components/ChronicleScuttlebuttDeepView.tsx

Features:
- Consensus mechanism visualization
  - Validator voting process
  - Consensus achievement time
  - Voting weight distribution
- Identity verification system
  - Validator authentication status
  - Key management display
- Anti-Sybil attack mechanisms
  - Staking threshold display
  - Reputation system details
  - Penalty records
- Real-time monitoring panel
  - Anomaly detection alerts
  - Node health checks
```

#### 1.2 ChronicleVaultView Component
```
Location: /src/app/[locale]/chronicle/components/ChronicleVaultView.tsx

Features:
- Vault overview
  - Total vault count
  - Total collateral value
  - Total debt value
  - Average collateral ratio
- Vault type distribution
  - ETH-A, WBTC-A, USDC-A statistics
- Liquidation monitoring
  - Active auctions
  - Liquidation history
  - Price alerts
- Risk parameters
  - Collateral ratios
  - Stability fees
  - Debt ceiling utilization
```

### Phase 2: Enhanced Features (P1)

#### 2.1 ChronicleCrossChainView Component
```
Location: /src/app/[locale]/chronicle/components/ChronicleCrossChainView.tsx

Features:
- Multi-chain price comparison table
- Price deviation heatmap
- Chain latency analysis
- Bridge status monitoring
```

#### 2.2 ChroniclePriceDeviationView Component
```
Location: /src/app/[locale]/chronicle/components/ChroniclePriceDeviationView.tsx

Features:
- Real-time deviation display
- Deviation history trends
- Deviation cause analysis
- Impact assessment
```

#### 2.3 ChronicleValidatorDetail Component
```
Location: /src/app/[locale]/chronicle/components/ChronicleValidatorDetail.tsx

Features:
- Validator basic info
- Performance analysis charts
- Staking details
- Voting records
```

### Phase 3: Data Layer Enhancement

#### 3.1 Extended ChronicleClient
```
Location: /src/lib/oracles/chronicle.ts

New methods:
- getVaultData()
- getScuttlebuttConsensus()
- getCrossChainPrices()
- getPriceDeviation()
- getValidatorDetail()
```

#### 3.2 New Hooks
```
Location: /src/hooks/oracles/chronicle.ts

New hooks:
- useChronicleVaultData()
- useChronicleCrossChain()
- useChroniclePriceDeviation()
- useChronicleValidatorDetail()
```

---

## Navigation Updates

Add new tabs to ChronicleSidebar:
- `scuttlebutt-deep` - Scuttlebutt 深度分析
- `vault` - 金库状态
- `cross-chain` - 跨链分析
- `price-deviation` - 价格偏差

---

## Type Definitions

```typescript
// Vault Types
interface VaultData {
  totalVaults: number;
  totalCollateral: number;
  totalDebt: number;
  avgCollateralRatio: number;
  vaultTypes: VaultTypeData[];
}

interface VaultTypeData {
  type: string;
  count: number;
  collateral: number;
  debt: number;
  collateralRatio: number;
  stabilityFee: number;
}

// Scuttlebutt Types
interface ScuttlebuttConsensus {
  votingProgress: number;
  consensusTime: number;
  validatorVotes: ValidatorVote[];
  forkStatus: 'none' | 'detected' | 'resolved';
}

interface ValidatorVote {
  validatorId: string;
  voteWeight: number;
  voteStatus: 'pending' | 'approved' | 'rejected';
  timestamp: number;
}

// Cross-Chain Types
interface CrossChainPrice {
  chain: string;
  price: number;
  lastUpdate: number;
  deviation: number;
  latency: number;
}

// Price Deviation Types
interface PriceDeviation {
  symbol: string;
  chroniclePrice: number;
  referencePrice: number;
  deviation: number;
  deviationPercent: number;
  source: string;
  timestamp: number;
}
```
