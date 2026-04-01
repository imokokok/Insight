# Tasks

- [x] Task 1: 创建预言机币种支持配置
  - [x] SubTask 1.1: 创建 `src/lib/oracles/supportedSymbols.ts` 文件，定义各预言机支持的币种列表
  - [x] SubTask 1.2: 为 Chainlink 定义支持币种 (ETH, BTC, LINK, USDC, USDT, DAI, MATIC, AVAX, BNB)
  - [x] SubTask 1.3: 为 RedStone 定义支持币种 (BTC, ETH, SOL, AVAX, LINK, UNI, AAVE, SNX, CRV, MKR, COMP, YFI, SUSHI, 1INCH, LDO, STETH, USDC, USDT, DAI, FRAX, WBTC, WETH, MATIC, BNB, FTM, OP, ARB, BASE, MNT)
  - [x] SubTask 1.4: 为 UMA 定义支持币种 (UMA)
  - [x] SubTask 1.5: 为 DIA 定义支持币种 (BTC, ETH, USDC, USDT, LINK, UNI)
  - [x] SubTask 1.6: 为 Chronicle 定义支持币种 (ETH, WBTC, USDC, DAI, LINK)
  - [x] SubTask 1.7: 为其他预言机定义支持币种 (Band, API3, Tellor, Pyth, WINkLink)

- [x] Task 2: 扩展 BaseOracleClient 接口
  - [x] SubTask 2.1: 在 `src/lib/oracles/base.ts` 中添加 `getSupportedSymbols()` 抽象方法
  - [x] SubTask 2.2: 在 `src/lib/oracles/base.ts` 中添加 `isSymbolSupported(symbol, chain?)` 方法
  - [x] SubTask 2.3: 在 `src/lib/oracles/base.ts` 中添加 `getSupportedChainsForSymbol(symbol)` 方法

- [x] Task 3: 在各预言机客户端实现币种支持方法
  - [x] SubTask 3.1: 在 ChainlinkClient 实现 `getSupportedSymbols()` 和 `isSymbolSupported()`
  - [x] SubTask 3.2: 在 RedStoneClient 实现 `getSupportedSymbols()` 和 `isSymbolSupported()`
  - [x] SubTask 3.3: 在 UMAClient 实现 `getSupportedSymbols()` 和 `isSymbolSupported()`
  - [x] SubTask 3.4: 在 DIAClient 实现 `getSupportedSymbols()` 和 `isSymbolSupported()`
  - [x] SubTask 3.5: 在 ChronicleClient 实现 `getSupportedSymbols()` 和 `isSymbolSupported()`
  - [x] SubTask 3.6: 在 BandProtocolClient 实现 `getSupportedSymbols()` 和 `isSymbolSupported()`
  - [x] SubTask 3.7: 在 API3Client 实现 `getSupportedSymbols()` 和 `isSymbolSupported()`
  - [x] SubTask 3.8: 在 TellorClient 实现 `getSupportedSymbols()` 和 `isSymbolSupported()`
  - [x] SubTask 3.9: 在 PythClient 实现 `getSupportedSymbols()` 和 `isSymbolSupported()`
  - [x] SubTask 3.10: 在 WINkLinkClient 实现 `getSupportedSymbols()` 和 `isSymbolSupported()`

- [x] Task 4: 创建价格查询 Hook 优化
  - [x] SubTask 4.1: 创建 `src/app/[locale]/price-query/hooks/useOracleSymbols.ts` Hook
  - [x] SubTask 4.2: 实现根据选中预言机动态获取支持币种列表的逻辑
  - [x] SubTask 4.3: 实现币种与链的交叉验证逻辑

- [x] Task 5: 优化查询表单组件
  - [x] SubTask 5.1: 检查并读取 `src/app/[locale]/price-query/components/QueryForm.tsx` 文件
  - [x] SubTask 5.2: 修改币种选择器，根据选中预言机动态过滤币种
  - [x] SubTask 5.3: 修改链选择器，根据选中预言机和币种动态过滤链
  - [x] SubTask 5.4: 添加币种不支持时的提示信息

- [x] Task 6: 优化查询结果展示
  - [x] SubTask 6.1: 检查并读取 `src/app/[locale]/price-query/components/QueryResults.tsx` 文件
  - [x] SubTask 6.2: 在价格结果中添加数据来源标识（实时/模拟）
  - [x] SubTask 6.3: 添加预言机特性标签展示

- [x] Task 7: 更新类型定义
  - [x] SubTask 7.1: 在 `src/types/oracle.ts` 中添加 `OracleSymbolSupport` 类型
  - [x] SubTask 7.2: 更新 `PriceData` 类型，添加 `dataSource` 字段标识数据来源

- [x] Task 8: 更新工厂类
  - [x] SubTask 8.1: 在 `src/lib/oracles/factory.ts` 中添加获取预言机支持币种的方法

# Task Dependencies

- Task 2 依赖于 Task 1
- Task 3 依赖于 Task 2
- Task 4 依赖于 Task 3
- Task 5 依赖于 Task 4
- Task 6 依赖于 Task 4
- Task 7 可以并行执行
- Task 8 依赖于 Task 3
