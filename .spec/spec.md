# Integrate eOracle (EO) Oracle Spec

## Why

项目当前集成了 8 个预言机（Chainlink、Pyth、API3、RedStone、DIA、WINkLink、Supra、TWAP），但缺少 eOracle——基于 EigenLayer 再质押基础设施的以太坊原生预言机。eOracle (EO) 通过 140+ 验证节点和 $2M+ 再质押 ETH 提供经济安全保障，其 ePrice 产品兼容 AggregatorV3Interface（与 Chainlink 相同接口），支持 25+ 链的价格源。集成 eOracle 可以为项目提供基于以太坊验证者集的预言机数据，增强跨预言机价格对比的多样性和安全性。

## What Changes

- 新增 `OracleProvider.EORACLE` 枚举值和 eOracle 相关类型定义
- 新增 `EOracleClient` 继承 `BaseOracleClient`，实现 `getPrice()` 和 `getHistoricalPrices()`
- 新增 `eOracleOnChainService` 通过 Alchemy RPC 读取 eOracle 价格源合约（AggregatorV3Interface 兼容）
- 新增 `eOracleConstants.ts` 包含价格源合约地址、链映射、ABI 等
- 新增 `useEOracleOnChainData` React Hook
- 新增 `EOracleStats` UI 组件展示验证者数量、再质押 ETH、安全指标等
- 修改工厂、配置、常量、颜色、国际化等 25+ 文件以支持 eOracle
- 所有当前交易对价格显示必须来自预言机网络（eOracle 使用链上真实数据），历史数据统一使用 Binance API
- 前端只显示 eOracle 可以正确获取数据的交易对
- 添加 `USE_REAL_EORACLE_DATA` 功能开关（默认 true）

## Impact

- Affected specs: OracleProvider 枚举、PriceData 接口、OracleClientFactory、所有预言机相关页面
- Affected code: src/types/oracle/, src/lib/oracles/, src/lib/config/, src/hooks/oracles/, src/app/price-query/, src/app/cross-oracle/, src/app/cross-chain/, src/i18n/

## ADDED Requirements

### Requirement: eOracle Oracle Provider

系统 SHALL 提供 eOracle (EO) 作为第 9 个预言机提供商。

#### Scenario: 获取 eOracle 实时价格

- **WHEN** 用户请求 eOracle 预言机的 symbol 价格
- **THEN** 系统通过 Alchemy RPC 调用 eOracle 价格源合约的 `latestRoundData()`、`decimals()`、`description()` 方法获取真实链上价格数据
- **AND** 价格数据包含 roundId、answeredInRound、startedAt 等元数据
- **AND** 使用 Alchemy RPC 作为主节点，公共 RPC 作为备用节点，支持自动故障转移

#### Scenario: 获取 eOracle 历史价格

- **WHEN** 用户请求 eOracle 预言机的历史价格
- **THEN** 系统通过 Binance API 获取历史数据（与其他预言机一致）

#### Scenario: eOracle 价格验证

- **WHEN** eOracle 价格获取成功
- **THEN** 价格与 Binance 现货价格偏差 SHALL < 1%（主流交易对 BTC、ETH、USDC、USDT）

### Requirement: eOracle 链上数据展示

系统 SHALL 在价格查询页面展示 eOracle 特有的链上数据指标。

#### Scenario: eOracle 统计卡片

- **WHEN** 用户在价格查询页面选择 eOracle 预言机
- **THEN** 显示验证者数量、再质押 ETH 总量、数据更新频率、价格源描述、Round ID、数据新鲜度

### Requirement: eOracle 跨预言机对比

系统 SHALL 支持 eOracle 与其他 8 个预言机的价格对比。

#### Scenario: 跨预言机价格对比

- **WHEN** 用户在跨预言机页面选择 eOracle + 其他预言机
- **THEN** eOracle 价格参与偏差计算和一致性评级

### Requirement: 仅显示可获取数据的交易对

系统 SHALL 仅在前端显示 eOracle 可以正确获取数据的交易对。

#### Scenario: 交易对筛选

- **WHEN** eOracle 价格源合约不存在或返回无效数据
- **THEN** 该交易对不在前端 eOracle 选项中显示

### Requirement: eOracle 多链支持

系统 SHALL 支持在 eOracle 已部署的多个链上获取价格。

#### Scenario: 多链价格获取

- **WHEN** 用户选择不同链查询 eOracle 价格
- **THEN** 系统使用对应链的 Alchemy RPC 和价格源合约地址获取价格
- **AND** 支持 Ethereum Mainnet、Arbitrum、Base、Optimism、Polygon 等链

### Requirement: 功能开关

系统 SHALL 提供 `USE_REAL_EORACLE_DATA` 环境变量控制是否使用真实链上数据。

#### Scenario: 功能开关控制

- **WHEN** `USE_REAL_EORACLE_DATA=true`（默认）
- **THEN** 使用 Alchemy RPC 读取链上真实数据
- **WHEN** `USE_REAL_EORACLE_DATA=false`
- **THEN** 抛出错误，不使用模拟数据

### Requirement: eOracle 价格源合约地址管理

系统 SHALL 维护 eOracle 在各链上的价格源合约地址映射。

#### Scenario: 合约地址查找

- **WHEN** 系统需要获取某 symbol 在某链上的价格
- **THEN** 从 `EORACLE_PRICE_FEEDS` 映射中查找对应的合约地址
- **AND** 如果找不到，抛出 SYMBOL_NOT_SUPPORTED 错误

## MODIFIED Requirements

### Requirement: OracleProvider 枚举

在 `OracleProvider` 枚举中新增 `EORACLE = 'eoracle'`

### Requirement: PriceData 接口

在 `PriceData` 接口中新增 eOracle 元数据字段（复用 Chainlink 的 roundId、answeredInRound、version、startedAt 字段，因为 eOracle 兼容 AggregatorV3Interface）

### Requirement: OracleClientFactory

在 `OracleClientFactory.createClient()` 中新增 `OracleProvider.EORACLE` case，创建 `EOracleClient` 实例

### Requirement: 颜色配置

在 `chartColors.oracle` 中新增 `eoracle` 颜色配置

### Requirement: 预言机配置

在 `oracleConfigs` 中新增 eOracle 配置项

### Requirement: 支持的币种列表

在 `supportedSymbols.ts` 中新增 `eoracleSymbols` 和 `EORACLE_AVAILABLE_PAIRS`

### Requirement: 搜索配置

在 `searchConfig.ts` 中新增 eOracle 相关搜索项

## Technical Design

### eOracle 价格源合约接口

eOracle 的 ePrice 产品完全兼容 Chainlink 的 AggregatorV3Interface：

```solidity
interface AggregatorV3Interface {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
}
```

### 已验证的合约地址（Ethereum Mainnet）

| Feed       | Address                                    | Decimals |
| ---------- | ------------------------------------------ | -------- |
| BTC/USD    | 0x98BFa01a561d01f7d6ACbcBea71e20b1cAF0D08c | 8        |
| ETH/USD    | 0x5716b9982f3873959a9c6c6aB0F55F10C4EE888E | 8        |
| USDC/USD   | 0x388C2CE48DE519fB57FfDd4b73C2755DCBD6e5DE | 8        |
| USDT/USD   | 0x1B4D2eD5Cc36480c9ed2d86cdd26818c01A494F8 | 8        |
| AVAX/USD   | 0x864fa871a0e753927EA85cd4997a9e5393943827 | 8        |
| BNB/USD    | (从文档获取)                               | 8        |
| wstETH/ETH | 0x6a7c5E1453eD56B89ce05aDad746dcE01723E986 | 8        |
| rsETH/ETH  | 0xC2A8dc68d3F0EFe893FAab3D5414C18CAEDB58F5 | 8        |

### RPC 配置

使用项目已有的 Alchemy RPC 配置，与 Chainlink 相同的模式：

- Alchemy RPC 作为主节点
- 公共 RPC 作为备用节点
- 支持自动故障转移和健康检查

### 数据流

```
用户请求
    |
    v
API Route (/api/oracles/eoracle)
    |
    v
OracleHandlers (验证、缓存)
    |
    v
OracleClientFactory.getClient('eoracle')
    |
    v
EOracleClient.getPrice(symbol, chain)
    |
    v
eOracleOnChainService.getPrice(symbol, chainId)
    |
    v
Alchemy RPC eth_call -> eOracle Price Feed Contract (AggregatorV3Interface)
    |
    v
decode latestRoundData() -> PriceData
```

### 历史数据

eOracle 不提供链上历史数据 API，因此历史数据统一使用 Binance API（与其他预言机一致，通过 `BaseOracleClient.getHistoricalPrices()` 实现）。
