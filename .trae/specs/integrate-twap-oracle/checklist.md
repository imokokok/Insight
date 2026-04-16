# TWAP 预言机集成验证清单

## 一、类型与枚举验证

- [ ] `OracleProvider.TWAP = 'twap'` 已添加到枚举
- [ ] `PriceData` 接口包含 TWAP 元数据字段（poolAddress, feeTier, sqrtPriceX96, tick, twapInterval, twapPrice, spotPrice, liquidity）
- [ ] `OracleErrorCode` 包含 TWAP 相关错误码（TWAP_ERROR, TWAP_POOL_NOT_FOUND, TWAP_INSUFFICIENT_LIQUIDITY, TWAP_OBSERVATION_ERROR, TWAP_HISTORICAL_ERROR）

## 二、常量与配置验证

- [ ] `twapConstants.ts` 包含正确的 Uniswap V3 Factory 地址（6 条链）
- [ ] `twapConstants.ts` 包含正确的 Pool ABI（slot0, observe, token0, token1, fee, liquidity）
- [ ] `twapConstants.ts` 包含正确的 Factory ABI（getPool）
- [ ] `twapConstants.ts` 包含主流交易对 Pool 地址映射
- [ ] `twapConstants.ts` 包含 Token 地址映射
- [ ] `twapConstants.ts` 包含 RPC 配置（Alchemy 优先）
- [ ] `supportedSymbols.ts` 包含 `twapSymbols` 和 `TWAP_AVAILABLE_PAIRS`
- [ ] `oracleSupportedSymbols` 包含 `twap` 键
- [ ] `providerNames` 包含 `twap: 'TWAP'`
- [ ] `oracleColors` 包含 `twap` 颜色
- [ ] `oracleI18nKeys` 包含 `twap` 键

## 三、服务层验证

- [ ] `TwapOnChainService` 类实现完整
- [ ] `rpcCallWithFallback` 实现 Alchemy 优先 + 公共节点备用
- [ ] `getTwapPrice()` 正确调用 Pool.observe() 并计算 TWAP
- [ ] `getSpotPrice()` 正确调用 Pool.slot0()
- [ ] 价格计算公式正确（tick → price, sqrtPriceX96 → price）
- [ ] 缓存机制工作正常（30s TTL）
- [ ] 端点健康检查和故障转移工作正常
- [ ] 单例 `twapOnChainService` 正确导出

## 四、客户端层验证

- [ ] `TWAPClient` 继承 `BaseOracleClient`
- [ ] `name = OracleProvider.TWAP`
- [ ] `supportedChains` 包含 6 条链
- [ ] `getPrice()` 调用 `twapOnChainService.getTwapPrice()` 并使用 `withOracleRetry`
- [ ] `getHistoricalPrices()` 调用 `binanceMarketService.getHistoricalPricesByHours()`
- [ ] `getSupportedSymbols()` 返回 twapSymbols
- [ ] 置信度计算逻辑合理
- [ ] `OracleClientFactory.createClient()` 包含 TWAP case
- [ ] `FEATURE_FLAGS.useRealTwapData` 控制真实数据获取

## 五、配置层验证

- [ ] `env.ts` 包含 `useRealTwapData` 特性开关
- [ ] `serverEnv.ts` 包含 TWAP 缓存配置
- [ ] `oracles.tsx` 包含完整的 TWAP 配置
- [ ] `colors.ts` 包含 TWAP 颜色 `#FF007A`
- [ ] `colors.ts` (oracles) 包含 TWAP 颜色映射

## 六、Hooks 层验证

- [ ] `useTwapOnChainData` Hook 实现完整
- [ ] React Query 配置正确（staleTime: 60000, gcTime: 300000, refetchInterval: 60000）
- [ ] `useOnChainDataByProvider` 包含 TWAP case
- [ ] `OnChainDataReturn` 联合类型包含 TWAP 数据类型

## 七、API 路由验证

- [ ] `/api/oracles/twap?symbol=ETH` 返回正确数据
- [ ] `validateProvider` 支持 'twap'
- [ ] Zod 验证 Schema 支持 'twap'

## 八、UI 组件验证

- [ ] `TwapStats` 组件正确渲染
- [ ] `StatsCardsSelector` 包含 TWAP case
- [ ] Uniswap 图标 SVG 正确显示

## 九、跨预言机页面验证

- [ ] 跨预言机常量包含 TWAP 名称和颜色
- [ ] `useCommonSymbols` 正确计算 TWAP 与其他预言机的共同币种

## 十、国际化验证

- [ ] 英文导航包含 TWAP 翻译
- [ ] 中文导航包含 TWAP 翻译
- [ ] 英文价格查询翻译包含 TWAP 键
- [ ] 中文价格查询翻译包含 TWAP 键

## 十一、真实数据验证

- [ ] ETH/USDC TWAP 价格与 Binance 现货价格偏差 < 1%
- [ ] BTC/USDC TWAP 价格与 Binance 现货价格偏差 < 1%
- [ ] 多链数据获取正常

## 十二、构建验证

- [ ] `npm run lint` 无错误
- [ ] TypeScript 类型检查无错误
- [ ] `npm run build` 构建成功
