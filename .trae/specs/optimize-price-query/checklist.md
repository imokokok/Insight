# Checklist

## 后端实现检查项

- [x] 预言机币种支持配置已创建 (`src/lib/oracles/supportedSymbols.ts`)
- [x] Chainlink 支持币种配置正确 (ETH, BTC, LINK, USDC, USDT, DAI, MATIC, AVAX, BNB)
- [x] RedStone 支持币种配置正确 (BTC, ETH, SOL, AVAX, LINK, UNI, AAVE, SNX, CRV, MKR, COMP, YFI, SUSHI, 1INCH, LDO, STETH, USDC, USDT, DAI, FRAX, WBTC, WETH, MATIC, BNB, FTM, OP, ARB, BASE, MNT)
- [x] UMA 支持币种配置正确 (UMA)
- [x] DIA 支持币种配置正确 (BTC, ETH, USDC, USDT, LINK, UNI)
- [x] Chronicle 支持币种配置正确 (ETH, WBTC, USDC, DAI, LINK)
- [x] 其他预言机支持币种配置正确 (Band, API3, Tellor, Pyth, WINkLink)
- [x] BaseOracleClient 已添加 `getSupportedSymbols()` 方法
- [x] BaseOracleClient 已添加 `isSymbolSupported(symbol, chain?)` 方法
- [x] BaseOracleClient 已添加 `getSupportedChainsForSymbol(symbol)` 方法
- [x] ChainlinkClient 已实现币种支持方法
- [x] RedStoneClient 已实现币种支持方法
- [x] UMAClient 已实现币种支持方法
- [x] DIAClient 已实现币种支持方法
- [x] ChronicleClient 已实现币种支持方法
- [x] BandProtocolClient 已实现币种支持方法
- [x] API3Client 已实现币种支持方法
- [x] TellorClient 已实现币种支持方法
- [x] PythClient 已实现币种支持方法
- [x] WINkLinkClient 已实现币种支持方法
- [x] OracleClientFactory 已添加获取预言机支持币种的方法

## 前端实现检查项

- [x] `useOracleSymbols` Hook 已创建
- [x] Hook 能根据选中预言机动态获取支持币种列表
- [x] Hook 能实现币种与链的交叉验证
- [x] QueryForm 组件币种选择器根据预言机动态过滤
- [x] QueryForm 组件链选择器根据预言机和币种动态过滤
- [x] QueryForm 组件显示币种不支持提示
- [x] QueryResults 组件显示数据来源标识（实时/模拟）
- [x] QueryResults 组件显示预言机特性标签

## 类型定义检查项

- [x] `OracleSymbolSupport` 类型已添加
- [x] `PriceData` 类型已添加 `dataSource` 字段

## 功能验证检查项

- [x] 选择 Chainlink 时只显示 Chainlink 支持的币种
- [x] 选择 RedStone 时只显示 RedStone 支持的币种
- [x] 选择 UMA 时只显示 UMA 币种
- [x] 选择多个预言机时显示共同支持的币种
- [x] 币种选择后链选择器正确过滤
- [x] 价格结果正确显示数据来源标识
- [x] 所有预言机客户端能正确返回支持的币种列表
