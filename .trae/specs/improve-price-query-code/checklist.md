# Checklist

## 代码结构改进

- [x] `priceQueryUtils.ts` 文件已创建，包含 `fetchPriceData` 函数
- [x] `priceQueryConstants.ts` 文件已创建，包含所有常量定义
- [x] `usePriceData.ts` 已重构，使用新的工具函数
- [x] `useMultiPriceData` 已重构，复用相同逻辑

## 类型安全改进

- [x] `ChartDataPoint` 类型已优化，消除宽泛类型
- [x] 所有隐式 any 已修复
- [x] TypeScript 检查通过，无类型错误

## 导出逻辑改进

- [x] `extractExportFields` 函数已创建
- [x] `exportUtils.ts` 已重构，使用统一字段处理
- [x] CSV 导出功能正常工作
- [x] JSON 导出功能正常工作
- [x] PDF 导出功能正常工作

## 统计计算改进

- [x] `calculateStats` 工具函数已创建
- [x] `usePriceQuery.ts` 已使用新的统计函数
- [x] 主数据统计计算正确
- [x] 对比数据统计计算正确

## 图表组件改进

- [x] `PriceChart.tsx` 已使用新的类型定义
- [x] 图表数据处理逻辑已简化
- [x] 图表功能正常工作

## 常量提取

- [x] `MAX_CONCURRENT_REQUESTS` 常量已提取
- [x] `REQUEST_TIMEOUT_MS` 常量已提取
- [x] `MAX_VISIBLE_SYMBOLS` 常量已提取
- [x] 所有魔法数字已被替换

## 质量验证

- [x] ESLint 检查通过，无错误
- [x] TypeScript 类型检查通过
- [x] 价格查询功能正常
- [x] 导出功能正常
- [x] 图表显示正常
- [x] 性能没有退化
