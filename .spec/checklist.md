# Chaos Labs Oracle 集成验证清单

## 一、类型与枚举验证

- [ ] `OracleProvider.CHAOS = 'chaos'` 已添加到枚举
- [ ] `PriceData` 接口包含 Chaos 元数据字段（feedId, expo, signature, pushOracleAddress, dataMode）
- [ ] `OracleErrorCode` 包含 Chaos 相关错误码（CHAOS_ERROR, CHAOS_PUSH_ORACLE_ERROR, CHAOS_PULL_API_ERROR, CHAOS_FEED_NOT_FOUND, CHAOS_API_KEY_MISSING, CHAOS_HISTORICAL_ERROR）
- [ ] 所有类型导出正确

## 二、常量与配置验证

- [ ] `chaosConstants.ts` 包含正确的 API 配置（CHAOS_API_BASE, CHAOS_API_ENDPOINTS）
- [ ] `chaosConstants.ts` 包含正确的 Feed ID 映射（CHAOS_FEED_IDS）
- [ ] `chaosConstants.ts` 包含正确的反向映射（CHAOS_FEED_ID_TO_SYMBOL）
- [ ] `chaosConstants.ts` 包含正确的链可靠性配置（CHAOS_CHAIN_RELABILITY）
- [ ] `chaosConstants.ts` 包含正确的缓存配置（CHAOS_CACHE_TTL）
- [ ] `chaosConstants.ts` 包含正确的 RPC 配置（CHAOS_RPC_CONFIG，Alchemy 优先）
- [ ] `chaosDataSources.ts` 包含 Push Oracle 合约地址映射（CHAOS_PUSH_PRICE_FEEDS）
- [ ] `chaosDataSources.ts` 包含正确的 Push Oracle ABI（与 Chainlink 兼容）
- [ ] `chaosDataSources.ts` 辅助函数正确（getChaosPriceFeed, isChaosPriceFeedSupported, getSupportedSymbols）
- [ ] `supportedSymbols.ts` 包含 `chaosSymbols` 和 `CHAOS_AVAILABLE_PAIRS`
- [ ] `oracleSupportedSymbols` 包含 `chaos` 键
- [ ] `providerNames` 包含 `chaos: 'Chaos'`
- [ ] `oracleColors` 包含 `chaos` 颜色
- [ ] `oracleI18nKeys` 包含 `chaos` 键

## 三、服务层验证

- [ ] `ChaosDataService` 类实现完整
- [ ] Pull Oracle 方法实现正确（getPullPrice, getPullPrices, fetchFromApi）
- [ ] Push Oracle 方法实现正确（getPushPrice, rpcCallWithFallback, ethCall）
- [ ] 统一接口实现正确（getPrice: Push 优先，Pull 降级）
- [ ] 数据解码逻辑正确（复用 Chainlink 解码：decodeLatestRoundData, decodeDecimals, decodeString）
- [ ] 缓存机制工作正常（Push 30s TTL，Pull 10s TTL）
- [ ] 端点健康检查和故障转移工作正常
- [ ] 单例 `chaosDataService` 正确导出
- [ ] Feed ID 转换逻辑正确（symbol → feedId，如 BTC → BTCUSD）
- [ ] API Key 认证正确（Authorization 请求头）

## 四、客户端层验证

- [ ] `ChaosClient` 继承 `BaseOracleClient`
- [ ] `name = OracleProvider.CHAOS`
- [ ] `supportedChains` 包含 7 条 EVM 链 + Solana
- [ ] `getPrice()` 调用 `chaosDataService.getPrice()` 并使用 `withOracleRetry`
- [ ] `getPrice()` 实现双模式降级（Push → Pull）
- [ ] `getHistoricalPrices()` 调用 `binanceMarketService.getHistoricalPricesByHours()`
- [ ] `getSupportedSymbols()` 返回 chaosSymbols
- [ ] `isSymbolSupported()` 正确判断
- [ ] `getSupportedChainsForSymbol()` 正确返回
- [ ] 置信度计算逻辑合理（基于链可靠性、数据模式、数据新鲜度）
- [ ] `OracleClientFactory.createClient()` 包含 CHAOS case
- [ ] `FEATURE_FLAGS.useRealChaosData` 控制真实数据获取
- [ ] `getAllClients()` 包含 CHAOS
- [ ] `getAllSupportedSymbols()` 包含 CHAOS

## 五、配置层验证

- [ ] `env.ts` 包含 `useRealChaosData` 特性开关
- [ ] `env.ts` 的 `serverEnvSchema` 包含 `USE_REAL_CHAOS_DATA`
- [ ] `env.ts` 的 `FEATURE_FLAGS` 默认值包含 `useRealChaosData`
- [ ] `serverEnv.ts` 包含 `CHAOS_CONFIG`（apiKey）
- [ ] `serverEnv.ts` 包含 Chaos 缓存配置
- [ ] `oracles.tsx` 包含完整的 Chaos 配置（基本信息、链支持、图标、市场数据、网络数据、功能特性、标签页）
- [ ] `colors.ts` 包含 Chaos 颜色
- [ ] `colors.ts` (oracles) 包含 Chaos 颜色映射

## 六、Hooks 层验证

- [ ] `useChaosOnChainData` Hook 实现完整
- [ ] React Query 配置正确（staleTime: 60000, gcTime: 300000, refetchInterval: 60000）
- [ ] `useOnChainDataByProvider` 包含 CHAOS case
- [ ] `OnChainDataReturn` 联合类型包含 Chaos 数据类型

## 七、API 路由验证

- [ ] `/api/oracles/chaos?symbol=ETH` 返回正确数据
- [ ] `/api/oracles/chaos?symbol=ETH&period=24` 返回历史数据
- [ ] `/api/oracles/chaos?symbol=ETH&chain=arbitrum` 返回 Arbitrum 链数据
- [ ] `validateProvider` 支持 'chaos'
- [ ] 动态路由 `[provider]` 支持 'chaos'

## 八、UI 组件验证

- [ ] `ChaosStats` 组件正确渲染
- [ ] `ChaosStats` 展示 Chaos 特有指标（数据模式、Feed ID、合约地址、精度、新鲜度、签名状态）
- [ ] `StatsCardsSelector` 包含 CHAOS case
- [ ] Chaos Labs 图标 SVG 正确显示
- [ ] 价格查询页面选择 Chaos 时显示正确统计卡片

## 九、跨预言机页面验证

- [ ] 跨预言机常量包含 Chaos 名称和颜色
- [ ] `useCommonSymbols` 正确计算 Chaos 与其他预言机的共同币种
- [ ] 选择 Chaos + 其他预言机时，价格表正确显示
- [ ] Chaos 数据线在图表中正确显示
- [ ] 一致性评级包含 Chaos 数据

## 十、真实数据验证（核心）

### 10.1 Pull Oracle 验证

- [ ] BTC/USD 价格与 Binance BTC/USDT 现货价格偏差 < 1%
- [ ] ETH/USD 价格与 Binance ETH/USDT 现货价格偏差 < 1%
- [ ] SOL/USD 价格与 Binance SOL/USDT 现货价格偏差 < 1%
- [ ] BNB/USD 价格与 Binance BNB/USDT 现货价格偏差 < 1%
- [ ] AVAX/USD 价格合理
- [ ] LINK/USD 价格合理
- [ ] USDC/USD 价格接近 1.0
- [ ] USDT/USD 价格接近 1.0
- [ ] DAI/USD 价格接近 1.0
- [ ] 时间戳合理（< 5 分钟）
- [ ] expo 值合理（通常为 -8）
- [ ] 签名数据存在（如 API Key 已配置）

### 10.2 Push Oracle 验证（如合约地址可用）

- [ ] BTC/USD Push Oracle 价格与 Pull Oracle 价格一致
- [ ] ETH/USD Push Oracle 价格与 Pull Oracle 价格一致
- [ ] Push Oracle 合约返回有效的 roundId
- [ ] Push Oracle 合约返回有效的 updatedAt 时间戳
- [ ] Push Oracle decimals 返回 8
- [ ] Push Oracle description 返回正确的 Feed 名称

### 10.3 跨预言机对比验证

- [ ] Chaos 价格与 Chainlink 价格偏差 < 2%
- [ ] Chaos 价格与 Pyth 价格偏差 < 2%
- [ ] Chaos 价格与 RedStone 价格偏差 < 2%
- [ ] Chaos 参与一致性评级计算

### 10.4 历史数据验证

- [ ] Chaos 历史数据通过 Binance API 获取
- [ ] 历史数据图表正确显示
- [ ] 历史数据与其他预言机一致

## 十一、前端交易对筛选验证

- [ ] Chaos 交易对列表仅包含可正确获取数据的交易对
- [ ] 无法获取数据的交易对不在前端显示
- [ ] 跨预言机共同币种交集正确排除 Chaos 不支持的币种
- [ ] 价格查询页面币种选择器正确筛选 Chaos 支持的币种
- [ ] 每条链只显示该链可获取数据的交易对

## 十二、错误处理验证

- [ ] Push Oracle 失败时自动降级到 Pull Oracle
- [ ] Pull Oracle 失败时如果 Push 可用则使用 Push
- [ ] 双模式均失败时返回 REAL_DATA_NOT_AVAILABLE 错误
- [ ] Feed 不存在时返回 CHAOS_FEED_NOT_FOUND 错误
- [ ] API Key 缺失时 Pull Oracle 返回 CHAOS_API_KEY_MISSING 错误
- [ ] RPC 调用失败时正确故障转移
- [ ] 重试机制工作正常
- [ ] 错误信息在前端正确显示

## 十三、安全验证

- [ ] CHAOS_API_KEY 仅在服务端使用，不暴露到客户端
- [ ] 价格验证：Chaos 价格与 basePrices 偏差 < 50%
- [ ] 数据新鲜度验证：拒绝过期数据
- [ ] RPC 使用 Alchemy 端点，避免公共节点风险

## 十四、构建与代码质量验证

- [ ] `npm run lint` 无错误
- [ ] TypeScript 类型检查无错误
- [ ] `npm run build` 构建成功
- [ ] 无未使用的导入
- [ ] 无循环依赖
- [ ] 现有测试全部通过
