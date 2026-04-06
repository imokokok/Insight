# 简化预言机页面 Spec

## Why
项目决定聚焦于价格查询和对比功能，需要移除十个预言机专属页面的所有前端组件代码以及获取每个预言机特性的代码，只保留每个预言机价格获取功能。这样可以简化代码库，减少维护成本，专注于核心价格查询功能。

## What Changes
- **BREAKING**: 移除十个预言机专属页面的所有前端组件（Hero、Sidebar、各个 View 组件等）
- **BREAKING**: 移除获取预言机特性数据的代码（网络统计、验证者、治理等）
- **保留**: 每个预言机的价格获取功能（通过 Binance API）
- **保留**: UMA 预言机的信息获取功能（前端组件删除，但数据获取保留）
- **保留**: 调用 Binance API 获取每个预言机代币价值的代码

## Impact
- Affected specs: oracle-pages, oracle-components, oracle-data-fetching
- Affected code:
  - `src/app/[locale]/api3/` - 整个目录
  - `src/app/[locale]/band-protocol/` - 整个目录
  - `src/app/[locale]/chainlink/` - 整个目录
  - `src/app/[locale]/chronicle/` - 整个目录
  - `src/app/[locale]/dia/` - 整个目录
  - `src/app/[locale]/pyth/` - 整个目录
  - `src/app/[locale]/redstone/` - 整个目录
  - `src/app/[locale]/tellor/` - 整个目录
  - `src/app/[locale]/uma/` - 整个目录（组件删除，保留数据获取）
  - `src/app/[locale]/winklink/` - 整个目录
  - `src/lib/services/oracle/clients/*.ts` - 保留价格获取方法
  - `src/lib/services/marketData/binanceMarketService.ts` - 保留

## ADDED Requirements

### Requirement: 保留价格获取功能
系统 SHALL 保留所有预言机的价格获取功能，确保价格查询和对比功能正常工作。

#### Scenario: 获取 API3 价格
- **WHEN** 调用 API3Client.getPrice()
- **THEN** 系统 SHALL 返回 API3 代币的当前价格

#### Scenario: 获取历史价格
- **WHEN** 调用任意 OracleClient.getHistoricalPrices()
- **THEN** 系统 SHALL 返回该代币的历史价格数据

### Requirement: 保留 UMA 数据获取功能
系统 SHALL 保留 UMA 预言机的数据获取功能，即使其前端组件被删除。

#### Scenario: 获取 UMA 价格
- **WHEN** 调用 UMAClient.getPrice()
- **THEN** 系统 SHALL 返回 UMA 代币的当前价格

#### Scenario: 获取 UMA 网络统计
- **WHEN** 调用 UMAClient 的其他数据获取方法
- **THEN** 系统 SHALL 返回相应的数据

### Requirement: 保留 Binance API 调用
系统 SHALL 保留通过 Binance API 获取代币市场数据的功能。

#### Scenario: 获取代币市场数据
- **WHEN** 调用 binanceMarketService.getTokenMarketData()
- **THEN** 系统 SHALL 返回该代币的市场数据

## MODIFIED Requirements

### Requirement: Oracle Client 接口
Oracle Client 接口 SHALL 只保留价格相关方法，移除其他特性方法。

#### Scenario: API3Client 方法
- **BEFORE**: 包含 getAirnodeNetworkStats, getDapiCoverage, getStakingData 等方法
- **AFTER**: 只保留 getPrice, getHistoricalPrices 方法

#### Scenario: ChainlinkClient 方法
- **BEFORE**: 包含网络统计、节点数据等方法
- **AFTER**: 只保留价格相关方法

## REMOVED Requirements

### Requirement: 十个预言机专属页面
**Reason**: 项目聚焦于价格查询和对比功能，不再需要单独的预言机详情页面
**Migration**: 使用价格查询页面和跨预言机对比页面替代

### Requirement: 预言机特性数据获取
**Reason**: 不再需要显示预言机的网络统计、验证者、治理等详细信息
**Migration**: 删除相关代码，只保留价格获取功能

### Requirement: UMA 前端组件
**Reason**: 项目聚焦于价格查询功能，UMA 页面组件不再需要
**Migration**: 删除 UMA 页面组件，但保留数据获取功能供其他模块使用

---

## 十个预言机清单

1. **API3** (`src/app/[locale]/api3/`)
2. **Band Protocol** (`src/app/[locale]/band-protocol/`)
3. **Chainlink** (`src/app/[locale]/chainlink/`)
4. **Chronicle** (`src/app/[locale]/chronicle/`)
5. **DIA** (`src/app/[locale]/dia/`)
6. **Pyth** (`src/app/[locale]/pyth/`)
7. **RedStone** (`src/app/[locale]/redstone/`)
8. **Tellor** (`src/app/[locale]/tellor/`)
9. **UMA** (`src/app/[locale]/uma/`) - 特殊处理：删除组件，保留数据获取
10. **Winklink** (`src/app/[locale]/winklink/`)

## 需要保留的核心文件

### 价格获取服务
- `src/lib/services/marketData/binanceMarketService.ts` - Binance API 服务
- `src/lib/services/oracle/clients/api3.ts` - 保留 getPrice, getHistoricalPrices
- `src/lib/services/oracle/clients/band.ts` - 保留 getPrice, getHistoricalPrices
- `src/lib/services/oracle/clients/chainlink.ts` - 保留 getPrice, getHistoricalPrices
- `src/lib/services/oracle/clients/chronicle.ts` - 保留 getPrice, getHistoricalPrices
- `src/lib/services/oracle/clients/dia.ts` - 保留 getPrice, getHistoricalPrices
- `src/lib/services/oracle/clients/pyth.ts` - 保留 getPrice, getHistoricalPrices
- `src/lib/services/oracle/clients/redstone.ts` - 保留 getPrice, getHistoricalPrices
- `src/lib/services/oracle/clients/tellor.ts` - 保留 getPrice, getHistoricalPrices
- `src/lib/services/oracle/clients/uma.ts` - 保留所有方法（特殊处理）
- `src/lib/services/oracle/clients/winklink.ts` - 保留 getPrice, getHistoricalPrices

### 基础类型和配置
- `src/types/oracle/*.ts` - 保留类型定义
- `src/lib/config/oracles.tsx` - 保留配置
