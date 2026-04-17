# Chaos Labs Oracle 集成任务分解

## 阶段一：基础设施层（类型、枚举、常量）

### Task 1.1: 新增 OracleProvider.CHAOS 枚举值

- **文件**: `src/types/oracle/enums.ts`
- **操作**: 在 `OracleProvider` 枚举中新增 `CHAOS = 'chaos'`
- **验证**: TypeScript 编译通过

### Task 1.2: 扩展 PriceData 接口

- **文件**: `src/types/oracle/price.ts`
- **操作**: 在 `PriceData` 接口中新增 Chaos 元数据字段
  - `feedId?: string` — Chaos Feed ID（如 BTCUSD）
  - `expo?: number` — 价格指数（如 -8）
  - `signature?: string` — Pull Oracle 签名
  - `pushOracleAddress?: string` — Push Oracle 合约地址
  - `dataMode?: 'push' | 'pull'` — 数据获取模式
- **验证**: TypeScript 编译通过

### Task 1.3: 新增 Chaos 错误码

- **文件**: `src/types/oracle/oracle.ts`（或相关错误码文件）
- **操作**: 在 `OracleErrorCode` 联合类型中新增：
  - `'CHAOS_ERROR'`
  - `'CHAOS_PUSH_ORACLE_ERROR'`
  - `'CHAOS_PULL_API_ERROR'`
  - `'CHAOS_FEED_NOT_FOUND'`
  - `'CHAOS_API_KEY_MISSING'`
  - `'CHAOS_HISTORICAL_ERROR'`
- **验证**: TypeScript 编译通过

### Task 1.4: 创建 Chaos 常量文件

- **文件**: `src/lib/oracles/constants/chaosConstants.ts`（新建）
- **操作**:
  1. 定义 Pull Oracle API 配置（`CHAOS_API_BASE`, `CHAOS_API_ENDPOINTS`）
  2. 定义 WebSocket 端点（`CHAOS_WS_URL`）
  3. 定义 Feed ID 映射（`CHAOS_FEED_IDS`: symbol → feedId）
  4. 定义反向映射（`CHAOS_FEED_ID_TO_SYMBOL`: feedId → symbol）
  5. 定义链可靠性配置（`CHAOS_CHAIN_RELABILITY`）
  6. 定义缓存配置（`CHAOS_CACHE_TTL`）
  7. 定义 RPC 配置（`CHAOS_RPC_CONFIG`，复用 Alchemy RPC）
- **验证**: 所有常量格式正确，Feed ID 映射覆盖主流交易对

### Task 1.5: 创建 Chaos 数据源文件

- **文件**: `src/lib/oracles/services/chaosDataSources.ts`（新建）
- **操作**:
  1. 定义 Push Oracle 合约地址映射（`CHAOS_PUSH_PRICE_FEEDS`）
  2. 定义 Push Oracle 合约 ABI（与 Chainlink AggregatorV3Interface 兼容）
  3. 实现 `getChaosPriceFeed(symbol, chainId)` 辅助函数
  4. 实现 `getChaosRPCConfig(chainId)` 辅助函数
  5. 实现 `isChaosPriceFeedSupported(symbol, chainId)` 辅助函数
  6. 实现 `getSupportedSymbols()` 辅助函数
  7. 实现 `buildEndpoints()` 辅助函数（Alchemy 优先 + 公共节点备用）
- **验证**: ABI 可用于 viem 编码，辅助函数返回正确结果

### Task 1.6: 更新 supportedSymbols.ts

- **文件**: `src/lib/oracles/constants/supportedSymbols.ts`
- **操作**:
  1. 新增 `chaosSymbols` 数组（仅包含可正确获取数据的交易对）
  2. 新增 `CHAOS_AVAILABLE_PAIRS` 映射（按链分组）
  3. 在 `oracleSupportedSymbols` 中新增 `chaos: chaosSymbols`
  4. 新增 `ChaosSymbol` 类型
- **验证**: `getAllSupportedSymbols()` 包含 Chaos 币种

### Task 1.7: 更新全局常量

- **文件**: `src/lib/constants/index.ts`
- **操作**:
  1. 在 `providerNames` 中新增 `chaos: 'Chaos'`
  2. 在 `oracleI18nKeys` 中新增 `chaos: 'chaos'`
  3. 在 `oracleColors` 中新增 `chaos` 颜色
- **验证**: 所有引用 providerNames 的地方能正确显示 Chaos

## 阶段二：服务层（数据服务）

### Task 2.1: 创建 ChaosDataService

- **文件**: `src/lib/oracles/services/chaosDataService.ts`（新建）
- **操作**:
  1. 实现 `ChaosDataService` 类
  2. **Pull Oracle 方法**（参照 RedStoneClient 模式）：
     - `getPullPrice(symbol, signal?)`: 通过 API 获取价格
     - `getPullPrices(symbols, signal?)`: 批量获取价格
     - `fetchFromApi(endpoint, feedIds, signal?)`: 通用 API 调用方法
  3. **Push Oracle 方法**（参照 ChainlinkOnChainService 模式）：
     - `getPushPrice(symbol, chainId, signal?)`: 通过 RPC 读取链上合约
     - `rpcCallWithFallback(chainId, method, params, signal?)`: RPC 调用（Alchemy 优先 + 公共节点备用）
     - `ethCall(chainId, to, data, signal?)`: eth_call 封装
  4. **统一接口**：
     - `getPrice(symbol, chainId, signal?)`: Push 优先，Pull 降级
     - `getPrices(symbols, chainId)`: 批量获取
     - `getSupportedSymbols()`: 获取支持的交易对
     - `getSupportedChainIds(symbol)`: 获取支持的链 ID
  5. **数据解码**（复用 Chainlink 的解码逻辑）：
     - `decodeLatestRoundData(data)`: 解码 latestRoundData 返回值
     - `decodeDecimals(data)`: 解码 decimals
     - `decodeString(data)`: 解码 description
  6. **缓存机制**：Push 30s TTL，Pull 10s TTL
  7. **端点健康检查和故障转移**
  8. 导出单例 `chaosDataService`
- **验证**: 通过 API 和 RPC 成功获取 BTC/USD 价格

### Task 2.2: 验证 ChaosDataService 真实数据

- **操作**:
  1. 编写临时测试脚本，调用 `chaosDataService.getPullPrice('BTC')`
  2. 对比返回价格与 Binance BTC/USDT 现货价格
  3. 验证偏差 < 1%
  4. 验证时间戳合理（< 5 分钟）
  5. 如果 Push Oracle 合约地址可用，测试 RPC 读取
  6. 测试故障转移机制
- **验证**: 主流交易对能获取真实数据

## 阶段三：客户端层（ChaosClient）

### Task 3.1: 创建 ChaosClient

- **文件**: `src/lib/oracles/clients/chaos.ts`（新建）
- **操作**:
  1. 创建 `ChaosClient` 类，继承 `BaseOracleClient`
  2. 实现 `name = OracleProvider.CHAOS`
  3. 实现 `supportedChains`（7 条 EVM 链 + Solana）
  4. 实现 `getPrice()`：调用 `chaosDataService.getPrice()`，使用 `withOracleRetry` 包装
  5. 实现 `getHistoricalPrices()`：调用 `binanceMarketService.getHistoricalPricesByHours()`
  6. 实现 `getSupportedSymbols()`
  7. 实现 `isSymbolSupported()`
  8. 实现 `getSupportedChainsForSymbol()`
  9. 实现置信度计算（基于链可靠性、数据模式、数据新鲜度）
  10. 实现 `convertToPriceData()` 辅助方法
  11. 实现 `onHistoricalDataError()` 错误处理
- **验证**: ChaosClient 能正确获取价格和历史数据

### Task 3.2: 注册 Chaos 到工厂

- **文件**: `src/lib/oracles/factory.ts`
- **操作**:
  1. 导入 `ChaosClient`
  2. 在 `createClient()` switch 中新增 `case OracleProvider.CHAOS`
  3. 传入 `useRealData: FEATURE_FLAGS.useRealChaosData`
  4. 在 `getAllClients()` 的 providers 数组中新增 `OracleProvider.CHAOS`
  5. 在 `getAllSupportedSymbols()` 的 providers 数组中新增 `OracleProvider.CHAOS`
- **验证**: `getOracleClient('chaos')` 返回 ChaosClient 实例

### Task 3.3: 更新 oracles/index.ts 导出

- **文件**: `src/lib/oracles/index.ts`
- **操作**:
  1. 导出 `ChaosClient`
  2. 导出 `ChaosDataService`、`chaosDataService` 及相关类型
  3. 导出 Chaos 常量（`CHAOS_FEED_IDS`、`CHAOS_API_BASE` 等）
  4. 导出 Chaos 数据源（`CHAOS_PUSH_PRICE_FEEDS`、`CHAOS_PUSH_ORACLE_ABI` 等）
- **验证**: 所有 Chaos 相关导出可被正确引用

## 阶段四：配置层

### Task 4.1: 更新环境变量配置

- **文件**: `src/lib/config/env.ts`
- **操作**:
  1. 在 `ServerFeatureFlags` 中新增 `useRealChaosData: boolean`
  2. 在 `serverEnvSchema` 中新增 `USE_REAL_CHAOS_DATA` 字段（默认 true）
  3. 在 `lenientServerEnvSchema` 中新增 `USE_REAL_CHAOS_DATA` 字段
  4. 在 `getRawServerEnv()` 中新增 `USE_REAL_CHAOS_DATA`
  5. 在 `buildServerEnvConfig()` 中新增 `useRealChaosData`
  6. 在 `FEATURE_FLAGS` 默认值中新增 `useRealChaosData: false`
- **验证**: `FEATURE_FLAGS.useRealChaosData` 默认为 true

### Task 4.2: 更新服务端环境变量

- **文件**: `src/lib/config/serverEnv.ts`
- **操作**:
  1. 新增 `CHAOS_CONFIG` 配置（包含 `apiKey`）
  2. 新增 `CHAOS_CACHE_TTL` 配置
  3. 在 `validateServerEnv()` 中新增 CHAOS 相关验证（可选）
- **验证**: 配置正确读取

### Task 4.3: 更新预言机配置

- **文件**: `src/lib/config/oracles.tsx`
- **操作**:
  1. 在 `oracleConfigs` 中新增 `OracleProvider.CHAOS` 配置
  2. 配置基本信息：name='Chaos Labs', symbol='CHAOS', defaultChain=Ethereum
  3. 配置 supportedChains（7 条 EVM 链 + Solana）
  4. 配置 icon（Chaos SVG 图标）
  5. 配置 themeColor（Chaos Labs 品牌色）
  6. 配置 marketData（Chaos 代币市场数据，通过 Binance 获取）
  7. 配置 networkData
  8. 配置 features（hasPriceFeeds=true, hasDataStreams=true, hasCrossChain=true 等）
  9. 配置 tabs 和 views
  10. 实例化 ChaosClient
- **验证**: `getOracleConfig('chaos')` 返回完整配置

### Task 4.4: 更新颜色配置

- **文件**: `src/lib/config/colors.ts`
- **操作**: 在 `chartColors.oracle` 中新增 `chaos` 颜色
- **验证**: Chaos 图表使用正确颜色

### Task 4.5: 更新预言机颜色工具

- **文件**: `src/lib/oracles/colors.ts`
- **操作**: 在 `colorMap` 中新增 `[OracleProvider.CHAOS]: chartColors.oracle.chaos`
- **验证**: `getOracleColor('chaos')` 返回正确颜色

## 阶段五：前端 Hooks 层

### Task 5.1: 创建 useChaosOnChainData Hook

- **文件**: `src/hooks/oracles/useChaosOnChainData.ts`（新建）
- **操作**:
  1. 实现 `useChaosOnChainData` Hook（参照 `useSupraOnChainData` 模式）
  2. 使用 React Query（staleTime: 60000, gcTime: 300000, refetchInterval: 60000）
  3. 获取 Chaos 链上数据：数据模式、Feed ID、合约地址、价格精度、数据新鲜度
  4. 定义 `UseChaosOnChainDataReturn` 类型
- **验证**: Hook 在 React 组件中正确工作

### Task 5.2: 更新 useOnChainDataByProvider

- **文件**: `src/hooks/oracles/useOnChainDataByProvider.ts`
- **操作**:
  1. 导入 `useChaosOnChainData`
  2. 新增 `chaosResult` 调用
  3. 在 switch 中新增 `case 'chaos': return chaosResult`
  4. 更新 `OnChainDataReturn` 联合类型
- **验证**: `useOnChainDataByProvider({ provider: 'chaos' })` 正确返回 Chaos 数据

## 阶段六：API 路由层

### Task 6.1: 更新 oracleHandlers 验证

- **文件**: `src/lib/api/oracleHandlers.ts`
- **操作**:
  1. 确保 `validateProvider` 支持 'chaos'
  2. 确保 `handleGetPrice` 和 `handleGetHistoricalPrices` 支持 Chaos
- **验证**: `/api/oracles/chaos?symbol=ETH` 返回正确数据

### Task 6.2: 更新 API 路由

- **文件**: `src/app/api/oracles/[provider]/route.ts`
- **操作**: 确保动态路由支持 'chaos' provider
- **验证**: `/api/oracles/chaos` 路由可访问

## 阶段七：UI 组件层

### Task 7.1: 创建 ChaosStats 组件

- **文件**: `src/app/price-query/components/stats/ChaosStats.tsx`（新建）
- **操作**:
  1. 参照 `ChainlinkStats.tsx` 模式
  2. 展示 Chaos 特有指标：
     - 数据模式（Push/Pull）
     - Feed ID
     - Push Oracle 合约地址
     - 价格精度（expo）
     - 数据新鲜度
     - 签名状态
  3. 使用 `useChaosOnChainData` Hook
- **验证**: 组件正确渲染 Chaos 统计数据

### Task 7.2: 更新 StatsCardsSelector

- **文件**: `src/app/price-query/components/stats/StatsCardsSelector.tsx`
- **操作**:
  1. 导入 `ChaosStats`
  2. 新增 `case OracleProvider.CHAOS: return <ChaosStats .../>`
- **验证**: 选择 Chaos 预言机时显示 ChaosStats

### Task 7.3: 更新 stats/index.ts 导出

- **文件**: `src/app/price-query/components/stats/index.ts`
- **操作**: 导出 `ChaosStats`
- **验证**: 导出正确

### Task 7.4: 添加 Chaos 图标

- **文件**: `public/logos/oracles/chaos.svg`（新建）
- **操作**: 添加 Chaos Labs 图标 SVG
- **验证**: 图标在 UI 中正确显示

## 阶段八：跨预言机页面集成

### Task 8.1: 更新跨预言机常量

- **文件**: `src/app/cross-oracle/constants.tsx`
- **操作**:
  1. 在 `oracleNames` 中新增 `chaos: 'Chaos'`
  2. 在 `oracleColors` 中新增 `chaos` 颜色
  3. 确保 `tradingPairs` 包含 Chaos 支持的交易对
- **验证**: 跨预言机页面显示 Chaos 选项

### Task 8.2: 更新 useCommonSymbols

- **文件**: `src/app/cross-oracle/hooks/useCommonSymbols.ts`
- **操作**: 确保 `oracleSupportedSymbols` 中包含 chaos，交集计算正确
- **验证**: 选择 Chaos + 其他预言机时，正确显示共同支持的币种

## 阶段九：数据验证与交易对筛选

### Task 9.1: 验证 Pull Oracle 真实数据

- **操作**:
  1. 启动开发服务器
  2. 在价格查询页面选择 Chaos 预言机
  3. 查询 BTC/USD 价格
  4. 对比 Chaos 价格与 Binance 现货价格（偏差应 < 1%）
  5. 查询 ETH/USD 价格
  6. 对比 Chaos 价格与 Chainlink 价格（偏差应 < 2%）
  7. 测试所有支持链的数据获取
  8. 测试历史数据图表
- **验证**: 所有数据真实可靠

### Task 9.2: 验证 Push Oracle 真实数据（如合约地址可用）

- **操作**:
  1. 通过 Alchemy RPC 调用 Push Oracle 合约
  2. 验证返回的价格数据
  3. 对比 Push Oracle 与 Pull Oracle 价格（应一致）
  4. 对比 Push Oracle 与 Binance 现货价格（偏差应 < 1%）
- **验证**: Push Oracle 数据真实可靠

### Task 9.3: 筛选可用交易对

- **操作**:
  1. 逐一测试 chaosSymbols 中的每个交易对
  2. 记录哪些交易对可以成功获取数据
  3. 移除无法获取数据的交易对
  4. 更新 `chaosSymbols` 和 `CHAOS_AVAILABLE_PAIRS`
  5. 确保前端只显示可获取数据的交易对
- **验证**: 前端不显示无法获取数据的交易对

### Task 9.4: 验证跨预言机对比

- **操作**:
  1. 在跨预言机页面选择 Chaos + Chainlink + Pyth
  2. 查询 BTC/USD 价格
  3. 验证 Chaos 价格与其他预言机价格偏差合理
  4. 验证一致性评级正确
  5. 验证图表正确显示 Chaos 数据线
- **验证**: 跨预言机对比功能正常

### Task 9.5: 验证前端只显示可获取数据的交易对

- **操作**:
  1. 检查 Chaos 交易对列表是否仅包含可获取数据的交易对
  2. 检查跨预言机页面共同币种交集是否正确
  3. 检查价格查询页面币种选择器是否正确筛选
- **验证**: 前端不显示无法获取数据的交易对

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

### Task 10.3: 运行现有测试

- **操作**: 运行 `npm test`
- **验证**: 所有现有测试通过，无回归
