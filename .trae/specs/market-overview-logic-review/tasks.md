# Tasks

- [x] Task 1: 修复除零错误风险
  - [x] SubTask 1.1: 在 `useMarketOverviewData.ts` 中添加数组长度检查
  - [x] SubTask 1.2: 为空数组情况添加默认值处理

- [x] Task 2: 修复 TVS 字段类型不一致问题
  - [x] SubTask 2.1: 在 `ChartRenderer.tsx` 中将 `item.tvs` 改为 `item.tvsValue`
  - [x] SubTask 2.2: 移除不必要的类型检查

- [x] Task 7: 移除重复的 generateTVSTrendData 函数
  - [x] SubTask 7.1: 删除 `constants.ts` 中的 `generateTVSTrendData` 函数
  - [x] SubTask 7.2: 更新所有引用使用 `priceCalculations.ts` 中的版本

- [x] Task 3: 统一置信区间计算
  - [x] SubTask 3.1: 在 `priceCalculations.ts` 中将置信区间从 ±2% 改为 ±5%
  - [x] SubTask 3.2: 确保两处实现一致

- [x] Task 4: 修复 useEffect 依赖问题
  - [x] SubTask 4.1: 使用 `useRef` 存储最新的 `selectedTimeRange`
  - [x] SubTask 4.2: 调整 `fetchData` 的依赖数组

- [x] Task 5: 消除重复的 prepareComparisonData 函数
  - [x] SubTask 5.1: 创建共享工具函数文件
  - [x] SubTask 5.2: 在 `ChartContainer.tsx` 和 `ChartRenderer.tsx` 中导入共享函数

- [x] Task 6: 修复硬编码的统计变化值
  - [x] SubTask 6.1: 在 `useMarketOverviewData.ts` 中计算 chains 和 protocols 的变化值
  - [x] SubTask 6.2: 更新 `MarketStats.tsx` 使用计算值

- [ ] Task 7: 移除重复的 generateTVSTrendData 函数
  - [ ] SubTask 7.1: 删除 `constants.ts` 中的 `generateTVSTrendData` 函数
  - [ ] SubTask 7.2: 更新所有引用使用 `priceCalculations.ts` 中的版本

# Task Dependencies

- [Task 3] 依赖 [Task 7] - 统一置信区间需要先统一函数实现
- [Task 5] 可以独立进行
- [Task 6] 可以独立进行
