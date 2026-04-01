# 大文件拆分规范

## Why

代码库中存在两个超过700行的文件，它们混合了核心逻辑与大量模拟数据，降低了代码可读性和可维护性。将模拟数据提取到独立文件中可以提高代码组织性，同时保持合理的拆分粒度。

## What Changes

- 将 `api3DataAggregator.ts` 中的模拟数据提取到独立的 `api3MockData.ts` 文件
- 将 `OracleMarketDataService.ts` 中的默认/模拟数据提取到独立的 `marketDataDefaults.ts` 文件

## Impact

- Affected specs: 无
- Affected code:
  - `src/lib/oracles/api3DataAggregator.ts`
  - `src/lib/oracles/api3MockData.ts` (新建)
  - `src/lib/services/oracle/OracleMarketDataService.ts`
  - `src/lib/services/oracle/marketDataDefaults.ts` (新建)

## ADDED Requirements

### Requirement: API3 模拟数据分离

系统 SHALL 将 API3 数据聚合器中的模拟数据提取到独立文件中，以改善代码组织结构。

#### Scenario: 模拟数据提取成功

- **WHEN** 开发者查看 `api3DataAggregator.ts` 文件
- **THEN** 该文件只包含核心聚合逻辑、缓存机制和数据处理方法
- **AND** 所有模拟数据方法（getMockMarketData, getMockDAPIData, getMockNetworkData 等）的数据定义位于 `api3MockData.ts` 中

### Requirement: 市场数据默认值分离

系统 SHALL 将 Oracle 市场数据服务中的默认数据提取到独立文件中，以改善代码组织结构。

#### Scenario: 默认数据提取成功

- **WHEN** 开发者查看 `OracleMarketDataService.ts` 文件
- **THEN** 该文件只包含类型定义、钩子函数和服务逻辑
- **AND** 所有默认数据常量（DEFAULT_MARKET_SHARE_DATA, DEFAULT_CHAIN_SUPPORT_DATA, TVS_TREND_DATA_BY_RANGE）位于 `marketDataDefaults.ts` 中

## MODIFIED Requirements

无

## REMOVED Requirements

无
