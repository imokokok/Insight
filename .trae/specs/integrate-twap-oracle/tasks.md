# Tasks

- [ ] Task 1: 基础设施层 - 类型、枚举、常量
  - [ ] Task 1.1: 在 `src/types/oracle/enums.ts` 的 `OracleProvider` 枚举中新增 `TWAP = 'twap'`
  - [ ] Task 1.2: 在 `src/types/oracle/price.ts` 的 `PriceData` 接口中新增 TWAP 元数据字段（poolAddress, feeTier, sqrtPriceX96, tick, twapInterval, twapPrice, spotPrice, liquidity）
  - [ ] Task 1.3: 在 `src/types/oracle/oracle.ts` 的 `OracleErrorCode` 联合类型中新增 TWAP 错误码（TWAP_ERROR, TWAP_POOL_NOT_FOUND, TWAP_INSUFFICIENT_LIQUIDITY, TWAP_OBSERVATION_ERROR, TWAP_HISTORICAL_ERROR）
  - [ ] Task 1.4: 创建 `src/lib/oracles/constants/twapConstants.ts`，包含 Uniswap V3 Factory 地址、Fee Tier、TWAP 间隔、Pool 地址映射、Token 地址映射、RPC 配置、Pool ABI、Factory ABI、twapSymbols、TWAP_AVAILABLE_PAIRS
  - [ ] Task 1.5: 更新 `src/lib/oracles/constants/supportedSymbols.ts`，新增 twapSymbols、TWAP_AVAILABLE_PAIRS、oracleSupportedSymbols.twap
  - [ ] Task 1.6: 更新 `src/lib/constants/index.ts`，新增 TWAP 到 providerNames、oracleI18nKeys、oracleColors

- [ ] Task 2: 服务层 - TwapOnChainService
  - [ ] Task 2.1: 创建 `src/lib/oracles/services/twapOnChainService.ts`，实现 TwapOnChainService 类（参照 ChainlinkOnChainService 模式），包含 rpcCallWithFallback、getTwapPrice、getSpotPrice、getPoolInfo、getPrices、价格计算函数、缓存、端点健康检查

- [ ] Task 3: 客户端层 - TWAPClient
  - [ ] Task 3.1: 创建 `src/lib/oracles/clients/twap.ts`，实现 TWAPClient 继承 BaseOracleClient（getPrice、getHistoricalPrices、getSupportedSymbols、置信度计算）
  - [ ] Task 3.2: 更新 `src/lib/oracles/factory.ts`，注册 TWAPClient 到工厂
  - [ ] Task 3.3: 更新 `src/lib/oracles/index.ts`，新增 TWAP 相关导出

- [ ] Task 4: 配置层
  - [ ] Task 4.1: 更新 `src/lib/config/env.ts`，新增 useRealTwapData 特性开关
  - [ ] Task 4.2: 更新 `src/lib/config/serverEnv.ts`，新增 TWAP 缓存配置
  - [ ] Task 4.3: 更新 `src/lib/config/oracles.tsx`，新增 TWAP 完整配置
  - [ ] Task 4.4: 更新 `src/lib/config/colors.ts`，新增 TWAP 颜色 #FF007A
  - [ ] Task 4.5: 更新 `src/lib/oracles/colors.ts`，新增 TWAP 颜色映射

- [ ] Task 5: 前端 Hooks 层
  - [ ] Task 5.1: 创建 `src/hooks/oracles/useTwapOnChainData.ts`，实现 useTwapOnChainData Hook
  - [ ] Task 5.2: 更新 `src/hooks/oracles/useOnChainDataByProvider.ts`，新增 TWAP case

- [ ] Task 6: API 路由层
  - [ ] Task 6.1: 更新 `src/lib/api/oracleHandlers.ts`，确保 validateProvider 支持 twap
  - [ ] Task 6.2: 更新 Zod 验证 Schema，确保 provider 字段支持 twap

- [ ] Task 7: UI 组件层
  - [ ] Task 7.1: 创建 `src/app/[locale]/price-query/components/stats/TwapStats.tsx`
  - [ ] Task 7.2: 更新 `src/app/[locale]/price-query/components/stats/StatsCardsSelector.tsx`，新增 TWAP case
  - [ ] Task 7.3: 更新 `src/app/[locale]/price-query/components/stats/index.ts`，导出 TwapStats
  - [ ] Task 7.4: 添加 `public/logos/oracles/uniswap.svg` 图标

- [ ] Task 8: 跨预言机页面集成
  - [ ] Task 8.1: 更新 `src/app/[locale]/cross-oracle/constants.tsx`，新增 TWAP 颜色和名称
  - [ ] Task 8.2: 更新 `src/app/[locale]/cross-oracle/hooks/useCommonSymbols.ts`，支持 TWAP 币种交集

- [ ] Task 9: 国际化
  - [ ] Task 9.1: 更新英文翻译（navigation.json, priceQuery.json, crossOracle.json, home.json）
  - [ ] Task 9.2: 更新中文翻译（navigation.json, priceQuery.json, crossOracle.json, home.json）

- [ ] Task 10: 数据验证与构建
  - [ ] Task 10.1: 验证 TWAP 真实数据（价格偏差 < 1%）
  - [ ] Task 10.2: 运行 lint 和 typecheck
  - [ ] Task 10.3: 构建验证

# Task Dependencies

- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 1]
- [Task 5] depends on [Task 3]
- [Task 6] depends on [Task 3]
- [Task 7] depends on [Task 5]
- [Task 8] depends on [Task 3]
- [Task 9] depends on [Task 4]
- [Task 10] depends on [Task 7, Task 8, Task 9]
- [Task 1.4, 1.5, 1.6] can run in parallel
- [Task 4.1, 4.2, 4.3, 4.4, 4.5] can run in parallel
- [Task 9.1, 9.2] can run in parallel
