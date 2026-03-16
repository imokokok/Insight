# Checklist

## 区块链枚举和基础配置
- [x] Blockchain 枚举包含 TRON、TON、NEAR、AURORA、CELO
- [x] chainNames 映射包含所有新增区块链的显示名称
- [x] chainColors 映射包含所有新增区块链的品牌颜色

## 预言机链支持更新
- [x] Chainlink supportedChains 包含 Ethereum、Arbitrum、Optimism、Polygon、Avalanche、BNB Chain、Base、Solana
- [x] Pyth supportedChains 包含 Ethereum、Arbitrum、Optimism、Polygon、Solana、Avalanche、BNB Chain、Aptos、Sui
- [x] API3 supportedChains 包含 Ethereum、Arbitrum、Polygon、Avalanche、BNB Chain、Base
- [x] Band Protocol supportedChains 包含 Ethereum、Polygon、Avalanche、BNB Chain、Cosmos、Osmosis、Juno
- [x] UMA supportedChains 包含 Ethereum、Polygon、Arbitrum、Optimism、Base
- [x] Chronicle supportedChains 包含 Ethereum、Arbitrum、Optimism、Polygon、Base、Avalanche
- [x] WINkLink supportedChains 包含 TRON、BNB Chain

## 国际化
- [x] 链名称通过 chainNames 常量直接定义，无需额外国际化文件

## 代码质量
- [x] TypeScript 编译无新增区块链相关错误
- [x] 所有新增枚举值在常量映射中有对应条目
