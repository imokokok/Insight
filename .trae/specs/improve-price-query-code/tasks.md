# Tasks

## Task 1: 提取公共查询函数

- [x] Task 1.1: 创建 `priceQueryUtils.ts` 文件
  - [x] 提取 `fetchPriceData` 函数
  - [x] 提取缓存处理逻辑
  - [x] 添加完整的 JSDoc 注释

- [x] Task 1.2: 重构 `usePriceData.ts`
  - [x] 使用新的 `fetchPriceData` 函数
  - [x] 更新 `usePriceData` hook
  - [x] 更新 `useMultiPriceData` hook
  - [x] 确保所有测试通过

## Task 2: 优化类型定义

- [x] Task 2.1: 优化 `ChartDataPoint` 类型
  - [x] 明确时间戳和时间的类型
  - [x] 使用更具体的索引签名或联合类型
  - [x] 更新所有使用处

- [x] Task 2.2: 检查并修复隐式 any
  - [x] 运行 TypeScript 检查
  - [x] 修复所有隐式 any 问题
  - [x] 添加明确的类型定义

## Task 3: 提取常量

- [x] Task 3.1: 创建 `priceQueryConstants.ts` 文件
  - [x] 提取 `MAX_CONCURRENT_REQUESTS = 6`
  - [x] 提取 `REQUEST_TIMEOUT_MS = 30000`
  - [x] 提取 `MAX_VISIBLE_SYMBOLS = 12`
  - [x] 添加其他相关常量

- [x] Task 3.2: 更新使用处
  - [x] 更新 `usePriceQueryData.ts` 使用常量
  - [x] 更新 `Selectors.tsx` 使用常量
  - [x] 确保所有魔法数字都被替换

## Task 4: 统一导出逻辑

- [x] Task 4.1: 提取字段处理函数
  - [x] 创建 `extractExportFields` 函数
  - [x] 统一 CSV 和 JSON 的字段提取
  - [x] 添加类型定义

- [x] Task 4.2: 重构 `exportUtils.ts`
  - [x] 使用新的字段提取函数
  - [x] 确保导出格式不变
  - [x] 测试导出功能

## Task 5: 优化统计计算

- [x] Task 5.1: 创建统计工具函数
  - [x] 创建 `calculateStats` 函数
  - [x] 支持主数据和对比数据
  - [x] 添加单元测试

- [x] Task 5.2: 重构 `usePriceQuery.ts`
  - [x] 使用新的统计工具函数
  - [x] 消除重复计算逻辑
  - [x] 确保计算结果正确

## Task 6: 优化 PriceChart 组件

- [x] Task 6.1: 提取自定义 hook
  - [x] 创建 `useChartData.ts` hook
  - [x] 移动数据处理逻辑
  - [x] 优化性能

- [x] Task 6.2: 重构 `PriceChart.tsx`
  - [x] 使用新的 hook
  - [x] 简化组件逻辑
  - [x] 确保图表功能正常

## Task 7: 验证和测试

- [x] Task 7.1: 运行类型检查
  - [x] 运行 `npm run typecheck`
  - [x] 价格查询相关文件无类型错误

- [x] Task 7.2: 运行代码检查
  - [x] 运行 `npm run lint`
  - [x] 价格查询相关文件无严重错误

- [x] Task 7.3: 功能验证
  - [x] 代码结构改进完成
  - [x] 类型安全改进完成
  - [x] 导出逻辑改进完成
  - [x] 常量提取完成

# Task Dependencies

- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 1]
- [Task 5] depends on [Task 1]
- [Task 6] depends on [Task 2]
- [Task 7] depends on [Task 3, Task 4, Task 5, Task 6]
