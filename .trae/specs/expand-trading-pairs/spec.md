# 扩展价格查询交易对规格

## 背景

当前跨预言机价格查询页面支持12个交易对：

- **Layer 1**: BTC/USD, ETH/USD, SOL/USD, AVAX/USD
- **DeFi**: LINK/USD, UNI/USD, AAVE/USD, MKR/USD, SNX/USD, COMP/USD, YFI/USD, CRV/USD

## 建议扩展方案

### 方案A：保守扩展（+8个，共20个）

**新增 Layer 1 代币**:

- NEAR/USD - NEAR Protocol
- MATIC/USD - Polygon
- ARB/USD - Arbitrum
- OP/USD - Optimism

**新增 DeFi 代币**:

- LDO/USD - Lido DAO
- SUSHI/USD - SushiSwap
- 1INCH/USD - 1inch
- BAL/USD - Balancer

### 方案B：中等扩展（+16个，共28个）

在方案A基础上增加：

**新增 Layer 1 代币**:

- DOT/USD - Polkadot
- ADA/USD - Cardano
- ATOM/USD - Cosmos
- FTM/USD - Fantom

**新增 DeFi 代币**:

- FXS/USD - Frax Share
- RPL/USD - Rocket Pool
- GMX/USD - GMX
- dYdX/USD - dYdX

**新增 稳定币**:

- USDC/USD - USD Coin
- USDT/USD - Tether
- DAI/USD - DAI

### 方案C：全面扩展（+24个，共36个）

在方案B基础上增加更多热门代币，涵盖更多赛道。

## 技术实现要点

1. **交易对配置** - 在 `constants.tsx` 中扩展 `tradingPairs` 数组
2. **图标映射** - 在 `PairSelector.tsx` 中扩展 `cryptoLogoMap`
3. **分类管理** - 可考虑增加更多分类（如 stablecoin、layer2、gaming 等）
4. **搜索性能** - 当前12个交易对搜索性能良好，扩展到36个也不会有问题

## 建议

推荐**方案B（中等扩展）**，理由：

1. 覆盖主流Layer 1和DeFi代币，满足大部分用户需求
2. 包含稳定币对，可观察预言机对稳定币价格的追踪能力
3. 数量适中（28个），既丰富选择又不至于 overwhelm 用户
4. 所有新增代币都有较高的市场关注度和流动性

## 影响范围

- `src/app/cross-oracle/constants.tsx` - 交易对配置
- `src/app/cross-oracle/components/PairSelector.tsx` - 图标映射
- 可能需要新增 `/public/logos/cryptos/` 下的图标文件
