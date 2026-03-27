# 价格数据查询功能代码审查 Spec

## Why
用户请求审查价格数据查询功能的代码逻辑，发现潜在的 bug、性能问题和代码质量问题。

## What Changes
- 修复 `usePriceQuery.ts` 中 `isMounted` 变量硬编码为 `true` 的严重 bug
- 修复组件卸载后状态更新的内存泄漏问题
- 改进错误处理和用户反馈机制
- 优化请求性能和缓存策略
- 修复对比模式下的数据一致性问题

## Impact
- Affected code: 
  - `src/app/[locale]/price-query/hooks/usePriceQuery.ts`
  - `src/app/[locale]/price-query/components/QueryResults.tsx`
  - `src/app/[locale]/price-query/components/PriceChart.tsx`

## 发现的问题

### 问题 1: 严重 Bug - isMounted 硬编码为 true (HIGH)

**位置**: `usePriceQuery.ts` 第 392 行

**问题描述**:
```typescript
const isMounted = true;  // 永远是 true
```

这是一个严重的 bug。`isMounted` 被硬编码为 `true`，导致：
1. 组件卸载后仍然会尝试更新状态
2. 可能导致 React 的 "Can't perform a React state update on an unmounted component" 警告
3. 可能导致内存泄漏
4. 第 419、450、464、495、518 行的 `if (!isMounted) return;` 检查永远不会生效

**正确实现应该是**:
```typescript
const isMounted = useRef(true);
useEffect(() => {
  return () => {
    isMounted.current = false;
  };
}, []);
// 使用 isMounted.current 检查
```

### 问题 2: 对比模式下数据不一致 (MEDIUM)

**位置**: `usePriceQuery.ts` 第 454-497 行

**问题描述**:
在对比模式下，主数据和对比数据是分别获取的：
1. 先获取主时间范围的数据
2. 然后获取对比时间范围的数据
3. 两次获取之间可能存在时间差，导致价格数据不一致

**影响**:
- 对比分析可能不准确
- 用户可能看到不同时间点的价格快照

### 问题 3: 错误处理不完善 (MEDIUM)

**位置**: `usePriceQuery.ts` 第 436-441 行

**问题描述**:
```typescript
} catch (error) {
  logger.error(
    `Error fetching ${provider} on ${chain}`,
    error instanceof Error ? error : new Error(String(error))
  );
}
```

错误只被记录到日志，但：
1. 没有向用户显示错误信息
2. 没有重试机制
3. 用户不知道哪些数据获取失败了

### 问题 4: 没有请求取消机制 (MEDIUM)

**位置**: `usePriceQuery.ts` 第 384-531 行

**问题描述**:
`fetchQueryData` 函数没有提供取消正在进行的请求的能力。如果用户：
1. 快速切换选择参数
2. 在请求完成前离开页面

会导致不必要的请求继续执行，浪费资源。

### 问题 5: 请求触发过于频繁 (LOW)

**位置**: `usePriceQuery.ts` 第 533-536 行

**问题描述**:
```typescript
useEffect(() => {
  if (!urlParamsParsed) return;
  fetchQueryData();
}, [urlParamsParsed, fetchQueryData]);
```

`fetchQueryData` 作为依赖项，但由于它是 `useCallback` 创建的，每当其依赖项变化时都会重新创建，可能导致不必要的请求。

### 问题 6: 类型转换问题 (LOW)

**位置**: `QueryResults.tsx` 第 306-309 行

**问题描述**:
```typescript
timeConfig={timeComparisonConfig as unknown as ExternalTimeComparisonConfig}
onTimeConfigChange={(config) => {
  onTimeConfigChange(config as unknown as TimeComparisonConfig);
}}
```

使用 `as unknown as` 进行类型转换表明类型定义不一致，可能导致运行时错误。

### 问题 7: chartData 构建逻辑可能产生空数据点 (LOW)

**位置**: `usePriceQuery.ts` 第 542-579 行

**问题描述**:
chartData 的构建基于所有 historicalData 的时间戳并集，但每个时间点可能只有部分 oracle/chain 有数据，导致图表上出现断点或空数据。

### 问题 8: 没有数据缓存策略 (LOW)

**位置**: `usePriceQuery.ts` 整体

**问题描述**:
每次调用 `fetchQueryData` 都会重新获取所有数据，没有：
1. 短期缓存机制
2. 请求去重
3. 增量更新策略

### 问题 9: 历史记录保存时机问题 (LOW)

**位置**: `usePriceQuery.ts` 第 503-511 行

**问题描述**:
```typescript
if (results.length > 0) {
  saveQueryHistory({...});
}
```

只有成功获取到结果时才保存历史，但如果部分请求失败，用户的选择不会被记录。

### 问题 10: URL 参数解析只执行一次 (LOW)

**位置**: `usePriceQuery.ts` 第 260-281 行

**问题描述**:
`urlParamsParsed` 状态在第一次解析后就设为 `true`，如果用户手动修改 URL 参数，不会重新解析。
