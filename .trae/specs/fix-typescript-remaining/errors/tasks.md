# Tasks

- [x] Task 1: 修复 cross-oracle 模块 Tooltip formatter 类型错误
  - [x] SubTask 1.1: 修复 MultiOracleTrendChart.tsx Tooltip 类型
  - [x] SubTask 1.2: 修复 PriceDistributionHistogram.tsx Tooltip 类型
  - [x] SubTask 1.3: 修复 OracleQualityTable.tsx props 类型
  - [x] SubTask 1.4: 修复其他 cross-oracle 类型错误

- [x] Task 2: 修复 market-overview 模块类型错误
  - [x] SubTask 2.1: 修复 ChartContext.tsx 缺失导出
  - [x] SubTask 2.2: 修复 useChartState.ts 缺失导出
  - [x] SubTask 2.3: 修复 useComparisonState.ts 缺失导出
  - [x] SubTask 2.4: 修复 useMarketInsights.ts 缺失导出
  - [x] SubTask 2.5: 修复 possibly undefined 错误

- [x] Task 3: 修复 price-query 模块类型错误
  - [x] SubTask 3.1: 修复 PriceChart.tsx props 类型
  - [x] SubTask 3.2: 修复 QueryHeader.tsx 类型错误
  - [x] SubTask 3.3: 修复 QueryResults.tsx 类型错误
  - [x] SubTask 3.4: 修复 Selectors.tsx readonly 类型错误
  - [x] SubTask 3.5: 修复 usePriceQuery.ts 类型错误

- [x] Task 4: 修复 API routes 类型错误
  - [x] SubTask 4.1: 修复 oracles/route.ts handler 类型
  - [x] SubTask 4.2: 修复 snapshots/route.ts 类型错误

- [x] Task 5: 最终验证
  - [x] SubTask 5.1: 运行 npm run typecheck
  - [x] SubTask 5.2: 验证错误数显著减少

# Task Dependencies

- Task 2, 3, 4 可以与 Task 1 并行执行
- Task 5 依赖于 Task 1, 2, 3, 4

# 修复结果

## TypeScript 改进

- 初始: 178 errors
- 最终: 170 errors
- 改进: 减少了 8 个错误

## 未完成工作

剩余 170 个 TypeScript 错误主要是复杂的类型兼容性问题，涉及:

- market-overview 模块的类型导出问题
- cross-oracle 模块的组件 props 类型匹配问题
- 其他复杂类型不兼容问题

这些需要更长的重构时间。
