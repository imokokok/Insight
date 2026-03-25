# 预言机链集成扩展规格

## Why

当前项目支持 28 条区块链和 10 个预言机，但各预言机支持的链覆盖不够全面。要成为专业的预言机数据分析平台，需要：

1. **扩展链覆盖范围** - 添加 Starknet、Blast、Cardano 等主流链
2. **增加预言机链支持** - 让每个预言机支持更多链
3. **完善前端展示** - 更新 UI 以展示更全面的链支持信息
4. **提升数据完整性** - 提供更全面的跨链预言机数据对比

## What Changes

### 1. 新增区块链支持

添加以下区块链到项目：

| 链名 | 标识符 | 优先级 | 理由 |
|------|--------|--------|------|
| Starknet | starknet | 高 | 主流 ZK-Rollup L2 |
| Blast | blast | 高 | 新兴热门 L2，TVL 增长快 |
| Cardano | cardano | 高 | 市值前10公链 |
| Polkadot | polkadot | 高 | 跨链生态重要玩家 |
| Kava | kava | 中 | Cosmos SDK 链，Chainlink 原生支持 |
| Moonbeam | moonbeam | 中 | Polkadot 生态 EVM 兼容链 |
| StarkEx | starkex | 中 | StarkWare 生态 |

### 2. 扩展各预言机支持的链

#### Chainlink (当前8条 → 目标14条)
新增：Starknet、Blast、Moonbeam、Kava、Polkadot

#### Pyth (当前7条 → 目标12条)
新增：Starknet、Blast、Sui、Aptos、Injective、Sei

#### Band Protocol (当前8条 → 目标11条)
新增：Injective、Sei、Kava

#### API3 (当前7条 → 目标12条)
新增：Moonbeam、Kava、Fantom、Gnosis、Linea、Scroll

#### RedStone (当前12条 → 目标16条)
新增：Blast、Starknet、Aptos、Sui

#### DIA (当前6条 → 目标11条)
新增：Fantom、Cronos、Moonbeam、Gnosis、Kava

#### Tellor (当前6条 → 目标10条)
新增：BNB Chain、Fantom、Moonbeam、Gnosis

#### UMA (当前5条 → 目标9条)
新增：BNB Chain、Avalanche、Fantom、Gnosis

#### Chronicle (当前5条 → 目标9条)
新增：BNB Chain、Avalanche、Fantom、Gnosis

#### WINkLink (当前1条 → 目标3条)
新增：TRON、Ethereum（跨链桥接）

### 3. 前端展示更新

#### ChainSelector 组件增强
- 支持按链类型筛选（L1/L2/Cosmos/其他）
- 显示链的图标和标识
- 支持多链选择对比

#### OracleConfig 面板更新
- 显示各预言机支持的完整链列表
- 添加链支持度评分
- 显示链覆盖热力图

#### 跨链对比功能
- 支持同一资产在不同链上的价格对比
- 链间价格差异分析
- 跨链套利机会提示

## Impact

### 受影响文件

**类型定义：**
- `src/types/oracle/enums.ts` - 添加新 Blockchain 枚举值
- `src/lib/constants/index.ts` - 添加链名称和颜色配置

**配置：**
- `src/lib/config/oracles.tsx` - 更新各预言机的 supportedChains
- `src/lib/config/colors.ts` - 添加新链的颜色配置

**前端组件：**
- `src/components/oracle/ChainSelector.tsx` - 增强链选择功能
- `src/components/oracle/panels/NetworkHealthPanel.tsx` - 显示多链数据
- `src/app/[locale]/cross-oracle/components/` - 更新跨链对比展示

**Hook：**
- `src/hooks/useOracleData.ts` - 支持多链数据获取
- `src/hooks/useCrossChainComparison.ts` - 新增跨链对比 hook

### 数据影响

- 支持的链总数：28 → 35 (+7)
- Chainlink 链覆盖：8 → 14 (+6)
- Pyth 链覆盖：7 → 12 (+5)
- 平均每个预言机链覆盖：6.8 → 11.3 (+4.5)

## ADDED Requirements

### Requirement: 新增区块链枚举
系统 SHALL 在 Blockchain 枚举中添加 7 条新链。

#### Scenario: 枚举定义
- **WHEN** 开发者查看 Blockchain 枚举
- **THEN** 看到 Starknet、Blast、Cardano、Polkadot、Kava、Moonbeam、StarkEx
- **AND** 每条链有唯一的标识符

### Requirement: 预言机链配置扩展
系统 SHALL 为每个预言机扩展支持的链列表。

#### Scenario: Chainlink 链扩展
- **WHEN** 查看 Chainlink 配置
- **THEN** supportedChains 包含 14 条链
- **AND** 新增 Starknet、Blast、Moonbeam、Kava、Polkadot

#### Scenario: Pyth 链扩展
- **WHEN** 查看 Pyth 配置
- **THEN** supportedChains 包含 12 条链
- **AND** 新增 Starknet、Blast、Sui、Aptos、Injective、Sei

#### Scenario: 其他预言机链扩展
- **WHEN** 查看其他预言机配置
- **THEN** 每个预言机至少支持 9 条链
- **AND** 覆盖主流 L1/L2 网络

### Requirement: 链颜色配置
系统 SHALL 为每条新链配置唯一的颜色标识。

#### Scenario: 颜色配置
- **WHEN** 查看链颜色配置
- **THEN** 每条新链有对应的颜色值
- **AND** 颜色与链的品牌色一致或协调

### Requirement: 前端链选择器增强
系统 SHALL 增强 ChainSelector 组件以支持更多链。

#### Scenario: 链筛选功能
- **WHEN** 用户打开链选择器
- **THEN** 可以按类型筛选链（L1/L2/Cosmos）
- **AND** 可以快速搜索链名称
- **AND** 可以选择多条链进行对比

#### Scenario: 链信息显示
- **WHEN** 链选择器显示链列表
- **THEN** 每条链显示图标和名称
- **AND** 显示该链支持的预言机数量

### Requirement: 跨链数据展示
系统 SHALL 在跨预言机对比页面展示跨链数据。

#### Scenario: 链覆盖热力图
- **WHEN** 用户查看跨预言机对比页面
- **THEN** 看到预言机×链的覆盖热力图
- **AND** 可以直观了解各预言机的链支持情况

#### Scenario: 跨链价格对比
- **WHEN** 用户选择资产和多条链
- **THEN** 显示该资产在不同链上的价格
- **AND** 显示链间价格差异

## MODIFIED Requirements

### Requirement: Blockchain 枚举
**原定义:** 28 条链

**修改后:** 35 条链
- 新增 STARKNET = 'starknet'
- 新增 BLAST = 'blast'
- 新增 CARDANO = 'cardano'
- 新增 POLKADOT = 'polkadot'
- 新增 KAVA = 'kava'
- 新增 MOONBEAM = 'moonbeam'
- 新增 STARKEX = 'starkex'

### Requirement: OracleConfig 类型
**原定义:** supportedChains 为 Blockchain[]

**修改后:** 
- 保持类型不变
- 更新各预言机配置实例的 supportedChains 值
- 添加 chainCoverage 计算属性

### Requirement: ChainSelector Props
**原定义:**
```typescript
interface ChainSelectorProps {
  selectedChain: Blockchain;
  onChainChange: (chain: Blockchain) => void;
  supportedChains?: Blockchain[];
}
```

**修改后:**
```typescript
interface ChainSelectorProps {
  selectedChains: Blockchain[];
  onChainsChange: (chains: Blockchain[]) => void;
  supportedChains?: Blockchain[];
  allowMultiSelect?: boolean;
  filterByType?: 'all' | 'l1' | 'l2' | 'cosmos';
  showOracleCount?: boolean;
}
```

## REMOVED Requirements

无移除需求

## 技术实现要点

### 1. 链分类定义

```typescript
export const CHAIN_CATEGORIES: Record<Blockchain, 'l1' | 'l2' | 'cosmos' | 'other'> = {
  [Blockchain.ETHEREUM]: 'l1',
  [Blockchain.ARBITRUM]: 'l2',
  [Blockchain.STARKNET]: 'l2',
  [Blockchain.BLAST]: 'l2',
  // ...
};
```

### 2. 链覆盖度计算

```typescript
function calculateChainCoverage(provider: OracleProvider): number {
  const config = oracleConfigs[provider];
  const totalChains = BLOCKCHAIN_VALUES.length;
  return (config.supportedChains.length / totalChains) * 100;
}
```

### 3. 前端展示优化

- 使用虚拟列表处理大量链选项
- 链图标懒加载
- 响应式设计支持移动端链选择

## 预期效果

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 支持链总数 | 28 | 35 | +25% |
| Chainlink 链覆盖 | 8 | 14 | +75% |
| Pyth 链覆盖 | 7 | 12 | +71% |
| 平均链覆盖 | 6.8 | 11.3 | +66% |
| 平台专业度评分 | 7/10 | 9/10 | +28% |
