# 跨链价格分析功能专业评审 Spec

## Why
用户请求对跨链价格分析功能进行专业评审，发现虽然之前的问题已修复，但仍存在多个架构设计、统计学方法、性能优化和用户体验方面的问题需要改进。

## What Changes
- 修复滚动相关性图表时间范围过滤未实现的问题
- 修复热力图历史数据过滤未生效的问题
- 改进协整分析的统计显著性检验
- 改进波动率年化因子计算
- 改进置信区间计算方法
- 添加数据缓存策略
- 添加错误边界处理
- 改进无障碍访问支持
- 优化性能
- 改进数据验证
- 改进用户反馈机制
- 改进移动端适配
- 添加交易风险提示

## Impact
- Affected specs: 跨链价格分析功能、热力图功能、相关性分析功能、协整分析功能
- Affected code:
  - `src/app/[locale]/cross-chain/page.tsx`
  - `src/app/[locale]/cross-chain/useCrossChainData.ts`
  - `src/app/[locale]/cross-chain/utils.ts`
  - `src/app/[locale]/cross-chain/components/InteractivePriceChart.tsx`
  - `src/app/[locale]/cross-chain/components/PriceSpreadHeatmap.tsx`
  - `src/app/[locale]/cross-chain/components/RollingCorrelationChart.tsx`
  - `src/app/[locale]/cross-chain/components/CointegrationAnalysis.tsx`
  - `src/app/[locale]/cross-chain/components/CorrelationMatrix.tsx`

---

## 发现的问题详情

### 问题 1: 滚动相关性图表时间范围过滤未实现（高优先级）
**位置**: `RollingCorrelationChart.tsx` 第 48-52 行

**描述**:
- `handleTimeRangeChange` 只打印日志，没有实际过滤数据
- 用户切换时间范围后图表数据不会变化

**代码示例**:
```typescript
// RollingCorrelationChart.tsx 第 48-52 行
const handleTimeRangeChange = useCallback((range: string) => {
  setSelectedTimeRange(range as TimeRange);
  // TODO: Implement time range filtering logic
  console.log('Time range changed to:', range);
}, []);
```

**影响**: 时间范围选择器形同虚设，用户无法按时间范围过滤滚动相关性数据

---

### 问题 2: 热力图历史数据过滤未生效（高优先级）
**位置**: `PriceSpreadHeatmap.tsx` 第 116-164 行

**描述**:
- `filteredHistoricalPrices` 被计算了，但 `heatmapData` 计算中没有使用
- 热力图仍然只使用 `currentPrices`（当前价格快照）
- 时间范围选择器对热力图数据没有影响

**代码示例**:
```typescript
// PriceSpreadHeatmap.tsx 第 132-164 行
const { heatmapData, maxHeatmapValue } = useMemo(() => {
  const filteredPrices = currentPrices.filter((p) => p.chain && filteredChains.includes(p.chain));
  // filteredHistoricalPrices 没有被使用！
  if (filteredPrices.length < 2) {
    return { heatmapData: originalHeatmapData, maxHeatmapValue: originalMaxHeatmapValue };
  }
  // ...
}, [currentPrices, filteredChains, originalHeatmapData, originalMaxHeatmapValue]);
```

**影响**: 热力图无法显示历史时间范围内的价格差异分布

---

### 问题 3: 协整分析缺少统计显著性检验（高优先级）
**位置**: `cointegration.ts` 和 `CointegrationAnalysis.tsx`

**描述**:
- ADF 检验的临界值是硬编码的
- 没有提供置信区间
- 没有对协整关系进行统计显著性检验
- 交易建议缺少风险提示

**影响**: 协整分析结果可能不可靠，用户可能基于不准确的分析做出交易决策

---

### 问题 4: 波动率年化因子假设数据频率（中优先级）
**位置**: `utils.ts` 第 772 行

**描述**:
- 假设数据是小时级的，年化因子为 `sqrt(365 * 24)`
- 但实际数据间隔可能不同（如分钟级、秒级）
- 导致年化波动率计算不准确

**代码示例**:
```typescript
// utils.ts 第 772 行
const annualizedVolatility = volatility * Math.sqrt(365 * 24) * 100;
```

**建议**: 应该根据实际数据间隔动态计算年化因子

---

### 问题 5: 置信区间计算假设正态分布（中优先级）
**位置**: `useCrossChainData.ts` 第 572-583 行

**描述**:
- 使用 1.96 作为 z 值（95% 置信区间）
- 假设样本量足够大且数据服从正态分布
- 对于小样本（n < 30）应该使用 t 分布

**代码示例**:
```typescript
// useCrossChainData.ts 第 572-583 行
const confidenceInterval95 = useMemo(() => {
  if (validPrices.length < 2 || standardDeviation === 0) {
    return { lower: avgPrice, upper: avgPrice };
  }
  const n = validPrices.length;
  const standardError = standardDeviation / Math.sqrt(n);
  const marginOfError = 1.96 * standardError;  // 假设大样本正态分布
  return {
    lower: avgPrice - marginOfError,
    upper: avgPrice + marginOfError,
  };
}, [validPrices, avgPrice, standardDeviation]);
```

**建议**: 对于小样本使用 t 分布临界值

---

### 问题 6: 缺少数据缓存策略（中优先级）
**位置**: `useCrossChainData.ts`

**描述**:
- 每次切换预言机或代币时都重新获取数据
- 没有缓存机制，浪费网络请求
- 用户体验不佳，需要等待数据加载

**影响**: 频繁切换时性能下降，用户需要等待

---

### 问题 7: 缺少错误边界处理（中优先级）
**位置**: `page.tsx` 和各组件

**描述**:
- 图表组件没有错误边界
- 图表渲染失败会导致整个页面崩溃
- 没有优雅的错误恢复机制

**影响**: 单个图表错误会影响整个页面

---

### 问题 8: 无障碍访问问题（低优先级）
**位置**: 各图表组件

**描述**:
- 图表缺少键盘导航支持
- 色盲模式虽然存在但不够完善
- 缺少屏幕阅读器支持
- 缺少高对比度模式

**影响**: 视障用户无法正常使用

---

### 问题 9: 性能优化不足（中优先级）
**位置**: `useCrossChainData.ts`

**描述**:
- 大量 useMemo 计算在数据变化时重新执行
- 热力图计算复杂度为 O(n²)
- 相关性矩阵计算复杂度为 O(n²)
- 没有使用 Web Worker 进行复杂计算

**影响**: 大数据量时页面卡顿

---

### 问题 10: 数据验证不完整（中优先级）
**位置**: `useCrossChainData.ts`

**描述**:
- 价格数据没有验证是否为有效数字
- 时间戳没有验证是否合理
- 没有检测异常数据点

**影响**: 异常数据可能导致计算错误

---

### 问题 11: 用户反馈机制缺失（低优先级）
**位置**: `page.tsx`

**描述**:
- 数据加载失败时只显示错误状态
- 缺少重试按钮
- 数据更新时没有视觉反馈
- 缺少数据加载进度指示

**影响**: 用户不知道如何处理错误

---

### 问题 12: 移动端适配问题（低优先级）
**位置**: 各组件

**描述**:
- 图表在移动设备上交互体验差
- 表格在小屏幕上显示不完整
- 工具提示可能超出屏幕

**影响**: 移动端用户体验不佳

---

### 问题 13: 协整分析交易建议风险提示不足（中优先级）
**位置**: `CointegrationAnalysis.tsx`

**描述**:
- 给出了交易建议（做多/做空价差）
- 没有充分的风险提示
- 用户可能误以为是投资建议

**代码示例**:
```typescript
// CointegrationAnalysis.tsx 第 246-253 行
<div className="mt-4 text-xs text-gray-500">
  <p>
    <strong>{t('crossChain.tradingAdvice')}:</strong>{' '}
    {signal === 'long' && t('crossChain.longSpreadAdvice')}
    {signal === 'short' && t('crossChain.shortSpreadAdvice')}
    {signal === 'neutral' && t('crossChain.neutralAdvice')}
  </p>
</div>
```

**建议**: 添加明显的风险提示，说明这不是投资建议

---

### 问题 14: 相关性矩阵样本量显示问题（低优先级）
**位置**: `CorrelationMatrix.tsx` 第 39-51 行

**描述**:
- 显示的是平均样本量
- 不同链对的样本量可能差异很大
- 用户可能误以为所有链对的样本量相同

**建议**: 应该在每个单元格显示实际样本量

---

### 问题 15: 滚动相关性窗口大小固定（低优先级）
**位置**: `RollingCorrelationChart.tsx` 第 29-33 行

**描述**:
- 只有 30、50、100 三个选项
- 没有提供自定义选项
- 不同分析场景可能需要不同的窗口大小

**建议**: 添加自定义窗口大小输入

---

### 问题 16: 相关性矩阵导出功能未实现（低优先级）
**位置**: `CorrelationMatrix.tsx` 第 28-31 行

**描述**:
- `handleExport` 只打印日志
- 没有实际导出功能

**代码示例**:
```typescript
// CorrelationMatrix.tsx 第 28-31 行
const handleExport = useCallback(() => {
  console.log('Exporting correlation matrix data...');
  // TODO: Implement export functionality
}, []);
```

---

### 问题 17: 滚动相关性图表导出功能未实现（低优先级）
**位置**: `RollingCorrelationChart.tsx` 第 55-58 行

**描述**:
- `handleExport` 只打印日志
- 没有实际导出功能

---

### 问题 18: 热力图导出功能未实现（低优先级）
**位置**: `PriceSpreadHeatmap.tsx` 第 96-98 行

**描述**:
- `handleExport` 只打印日志
- 没有实际导出功能

---

### 问题 19: 价格图表导出功能未实现（低优先级）
**位置**: `InteractivePriceChart.tsx` 第 134-136 行

**描述**:
- `handleExport` 只打印日志
- 没有实际导出功能

---

### 问题 20: 数据刷新时缺少乐观更新（低优先级）
**位置**: `useCrossChainData.ts`

**描述**:
- 数据刷新时整个页面显示加载状态
- 没有乐观更新机制
- 用户无法在刷新时继续查看旧数据

**建议**: 后台刷新数据，保留旧数据显示

---

## ADDED Requirements

### Requirement: 滚动相关性时间范围过滤
系统 SHALL 使滚动相关性图表的时间范围选择器具有实际功能。

#### Scenario: 用户切换时间范围
- **WHEN** 用户点击时间范围选择器
- **THEN** 系统应该根据选择的时间范围过滤滚动相关性数据
- **AND** 图表应该只显示选定时间范围内的数据

### Requirement: 热力图历史数据过滤
系统 SHALL 使热力图的时间范围选择器能够过滤历史数据。

#### Scenario: 用户切换热力图时间范围
- **WHEN** 用户切换热力图的时间范围
- **THEN** 系统应该使用过滤后的历史价格数据计算热力图
- **AND** 热力图应该反映选定时间范围内的价格差异分布

### Requirement: 协整分析统计显著性
系统 SHALL 对协整分析结果进行统计显著性检验，并提供风险提示。

#### Scenario: 显示协整分析结果
- **WHEN** 系统显示协整分析结果
- **THEN** 应该显示统计显著性水平
- **AND** 应该显示明显的风险提示

### Requirement: 波动率年化因子动态计算
系统 SHALL 根据实际数据间隔动态计算波动率年化因子。

### Requirement: 置信区间小样本处理
系统 SHALL 对于小样本使用 t 分布计算置信区间。

### Requirement: 数据缓存策略
系统 SHALL 实现数据缓存策略，避免重复请求相同数据。

### Requirement: 错误边界处理
系统 SHALL 为图表组件添加错误边界，防止单个组件错误影响整个页面。

### Requirement: 导出功能实现
系统 SHALL 实现所有图表组件的导出功能。

## MODIFIED Requirements

无修改的需求。

## REMOVED Requirements

无移除的需求。
