# 大文件拆分优化 Spec

## Why

项目中存在多个超过 1000 行的大文件，影响代码可读性、可维护性和开发效率。需要进行合理的拆分，但避免过度拆分导致文件碎片化。

## What Changes

- 拆分 `src/hooks/oracles/api3.ts` (1318行, 27个 hooks) 为多个功能模块
- 拆分 `src/app/[locale]/cross-chain/utils.ts` (1159行, 38个函数) 为多个功能模块
- 拆分 `src/lib/services/marketData/defiLlamaApi.ts` (1910行, 11个函数) 为多个功能模块
- 拆分 `src/lib/oracles/pythDataService.ts` (1186行) 的 WebSocket 和缓存逻辑

## Impact

- Affected specs: 代码结构
- Affected code:
  - `src/hooks/oracles/api3.ts`
  - `src/app/[locale]/cross-chain/utils.ts`
  - `src/lib/services/marketData/defiLlamaApi.ts`
  - `src/lib/oracles/pythDataService.ts`

## 拆分原则

### 需要拆分的情况

1. **文件行数超过 1000 行** 且有多个独立功能模块
2. **导出项超过 10 个** 且可以按功能分组
3. **职责混杂**：一个文件包含多种不相关的职责

### 不需要拆分的情况

1. **自动生成的文件**（如 `generated-types.ts`）
2. **测试文件**（保持测试完整性）
3. **单一职责的大文件**（如单个大型服务类）
4. **拆分后会增加复杂性**的情况

## 拆分方案

### 1. api3.ts 拆分方案

**当前状态**: 1318 行，27 个导出的 hooks

**拆分后结构**:

```
src/hooks/oracles/api3/
├── index.ts              # 统一导出
├── useAPI3Price.ts       # 价格相关 hooks
├── useAPI3Historical.ts  # 历史数据 hooks
├── useAPI3Alerts.ts      # 告警相关 hooks
├── useAPI3Quality.ts     # 质量指标 hooks
├── useAPI3Staking.ts     # 质押相关 hooks
├── useAPI3Coverage.ts    # 覆盖池相关 hooks
├── useAPI3OEV.ts         # OEV 相关 hooks
├── useAPI3Network.ts     # 网络状态 hooks
├── useAPI3Cache.ts       # 缓存相关 hooks
└── types.ts              # 共享类型定义
```

**分组依据**:

- 价格相关: `useAPI3Price`, `useAPI3OHLC`
- 历史数据: `useAPI3Historical`, `useAPI3QualityHistory`
- 告警相关: `useAPI3Alerts`, `useAPI3AlertHistory`, `useAPI3AlertThresholds`
- 质量指标: `useAPI3QualityMetrics`, `useAPI3Deviations`, `useAPI3SourceTrace`
- 质押相关: `useAPI3Staking`, `useAPI3StakerRewards`
- 覆盖池: `useAPI3DapiCoverage`, `useAPI3CoverageEvents`, `useAPI3CoveragePoolDetails`, `useAPI3CoveragePoolClaims`
- OEV: `useAPI3OEVStats`, `useAPI3OEVAuctions`
- 网络: `useAPI3AirnodeStats`, `useAPI3Latency`, `useAPI3GasFees`, `useAPI3FirstParty`
- 缓存: `useCacheStatus`, `useAPI3OfflineStatus`, `useAPI3CacheActions`

### 2. cross-chain/utils.ts 拆分方案

**当前状态**: 1159 行，38 个导出的工具函数

**拆分后结构**:

```
src/app/[locale]/cross-chain/
├── utils/
│   ├── index.ts              # 统一导出
│   ├── colorUtils.ts         # 颜色相关工具
│   ├── statisticsUtils.ts    # 统计计算工具
│   ├── outlierUtils.ts       # 异常检测工具
│   ├── correlationUtils.ts   # 相关性计算工具
│   └── volatilityUtils.ts    # 波动率计算工具
```

**分组依据**:

- 颜色工具: `getDiffColorGradient`, `getDiffTextColor`, `getHeatmapColor`, `getCorrelationColor`, `getIntegrityColor`, `getJumpColor`, `getVolatilityColor`
- 统计计算: `calculateStandardDeviation`, `calculateVariance`, `calculatePercentile`, `calculateSMA`, `calculateZScore`
- 异常检测: `isOutlier`, `isOutlierIQR`, `detectOutliersIQR`, `detectOutliersZScore`
- 相关性计算: `calculatePearsonCorrelation`, `calculatePearsonCorrelationByTimestamp`, `calculatePearsonCorrelationWithSignificance`, `calculateRollingCorrelation`
- 波动率计算: `calculateVolatilityCone`, `calculateATR`, `calculateDynamicThreshold`, `detectPriceJumps`, `calculateRollingVolatility`

### 3. defiLlamaApi.ts 拆分方案

**当前状态**: 1910 行，11 个导出的异步函数

**拆分后结构**:

```
src/lib/services/marketData/
├── defiLlamaApi/
│   ├── index.ts              # 统一导出
│   ├── client.ts             # 基础客户端和错误处理
│   ├── oracles.ts            # Oracle 数据获取
│   ├── assets.ts             # 资产数据获取
│   ├── chains.ts             # 链相关数据
│   ├── protocols.ts          # 协议详情
│   ├── comparison.ts         # 对比分析
│   └── types.ts              # 类型定义
```

**分组依据**:

- 基础客户端: `MarketDataError`, `fetchWithTimeout`, `fetchWithRetry`
- Oracle 数据: `fetchOraclesData`, `checkApiHealth`
- 资产数据: `fetchAssetsData`, `fetchAssetCategories`
- 链相关: `fetchChainBreakdown`
- 协议详情: `fetchProtocolDetails`
- 对比分析: `fetchComparisonData`, `fetchRadarData`, `fetchBenchmarkData`, `calculateCorrelation`

### 4. pythDataService.ts 拆分方案

**当前状态**: 1186 行，包含 WebSocket、缓存、价格获取等多种功能

**拆分后结构**:

```
src/lib/oracles/pyth/
├── index.ts                  # 统一导出
├── PythDataService.ts        # 核心服务类（精简版）
├── pythWebSocket.ts          # WebSocket 管理
├── pythCache.ts              # 缓存管理
├── pythParser.ts             # 数据解析
└── types.ts                  # 类型定义
```

**分组依据**:

- 核心服务: 价格获取、发布者/验证者数据、网络统计
- WebSocket 管理: 连接、订阅、重连逻辑
- 缓存管理: 缓存读写、TTL 管理
- 数据解析: 价格解析、置信区间计算

## 不拆分的文件

以下文件虽然行数较多，但保持单文件更合适：

1. **generated-types.ts (12992行)** - 自动生成的类型文件
2. **websocket.test.ts (1158行)** - 测试文件，保持完整性
3. **bandRpcService.ts (1456行)** - 单一 RPC 服务职责
4. **redstone.ts (1323行)** - 单一 Oracle 客户端职责
5. **diaDataService.ts (1148行)** - 单一服务职责
6. **tellor.ts (1126行)** - 单一 Oracle 客户端职责
7. **DataQualityTrend.tsx (1100行)** - 单一图表组件
8. **ChartExportButton.tsx (1099行)** - 单一功能组件

## ADDED Requirements

### Requirement: 文件大小合理控制

系统 SHALL 保持单个文件行数在合理范围内（建议不超过 800 行），超过时应考虑拆分。

#### Scenario: 新增功能导致文件过大

- **WHEN** 一个文件的行数超过 800 行
- **THEN** 应评估是否需要按功能模块拆分

### Requirement: 功能内聚性

拆分后的文件 SHALL 保持功能内聚，每个文件专注于单一职责。

#### Scenario: 按功能拆分

- **WHEN** 拆分大文件时
- **THEN** 应按功能模块分组，而非随意拆分

### Requirement: 导入路径兼容

拆分后 SHALL 保持原有的导入路径兼容性，通过 index.ts 重导出。

#### Scenario: 保持向后兼容

- **WHEN** 拆分文件后
- **THEN** 原有的 `import { xxx } from '@/path/to/file'` 应继续有效
