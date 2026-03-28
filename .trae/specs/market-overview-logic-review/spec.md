# 市场概览功能代码逻辑审查 Spec

## Why

市场概览功能是项目的核心页面之一，需要确保代码逻辑正确、数据计算准确、避免潜在的运行时错误。

## What Changes

- 修复除零错误风险
- 修复类型不一致问题
- 消除重复代码
- 统一数据计算逻辑
- 修复潜在的无限循环问题

## Impact

- Affected specs: 市场概览数据展示、图表渲染、统计计算
- Affected code:
  - `src/app/[locale]/market-overview/useMarketOverviewData.ts`
  - `src/app/[locale]/market-overview/useDataFetching.ts`
  - `src/app/[locale]/market-overview/constants.ts`
  - `src/app/[locale]/market-overview/components/ChartRenderer.tsx`
  - `src/app/[locale]/market-overview/components/ChartContainer.tsx`
  - `src/app/[locale]/market-overview/components/MarketStats.tsx`
  - `src/lib/services/marketData/priceCalculations.ts`

## ADDED Requirements

### Requirement: 除零错误防护

系统 SHALL 在计算平均值时检查数组长度，避免除零错误。

#### Scenario: 空数据数组处理

- **WHEN** oracleData 数组为空时
- **THEN** 平均延迟计算应返回 0 而不是 NaN 或 Infinity

### Requirement: 类型一致性

系统 SHALL 确保数据类型定义与实际使用一致。

#### Scenario: TVS 字段类型

- **WHEN** 访问 oracle 数据的 TVS 字段时
- **THEN** 应使用正确的字段（tvsValue 为 number 类型，tvs 为 string 类型）

### Requirement: 置信区间统一

系统 SHALL 使用统一的置信区间计算方式。

#### Scenario: 趋势数据生成

- **WHEN** 生成 TVS 趋势数据时
- **THEN** 置信区间应使用一致的百分比（统一为 ±5%）

### Requirement: 消除重复代码

系统 SHALL 避免在多个文件中重复定义相同的函数。

#### Scenario: 数据准备函数

- **WHEN** 需要准备对比数据时
- **THEN** 应使用共享的工具函数而不是重复定义

## MODIFIED Requirements

### Requirement: 数据刷新逻辑

系统 SHALL 正确处理数据刷新依赖，避免无限循环。

**原实现问题**: `useEffect` 依赖 `fetchData`，而 `fetchData` 又依赖于 `selectedTimeRange`，可能导致不必要的重新渲染。

**修改后**: 使用 `useCallback` 的正确依赖数组，确保函数引用稳定。

### Requirement: 市场统计数据计算

系统 SHALL 从实际数据计算统计变化值，而不是使用硬编码值。

**原实现问题**: `totalChains` 和 `totalProtocols` 的变化值硬编码为 12.5 和 8.3。

**修改后**: 从 oracleData 中计算实际的变化百分比。

## REMOVED Requirements

### Requirement: 重复的 generateTVSTrendData 函数

**Reason**: `constants.ts` 和 `priceCalculations.ts` 中存在两份不同实现的 `generateTVSTrendData` 函数，造成混淆。
**Migration**: 统一使用 `priceCalculations.ts` 中的实现，移除 `constants.ts` 中的版本。

---

## 发现的问题详情

### 问题 1: 除零错误风险 (高优先级)

**文件**: `useMarketOverviewData.ts` 第 66-67 行

```javascript
const avgLatency =
  oracleData.reduce((sum, oracle) => sum + oracle.avgLatency, 0) / oracleData.length;
```

**问题**: 当 `oracleData` 为空数组时，会导致除零错误。

### 问题 2: TVS 字段类型不一致 (高优先级)

**文件**: `ChartRenderer.tsx` 第 214-217 行

```javascript
const totalTVS = sortedOracleData.reduce(
  (sum, item) => sum + (typeof item.tvs === 'number' ? item.tvs : 0),
  0
);
```

**问题**: 类型定义中 `tvs` 是 `string` 类型（如 "$42.1B"），但代码检查它是否为 `number`，导致始终返回 0。应使用 `tvsValue` 字段。

### 问题 3: 置信区间计算不一致 (中优先级)

**文件**:

- `constants.ts` 第 199 行: `const confidenceInterval = 0.05;` (±5%)
- `priceCalculations.ts` 第 81-82 行: `chainlink * 1.02` 和 `chainlink * 0.98` (±2%)

**问题**: 两处置信区间计算不一致，会导致数据行为不可预测。

### 问题 4: useEffect 依赖问题 (中优先级)

**文件**: `useDataFetching.ts` 第 343-347 行

```javascript
useEffect(() => {
  if (lastUpdated !== null) {
    fetchData();
  }
}, [selectedTimeRange, fetchData]);
```

**问题**: `fetchData` 依赖于 `selectedTimeRange`，当 `selectedTimeRange` 变化时，`fetchData` 引用会变化，可能触发额外的渲染。

### 问题 5: 重复的函数定义 (低优先级)

**文件**:

- `ChartContainer.tsx` 第 309-339 行: `prepareComparisonData`
- `ChartRenderer.tsx` 第 172-200 行: `prepareComparisonData`

**问题**: 相同的函数在两个文件中重复定义，增加维护成本。

### 问题 6: 硬编码的统计变化值 (低优先级)

**文件**: `MarketStats.tsx` 第 129-136 行

```javascript
const coreStats = [
  // ...
  { label: t('totalChains'), value: totalChains, change: 12.5 }, // 硬编码
  { label: t('totalProtocols'), value: `${totalProtocols}+`, change: 8.3 }, // 硬编码
];
```

**问题**: 变化值是硬编码的，而不是从实际数据计算得出。

### 问题 7: 异常检测阈值单位混淆 (低优先级)

**文件**: `ChartRenderer.tsx` 第 148 行

```javascript
const detectAnomalies = (data: TVSTrendData[], dataKey: string, threshold: number = 0.1) => {
```

**问题**: 阈值使用小数形式（0.1 = 10%），但 UI 中显示的是百分比形式，可能导致混淆。

### 问题 8: generateTVSTrendData 函数重复 (中优先级)

**文件**:

- `constants.ts` 第 182-296 行
- `priceCalculations.ts` 第 23-128 行

**问题**: 两份不同实现的同名函数，`constants.ts` 中的版本使用累积波动，`priceCalculations.ts` 中的版本每次独立计算，行为不一致。
