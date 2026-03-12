# 区块链支持分析与扩展建议 Spec

## Why
作为一个专业的预言机数据分析平台，需要全面评估当前区块链支持的覆盖度，并根据市场趋势、预言机生态和用户需求，提出专业的链扩展建议，以提升平台的竞争力和实用性。

## What Changes
- 分析当前支持的区块链网络
- 评估各预言机在不同链上的实际部署情况
- 提出优先级排序的链扩展建议
- 识别当前支持但实际未使用的链

## Impact
- Affected specs: 区块链枚举定义、预言机配置
- Affected code: `src/lib/types/oracle.ts`, `src/lib/config/oracles.tsx`, `src/lib/constants/index.ts`

---

## 当前支持情况分析

### 一、已定义的区块链（共13条）

| 区块链 | 代码标识 | 类型 | 当前使用情况 |
|--------|----------|------|--------------|
| Ethereum | `ETHEREUM` | L1 | ✅ 全预言机支持 |
| Arbitrum | `ARBITRUM` | L2 | ✅ 多预言机支持 |
| Optimism | `OPTIMISM` | L2 | ✅ 多预言机支持 |
| Polygon | `POLYGON` | L2/Sidechain | ✅ 多预言机支持 |
| Solana | `SOLANA` | L1 (非EVM) | ✅ Pyth主要支持 |
| Avalanche | `AVALANCHE` | L1 | ⚠️ 仅定义，部分配置 |
| Fantom | `FANTOM` | L1 | ⚠️ 仅定义，Band配置 |
| Cronos | `CRONOS` | L1 | ⚠️ 仅定义，Band配置 |
| Cosmos | `COSMOS` | L1 (非EVM) | ✅ Band主要支持 |
| Osmosis | `OSMOSIS` | L1 (非EVM) | ✅ Band配置 |
| Juno | `JUNO` | L1 (非EVM) | ⚠️ 仅定义，Band配置 |
| Binance | `BINANCE` | L1 | ⚠️ 仅定义，未实际使用 |
| Base | `BASE` | L2 | ⚠️ 仅定义，未实际使用 |

### 二、各预言机实际链支持对比

#### Chainlink
- **配置支持**: Ethereum, Arbitrum, Optimism, Polygon
- **实际支持**: 还支持 Avalanche, Base, BNB Chain, Fantom, Gnosis, Scroll, zkSync 等
- **差距**: 缺少 Avalanche, Base, BNB Chain 等重要链

#### Band Protocol
- **配置支持**: Cosmos, Osmosis, Juno, Ethereum, Polygon, Avalanche, Fantom, Cronos
- **实际支持**: 基本匹配，但还支持 BNB Chain, Moonriver, Oasis 等
- **差距**: 配置较为完整

#### UMA
- **配置支持**: Ethereum, Arbitrum, Optimism
- **实际支持**: 基本匹配，还支持 Polygon, Base 等
- **差距**: 可扩展 Polygon, Base

#### Pyth Network
- **配置支持**: Solana, Ethereum, Arbitrum
- **实际支持**: 还支持 Polygon, Optimism, Avalanche, Base, Aptos, Sui, Osmosis 等
- **差距**: 缺少大量支持的链

#### API3
- **配置支持**: Ethereum, Arbitrum, Polygon
- **实际支持**: 还支持 Avalanche, Optimism, Base, BNB Chain, Gnosis, Metis 等
- **差距**: 缺少 Avalanche, Base, BNB Chain 等

---

## ADDED Requirements

### Requirement: 区块链扩展优先级建议

系统应根据以下优先级扩展区块链支持：

#### 第一优先级（高TVL + 多预言机支持）

| 链 | 理由 | 预言机支持情况 |
|----|------|----------------|
| **Base** | Coinbase L2，TVL快速增长，已超50亿美元 | Chainlink, Pyth, API3, UMA |
| **BNB Chain (Binance)** | TVL排名前3，用户基数大 | Chainlink, Band, Pyth, API3 |

#### 第二优先级（中等TVL + 特定预言机优势）

| 链 | 理由 | 预言机支持情况 |
|----|------|----------------|
| **Avalanche** | 已定义但未充分配置，TVL高 | Chainlink, Band, Pyth, API3 |
| **Scroll** | zkRollup龙头，TVL增长快 | Chainlink, Pyth |
| **zkSync Era** | zkRollup重要玩家 | Chainlink |

#### 第三优先级（新兴/垂直领域）

| 链 | 理由 | 预言机支持情况 |
|----|------|----------------|
| **Aptos** | Move语言生态，Pyth原生支持 | Pyth |
| **Sui** | Move语言生态，Pyth原生支持 | Pyth |
| **Gnosis** | DeFi老牌链，API3重点支持 | Chainlink, API3 |
| **Mantle** | 模块化L2，TVL增长 | Chainlink, Pyth, API3 |
| **Linea** | ConsenSys L2，增长潜力 | Chainlink |

#### 第四优先级（特定场景）

| 链 | 理由 | 预言机支持情况 |
|----|------|----------------|
| **Celestia** | 模块化区块链，数据可用性层 | Band |
| **Injective** | DeFi专用链 | Band, Pyth |
| **Sei** | 高性能交易链 | Pyth |

---

### Requirement: 预言机配置完善建议

#### Chainlink 配置扩展
```
当前: Ethereum, Arbitrum, Optimism, Polygon
建议添加: Avalanche, Base, BNB Chain, Scroll, zkSync, Gnosis, Fantom
```

#### Pyth Network 配置扩展
```
当前: Solana, Ethereum, Arbitrum
建议添加: Polygon, Optimism, Avalanche, Base, Aptos, Sui, Injective, Sei, Mantle
```

#### API3 配置扩展
```
当前: Ethereum, Arbitrum, Polygon
建议添加: Avalanche, Base, BNB Chain, Optimism, Gnosis, Mantle
```

#### UMA 配置扩展
```
当前: Ethereum, Arbitrum, Optimism
建议添加: Polygon, Base
```

---

### Requirement: 数据质量与链分类

系统应按以下维度对链进行分类管理：

#### 按技术架构
- **EVM兼容链**: Ethereum, Arbitrum, Optimism, Polygon, Avalanche, Fantom, BNB Chain, Base, Cronos, Gnosis, Scroll, zkSync, Mantle, Linea
- **非EVM链**: Solana, Cosmos, Osmosis, Juno, Aptos, Sui, Sei, Injective

#### 按层级
- **Layer 1**: Ethereum, Solana, Avalanche, Fantom, BNB Chain, Cosmos, Aptos, Sui
- **Layer 2**: Arbitrum, Optimism, Polygon, Base, Scroll, zkSync, Mantle, Linea
- **应用链**: Osmosis (DEX), Juno (智能合约), Sei (交易), Injective (DeFi)

#### 按TVL规模（2024年参考）
- **超高TVL (>$50B)**: Ethereum
- **高TVL ($5B-$50B)**: Arbitrum, BNB Chain, Solana, Base, Polygon
- **中等TVL ($1B-$5B)**: Avalanche, Optimism, Scroll, zkSync, Mantle
- **新兴TVL (<$1B)**: 其他链

---

## MODIFIED Requirements

### Requirement: 区块链枚举扩展

当前 `Blockchain` 枚举应扩展以包含：

```typescript
export enum Blockchain {
  // 现有
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  SOLANA = 'solana',
  AVALANCHE = 'avalanche',
  FANTOM = 'fantom',
  CRONOS = 'cronos',
  JUNO = 'juno',
  COSMOS = 'cosmos',
  OSMOSIS = 'osmosis',
  BINANCE = 'binance',
  BASE = 'base',
  
  // 建议新增 - 第一优先级
  BNB_CHAIN = 'bnb-chain',      // 重命名 BINANCE
  // BASE 已存在
  
  // 建议新增 - 第二优先级
  SCROLL = 'scroll',
  ZKSYNC = 'zksync',
  
  // 建议新增 - 第三优先级
  APTOS = 'aptos',
  SUI = 'sui',
  GNOSIS = 'gnosis',
  MANTLE = 'mantle',
  LINEA = 'linea',
  
  // 建议新增 - 第四优先级
  CELESTIA = 'celestia',
  INJECTIVE = 'injective',
  SEI = 'sei',
}
```

---

## 实施建议总结

### 短期（立即实施）
1. **完善现有链配置**: 将 Avalanche, Base 等已定义但未充分配置的链补全
2. **添加 BNB Chain**: 高TVL，多预言机支持

### 中期（1-2个月）
1. **添加 Scroll, zkSync**: zkRollup生态重要组成
2. **扩展 Pyth 配置**: 添加 Aptos, Sui 等非EVM链

### 长期（按需）
1. **监控新兴链发展**: Sei, Injective, Celestia 等
2. **根据用户反馈调整优先级**
