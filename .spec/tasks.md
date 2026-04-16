# TWAP 预言机集成任务分解

## 阶段一：基础设施层（类型、枚举、常量）

### Task 1.1: 新增 OracleProvider.TWAP 枚举值

- **文件**: `src/types/oracle/enums.ts`
- **操作**: 在 `OracleProvider` 枚举中新增 `TWAP = 'twap'`
- **验证**: TypeScript 编译通过

### Task 1.2: 扩展 PriceData 接口

- **文件**: `src/types/oracle/price.ts`
- **操作**: 在 `PriceData` 接口中新增 TWAP 元数据字段
  - `poolAddress?: string`
  - `feeTier?: number`
  - `sqrtPriceX96?: string`
  - `tick?: number`
  - `twapInterval?: number`
  - `twapPrice?: number`
  - `spotPrice?: number`
  - `liquidity?: string`
- **验证**: TypeScript 编译通过

### Task 1.3: 新增 TWAP 错误码

- **文件**: `src/types/oracle/oracle.ts`
- **操作**: 在 `OracleErrorCode` 联合类型中新增：
  - `'TWAP_ERROR'`
  - `'TWAP_POOL_NOT_FOUND'`
  - `'TWAP_INSUFFICIENT_LIQUIDITY'`
  - `'TWAP_OBSERVATION_ERROR'`
  - `'TWAP_HISTORICAL_ERROR'`
- **验证**: TypeScript 编译通过

### Task 1.4: 创建 TWAP 常量文件

- **文件**: `src/lib/oracles/constants/twapConstants.ts`（新建）
- **操作**:
  1. 定义 Uniswap V3 Factory 地址映射（6 条链）
  2. 定义 Fee Tier 常量（500/3000/10000）
  3. 定义 TWAP 时间间隔常量（600/1800/3600）
  4. 定义主流交易对 Pool 地址映射（BTC、ETH、USDC、USDT、DAI、WBTC、LINK、UNI 等在 6 条链上的高流动性 Pool）
  5. 定义 Token 地址映射（WETH、USDC、USDT、WBTC 等在 6 条链上的合约地址）
  6. 定义 RPC 配置（复用 Alchemy RPC，参照 Chainlink 模式）
  7. 定义 Uniswap V3 Pool ABI（slot0、observe、token0、token1、fee、liquidity）
  8. 定义 Uniswap V3 Factory ABI（getPool）
  9. 定义 twapSymbols 数组
  10. 定义 TWAP_AVAILABLE_PAIRS 映射
- **验证**: 所有地址格式正确，ABI 可用于 viem 编码

### Task 1.5: 更新 supportedSymbols.ts

- **文件**: `src/lib/oracles/constants/supportedSymbols.ts`
- **操作**:
  1. 新增 `twapSymbols` 数组（仅包含有真实流动性的交易对）
  2. 新增 `TWAP_AVAILABLE_PAIRS` 映射（按链分组）
  3. 在 `oracleSupportedSymbols` 中新增 `twap: twapSymbols`
  4. 新增 `TwapSymbol` 类型
- **验证**: `getAllSupportedSymbols()` 包含 TWAP 币种

### Task 1.6: 更新全局常量

- **文件**: `src/lib/constants/index.ts`
- **操作**:
  1. 在 `providerNames` 中新增 `twap: 'TWAP'`
  2. 在 `oracleI18nKeys` 中新增 `twap: 'twap'`
  3. 在 `oracleColors` 中新增 `twap` 颜色
- **验证**: 所有引用 providerNames 的地方能正确显示 TWAP

## 阶段二：服务层（链上数据服务）

### Task 2.1: 创建 TwapOnChainService

- **文件**: `src/lib/oracles/services/twapOnChainService.ts`（新建）
- **操作**:
  1. 实现 `TwapOnChainService` 类（参照 `ChainlinkOnChainService` 模式）
  2. 实现 RPC 调用方法：`rpcCallWithFallback`（Alchemy 优先 + 公共节点备用）
  3. 实现 `getTwapPrice()`：调用 Pool.observe() 获取累积 tick，计算 TWAP
  4. 实现 `getSpotPrice()`：调用 Pool.slot0() 获取现货价格
  5. 实现 `getPoolInfo()`：获取 Pool 元数据
  6. 实现 `getPrices()`：批量获取价格
  7. 实现价格计算函数：tick → price、sqrtPriceX96 → price
  8. 实现缓存机制（30s TTL）
  9. 实现端点健康检查和故障转移
  10. 导出单例 `twapOnChainService`
- **验证**: 通过 Alchemy RPC 成功获取 ETH/USDC 的 TWAP 价格

### Task 2.2: 验证 TwapOnChainService 真实数据

- **操作**:
  1. 编写临时测试脚本，调用 `twapOnChainService.getTwapPrice('ETH', 1)`
  2. 对比返回价格与 Binance ETH/USDT 现货价格
  3. 验证偏差 < 1%
  4. 验证时间戳合理（< 5 分钟）
  5. 测试所有 6 条链的数据获取
  6. 测试故障转移机制
- **验证**: 所有主流交易对在所有支持链上都能获取真实数据

## 阶段三：客户端层（TWAPClient）

### Task 3.1: 创建 TWAPClient

- **文件**: `src/lib/oracles/clients/twap.ts`（新建）
- **操作**:
  1. 创建 `TWAPClient` 类，继承 `BaseOracleClient`
  2. 实现 `name = OracleProvider.TWAP`
  3. 实现 `supportedChains`（6 条链）
  4. 实现 `getPrice()`：调用 `twapOnChainService.getTwapPrice()`，使用 `withOracleRetry` 包装
  5. 实现 `getHistoricalPrices()`：调用 `binanceMarketService.getHistoricalPricesByHours()`
  6. 实现 `getSupportedSymbols()`
  7. 实现 `isSymbolSupported()`
  8. 实现 `getSupportedChainsForSymbol()`
  9. 实现置信度计算（基于流动性、TWAP 间隔、链可靠性）
  10. 实现 `convertToPriceData()` 辅助方法
- **验证**: TWAPClient 能正确获取价格和历史数据

### Task 3.2: 注册 TWAP 到工厂

- **文件**: `src/lib/oracles/factory.ts`
- **操作**:
  1. 导入 `TWAPClient`
  2. 在 `createClient()` switch 中新增 `case OracleProvider.TWAP`
  3. 传入 `useRealData: FEATURE_FLAGS.useRealTwapData`
- **验证**: `getOracleClient('twap')` 返回 TWAPClient 实例

### Task 3.3: 更新 oracles/index.ts 导出

- **文件**: `src/lib/oracles/index.ts`
- **操作**:
  1. 导出 `TWAPClient`
  2. 导出 `TwapOnChainService`、`twapOnChainService` 及相关类型
  3. 导出 TWAP 常量
- **验证**: 所有 TWAP 相关导出可被正确引用

## 阶段四：配置层

### Task 4.1: 更新环境变量配置

- **文件**: `src/lib/config/env.ts`
- **操作**:
  1. 在 `ServerFeatureFlags` 中新增 `useRealTwapData: boolean`
  2. 在 `serverEnvSchema` 中新增 `USE_REAL_TWAP_DATA` 字段
  3. 在 `FEATURE_FLAGS` 中新增 `useRealTwapData`
- **验证**: `FEATURE_FLAGS.useRealTwapData` 默认为 true

### Task 4.2: 更新服务端环境变量

- **文件**: `src/lib/config/serverEnv.ts`
- **操作**:
  1. 新增 `TWAP_CACHE_TTL` 配置
  2. 新增 TWAP 相关环境变量（如有需要）
- **验证**: 配置正确读取

### Task 4.3: 更新预言机配置

- **文件**: `src/lib/config/oracles.tsx`
- **操作**:
  1. 在 `oracleConfigs` 中新增 `OracleProvider.TWAP` 配置
  2. 配置基本信息：name='TWAP Oracle', symbol='UNI', defaultChain=Ethereum
  3. 配置 supportedChains（6 条链）
  4. 配置 icon（Uniswap SVG 图标）
  5. 配置 themeColor（#FF007A - Uniswap 粉色）
  6. 配置 marketData（UNI 代币市场数据）
  7. 配置 networkData（Uniswap V3 网络数据）
  8. 配置 features（hasPriceFeeds=true, hasCrossChain=true 等）
  9. 配置 tabs 和 views
  10. 实例化 TWAPClient
- **验证**: `getOracleConfig('twap')` 返回完整配置

### Task 4.4: 更新颜色配置

- **文件**: `src/lib/config/colors.ts`
- **操作**: 在 `chartColors.oracle` 中新增 `twap: '#FF007A'`
- **验证**: TWAP 图表使用正确颜色

### Task 4.5: 更新预言机颜色工具

- **文件**: `src/lib/oracles/colors.ts`
- **操作**: 在 `colorMap` 中新增 `[OracleProvider.TWAP]: chartColors.oracle.twap`
- **验证**: `getOracleColor('twap')` 返回正确颜色

## 阶段五：前端 Hooks 层

### Task 5.1: 创建 useTwapOnChainData Hook

- **文件**: `src/hooks/oracles/useTwapOnChainData.ts`（新建）
- **操作**:
  1. 实现 `useTwapOnChainData` Hook（参照 `useSupraOnChainData` 模式）
  2. 使用 React Query（staleTime: 60000, gcTime: 300000, refetchInterval: 60000）
  3. 获取 TWAP 链上数据：Pool 地址、流动性、Fee Tier、TWAP 间隔、TWAP vs Spot 偏差
  4. 定义 `UseTwapOnChainDataReturn` 类型
- **验证**: Hook 在 React 组件中正确工作

### Task 5.2: 更新 useOnChainDataByProvider

- **文件**: `src/hooks/oracles/useOnChainDataByProvider.ts`
- **操作**:
  1. 导入 `useTwapOnChainData`
  2. 新增 `twapResult` 调用
  3. 在 switch 中新增 `case 'twap': return twapResult`
  4. 更新 `OnChainDataReturn` 联合类型
- **验证**: `useOnChainDataByProvider({ provider: 'twap' })` 正确返回 TWAP 数据

## 阶段六：API 路由层

### Task 6.1: 更新 oracleHandlers 验证

- **文件**: `src/lib/api/oracleHandlers.ts`
- **操作**:
  1. 确保 `validateProvider` 支持 'twap'
  2. 确保 `handleGetPrice` 和 `handleGetHistoricalPrices` 支持 TWAP
- **验证**: `/api/oracles/twap?symbol=ETH` 返回正确数据

### Task 6.2: 更新 Zod 验证 Schema

- **文件**: `src/lib/security/validation.ts` 或相关文件
- **操作**: 确保 `PriceQueryRequestSchema` 的 provider 字段支持 'twap'
- **验证**: API 请求验证通过

## 阶段七：UI 组件层

### Task 7.1: 创建 TwapStats 组件

- **文件**: `src/app/[locale]/price-query/components/stats/TwapStats.tsx`（新建）
- **操作**:
  1. 参照 `ChainlinkStats.tsx` 模式
  2. 展示 TWAP 特有指标：
     - TWAP 价格 vs 现货价格
     - Pool 流动性
     - Fee Tier
     - TWAP 计算间隔
     - 价格偏差
     - Pool 地址
  3. 使用 `useTwapOnChainData` Hook
- **验证**: 组件正确渲染 TWAP 统计数据

### Task 7.2: 更新 StatsCardsSelector

- **文件**: `src/app/[locale]/price-query/components/stats/StatsCardsSelector.tsx`
- **操作**:
  1. 导入 `TwapStats`
  2. 新增 `case OracleProvider.TWAP: return <TwapStats .../>`
- **验证**: 选择 TWAP 预言机时显示 TwapStats

### Task 7.3: 更新 stats/index.ts 导出

- **文件**: `src/app/[locale]/price-query/components/stats/index.ts`
- **操作**: 导出 `TwapStats`
- **验证**: 导出正确

### Task 7.4: 添加 TWAP 图标

- **文件**: `public/logos/oracles/uniswap.svg`（新建）
- **操作**: 添加 Uniswap 图标 SVG
- **验证**: 图标在 UI 中正确显示

## 阶段八：跨预言机页面集成

### Task 8.1: 更新跨预言机常量

- **文件**: `src/app/[locale]/cross-oracle/constants.tsx`
- **操作**:
  1. 在 `oracleNames` 中新增 `twap: 'TWAP'`
  2. 在 `oracleColors` 中新增 `twap: '#FF007A'`
  3. 确保 `tradingPairs` 包含 TWAP 支持的交易对
- **验证**: 跨预言机页面显示 TWAP 选项

### Task 8.2: 更新 useCommonSymbols

- **文件**: `src/app/[locale]/cross-oracle/hooks/useCommonSymbols.ts`
- **操作**: 确保 `oracleSupportedSymbols` 中包含 twap，交集计算正确
- **验证**: 选择 TWAP + 其他预言机时，正确显示共同支持的币种

## 阶段九：国际化

### Task 9.1: 更新英文翻译

- **文件**: `src/i18n/messages/en/navigation.json`
- **操作**: 新增 `twap` 和 `twapDesc` 导航翻译
- **验证**: 英文界面显示 TWAP 导航

### Task 9.2: 更新中文翻译

- **文件**: `src/i18n/messages/zh-CN/navigation.json`
- **操作**: 新增 `twap` 和 `twapDesc` 导航翻译
- **验证**: 中文界面显示 TWAP 导航

### Task 9.3: 更新价格查询翻译

- **文件**: `src/i18n/messages/en/priceQuery.json`, `src/i18n/messages/zh-CN/priceQuery.json`
- **操作**: 新增 TWAP 相关翻译键
- **验证**: 价格查询页面 TWAP 选项正确显示

### Task 9.4: 更新跨预言机翻译

- **文件**: `src/i18n/messages/en/crossOracle.json`, `src/i18n/messages/zh-CN/crossOracle.json`
- **操作**: 新增 TWAP 相关翻译键
- **验证**: 跨预言机页面 TWAP 选项正确显示

### Task 9.5: 更新首页翻译

- **文件**: `src/i18n/messages/en/home.json`, `src/i18n/messages/zh-CN/home.json`
- **操作**: 新增 TWAP 相关翻译键
- **验证**: 首页预言机卡片显示 TWAP

## 阶段十：数据验证与测试

### Task 10.1: 验证 TWAP 真实数据

- **操作**:
  1. 启动开发服务器
  2. 在价格查询页面选择 TWAP 预言机
  3. 查询 ETH/USD 价格
  4. 对比 TWAP 价格与 Binance 现货价格（偏差应 < 1%）
  5. 查询 BTC/USD 价格
  6. 对比 TWAP 价格与 Chainlink 价格（偏差应 < 2%）
  7. 测试所有 6 条链的数据获取
  8. 测试历史数据图表
- **验证**: 所有数据真实可靠

### Task 10.2: 验证跨预言机对比

- **操作**:
  1. 在跨预言机页面选择 TWAP + Chainlink + Pyth
  2. 查询 BTC/USD 价格
  3. 验证 TWAP 价格与其他预言机价格偏差合理
  4. 验证一致性评级正确
  5. 验证图表正确显示 TWAP 数据线
- **验证**: 跨预言机对比功能正常

### Task 10.3: 验证前端只显示可获取数据的交易对

- **操作**:
  1. 检查 TWAP 交易对列表是否仅包含有真实 Pool 的交易对
  2. 检查跨预言机页面共同币种交集是否正确
  3. 检查价格查询页面币种选择器是否正确筛选
- **验证**: 前端不显示无法获取数据的交易对

### Task 10.4: 运行 lint 和 typecheck

- **操作**:
  1. 运行 `npm run lint`
  2. 运行 `npm run typecheck`（或 `npx tsc --noEmit`）
  3. 修复所有错误和警告
- **验证**: 无 lint 错误、无类型错误

### Task 10.5: 构建验证

- **操作**: 运行 `npm run build`
- **验证**: 构建成功，无错误
