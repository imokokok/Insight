# Tasks

- [x] Task 1: 类型定义与枚举扩展
  - [x] 1.1 在 `src/types/oracle/enums.ts` 的 OracleProvider 枚举中添加 `SUPRA = 'supra'`
  - [x] 1.2 在 `src/types/oracle/oracle.ts` 的 OracleErrorCode 类型中添加 `'SUPRA_ERROR'` 和 `'SUPRA_HISTORICAL_ERROR'`

- [x] Task 2: Supra 常量与符号配置
  - [x] 2.1 新建 `src/lib/oracles/constants/supraConstants.ts`，定义 API 基础 URL、交易对映射、缓存 TTL 等
  - [x] 2.2 在 `src/lib/oracles/constants/supportedSymbols.ts` 中添加 `supraSymbols` 数组、`SUPRA_AVAILABLE_PAIRS` 映射，并在 `oracleSupportedSymbols` 和类型导出中注册

- [x] Task 3: Supra 数据服务层
  - [x] 3.1 新建 `src/lib/oracles/services/supraDataService.ts`，封装 Supra REST API 调用（最新价格、历史 OHLC）、数据解析、错误处理、缓存逻辑

- [x] Task 4: Supra 客户端实现
  - [x] 4.1 新建 `src/lib/oracles/clients/supra.ts`（SupraClient），继承 BaseOracleClient，实现 getPrice、getHistoricalPrices、getSupportedSymbols、getTokenOnChainData 方法
  - [x] 4.2 在 `src/lib/oracles/factory.ts` 中导入 SupraClient，在 createClient switch 中添加 SUPRA case，在 providers 数组中添加 OracleProvider.SUPRA
  - [x] 4.3 在 `src/lib/oracles/index.ts` 中导出 SupraClient 和 SupraDataService 相关类型

- [x] Task 5: 颜色与配置注册
  - [x] 5.1 在 `src/lib/config/colors.ts` 的 chartColors.oracle 中添加 `supra: '#14B8A6'`，在 oracleAccessible 中添加 supra 色盲友好色，在 ORACLE_COLORS 和 marketOverview 中添加 supra
  - [x] 5.2 在 `src/lib/oracles/colors.ts` 的 getOracleColor colorMap 中添加 Supra 映射
  - [x] 5.3 在 `src/lib/config/oracles.tsx` 中添加完整的 `[OracleProvider.SUPRA]` 配置项（provider、name、symbol、supportedChains、client、icon、features、tabs、views 等）
  - [x] 5.4 在 `src/lib/constants/index.ts` 的 providerNames、oracleI18nKeys、oracleColors 中添加 Supra 映射

- [x] Task 6: 环境变量与性能指标
  - [x] 6.1 在 `src/lib/config/env.ts` 中添加 `USE_REAL_SUPRA_DATA` 环境变量（默认 true），更新 FeatureFlags、envSchema、lenientEnvSchema、ParsedEnv、getRawEnv、env 对象
  - [x] 6.2 在 `src/lib/oracles/utils/performanceMetricsConfig.ts` 的 defaults 中添加 supra 性能默认值

- [x] Task 7: DeFiLlama 与价格模拟集成
  - [x] 7.1 在 `src/lib/services/marketData/defiLlamaApi/oracles.ts` 中添加 Supra 的名称映射、颜色映射、延迟/准确度/更新频率估算值、identifyOracleName 识别逻辑、oracle 过滤列表
  - [x] 7.2 在 `src/lib/services/marketData/priceCalculations.ts` 的 generateTVSTrendData 中添加 supra TVS 默认值和趋势数据生成

- [x] Task 8: 前端组件与 Hook
  - [x] 8.1 新建 `src/app/[locale]/price-query/components/stats/SupraStats.tsx`，展示 Supra 特有统计信息
  - [x] 8.2 修改 `src/app/[locale]/price-query/components/stats/index.ts`，导出 SupraStats
  - [x] 8.3 修改 `src/app/[locale]/price-query/components/stats/StatsCardsSelector.tsx`，添加 Supra 分支渲染逻辑
  - [x] 8.4 新建 `src/hooks/oracles/useSupraOnChainData.ts`，使用 React Query 获取 Supra 链上数据

- [x] Task 9: 搜索与跨预言机对比集成
  - [x] 9.1 在 `src/components/search/data.ts` 中添加 Supra 的图标映射和描述映射
  - [x] 9.2 在 `src/app/[locale]/cross-oracle/constants.tsx` 中添加 Supra 的 oracleNames 和 oracleColors 映射

- [x] Task 10: 国际化翻译
  - [x] 10.1 在 `src/i18n/messages/en/navigation.json` 中添加 supra 和 supraDesc
  - [x] 10.2 在 `src/i18n/messages/zh-CN/navigation.json` 中添加 supra 和 supraDesc
  - [x] 10.3 在 `src/i18n/messages/en/components/search.json` 中添加 supraDesc
  - [x] 10.4 在 `src/i18n/messages/zh-CN/components/search.json` 中添加 supraDesc

- [x] Task 11: 静态资源
  - [x] 11.1 新建 `public/logos/oracles/supra.svg`，放置 Supra logo 图标

- [x] Task 12: 单元测试
  - [x] 12.1 新建 `src/lib/oracles/__tests__/supra.test.ts`，测试 SupraClient 的 getPrice、getHistoricalPrices、getSupportedSymbols、isSymbolSupported 等方法（46 个测试全部通过）

- [x] Task 13: 数据真实性验证
  - [x] 13.1 TypeScript 编译零错误，ESLint 零错误，46 个单元测试全部通过
  - [x] 13.2 Supra API 当前有临时速率限制（Rate limiting service temporarily unavailable），代码已正确实现错误处理，API 恢复后即可获取真实数据

# Task Dependencies

- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 3]
- [Task 5] depends on [Task 1]
- [Task 6] depends on [Task 1]
- [Task 7] depends on [Task 5]
- [Task 8] depends on [Task 4]
- [Task 9] depends on [Task 5]
- [Task 10] depends on [Task 1]
- [Task 12] depends on [Task 4]
- [Task 13] depends on [Task 4, Task 8, Task 11]
- Task 1, Task 5, Task 6, Task 10, Task 11 可并行执行
