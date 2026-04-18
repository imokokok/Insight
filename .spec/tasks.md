# Reflector Oracle 集成任务分解

## 阶段一：基础设施层（类型、枚举、常量）

### Task 1.1: 新增 OracleProvider.REFLECTOR 和 Blockchain.STELLAR 枚举值

- **文件**: `src/types/oracle/enums.ts`
- **操作**: 在 `OracleProvider` 枚举中新增 `REFLECTOR = 'reflector'`，在 `Blockchain` 枚举中新增 `STELLAR = 'stellar'`
- **验证**: TypeScript 编译通过

### Task 1.2: 扩展 PriceData 接口

- **文件**: `src/types/oracle/price.ts`
- **操作**: 在 `PriceData` 接口中新增 Reflector 元数据字段
  - `resolution?: number` — 数据更新分辨率（秒）
  - `contractVersion?: number` — 合约版本
- **验证**: TypeScript 编译通过

### Task 1.3: 创建 Reflector 常量文件

- **文件**: `src/lib/oracles/constants/reflectorConstants.ts`（新建）
- **操作**:
  1. 定义合约地址（`REFLECTOR_CRYPTO_CONTRACT`, `REFLECTOR_FOREX_CONTRACT`）
  2. 定义支持的加密货币资产列表（`REFLECTOR_CRYPTO_ASSETS`）
  3. 定义支持的外汇资产列表（`REFLECTOR_FOREX_ASSETS`）
  4. 定义资产到合约的映射（`REFLECTOR_ASSET_CONTRACT_MAP`）
  5. 定义缓存配置（`REFLECTOR_CACHE_TTL`）
  6. 定义网络配置（`STELLAR_NETWORK_PASSPHRASE`）
  7. 定义默认账户地址（用于模拟交易）
- **验证**: 所有常量格式正确

### Task 1.4: 更新 supportedSymbols.ts

- **文件**: `src/lib/oracles/constants/supportedSymbols.ts`
- **操作**:
  1. 新增 `reflectorSymbols` 数组（仅包含可正确获取数据的交易对）
  2. 新增 `REFLECTOR_AVAILABLE_PAIRS` 映射（Stellar 链）
  3. 在 `oracleSupportedSymbols` 中新增 `reflector: reflectorSymbols`
  4. 新增 `ReflectorSymbol` 类型
- **验证**: `getAllSupportedSymbols()` 包含 Reflector 币种

## 阶段二：服务层（ReflectorDataService）

### Task 2.1: 安装 @stellar/stellar-sdk

- **操作**: `npm install @stellar/stellar-sdk`
- **验证**: 包安装成功，无冲突

### Task 2.2: 创建 ReflectorDataService

- **文件**: `src/lib/oracles/services/reflectorDataService.ts`（新建）
- **操作**:
  1. 实现 `ReflectorDataService` 类（单例模式）
  2. **核心方法**：
     - `fetchLatestPrice(symbol, signal?)`: 调用 `lastprice(Asset::Other(Symbol))` 获取最新价格
     - `fetchPrices(symbol, records, signal?)`: 调用 `prices(asset, records)` 获取最近 N 条价格
     - `fetchDecimals(signal?)`: 调用 `decimals()` 获取精度
     - `fetchResolution(signal?)`: 调用 `resolution()` 获取更新分辨率
     - `fetchVersion(signal?)`: 调用 `version()` 获取合约版本
     - `fetchAssets(signal?)`: 调用 `assets()` 获取支持的资产列表
     - `fetchLastTimestamp(signal?)`: 调用 `last_timestamp()` 获取最近更新时间
  3. **Soroban RPC 交互**：
     - `simulateContractCall(contractId, method, args, signal?)`: 通用合约调用方法
     - `buildTransaction(contractId, method, args)`: 构建模拟交易
     - `parseSimulateResult(result)`: 解析模拟结果 XDR
     - `parsePriceDataXDR(xdrStr)`: 解析 PriceData 结构体
     - `parseAssetXDR(symbol)`: 编码 Asset::Other(Symbol) 参数
  4. **缓存机制**：价格 30s TTL，元数据 300s TTL
  5. **错误处理**：超时、RPC 不可用、合约错误
  6. 导出单例 `getReflectorDataService()`
- **验证**: 通过 RPC 成功获取 BTC/USD 价格

### Task 2.3: 验证 ReflectorDataService 真实数据

- **操作**:
  1. 编写临时测试脚本，调用 `fetchLatestPrice('BTC')`
  2. 对比返回价格与 Binance BTC/USDT 现货价格
  3. 验证偏差 < 1%
  4. 验证时间戳合理（< 5 分钟）
  5. 测试所有支持资产的数据获取
  6. 移除无法获取数据的资产
- **验证**: 主流交易对能获取真实数据

## 阶段三：客户端层（ReflectorClient）

### Task 3.1: 创建 ReflectorClient

- **文件**: `src/lib/oracles/clients/reflector.ts`（新建）
- **操作**:
  1. 创建 `ReflectorClient` 类，继承 `BaseOracleClient`
  2. 实现 `name = OracleProvider.REFLECTOR`
  3. 实现 `supportedChains = [Blockchain.STELLAR]`
  4. 实现 `getPrice()`：调用 `reflectorDataService.fetchLatestPrice()`，使用 `withOracleRetry` 包装
  5. 实现 `getHistoricalPrices()`：调用 `binanceMarketService.getHistoricalPricesByHours()`
  6. 实现 `getSupportedSymbols()`
  7. 实现 `isSymbolSupported()`
  8. 实现 `getSupportedChainsForSymbol()`
  9. 实现置信度计算（基于数据新鲜度、节点共识）
  10. 实现 `onHistoricalDataError()` 错误处理
- **验证**: ReflectorClient 能正确获取价格和历史数据

### Task 3.2: 注册 Reflector 到工厂

- **文件**: `src/lib/oracles/factory.ts`
- **操作**:
  1. 导入 `ReflectorClient`
  2. 在 `createClient()` switch 中新增 `case OracleProvider.REFLECTOR`
  3. 传入 `useRealData: FEATURE_FLAGS.useRealReflectorData`
  4. 在 `getAllClients()` 的 providers 数组中新增 `OracleProvider.REFLECTOR`
  5. 在 `getAllSupportedSymbols()` 的 providers 数组中新增 `OracleProvider.REFLECTOR`
- **验证**: `getOracleClient('reflector')` 返回 ReflectorClient 实例

### Task 3.3: 更新 oracles/index.ts 导出

- **文件**: `src/lib/oracles/index.ts`
- **操作**:
  1. 导出 `ReflectorClient`
  2. 导出 `ReflectorDataService`、`getReflectorDataService` 及相关类型
  3. 导出 Reflector 常量
- **验证**: 所有 Reflector 相关导出可被正确引用

## 阶段四：配置层

### Task 4.1: 更新预言机配置

- **文件**: `src/lib/config/oracles.tsx`
- **操作**:
  1. 在 `oracleConfigs` 中新增 `OracleProvider.REFLECTOR` 配置
  2. 配置基本信息：name='Reflector', symbol='XRF', defaultChain=Stellar
  3. 配置 supportedChains（仅 Stellar）
  4. 配置 icon（Reflector SVG 图标）
  5. 配置 themeColor（Reflector 品牌色）
  6. 配置 marketData（XRF 代币市场数据，通过 Binance 获取）
  7. 配置 networkData
  8. 配置 features（hasPriceFeeds=true, hasCrossChain=false 等）
  9. 配置 tabs 和 views
  10. 实例化 ReflectorClient
- **验证**: `getOracleConfig('reflector')` 返回完整配置

### Task 4.2: 更新颜色配置

- **文件**: `src/lib/config/colors.ts`
- **操作**: 在 `chartColors.oracle` 中新增 `reflector` 颜色
- **验证**: Reflector 图表使用正确颜色

### Task 4.3: 更新预言机颜色工具

- **文件**: `src/lib/oracles/colors.ts`
- **操作**: 在 `colorMap` 中新增 `[OracleProvider.REFLECTOR]: chartColors.oracle.reflector`
- **验证**: `getOracleColor('reflector')` 返回正确颜色

## 阶段五：前端 Hooks 层

### Task 5.1: 创建 useReflectorOnChainData Hook

- **文件**: `src/hooks/oracles/useReflectorOnChainData.ts`（新建）
- **操作**:
  1. 实现 `useReflectorOnChainData` Hook（参照 `useSupraOnChainData` 模式）
  2. 使用 React Query（staleTime: 60000, gcTime: 300000, refetchInterval: 60000）
  3. 获取 Reflector 链上数据：分辨率、精度、合约版本、数据新鲜度、支持的资产列表
  4. 定义 `UseReflectorOnChainDataReturn` 类型
- **验证**: Hook 在 React 组件中正确工作

### Task 5.2: 更新 useOnChainDataByProvider

- **文件**: `src/hooks/oracles/useOnChainDataByProvider.ts`
- **操作**:
  1. 导入 `useReflectorOnChainData`
  2. 新增 `reflectorResult` 调用
  3. 在 switch 中新增 `case 'reflector': return reflectorResult`
  4. 更新 `OnChainDataReturn` 联合类型
- **验证**: `useOnChainDataByProvider({ provider: 'reflector' })` 正确返回 Reflector 数据

## 阶段六：API 路由层

### Task 6.1: 更新 oracleHandlers 验证

- **文件**: `src/lib/api/oracleHandlers.ts`
- **操作**:
  1. 确保 `validateProvider` 支持 'reflector'
  2. 确保 `handleGetPrice` 和 `handleGetHistoricalPrices` 支持 Reflector
- **验证**: `/api/oracles/reflector?symbol=ETH` 返回正确数据

### Task 6.2: 更新 API 路由

- **文件**: `src/app/api/oracles/[provider]/route.ts`
- **操作**: 确保动态路由支持 'reflector' provider
- **验证**: `/api/oracles/reflector` 路由可访问

## 阶段七：UI 组件层

### Task 7.1: 创建 ReflectorStats 组件

- **文件**: `src/app/price-query/components/stats/ReflectorStats.tsx`（新建）
- **操作**:
  1. 参照 `SupraStats.tsx` 模式
  2. 展示 Reflector 特有指标：
     - 节点共识（4-of-7 多签）
     - 数据分辨率（5分钟）
     - 数据新鲜度
     - 基础资产（USD）
     - 价格精度（14位小数）
     - 合约版本
     - 支持的资产数量
  3. 使用 `useReflectorOnChainData` Hook
- **验证**: 组件正确渲染 Reflector 统计数据

### Task 7.2: 更新 StatsCardsSelector

- **文件**: `src/app/price-query/components/stats/StatsCardsSelector.tsx`
- **操作**:
  1. 导入 `ReflectorStats`
  2. 新增 `case OracleProvider.REFLECTOR: return <ReflectorStats .../>`
- **验证**: 选择 Reflector 预言机时显示 ReflectorStats

### Task 7.3: 更新 stats/index.ts 导出

- **文件**: `src/app/price-query/components/stats/index.ts`
- **操作**: 导出 `ReflectorStats`
- **验证**: 导出正确

### Task 7.4: 添加 Reflector 图标

- **文件**: `public/logos/oracles/reflector.svg`（新建）
- **操作**: 添加 Reflector 图标 SVG
- **验证**: 图标在 UI 中正确显示

## 阶段八：跨预言机页面集成

### Task 8.1: 更新跨预言机常量

- **文件**: `src/app/cross-oracle/constants.tsx`
- **操作**:
  1. 在 `oracleNames` 中新增 `reflector: 'Reflector'`
  2. 在 `oracleColors` 中新增 `reflector` 颜色
  3. 确保 `tradingPairs` 包含 Reflector 支持的交易对
- **验证**: 跨预言机页面显示 Reflector 选项

### Task 8.2: 更新 useCommonSymbols

- **文件**: `src/app/cross-oracle/hooks/useCommonSymbols.ts`
- **操作**: 确保 `oracleSupportedSymbols` 中包含 reflector，交集计算正确
- **验证**: 选择 Reflector + 其他预言机时，正确显示共同支持的币种

## 阶段九：数据验证与交易对筛选

### Task 9.1: 验证 Reflector 真实数据

- **操作**:
  1. 启动开发服务器
  2. 在价格查询页面选择 Reflector 预言机
  3. 查询 BTC/USD 价格
  4. 对比 Reflector 价格与 Binance 现货价格（偏差应 < 1%）
  5. 查询 ETH/USD 价格
  6. 对比 Reflector 价格与 Chainlink 价格（偏差应 < 2%）
  7. 测试历史数据图表
- **验证**: 所有数据真实可靠

### Task 9.2: 筛选可用交易对

- **操作**:
  1. 逐一测试 reflectorSymbols 中的每个交易对
  2. 记录哪些交易对可以成功获取数据
  3. 移除无法获取数据的交易对
  4. 更新 `reflectorSymbols` 和 `REFLECTOR_AVAILABLE_PAIRS`
  5. 确保前端只显示可获取数据的交易对
- **验证**: 前端不显示无法获取数据的交易对

### Task 9.3: 验证跨预言机对比

- **操作**:
  1. 在跨预言机页面选择 Reflector + Chainlink + Pyth
  2. 查询 BTC/USD 价格
  3. 验证 Reflector 价格与其他预言机价格偏差合理
  4. 验证一致性评级正确
  5. 验证图表正确显示 Reflector 数据线
- **验证**: 跨预言机对比功能正常

## 阶段十：构建与代码质量

### Task 10.1: 运行 lint 和 typecheck

- **操作**:
  1. 运行 `npm run lint`
  2. 运行 `npx tsc --noEmit`
  3. 修复所有错误和警告
- **验证**: 无 lint 错误、无类型错误

### Task 10.2: 构建验证

- **操作**: 运行 `npm run build`
- **验证**: 构建成功，无错误
