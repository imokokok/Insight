# 价格查询功能代码深度检查 Spec

## Why
价格查询功能是预言机系统的核心功能，代码质量直接影响数据的准确性和可靠性。通过深度检查发现多处逻辑问题、错误处理不一致、缓存策略混乱等问题，需要系统性地修复以提高代码质量和系统稳定性。

## What Changes
- 修复错误处理不一致问题，统一各 Oracle Client 的错误处理策略
- 修复缓存策略混乱问题，统一缓存层级和 TTL 配置
- 修复方法命名和注释不准确问题
- 修复硬编码值和魔法数字问题
- 修复数据验证缺失问题
- 优化 fallback 逻辑，避免重复调用
- **BREAKING**: BandProtocolClient.getPrice 不再返回 price: 0 的默认数据，改为抛出错误

## Impact
- Affected specs: oracle-price-query, oracle-error-handling, oracle-caching
- Affected code:
  - `src/lib/services/oracle/clients/dia.ts`
  - `src/lib/services/oracle/clients/chainlink.ts`
  - `src/lib/services/oracle/clients/pyth.ts`
  - `src/lib/services/oracle/clients/redstone.ts`
  - `src/lib/services/oracle/clients/band.ts`
  - `src/lib/services/marketData/binanceMarketService.ts`
  - `src/lib/oracles/base.ts`

## ADDED Requirements

### Requirement: 统一错误处理策略
系统 SHALL 提供一致的错误处理机制，所有 Oracle Client 在获取价格失败时 SHALL 抛出包含明确错误码的 OracleError。

#### Scenario: 价格获取失败
- **WHEN** 任何 Oracle Client 无法获取价格数据
- **THEN** 系统 SHALL 抛出带有明确错误码的 OracleError，而不是返回默认值或空数据

#### Scenario: Binance fallback 失败
- **WHEN** 主数据源失败后尝试 Binance fallback 也失败
- **THEN** 系统 SHALL 记录两个数据源的失败信息，抛出包含完整上下文的错误

### Requirement: 统一缓存策略
系统 SHALL 在 BaseOracleClient 层统一实现缓存逻辑，各具体 Client SHALL NOT 自行实现独立的缓存机制。

#### Scenario: 价格数据缓存
- **WHEN** 成功获取价格数据
- **THEN** 系统 SHALL 使用统一的缓存策略进行缓存，包括 TTL 和缓存键格式

#### Scenario: 缓存失效
- **WHEN** 缓存数据过期或被清除
- **THEN** 系统 SHALL 重新从数据源获取数据并更新缓存

### Requirement: 数据验证
系统 SHALL 对所有外部 API 返回的数据进行验证，确保数据完整性和有效性。

#### Scenario: API 响应验证
- **WHEN** 从外部 API 获取数据
- **THEN** 系统 SHALL 验证响应数据的完整性和有效性，无效数据 SHALL 被拒绝

#### Scenario: 价格合理性检查
- **WHEN** 获取到价格数据
- **THEN** 系统 SHALL 检查价格是否在合理范围内（非零、非负、非 NaN）

### Requirement: 方法命名准确性
系统 SHALL 确保方法名称准确反映其实现逻辑，避免误导性命名。

#### Scenario: 数据源命名
- **WHEN** 方法从特定数据源获取数据
- **THEN** 方法名称 SHALL 准确反映数据源名称

### Requirement: 配置常量化
系统 SHALL 将硬编码值提取为配置常量，便于维护和调整。

#### Scenario: Confidence 值配置
- **WHEN** 设置价格数据的 confidence 值
- **THEN** 系统 SHALL 使用配置常量而非硬编码值

#### Scenario: 超时配置
- **WHEN** 发起 API 请求
- **THEN** 系统 SHALL 使用统一的超时配置常量

## MODIFIED Requirements

### Requirement: BandProtocolClient.getPrice 行为变更
BandProtocolClient.getPrice 方法 SHALL 在无法获取价格时抛出错误，而不是返回 price: 0 的默认数据。

#### Scenario: BAND 代币价格获取
- **WHEN** 查询 BAND 代币价格且 Binance API 可用
- **THEN** 系统 SHALL 返回从 Binance 获取的价格数据

#### Scenario: 非 BAND 代币价格获取
- **WHEN** 查询非 BAND 代币价格
- **THEN** 系统 SHALL 抛出明确的不支持错误，而不是返回 price: 0

### Requirement: 历史价格获取一致性
所有 Oracle Client 的 getHistoricalPrices 方法 SHALL 返回一致的响应格式和错误处理策略。

#### Scenario: 无历史数据
- **WHEN** 无法获取历史价格数据
- **THEN** 系统 SHALL 根据配置决定返回空数组或抛出错误，保持各 Client 一致

## REMOVED Requirements

### Requirement: 无效默认数据返回
**Reason**: 返回 price: 0 或空数据的默认值会掩盖实际问题，导致下游系统做出错误决策
**Migration**: 调用方需要处理 OracleError 异常，而不是依赖默认值

---

## 发现的具体问题清单

### 1. DIA Client 问题

| 问题 | 严重程度 | 位置 | 描述 |
|------|----------|------|------|
| 错误处理不完整 | 高 | `getPrice` L106-147 | 当 DIA 代币查询 Binance 失败时，继续尝试 DIA 服务，但错误信息可能丢失 |
| 未使用基类缓存 | 中 | 整个文件 | DIAClient 没有使用 BaseOracleClient 提供的数据库缓存功能 |
| 硬编码 confidence | 低 | 多处 | confidence 值硬编码为 0.95-0.98 |

### 2. Chainlink Client 问题

| 问题 | 严重程度 | 位置 | 描述 |
|------|----------|------|------|
| 方法命名误导 | 中 | `getHistoricalPricesFromCoinGecko` L418 | 方法名暗示从 CoinGecko 获取，但实际使用 CoinGecko 服务 |
| 日志信息错误 | 中 | L162 | 日志显示 "Using Binance real historical data"，但实际使用 CoinGecko |
| 错误处理不一致 | 中 | `getHistoricalPrices` | 返回空数组而非抛出错误 |

### 3. Pyth Client 问题

| 问题 | 严重程度 | 位置 | 描述 |
|------|----------|------|------|
| 日志信息错误 | 中 | L145 | 日志显示 "trying Binance..."，但实际使用 CoinGecko |
| 无效置信区间 | 低 | `generateConfidenceInterval` L52 | 使用固定因子 1.0，置信区间没有实际意义 |

### 4. RedStone Client 问题

| 问题 | 严重程度 | 位置 | 描述 |
|------|----------|------|------|
| 双重 fallback 调用 | 高 | `getPrice` L384-441 | catch 块中再次尝试 Binance fallback，可能导致重复调用 |
| 独立缓存实现 | 中 | 整个文件 | 实现了独立的缓存机制，未使用基类功能 |
| 时间戳转换冗余 | 低 | L29-41 | 提供了两个方向的转换函数，但只使用了一个 |

### 5. Band Protocol Client 问题

| 问题 | 严重程度 | 位置 | 描述 |
|------|----------|------|------|
| 返回无效默认数据 | 高 | `getPrice` L99-106 | 返回 price: 0 的默认数据，可能误导调用方 |
| 错误处理不一致 | 中 | 多处 | 部分方法抛出错误，部分返回空数组 |

### 6. Binance Market Service 问题

| 问题 | 严重程度 | 位置 | 描述 |
|------|----------|------|------|
| 返回不完整数据 | 中 | `getTokenMarketData` L387-405 | marketCap、marketCapRank 等字段返回 0，可能误导调用方 |
| 缺少数据验证 | 中 | 多处 | 没有验证 API 返回的数据是否有效 |

### 7. Base Oracle Client 问题

| 问题 | 严重程度 | 位置 | 描述 |
|------|----------|------|------|
| 数据库缓存未被使用 | 中 | 整个文件 | 提供了数据库缓存功能，但各 Client 未使用 |
| 验证逻辑不一致 | 中 | `validatePriceData` | 只有 config.validateData 为 true 时才验证 |
