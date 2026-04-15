# 集成 Supra 预言机 Spec

## Why

项目当前已集成 6 个预言机（Chainlink、Pyth、API3、RedStone、DIA、WINkLink），需要集成第 7 个预言机 Supra，使项目覆盖更多预言机生态。Supra 采用 DORA 共识机制，提供原生 OHLC 历史数据 REST API，数据获取简单（无需链上交互），且拥有官方 npm SDK（supra-oracle-sdk），能完美融入项目现有的 REST API 客户端模式（类似 RedStone）。

## What Changes

- 在 `OracleProvider` 枚举中添加 `SUPRA = 'supra'`
- 新建 SupraClient 客户端，继承 BaseOracleClient，通过 Supra REST API 获取真实价格数据
- 新建 Supra 数据服务层（supraDataService.ts）和常量配置（supraConstants.ts）
- 在工厂模式、颜色映射、性能指标、DeFiLlama 集成等所有配置中注册 Supra
- 新建 SupraStats 统计卡片组件和 useSupraOnChainData hook
- 更新所有 i18n 翻译文件（en + zh-CN）
- 更新搜索组件数据映射
- 更新跨预言机对比常量
- 更新价格模拟计算（TVS 趋势数据）
- 添加 Supra SVG 图标资源
- 添加环境变量开关（USE_REAL_SUPRA_DATA）
- 添加 OracleErrorCode 中 Supra 相关错误码
- 编写 Supra 客户端单元测试

## Impact

- Affected specs: 预言机核心架构、前端展示层、国际化、搜索系统、跨预言机对比
- Affected code:
  - 类型定义：`src/types/oracle/enums.ts`, `src/types/oracle/oracle.ts`
  - 核心客户端：新建 `src/lib/oracles/clients/supra.ts`
  - 服务层：新建 `src/lib/oracles/services/supraDataService.ts`
  - 常量：新建 `src/lib/oracles/constants/supraConstants.ts`，修改 `supportedSymbols.ts`
  - 工厂：`src/lib/oracles/factory.ts`
  - 导出：`src/lib/oracles/index.ts`
  - 颜色：`src/lib/oracles/colors.ts`, `src/lib/config/colors.ts`
  - 配置：`src/lib/config/oracles.tsx`, `src/lib/config/env.ts`
  - 常量映射：`src/lib/constants/index.ts`
  - DeFiLlama：`src/lib/services/marketData/defiLlamaApi/oracles.ts`
  - 性能指标：`src/lib/oracles/utils/performanceMetricsConfig.ts`
  - 价格计算：`src/lib/services/marketData/priceCalculations.ts`
  - 前端组件：新建 `SupraStats.tsx`，修改 `StatsCardsSelector.tsx`, `index.ts`
  - Hook：新建 `useSupraOnChainData.ts`
  - 搜索：`src/components/search/data.ts`
  - 跨预言机：`src/app/[locale]/cross-oracle/constants.tsx`
  - i18n：`en/navigation.json`, `zh-CN/navigation.json`, `en/components/search.json`, `zh-CN/components/search.json`
  - 图标：新建 `public/logos/oracles/supra.svg`
  - 测试：新建 `src/lib/oracles/__tests__/supra.test.ts`

## ADDED Requirements

### Requirement: Supra 预言机客户端

系统 SHALL 提供 SupraClient 类，继承 BaseOracleClient，实现 IOracleClient 接口，通过 Supra REST API（`https://prod-kline-rest.supra.com/latest`）获取真实价格数据。

#### Scenario: 获取实时价格成功

- **WHEN** 用户调用 `getPrice('BTC')`
- **THEN** 系统从 Supra API 获取最新价格，返回标准 PriceData 对象，包含 price、timestamp、24h 变化等字段

#### Scenario: 获取历史价格成功

- **WHEN** 用户调用 `getHistoricalPrices('BTC', undefined, 24)`
- **THEN** 系统从 Supra History API（`https://prod-kline-rest.supra.com/history`）获取 OHLC 数据，返回 PriceData 数组

#### Scenario: 不支持的交易对

- **WHEN** 用户请求 Supra 不支持的交易对
- **THEN** 系统抛出 SYMBOL_NOT_SUPPORTED 错误

### Requirement: Supra 数据服务

系统 SHALL 提供 SupraDataService，封装 Supra API 的底层调用逻辑，包括最新价格获取、历史 OHLC 数据获取、交易对映射等功能。

### Requirement: Supra 统计卡片

系统 SHALL 提供 SupraStats 组件，在价格查询页面展示 Supra 特有的链上数据统计信息（价格精度、支持链数、数据源、数据年龄、24h 高低等）。

### Requirement: Supra 链上数据 Hook

系统 SHALL 提供 useSupraOnChainData hook，使用 React Query 获取 Supra 代币的链上相关数据，支持自动刷新和缓存。

### Requirement: Supra 预言机配置

系统 SHALL 在 oracleConfigs 中注册完整的 Supra 配置，包括支持的链、功能特性、标签页、视图、图标、主题色等，使其与其他 6 个预言机配置完全对等。

### Requirement: Supra 颜色映射

系统 SHALL 为 Supra 分配唯一的品牌色（#14B8A6 teal），在所有颜色映射（chartColors.oracle、oracleAccessible、ORACLE_COLORS、heatmapColors 等）中注册。

### Requirement: Supra 环境变量开关

系统 SHALL 提供 USE_REAL_SUPRA_DATA 环境变量开关，默认为 true，控制是否使用 Supra 真实数据。

### Requirement: Supra 错误码

系统 SHALL 在 OracleErrorCode 类型中添加 `SUPRA_ERROR` 和 `SUPRA_HISTORICAL_ERROR` 错误码。

### Requirement: Supra DeFiLlama 集成

系统 SHALL 在 DeFiLlama 预言机数据集成中添加 Supra 的名称映射、颜色映射、延迟/准确度/更新频率估算值。

### Requirement: Supra 性能指标默认值

系统 SHALL 在 performanceMetricsConfig 中添加 Supra 的默认性能指标（responseTime: 300, updateFrequency: 60, accuracy: 99.2, reliability: 99.7, dataSources: 100, decentralizationScore: 88, supportedChains: 30）。

### Requirement: Supra TVS 趋势数据

系统 SHALL 在 priceCalculations.ts 的 generateTVSTrendData 函数中添加 Supra 的 TVS 默认值（约 1.2B）和趋势数据生成逻辑。

### Requirement: Supra 国际化

系统 SHALL 在所有 i18n 翻译文件中添加 Supra 相关的翻译键值，包括导航描述、搜索描述等。

### Requirement: Supra 搜索集成

系统 SHALL 在搜索组件中添加 Supra 的图标映射（Sparkles）和描述映射。

### Requirement: Supra 跨预言机对比集成

系统 SHALL 在跨预言机对比常量中添加 Supra 的名称和颜色映射。

### Requirement: 数据真实性验证

集成完成后 SHALL 验证 Supra 返回的价格数据与市场真实价格一致（如 BTC 价格与 Binance/其他预言机价格偏差 < 1%）。

## MODIFIED Requirements

### Requirement: OracleProvider 枚举

在现有 6 个预言机提供商基础上，添加第 7 个 `SUPRA = 'supra'`。

### Requirement: OracleClientFactory

工厂的 createClient 方法、getAllClients 方法、getAllSupportedSymbols 方法均需支持 SUPRA 提供商。

### Requirement: supportedSymbols

添加 supraSymbols 数组和 SUPRA_AVAILABLE_PAIRS 链-交易对映射，并在 oracleSupportedSymbols 中注册。

## REMOVED Requirements

无移除的需求。
