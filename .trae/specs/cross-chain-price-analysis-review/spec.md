# 跨链价格分析功能代码逻辑问题分析 Spec

## Why

用户请求检查跨链价格分析功能的代码逻辑，发现存在多个功能不完整、逻辑错误和潜在 bug，需要系统性地记录并修复这些问题。

## What Changes

- 修复时间范围选择器无实际功能的问题
- 修复热力图数据计算逻辑问题
- 修复相关性计算时间戳不匹配问题
- 修复数据完整性计算假设问题
- 改进异常值检测逻辑
- 添加导出功能错误处理
- 改进类型安全

## Impact

- Affected specs: 跨链价格分析功能、热力图功能、相关性分析功能
- Affected code:
  - `src/app/[locale]/cross-chain/page.tsx`
  - `src/app/[locale]/cross-chain/useCrossChainData.ts`
  - `src/app/[locale]/cross-chain/utils.ts`
  - `src/app/[locale]/cross-chain/components/InteractivePriceChart.tsx`
  - `src/app/[locale]/cross-chain/components/PriceSpreadHeatmap.tsx`
  - `src/app/[locale]/cross-chain/components/PriceComparisonTable.tsx`

## 发现的问题详情

### 问题 1: 时间范围选择器无实际功能（高优先级）

**位置**:

- `InteractivePriceChart.tsx` 第 122-127 行、第 433-439 行
- `PriceSpreadHeatmap.tsx` 第 88-93 行、第 110-116 行

**描述**:

- `selectedTimeRange` 状态被创建并显示在 `ChartToolbar` 中
- `handleTimeRangeChange` 只更新状态，没有实际过滤数据
- 图表和热力图仍然显示全部数据，时间范围选择器形同虚设

**代码示例**:

```typescript
// InteractivePriceChart.tsx 第 125-127 行
const handleTimeRangeChange = useCallback((range: string) => {
  setSelectedTimeRange(range as TimeRange);
}, []);
// 状态更新后没有任何后续操作！
```

**影响**: 用户会认为时间范围选择器有效，但实际上没有任何作用，造成用户困惑

---

### 问题 2: 热力图数据计算逻辑问题（高优先级）

**位置**: `useCrossChainData.ts` 第 860-884 行

**描述**:

- `heatmapData` 只使用 `currentPrices`（当前价格快照）计算
- 热力图应该显示历史价格差异的分布，而不是仅当前价格差异
- 用户无法看到价格差异的历史趋势

**代码示例**:

```typescript
// useCrossChainData.ts 第 860-884 行
const heatmapData = useMemo(() => {
  const filteredPrices = currentPrices.filter((p) => p.chain && filteredChains.includes(p.chain));
  if (filteredPrices.length < 2) return [];
  const data: HeatmapData[] = [];

  filteredChains.forEach((xChain) => {
    filteredChains.forEach((yChain) => {
      const xPrice = filteredPrices.find((p) => p.chain === xChain)?.price || 0; // 只用当前价格
      const yPrice = filteredPrices.find((p) => p.chain === yChain)?.price || 0;
      // ...
    });
  });
  return data;
}, [currentPrices, filteredChains]); // 依赖只有 currentPrices
```

**影响**: 热力图只能显示当前时刻的价格差异，无法反映历史变化

---

### 问题 3: 相关性计算时间戳不匹配（高优先级）

**位置**: `utils.ts` 第 150-176 行

**描述**:

- `calculatePearsonCorrelation` 函数在数据长度不一致时只取前 n 个
- 但实际两条链的价格数据时间戳可能不匹配
- 导致计算的相关性可能不准确

**代码示例**:

```typescript
// utils.ts 第 150-176 行
export const calculatePearsonCorrelation = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const xSlice = x.slice(0, n); // 直接取前 n 个，不考虑时间戳
  const ySlice = y.slice(0, n);
  // ...
};
```

**正确做法**: 应该按时间戳匹配价格数据，只计算相同时间戳的数据点

**影响**: 相关性分析结果可能不准确，误导用户决策

---

### 问题 4: 数据完整性计算假设固定更新间隔（中优先级）

**位置**: `useCrossChainData.ts` 第 811-824 行

**描述**:

- 假设每分钟更新一次 (`updateIntervalMinutes = 1`)
- 但不同预言机的更新间隔可能不同
- 导致数据完整性评分不准确

**代码示例**:

```typescript
// useCrossChainData.ts 第 811-824 行
const dataIntegrity = useMemo(() => {
  const integrity: Partial<Record<Blockchain, number>> = {};
  const updateIntervalMinutes = 1; // 硬编码为 1 分钟
  const expectedPointsPerHour = 60 / updateIntervalMinutes;
  const expectedPoints = expectedPointsPerHour * selectedTimeRange;
  // ...
}, [historicalPrices, filteredChains, selectedTimeRange]);
```

**影响**: 数据完整性评分可能不准确

---

### 问题 5: 滚动相关性返回索引而非时间戳（中优先级）

**位置**: `utils.ts` 第 370-411 行

**描述**:

- `calculateRollingCorrelation` 返回的 `timestamp` 是数组索引
- 不是实际的时间戳，命名具有误导性

**代码示例**:

```typescript
// utils.ts 第 404-407 行
result.push({
  timestamp: i, // 这是索引，不是时间戳！
  correlation: isNaN(correlation) ? 0 : correlation,
});
```

**影响**: 如果用于图表显示，X 轴会显示错误的值

---

### 问题 6: 价格跳跃频率计算阈值过于简单（中优先级）

**位置**: `useCrossChainData.ts` 第 826-858 行

**描述**:

- 阈值只是平均变化的 2 倍
- 没有考虑价格波动特性
- 可能导致误报或漏报

**代码示例**:

```typescript
// useCrossChainData.ts 第 851-854 行
const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
const threshold = avgChange * 2; // 简单的 2 倍阈值
const jumpCount = changes.filter((change) => change > threshold).length;
```

**影响**: 价格跳跃检测可能不准确

---

### 问题 7: 导出功能缺少错误处理（中优先级）

**位置**: `useCrossChainData.ts` 第 1034-1094 行、第 1118-1198 行

**描述**:

- `exportToCSV` 和 `exportToJSON` 没有处理可能的错误情况
- 如数据为空、浏览器不支持下载等

**代码示例**:

```typescript
// useCrossChainData.ts 第 1081-1094 行
const csvContent = csvLines.join('\n');
const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
// 没有错误处理！
link.click();
document.body.removeChild(link);
```

**影响**: 导出失败时用户无法得到反馈

---

### 问题 8: 价格差异计算可能除以零（高优先级）

**位置**: `useCrossChainData.ts` 第 413-422 行

**描述**:

- `diffPercent = (diff / basePrice) * 100`
- 如果 `basePrice` 为 0 会导致计算错误

**代码示例**:

```typescript
// useCrossChainData.ts 第 413-422 行
return filteredPrices.map((priceData) => {
  const diff = priceData.price - basePrice;
  const diffPercent = (diff / basePrice) * 100; // basePrice 可能为 0
  return {
    chain: priceData.chain!,
    price: priceData.price,
    diff,
    diffPercent,
  };
});
```

**影响**: 可能导致 Infinity 或 NaN 值

---

### 问题 9: 历史价格百分位数计算时间戳不匹配（中优先级）

**位置**: `PriceSpreadHeatmap.tsx` 第 336-368 行

**描述**:

- 使用 `timestamps` Set 来匹配价格
- 但两条链的历史价格时间戳可能不完全匹配
- 导致计算的历史百分位数可能不准确

**代码示例**:

```typescript
// PriceSpreadHeatmap.tsx 第 345-356 行
timestamps.forEach((timestamp) => {
  const xHistPrice = xHistorical.find((p) => p.timestamp === timestamp)?.price;
  const yHistPrice = yHistorical.find((p) => p.timestamp === timestamp)?.price;
  // 如果时间戳不匹配，find 会返回 undefined
  if (xHistPrice && yHistPrice && xHistPrice > 0) {
    const diffPercent = (Math.abs(xHistPrice - yHistPrice) / xHistPrice) * 100;
    historicalDiffs.push(diffPercent);
  }
});
```

**影响**: 历史百分位数可能基于不完整的数据计算

---

### 问题 10: 类型安全问题（低优先级）

**位置**: `PriceComparisonTable.tsx` 第 39 行

**描述**:

- `historicalPrices[item.chain as Blockchain]` 可能为 undefined
- 虽然有 `|| []` 兜底，但类型断言可能隐藏潜在问题

**代码示例**:

```typescript
// PriceComparisonTable.tsx 第 39-40 行
const chainHistoricalPrices = historicalPrices[item.chain as Blockchain];
const priceHistory = chainHistoricalPrices?.map((p) => p.price) || [];
```

**影响**: 可能导致运行时错误

---

### 问题 11: Z-Score 异常值检测阈值固定（低优先级）

**位置**: `utils.ts` 第 110-113 行

**描述**:

- 固定使用 |z| > 2 作为异常值标准
- 可能不适用于所有价格波动情况

**代码示例**:

```typescript
// utils.ts 第 110-113 行
export const isOutlier = (zScore: number | null): boolean => {
  if (zScore === null) return false;
  return Math.abs(zScore) > 2; // 固定阈值
};
```

**影响**: 可能导致误报或漏报异常值

---

### 问题 12: 置信区间计算假设正态分布（低优先级）

**位置**: `useCrossChainData.ts` 第 561-572 行

**描述**:

- 使用 1.96 作为 z 值（95% 置信区间）
- 假设样本量足够大且数据服从正态分布
- 对于小样本或非正态分布可能不准确

**代码示例**:

```typescript
// useCrossChainData.ts 第 561-572 行
const confidenceInterval95 = useMemo(() => {
  if (validPrices.length < 2 || standardDeviation === 0) {
    return { lower: avgPrice, upper: avgPrice };
  }
  const n = validPrices.length;
  const standardError = standardDeviation / Math.sqrt(n);
  const marginOfError = 1.96 * standardError; // 假设大样本正态分布
  return {
    lower: avgPrice - marginOfError,
    upper: avgPrice + marginOfError,
  };
}, [validPrices, avgPrice, standardDeviation]);
```

**影响**: 置信区间可能不准确

---

### 问题 13: 波动率年化因子假设（低优先级）

**位置**: `utils.ts` 第 455 行

**描述**:

- 假设数据是小时级的，年化因子为 `sqrt(365 * 24)`
- 但实际数据间隔可能不是小时级

**代码示例**:

```typescript
// utils.ts 第 455 行
const annualizedVolatility = volatility * Math.sqrt(365 * 24) * 100;
```

**影响**: 年化波动率可能不准确

---

## ADDED Requirements

### Requirement: 时间范围选择器功能完整性

系统 SHALL 使时间范围选择器具有实际功能，切换时间范围时应该过滤图表数据。

#### Scenario: 用户切换时间范围

- **WHEN** 用户点击时间范围选择器（如 1H、24H、7D 等）
- **THEN** 系统应该根据选择的时间范围过滤图表数据
- **AND** 图表应该只显示选定时间范围内的数据

### Requirement: 热力图数据计算正确

系统 SHALL 使用历史价格数据计算热力图，显示价格差异的历史分布。

#### Scenario: 热力图显示历史价格差异

- **WHEN** 用户查看价格差异热力图
- **THEN** 系统应该使用历史价格数据计算差异
- **AND** 热力图应该反映选定时间范围内的价格差异分布

### Requirement: 相关性计算时间戳匹配

系统 SHALL 在计算相关性时匹配时间戳，确保只计算相同时间点的数据。

#### Scenario: 计算链间价格相关性

- **WHEN** 系统计算两条链之间的价格相关性
- **THEN** 应该只使用时间戳匹配的数据点
- **AND** 计算结果应该准确反映两条链的价格关联程度

### Requirement: 价格差异计算安全

系统 SHALL 在计算价格差异百分比时处理除零情况。

#### Scenario: 基准价格为零

- **WHEN** 基准链的价格为零
- **THEN** 系统应该返回特殊值或显示提示
- **AND** 不应该显示 Infinity 或 NaN

## MODIFIED Requirements

### Requirement: 数据完整性计算动态化

系统 SHALL 根据实际预言机更新间隔计算数据完整性评分。

### Requirement: 导出功能错误处理

系统 SHALL 在导出数据时处理可能的错误情况，并向用户提供反馈。

## REMOVED Requirements

无移除的需求。
