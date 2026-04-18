# Integrate Reflector Oracle Spec

## Why

项目当前集成了 8 个预言机（Chainlink、Pyth、API3、RedStone、DIA、WINkLink、Supra、TWAP），但缺少 Reflector——Stellar/Soroban 网络上的去中心化预言机。Reflector 通过 4-of-7 多签共识节点提供价格源，支持加密货币和外汇价格源，兼容 SEP-40 标准。项目已配置了 Ankr Stellar Soroban RPC 和 Reflector 合约地址（CRYPTO: CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN, FOREX: CBKGDQGJ7GZNK2V2LGIXPR326H7F7K2MMG6WRVZJXYHONI4GJMCJZC），但尚未实现客户端代码。集成 Reflector 可以为项目提供基于 Stellar 网络的预言机数据，增强跨预言机价格对比的多样性和安全性。

## What Changes

- 新增 `OracleProvider.REFLECTOR` 枚举值和 `Blockchain.STELLAR` 枚举值
- 新增 `ReflectorClient` 继承 `BaseOracleClient`，实现 `getPrice()` 和 `getHistoricalPrices()`
- 新增 `ReflectorDataService` 通过 Ankr Stellar Soroban RPC 读取 Reflector 合约数据
- 新增 `reflectorConstants.ts` 包含合约地址、资产映射、缓存配置等
- 新增 `useReflectorOnChainData` React Hook
- 新增 `ReflectorStats` UI 组件展示节点数量、分辨率、数据新鲜度等
- 修改工厂、配置、常量、颜色、国际化等文件以支持 Reflector
- 所有当前交易对价格显示必须来自 Reflector 预言机网络（使用 Soroban RPC 真实数据），历史数据统一使用 Binance API
- 前端只显示 Reflector 可以正确获取数据的交易对
- 使用已有的 `USE_REAL_REFLECTOR_DATA` 功能开关（默认 true）

## Impact

- Affected specs: OracleProvider 枚举、PriceData 接口、OracleClientFactory、所有预言机相关页面
- Affected code: src/types/oracle/, src/lib/oracles/, src/lib/config/, src/hooks/oracles/, src/app/price-query/, src/app/cross-oracle/, src/app/cross-chain/

## ADDED Requirements

### Requirement: Reflector Oracle Provider

系统 SHALL 提供 Reflector 作为第 9 个预言机提供商。

#### Scenario: 获取 Reflector 实时价格

- **WHEN** 用户请求 Reflector 预言机的 symbol 价格
- **THEN** 系统通过 Ankr Stellar Soroban RPC 调用 Reflector 合约的 `lastprice(Asset::Other(Symbol))` 方法获取真实链上价格数据
- **AND** 价格数据包含 timestamp、decimals、resolution 等元数据
- **AND** 使用 Ankr Stellar Soroban RPC 作为主节点，支持超时和重试

#### Scenario: 获取 Reflector 历史价格

- **WHEN** 用户请求 Reflector 预言机的历史价格
- **THEN** 系统通过 Binance API 获取历史数据（与其他预言机一致）

#### Scenario: Reflector 价格验证

- **WHEN** Reflector 价格获取成功
- **THEN** 价格与 Binance 现货价格偏差 SHALL < 1%（主流交易对 BTC、ETH、USDC、USDT）

### Requirement: Reflector 链上数据展示

系统 SHALL 在价格查询页面展示 Reflector 特有的链上数据指标。

#### Scenario: Reflector 统计卡片

- **WHEN** 用户在价格查询页面选择 Reflector 预言机
- **THEN** 显示节点数量（4-of-7 多签）、分辨率（5分钟）、数据新鲜度、基础资产、精度、合约版本

### Requirement: Reflector 跨预言机对比

系统 SHALL 支持 Reflector 与其他 8 个预言机的价格对比。

#### Scenario: 跨预言机价格对比

- **WHEN** 用户在跨预言机页面选择 Reflector + 其他预言机
- **THEN** Reflector 价格参与偏差计算和一致性评级

### Requirement: 仅显示可获取数据的交易对

系统 SHALL 仅在前端显示 Reflector 可以正确获取数据的交易对。

#### Scenario: 交易对筛选

- **WHEN** Reflector 合约不返回某 symbol 的价格数据
- **THEN** 该交易对不在前端 Reflector 选项中显示

### Requirement: Reflector Stellar 链支持

系统 SHALL 支持 Stellar 作为 Reflector 的默认链。

#### Scenario: Stellar 链价格获取

- **WHEN** 用户选择 Stellar 链查询 Reflector 价格
- **THEN** 系统使用 Ankr Stellar Soroban RPC 和 Reflector 合约地址获取价格
- **AND** Reflector 的 supportedChains 仅包含 Stellar（因为 Reflector 是 Stellar 原生预言机）

### Requirement: 功能开关

系统 SHALL 使用已有的 `USE_REAL_REFLECTOR_DATA` 环境变量控制是否使用真实链上数据。

#### Scenario: 功能开关控制

- **WHEN** `USE_REAL_REFLECTOR_DATA=true`（默认）
- **THEN** 使用 Ankr Stellar Soroban RPC 读取链上真实数据
- **WHEN** `USE_REAL_REFLECTOR_DATA=false`
- **THEN** 抛出错误，不使用模拟数据

### Requirement: Reflector 合约接口

系统 SHALL 实现 SEP-40 标准的 Reflector 合约接口调用。

#### Scenario: 合约方法调用

- **WHEN** 系统需要获取某 symbol 的价格
- **THEN** 通过 `simulateTransaction` 调用 `lastprice(Asset::Other(Symbol))` 方法
- **AND** 解析 XDR 响应获取 PriceData（price: i128, timestamp: u64）
- **AND** 实际价格 = price / 10^decimals

## MODIFIED Requirements

### Requirement: OracleProvider 枚举

在 `OracleProvider` 枚举中新增 `REFLECTOR = 'reflector'`

### Requirement: Blockchain 枚举

在 `Blockchain` 枚举中新增 `STELLAR = 'stellar'`

### Requirement: PriceData 接口

在 `PriceData` 接口中新增 Reflector 元数据字段：

- `resolution?: number` — 数据更新分辨率（秒）
- `contractVersion?: number` — 合约版本

### Requirement: OracleClientFactory

在 `OracleClientFactory.createClient()` 中新增 `OracleProvider.REFLECTOR` case，创建 `ReflectorClient` 实例

### Requirement: 颜色配置

在 `chartColors.oracle` 中新增 `reflector` 颜色配置

### Requirement: 预言机配置

在 `oracleConfigs` 中新增 Reflector 配置项

### Requirement: 支持的币种列表

在 `supportedSymbols.ts` 中新增 `reflectorSymbols` 和 `REFLECTOR_AVAILABLE_PAIRS`

## Technical Design

### Reflector 合约接口（SEP-40）

```rust
trait Contract {
    fn base(e: Env) -> Asset;
    fn assets(e: Env) -> Vec<Asset>;
    fn decimals(e: Env) -> u32;
    fn lastprice(e: Env, asset: Asset) -> Option<PriceData>;
    fn prices(e: Env, asset: Asset, records: u32) -> Option<Vec<PriceData>>;
    fn twap(e: Env, asset: Asset, records: u32) -> Option<i128>;
    fn resolution(e: Env) -> u32;
    fn period(e: Env) -> Option<u64>;
    fn last_timestamp(e: Env) -> u64;
    fn version(e: Env) -> u32;
}

enum Asset {
    Stellar(Address),
    Other(Symbol)
}

struct PriceData {
    price: i128,
    timestamp: u64
}
```

### 已配置的合约地址

| 类型   | 合约地址                                                 | 基础资产 | 精度 |
| ------ | -------------------------------------------------------- | -------- | ---- |
| Crypto | CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN | USD      | 14   |
| Forex  | CBKGDQGJ7GZNK2V2LGIXPR326H7F7K2MMG6WRVZJXYHONI4GJMCJZC   | USD      | 14   |

### RPC 配置

使用项目已配置的 Ankr Stellar Soroban RPC：

- `STELLAR_RPC_URL=https://rpc.ankr.com/stellar_soroban/...`

### 已知的支持资产（来自 Reflector 实时价格源）

**Crypto 合约**: BTC, ETH, USDT, XRP, SOL, USDC, ADA, AVAX, DOT, LINK, DAI, ATOM, XLM, UNI, EURC

**Forex 合约**: EUR, GBP, CAD, BRL, JPY, CNY

### 数据流

```
用户请求
    |
    v
API Route (/api/oracles/reflector)
    |
    v
OracleHandlers (验证、缓存)
    |
    v
OracleClientFactory.getClient('reflector')
    |
    v
ReflectorClient.getPrice(symbol, chain)
    |
    v
ReflectorDataService.fetchLatestPrice(symbol)
    |
    v
Ankr Stellar Soroban RPC simulateTransaction -> Reflector Contract (lastprice)
    |
    v
解析 XDR 响应 -> PriceData (price/10^decimals, timestamp)
```

### 历史数据

Reflector 合约提供 `prices(asset, records)` 方法获取最近 N 条记录，但保留期通常只有 24 小时。因此历史数据统一使用 Binance API（与其他预言机一致，通过 `BaseOracleClient.getHistoricalPrices()` 实现）。

### Soroban RPC 调用方式

使用 `@stellar/stellar-sdk` 的 `Server.simulateTransaction()` 方法进行只读调用：

1. 创建 `Server` 实例连接 Ankr RPC
2. 构建 `InvokeHostFunction` 操作调用 Reflector 合约
3. 构建 `Transaction` 并调用 `simulateTransaction()`
4. 解析模拟结果中的 XDR 数据获取返回值
5. 将 i128 价格除以 10^decimals 得到实际价格

### 依赖

需要安装 `@stellar/stellar-sdk` 包（Stellar JavaScript SDK，包含 Soroban RPC 支持）。
