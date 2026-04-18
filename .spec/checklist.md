# Reflector Oracle 集成验证清单

## 一、类型与枚举验证

- [ ] `OracleProvider.REFLECTOR = 'reflector'` 已添加到枚举
- [ ] `Blockchain.STELLAR = 'stellar'` 已添加到枚举
- [ ] `PriceData` 接口包含 Reflector 元数据字段（resolution, contractVersion）
- [ ] 所有类型导出正确

## 二、常量与配置验证

- [ ] `reflectorConstants.ts` 包含正确的合约地址（CRYPTO, FOREX）
- [ ] `reflectorConstants.ts` 包含正确的资产列表（REFLECTOR_CRYPTO_ASSETS, REFLECTOR_FOREX_ASSETS）
- [ ] `reflectorConstants.ts` 包含正确的资产到合约映射
- [ ] `reflectorConstants.ts` 包含正确的缓存配置（REFLECTOR_CACHE_TTL）
- [ ] `reflectorConstants.ts` 包含正确的网络配置（STELLAR_NETWORK_PASSPHRASE）
- [ ] `supportedSymbols.ts` 包含 `reflectorSymbols` 和 `REFLECTOR_AVAILABLE_PAIRS`
- [ ] `oracleSupportedSymbols` 包含 `reflector` 键

## 三、服务层验证

- [ ] `ReflectorDataService` 类实现完整
- [ ] `fetchLatestPrice` 方法通过 Soroban RPC 成功获取价格
- [ ] `fetchDecimals` 方法返回正确精度（14）
- [ ] `fetchResolution` 方法返回正确分辨率（300秒）
- [ ] `fetchVersion` 方法返回合约版本
- [ ] `fetchAssets` 方法返回支持的资产列表
- [ ] `fetchLastTimestamp` 方法返回最近更新时间
- [ ] `simulateContractCall` 方法正确构建和模拟交易
- [ ] XDR 解析逻辑正确（PriceData 结构体、Asset 枚举）
- [ ] 缓存机制工作正常（价格 30s TTL，元数据 300s TTL）
- [ ] 错误处理正确（超时、RPC 不可用、合约错误）
- [ ] 单例 `getReflectorDataService()` 正确导出

## 四、客户端层验证

- [ ] `ReflectorClient` 继承 `BaseOracleClient`
- [ ] `name = OracleProvider.REFLECTOR`
- [ ] `supportedChains` 包含 `Blockchain.STELLAR`
- [ ] `getPrice()` 调用 `reflectorDataService.fetchLatestPrice()` 并使用 `withOracleRetry`
- [ ] `getHistoricalPrices()` 调用 `binanceMarketService.getHistoricalPricesByHours()`
- [ ] `getSupportedSymbols()` 返回 reflectorSymbols
- [ ] `isSymbolSupported()` 正确判断
- [ ] `getSupportedChainsForSymbol()` 正确返回
- [ ] 置信度计算逻辑合理（基于数据新鲜度、节点共识）
- [ ] `OracleClientFactory.createClient()` 包含 REFLECTOR case
- [ ] `FEATURE_FLAGS.useRealReflectorData` 控制真实数据获取
- [ ] `getAllClients()` 包含 REFLECTOR
- [ ] `getAllSupportedSymbols()` 包含 REFLECTOR

## 五、配置层验证

- [ ] `oracles.tsx` 包含完整的 Reflector 配置（基本信息、链支持、图标、市场数据、网络数据、功能特性、标签页）
- [ ] `colors.ts` 包含 Reflector 颜色
- [ ] `colors.ts` (oracles) 包含 Reflector 颜色映射
- [ ] `env.ts` 已有 `useRealReflectorData` 特性开关
- [ ] `serverEnv.ts` 已有 `STELLAR_CONFIG` 配置

## 六、Hooks 层验证

- [ ] `useReflectorOnChainData` Hook 实现完整
- [ ] React Query 配置正确（staleTime: 60000, gcTime: 300000, refetchInterval: 60000）
- [ ] `useOnChainDataByProvider` 包含 REFLECTOR case
- [ ] `OnChainDataReturn` 联合类型包含 Reflector 数据类型

## 七、API 路由验证

- [ ] `/api/oracles/reflector?symbol=ETH` 返回正确数据
- [ ] `/api/oracles/reflector?symbol=ETH&period=24` 返回历史数据
- [ ] `validateProvider` 支持 'reflector'
- [ ] 动态路由 `[provider]` 支持 'reflector'

## 八、UI 组件验证

- [ ] `ReflectorStats` 组件正确渲染
- [ ] `ReflectorStats` 展示 Reflector 特有指标（节点共识、分辨率、新鲜度、基础资产、精度、合约版本）
- [ ] `StatsCardsSelector` 包含 REFLECTOR case
- [ ] Reflector 图标 SVG 正确显示
- [ ] 价格查询页面选择 Reflector 时显示正确统计卡片

## 九、跨预言机页面验证

- [ ] 跨预言机常量包含 Reflector 名称和颜色
- [ ] `useCommonSymbols` 正确计算 Reflector 与其他预言机的共同币种
- [ ] 选择 Reflector + 其他预言机时，价格表正确显示
- [ ] Reflector 数据线在图表中正确显示
- [ ] 一致性评级包含 Reflector 数据

## 十、真实数据验证（核心）

### 10.1 Crypto 价格验证

- [ ] BTC/USD 价格与 Binance BTC/USDT 现货价格偏差 < 1%
- [ ] ETH/USD 价格与 Binance ETH/USDT 现货价格偏差 < 1%
- [ ] SOL/USD 价格合理
- [ ] XRP/USD 价格合理
- [ ] USDC/USD 价格接近 1.0
- [ ] USDT/USD 价格接近 1.0
- [ ] DAI/USD 价格接近 1.0
- [ ] AVAX/USD 价格合理
- [ ] DOT/USD 价格合理
- [ ] LINK/USD 价格合理
- [ ] ADA/USD 价格合理
- [ ] ATOM/USD 价格合理
- [ ] XLM/USD 价格合理
- [ ] UNI/USD 价格合理
- [ ] 时间戳合理（< 5 分钟）
- [ ] decimals 返回 14

### 10.2 跨预言机对比验证

- [ ] Reflector 价格与 Chainlink 价格偏差 < 2%
- [ ] Reflector 价格与 Pyth 价格偏差 < 2%
- [ ] Reflector 参与一致性评级计算

### 10.3 历史数据验证

- [ ] Reflector 历史数据通过 Binance API 获取
- [ ] 历史数据图表正确显示
- [ ] 历史数据与其他预言机一致

## 十一、前端交易对筛选验证

- [ ] Reflector 交易对列表仅包含可正确获取数据的交易对
- [ ] 无法获取数据的交易对不在前端显示
- [ ] 跨预言机共同币种交集正确排除 Reflector 不支持的币种
- [ ] 价格查询页面币种选择器正确筛选 Reflector 支持的币种

## 十二、错误处理验证

- [ ] RPC 调用失败时正确返回错误
- [ ] 合约返回 None 时正确处理（资产不存在）
- [ ] 重试机制工作正常
- [ ] 错误信息在前端正确显示
- [ ] USE_REAL_REFLECTOR_DATA=false 时抛出错误

## 十三、构建与代码质量验证

- [ ] `npm run lint` 无错误
- [ ] TypeScript 类型检查无错误
- [ ] `npm run build` 构建成功
- [ ] 无未使用的导入
- [ ] 无循环依赖
