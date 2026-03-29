# Tasks

## P0 - 数据一致性问题

- [x] Task 1: 统一价格源数据获取逻辑
  - [x] SubTask 1.1: 移除 `PythPriceFeedsView.tsx` 中的 `mockPriceFeeds` 硬编码数据
  - [x] SubTask 1.2: 创建 `usePythPriceFeeds` hook 从 `PythDataService` 获取真实价格源列表
  - [x] SubTask 1.3: 更新 `PythPriceFeedsView` 组件使用新的 hook

- [x] Task 2: 统一跨链数据获取逻辑
  - [x] SubTask 2.1: 移除 `PythCrossChainView.tsx` 中的 `generateMockChainData()` 函数
  - [x] SubTask 2.2: 在 `PythDataService` 中添加 `getCrossChainPrices()` 方法
  - [x] SubTask 2.3: 创建 `usePythCrossChain` hook 获取真实跨链数据
  - [x] SubTask 2.4: 更新 `PythCrossChainView` 组件使用新的 hook

- [x] Task 3: 统一发布者数据获取逻辑
  - [x] SubTask 3.1: 移除 `usePythAllData` hook 中的硬编码发布者数据
  - [x] SubTask 3.2: 使用 `PythDataService.getPublishers()` 获取真实数据
  - [x] SubTask 3.3: 确保发布者数据在各组件间一致

- [x] Task 4: 统一验证者数据获取逻辑
  - [x] SubTask 4.1: 移除 `usePythAllData` hook 中的硬编码验证者数据
  - [x] SubTask 4.2: 在 `PythDataService` 中添加 `getValidators()` 方法
  - [x] SubTask 4.3: 更新 hook 使用真实数据源

## P1 - 代码重复问题

- [x] Task 5: 统一常量定义
  - [x] SubTask 5.1: 创建 `src/lib/oracles/pythConstants.ts` 文件
  - [x] SubTask 5.2: 将 `PYTH_PRICE_FEED_IDS` 从 `pythDataService.ts` 和 `PriceFeedDetailModal.tsx` 迁移到新文件
  - [x] SubTask 5.3: 更新所有引用位置使用统一的常量

- [x] Task 6: 统一类型定义
  - [x] SubTask 6.1: 在 `types.ts` 中统一定义 `PublisherData`、`ValidatorData`、`NetworkStats` 类型
  - [x] SubTask 6.2: 移除 `pyth.ts` hook 中重复的类型定义
  - [x] SubTask 6.3: 移除 `pythDataService.ts` 中重复的类型定义
  - [x] SubTask 6.4: 移除 `PriceFeedDetailModal.tsx` 中重复的类型定义

- [x] Task 7: 统一模拟数据生成逻辑
  - [x] SubTask 7.1: 将 `PublisherDetailModal.tsx` 中的 `generateStakeHistory`、`generateAccuracyHistory` 等函数迁移到统一位置
  - [x] SubTask 7.2: 将 `PriceFeedDetailModal.tsx` 中的 `generatePriceHistory` 函数迁移到统一位置
  - [x] SubTask 7.3: 创建 `src/lib/oracles/pythMockData.ts` 集中管理模拟数据生成

## P2 - WebSocket 连接管理问题

- [x] Task 8: 优化 WebSocket 连接管理
  - [x] SubTask 8.1: 确保 `PythDataService` 的 WebSocket 单例模式正确实现
  - [x] SubTask 8.2: 在 `usePythPage` hook 中正确管理 WebSocket 订阅生命周期
  - [x] SubTask 8.3: 在 `PriceFeedDetailModal` 中复用现有 WebSocket 连接而非创建新连接
  - [x] SubTask 8.4: 添加连接状态共享机制，避免多个组件重复订阅

## P3 - 性能问题

- [x] Task 9: 修复客户端实例重复创建问题
  - [x] SubTask 9.1: 在 `PythMarketView.tsx` 中使用 `useMemo` 缓存 `PythClient` 实例
  - [x] SubTask 9.2: 或将 `PythClient` 改为单例模式

- [x] Task 10: 优化大数据列表渲染
  - [x] SubTask 10.1: 为 `PythPublishersView` 添加虚拟滚动支持
  - [x] SubTask 10.2: 为 `PythValidatorsView` 添加虚拟滚动支持
  - [x] SubTask 10.3: 为 `PythPriceFeedsView` 添加虚拟滚动支持

## P4 - 类型安全问题

- [x] Task 11: 修复 any 类型使用
  - [x] SubTask 11.1: 为 `CustomTooltip` 组件定义明确的 props 类型
  - [x] SubTask 11.2: 移除所有 `any` 类型注解
  - [x] SubTask 11.3: 添加严格的类型检查

- [x] Task 12: 修复类型不一致问题
  - [x] SubTask 12.1: 统一 `PublisherData` 在不同文件中的定义
  - [x] SubTask 12.2: 统一 `NetworkStats` 在不同文件中的定义
  - [x] SubTask 12.3: 确保所有类型导出自单一位置

## P5 - 代码质量问题

- [x] Task 13: 修复 useEffect 依赖问题
  - [x] SubTask 13.1: 修复 `usePythPage.ts` 中 useEffect 的循环依赖问题
  - [x] SubTask 13.2: 修复 `PriceFeedDetailModal.tsx` 中 useEffect 依赖警告

- [x] Task 14: 优化错误处理
  - [x] SubTask 14.1: 统一错误处理逻辑，使用统一的错误类型
  - [x] SubTask 14.2: 添加用户友好的错误提示
  - [x] SubTask 14.3: 实现错误边界组件

# Task Dependencies
- [Task 5] depends on [Task 1, Task 2] (常量统一后再修改数据获取逻辑)
- [Task 6] depends on [Task 5] (类型统一后再修改常量)
- [Task 8] depends on [Task 6] (类型统一后再优化 WebSocket)
- [Task 10] depends on [Task 1, Task 2, Task 3, Task 4] (数据逻辑稳定后再优化性能)
