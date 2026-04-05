# 跨链价格分析功能代码审查规范

## Why
深度检查跨链价格分析功能代码，发现潜在的逻辑问题和边界情况处理缺陷，确保价格数据的准确性和可靠性。

## What Changes
- 修复异常检测算法中的偏差计算错误
- 修复相关性计算中的除零风险
- 修复价格跳变检测的阈值计算问题
- 修复箱线图数据的边界值计算
- 优化缓存机制和内存管理
- 修复 useEffect 依赖项导致的性能问题
- 改进数据完整性计算逻辑

## Impact
- Affected specs: 跨链价格分析、异常检测、相关性分析
- Affected code:
  - `src/app/[locale]/cross-chain/useCrossChainData.ts`
  - `src/app/[locale]/cross-chain/utils/volatilityUtils.ts`
  - `src/app/[locale]/cross-chain/utils/correlationUtils.ts`
  - `src/app/[locale]/cross-chain/utils/outlierUtils.ts`
  - `src/components/oracle/charts/CrossChainPriceComparison/CrossChainPriceComparison.tsx`

## ADDED Requirements

### Requirement: 异常检测算法修复
系统 SHALL 正确计算 IQR 异常检测中的偏差值。

#### Scenario: IQR 异常检测偏差计算
- **WHEN** 检测到价格低于下边界时
- **THEN** 偏差应基于 `lowerBound` 计算，而非 `q3`
- **WHEN** 检测到价格高于上边界时
- **THEN** 偏差应基于 `upperBound` 计算，而非 `q3`

### Requirement: 相关性计算安全性
系统 SHALL 处理相关性系数为 ±1 时的边界情况。

#### Scenario: 完全相关或完全负相关
- **WHEN** 相关系数为 1 或 -1 时
- **THEN** 应返回有效的统计结果，避免除零错误
- **AND** p 值应正确反映统计显著性

### Requirement: 价格跳变检测阈值
系统 SHALL 正确计算简单方法的价格跳变阈值。

#### Scenario: 价格变化均值为负或极小
- **WHEN** 价格变化均值为负数时
- **THEN** 阈值应基于绝对值或使用替代计算方法
- **WHEN** 价格变化均值接近零时
- **THEN** 应使用标准差或固定阈值作为备选

### Requirement: 箱线图边界计算
系统 SHALL 正确处理所有数据点都是异常值的情况。

#### Scenario: 所有数据点超出 IQR 边界
- **WHEN** 所有价格点都被判定为异常值时
- **THEN** 箱线图的 min/max 应使用实际的非异常值边界
- **OR** 应明确标记数据质量异常

### Requirement: 缓存机制优化
系统 SHALL 提供有效的缓存清理机制。

#### Scenario: 缓存内存管理
- **WHEN** 缓存条目超过一定数量时
- **THEN** 应自动清理最旧的条目
- **WHEN** 组件卸载时
- **THEN** 应清理相关的缓存条目

### Requirement: useEffect 依赖项优化
系统 SHALL 避免不必要的重新渲染。

#### Scenario: chains 数组依赖
- **WHEN** chains 数组内容未变化时
- **THEN** 不应触发重新获取数据
- **WHEN** chains 数组顺序变化但内容相同时
- **THEN** 不应触发重新获取数据

## MODIFIED Requirements

### Requirement: 数据完整性计算
系统 SHALL 更准确地计算数据完整性分数。

**原实现问题**：
- 假设每小时数据点数量固定
- 未考虑数据时间间隔的不均匀性

**修改后**：
- 应基于实际数据密度计算
- 应考虑配置的更新间隔与实际更新间隔的差异

### Requirement: 更新延迟计算
系统 SHALL 选择更合适的基准链进行延迟计算。

**原实现问题**：
- 固定使用第一个链作为基准
- 可能选择数据质量较差的链作为基准

**修改后**：
- 应选择数据点最多或数据质量最好的链作为基准
- 应提供基准链选择的配置选项

## 发现的问题详细分析

### 1. 严重问题：IQR 异常检测偏差计算错误

**位置**: `useCrossChainData.ts` 第 941-942 行

```typescript
// 错误代码
const deviation = Math.abs(priceData.price - iqrResult.q3) / iqrResult.iqr;
```

**问题**: 无论价格是低于下边界还是高于上边界，都使用 `q3` 计算偏差，这是不正确的。

**正确实现**:
```typescript
const boundValue = priceData.price < iqrResult.lowerBound 
  ? iqrResult.lowerBound 
  : iqrResult.upperBound;
const deviation = Math.abs(priceData.price - boundValue) / iqrResult.iqr;
```

### 2. 严重问题：相关性计算除零风险

**位置**: `correlationUtils.ts` 第 136 行和第 223 行

```typescript
// 风险代码
const tStatistic = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
```

**问题**: 当 `correlation` 为 1 或 -1 时，分母为零，导致 Infinity。

**正确实现**:
```typescript
const denominator = 1 - correlation * correlation;
if (denominator <= 0) {
  return {
    correlation,
    pValue: 0,
    sampleSize: n,
    isSignificant: true,
    significanceLevel: '***',
  };
}
const tStatistic = correlation * Math.sqrt((n - 2) / denominator);
```

### 3. 中等问题：价格跳变检测阈值计算

**位置**: `volatilityUtils.ts` 第 238-239 行

```typescript
// 问题代码
const simpleThreshold = mean * threshold;
return changes.filter((change) => change > simpleThreshold).length;
```

**问题**: 
- `mean` 可能是负数，导致阈值计算错误
- `mean` 可能接近零，导致阈值过小

**建议修复**:
```typescript
if (method === 'simple') {
  const absMean = Math.abs(mean);
  const simpleThreshold = absMean > 0.001 
    ? absMean * threshold 
    : stdDev * threshold;
  return changes.filter((change) => Math.abs(change) > simpleThreshold).length;
}
```

### 4. 中等问题：箱线图边界值计算

**位置**: `useCrossChainData.ts` 第 1343-1347 行

```typescript
// 问题代码
const nonOutliers = sorted.filter((p) => p >= lowerBound && p <= upperBound);
const min = nonOutliers.length > 0 ? Math.min(...nonOutliers) : sorted[0];
const max = nonOutliers.length > 0 ? Math.max(...nonOutliers) : sorted[n - 1];
```

**问题**: 当所有数据点都是异常值时，使用 `sorted[0]` 和 `sorted[n-1]` 可能不是最佳选择。

**建议修复**:
```typescript
const nonOutliers = sorted.filter((p) => p >= lowerBound && p <= upperBound);
if (nonOutliers.length === 0) {
  // 所有数据都是异常值，使用边界值作为 min/max
  return {
    ...result,
    min: lowerBound,
    max: upperBound,
  };
}
```

### 5. 性能问题：useEffect 依赖项

**位置**: `CrossChainPriceComparison.tsx` 第 219 行

```typescript
// 问题代码
useEffect(() => {
  fetchData();
}, [symbol, chains.join(',')]);
```

**问题**: `chains.join(',')` 在每次渲染时创建新字符串，导致不必要的重新渲染。

**建议修复**:
```typescript
const chainsKey = useMemo(() => chains.join(','), [chains]);
useEffect(() => {
  fetchData();
}, [symbol, chainsKey]);
```

### 6. 内存问题：缓存清理机制缺失

**位置**: `useCrossChainData.ts` 第 194-212 行

**问题**: 
- 缓存是全局 Map，没有大小限制
- 没有自动清理过期条目的机制
- 组件卸载时不会清理缓存

**建议修复**:
```typescript
const MAX_CACHE_SIZE = 50;

const cleanupCache = () => {
  if (dataCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(dataCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    toDelete.forEach(([key]) => dataCache.delete(key));
  }
};
```

### 7. 逻辑问题：更新延迟基准链选择

**位置**: `useCrossChainData.ts` 第 1056-1057 行

```typescript
// 问题代码
const baseChain = filteredChains[0];
```

**问题**: 固定使用第一个链作为基准，可能选择数据质量较差的链。

**建议修复**:
```typescript
// 选择数据点最多的链作为基准
const baseChain = filteredChains.reduce((best, chain) => {
  const bestLen = historicalPrices[best]?.length || 0;
  const chainLen = historicalPrices[chain]?.length || 0;
  return chainLen > bestLen ? chain : best;
}, filteredChains[0]);
```

### 8. 边界情况：数据完整性计算

**位置**: `useCrossChainData.ts` 第 1106-1133 行

**问题**: 
- 假设每小时数据点数量固定
- 未处理数据时间间隔不均匀的情况

**建议修复**:
```typescript
const calculateActualUpdateInterval = (prices: PriceData[]): number => {
  if (prices.length < 2) return defaultUpdateIntervalMinutes;
  
  const intervals: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const diffMs = prices[i].timestamp - prices[i - 1].timestamp;
    const diffMinutes = diffMs / (1000 * 60);
    // 过滤掉异常大的间隔（可能是数据缺失）
    if (diffMinutes > 0 && diffMinutes < defaultUpdateIntervalMinutes * 10) {
      intervals.push(diffMinutes);
    }
  }
  
  if (intervals.length === 0) return defaultUpdateIntervalMinutes;
  
  // 使用中位数而非平均值，更稳健
  const sorted = intervals.sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return median;
};
```

## 专业建议

### 短期修复优先级

1. **P0 - 立即修复**:
   - IQR 异常检测偏差计算错误
   - 相关性计算除零风险

2. **P1 - 尽快修复**:
   - 价格跳变检测阈值计算
   - 箱线图边界值计算

3. **P2 - 计划修复**:
   - 缓存清理机制
   - useEffect 依赖项优化
   - 更新延迟基准链选择

### 长期改进建议

1. **添加单元测试**: 为所有统计计算函数添加边界情况测试
2. **数据验证层**: 在数据进入计算前添加更严格的验证
3. **错误边界**: 为关键计算添加 try-catch 和降级处理
4. **监控告警**: 添加异常数据检测的日志和告警机制
5. **文档完善**: 为统计函数添加数学公式说明和边界条件文档
