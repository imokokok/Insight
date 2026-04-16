# Integrate TWAP Oracle Spec

## Why

项目当前集成了 7 个预言机（Chainlink、Pyth、API3、RedStone、DIA、WINkLink、Supra），但缺少基于 Uniswap V3 TWAP 的链上价格数据源。TWAP 提供完全链上、无需信任、抗操纵性强的价格数据，通过 Alchemy RPC 读取 Uniswap V3 Pool 合约获取真实数据，是预言机生态的重要补充。

## What Changes

- 新增 `OracleProvider.TWAP` 枚举值和 TWAP 相关类型定义
- 新增 `TWAPClient` 继承 `BaseOracleClient`，实现 `getPrice()` 和 `getHistoricalPrices()`
- 新增 `TwapOnChainService` 通过 Alchemy RPC 读取 Uniswap V3 Pool 合约数据
- 新增 `twapConstants.ts` 包含 Factory 地址、Pool 地址、Token 地址、ABI 等
- 新增 `useTwapOnChainData` React Hook
- 新增 `TwapStats` UI 组件
- 修改工厂、配置、常量、颜色、国际化等 20+ 文件以支持 TWAP
- 所有当前交易对价格显示来自预言机网络，历史数据统一使用 Binance API
- 前端只显示可以正确获取数据的交易对

## Impact

- Affected specs: OracleProvider 枚举、PriceData 接口、OracleClientFactory、所有预言机相关页面
- Affected code: src/types/oracle/, src/lib/oracles/, src/lib/config/, src/hooks/oracles/, src/app/[locale]/price-query/, src/app/[locale]/cross-oracle/, src/i18n/

## ADDED Requirements

### Requirement: TWAP Oracle Provider

系统 SHALL 提供 TWAP（Uniswap V3 时间加权平均价格）作为第 8 个预言机提供商。

#### Scenario: 获取 TWAP 实时价格

- **WHEN** 用户请求 TWAP 预言机的 symbol 价格
- **THEN** 系统通过 Alchemy RPC 调用 Uniswap V3 Pool 合约的 observe() 和 slot0() 方法获取真实链上 TWAP 价格

#### Scenario: 获取 TWAP 历史价格

- **WHEN** 用户请求 TWAP 预言机的历史价格
- **THEN** 系统通过 Binance API 获取历史数据（与其他预言机一致）

#### Scenario: TWAP 价格验证

- **WHEN** TWAP 价格获取成功
- **THEN** 价格与 Binance 现货价格偏差 SHALL < 1%（主流交易对）

### Requirement: TWAP 链上数据展示

系统 SHALL 在价格查询页面展示 TWAP 特有的链上数据指标。

#### Scenario: TWAP 统计卡片

- **WHEN** 用户在价格查询页面选择 TWAP 预言机
- **THEN** 显示 TWAP 价格 vs 现货价格、Pool 流动性、Fee Tier、TWAP 计算间隔、价格偏差

### Requirement: TWAP 跨预言机对比

系统 SHALL 支持TWAP 与其他 7 个预言机的价格对比。

#### Scenario: 跨预言机价格对比

- **WHEN** 用户在跨预言机页面选择 TWAP + 其他预言机
- **THEN** TWAP 价格参与偏差计算和一致性评级

### Requirement: 仅显示可获取数据的交易对

系统 SHALL 仅在前端显示 TWAP 可以正确获取数据的交易对。

#### Scenario: 交易对筛选

- **WHEN** TWAP Pool 不存在或流动性不足
- **THEN** 该交易对不在前端 TWAP 选项中显示

## MODIFIED Requirements

### Requirement: OracleProvider 枚举

在 `OracleProvider` 枚举中新增 `TWAP = 'twap'`

### Requirement: PriceData 接口

在 `PriceData` 接口中新增 TWAP 元数据字段：poolAddress, feeTier, sqrtPriceX96, tick, twapInterval, twapPrice, spotPrice, liquidity

### Requirement: OracleClientFactory

在 `createClient()` 方法中新增 `OracleProvider.TWAP` case，创建 `TWAPClient` 实例

## REMOVED Requirements

无
