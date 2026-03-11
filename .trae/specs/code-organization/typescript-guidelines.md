# 类型定义规范

## 1. Oracle核心类型 (oracleTypes.ts)

### 1.1 枚举定义

```typescript
export enum OracleProvider {
  CHAINLINK = 'chainlink',
  BAND_PROTOCOL = 'band-protocol',
  UMA = 'uma',
  PYTH_NETWORK = 'pyth-network',
  API3 = 'api3',
}

export enum Blockchain {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  SOLANA = 'solana',
  AVALANCHE = 'avalanche',
}

export enum TimeRange {
  '1H' = 3600,
  '24H' = 86400,
  '7D' = 604800,
  '30D' = 2592000,
}
```

### 1.2 状态类型

```typescript
export enum DataStatus {
  NORMAL = 'normal',
  WARNING = 'warning',
  CRITICAL = 'critical',
  STALE = 'stale',
}

export enum TrendDirection {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DECLINING = 'declining',
  EXPANDING = 'expanding',
  SHRINKING = 'shrinking',
}

export type PublisherStatus = 'active' | 'inactive' | 'degraded';
```

### 1.3 数据结构类型

```typescript
export interface PriceData {
  provider: OracleProvider;
  chain?: Blockchain;
  symbol: string;
  price: number;
  timestamp: number;
  decimals: number;
  confidence?: number;
  source?: string;
  change?: number;
  changePercent?: number;
}

export interface GenericHistoricalPrice {
  timestamp: number;
  price: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  close?: number;
}

export interface GenericValidator {
  id: string;
  name: string;
  reliabilityScore: number;
  latency: number;
  status: PublisherStatus;
  staked: number;
  region?: string;
  uptime?: number;
}
```

### 1.4 图表数据类型

```typescript
export interface ChartDataPoint {
  x: number | string | Date;
  y: number;
  label?: string;
  color?: string;
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface HeatmapCell {
  x: string;
  y: string;
  value: number;
  color?: string;
}
```

### 1.5 配置类型

```typescript
export interface TabConfig {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export interface PageConfig {
  title: string;
  description?: string;
  provider: OracleProvider;
  tabs: TabConfig[];
  refreshInterval?: number;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string;
  lastUpdated?: number;
}

export interface FilterState {
  timeRange?: TimeRange;
  chain?: Blockchain;
  symbol?: string;
  status?: DataStatus;
}
```

## 2. 快照类型 (snapshot.ts)

```typescript
export interface SnapshotStats {
  avgPrice: number;
  weightedAvgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  variance: number;
  standardDeviation: number;
}

export interface OracleSnapshot {
  id: string;
  timestamp: number;
  symbol: string;
  selectedOracles: OracleProvider[];
  priceData: PriceData[];
  stats: SnapshotStats;
}
```

## 3. 类型使用规范

### 3.1 时间戳处理

统一使用 Unix 时间戳 (number 类型)，单位为毫秒：

```typescript
interface DataPoint {
  timestamp: number;  // Unix时间戳（毫秒）
  value: number;
}
```

### 3.2 可选字段规范

```typescript
interface User {
  id: string;           // 必填
  name?: string;        // 可选，有默认值
  email?: string;       // 可选，可能为undefined
}
```

### 3.3 泛型使用

```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
  error?: string;
}

type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };
```

## 4. 已有类型迁移

### 4.1 旧类型兼容

在迁移期间，保持向后兼容：

```typescript
// 旧类型别名（兼容）
export type LegacyPriceData = PriceData;

// 废弃警告
/**
 * @deprecated 使用 PriceData 代替
 */
export interface OldPriceData {
  // ...
}
```

## 5. 类型导出

在 `src/lib/types/index.ts` 中统一导出：

```typescript
export * from './oracleTypes';
export * from './snapshot';
```
