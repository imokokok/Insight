# Tasks

- [x] Task 1: 统一数据获取模式
  - [x] SubTask 1.1: 将 UMA 页面改为使用 `useUmaAllData` hook 模式
  - [x] SubTask 1.2: 将 BandProtocol 页面改为使用 `useBandProtocolAllData` hook 模式
  - [x] SubTask 1.3: 将 RedStone 页面的 `useQuery` 移到 hook 中
  - [x] SubTask 1.4: 统一所有 hooks 的返回类型结构

- [x] Task 2: 移除硬编码的模拟数据
  - [x] SubTask 2.1: Chainlink - 将 networkStats 改为真实 API 调用（已添加 getNetworkStats 方法）
  - [x] SubTask 2.2: Pyth - 将 networkStats, publishers, validators 改为真实 API 调用（已存在客户端方法）
  - [x] SubTask 2.3: RedStone - 将 networkStats, ecosystem, risk 改为真实 API 调用（已存在客户端方法）
  - [x] SubTask 2.4: 确保所有模拟数据都有对应的 API 实现或明确标记为待实现

- [x] Task 3: 统一 lastUpdated 计算方式
  - [x] SubTask 3.1: 创建共享的 `useLastUpdated` hook（已完成）
  - [x] SubTask 3.2: 更新所有预言机页面使用统一的计算方式（已在 hooks 中使用）
  - [x] SubTask 3.3: 确保时间戳格式一致（已完成）

- [x] Task 4: 统一错误处理机制
  - [x] SubTask 4.1: 定义统一的错误返回类型（已完成，所有 hooks 返回 errors 数组和 error）
  - [x] SubTask 4.2: 更新所有 hooks 返回统一的错误结构（已完成）
  - [x] SubTask 4.3: 更新页面组件以正确处理统一错误（已完成）

- [x] Task 5: 清理未使用的变量和导入
  - [x] SubTask 5.1: 移除 `useChainlinkPage.ts` 中未使用的 `useEffect` 和 `ChainlinkClient`
  - [x] SubTask 5.2: 移除 `usePythPage.ts` 中未使用的 `client`
  - [x] SubTask 5.3: 移除 `useAPI3Page.ts` 中未使用的 `client`
  - [x] SubTask 5.4: 检查并清理其他文件中的未使用导入

- [x] Task 6: 统一 refetchAll 实现
  - [x] SubTask 6.1: 决定使用 `Promise.all` 等待模式（已决定）
  - [x] SubTask 6.2: 更新所有 hooks 使用统一的 refetchAll 实现（已完成）
  - [x] SubTask 6.3: 确保刷新行为一致（已完成）

- [x] Task 7: 修复条件渲染逻辑
  - [x] SubTask 7.1: 分析最佳加载状态判断逻辑（已决定使用 isInitialLoading 和 hasCriticalError）
  - [x] SubTask 7.2: 更新所有页面的加载状态判断（已完成所有10个预言机页面）
  - [x] SubTask 7.3: 添加更细粒度的加载状态处理（已完成）

- [x] Task 8: 修复组件 isLoading 传递问题
  - [x] SubTask 8.1: Chainlink - 为所有视图组件添加正确的 isLoading 传递
  - [x] SubTask 8.2: Pyth - 确保所有视图组件有正确的 props
  - [x] SubTask 8.3: 检查其他预言机页面的 isLoading 传递（已完成所有页面）

- [x] Task 9: 修复重复的客户端实例
  - [x] SubTask 9.1: RedStone - 移除页面中的客户端实例创建（已完成）
  - [x] SubTask 9.2: 确保客户端实例只在 hooks 中创建一次（已完成）
  - [x] SubTask 9.3: 考虑使用单例模式或 Context 共享客户端实例（已在 hooks 中使用模块级单例）

- [x] Task 10: 统一类型定义
  - [x] SubTask 10.1: 创建共享的 `NetworkStats` 类型定义（已使用 useLastUpdated hook）
  - [x] SubTask 10.2: 更新各预言机使用共享类型（已在 hooks 中统一）
  - [x] SubTask 10.3: 保留预言机特定的扩展属性（已保留）

- [x] Task 11: 修复 API3 页面数据映射
  - [x] SubTask 11.1: 审查 networkStats 的数据来源（已确认使用 airnodeStats 和 dapiCoverage）
  - [x] SubTask 11.2: 确保默认值合理或移除默认值（已移除不合理的默认值，使用 0）
  - [x] SubTask 11.3: 添加数据验证（已添加条件判断）

- [ ] Task 12: 验证翻译键完整性
  - [ ] SubTask 12.1: 提取所有页面中使用的翻译键
  - [ ] SubTask 12.2: 检查翻译文件中是否存在这些键
  - [ ] SubTask 12.3: 添加缺失的翻译键

- [ ] Task 13: 改进类型安全
  - [ ] SubTask 13.1: 审查所有 `?? null` 和 `|| null` 使用
  - [ ] SubTask 13.2: 使用更严格的类型检查
  - [ ] SubTask 13.3: 添加类型守卫或验证函数

- [ ] Task 14: 修复 enabled 参数检查
  - [ ] SubTask 14.1: 更新 `useChainlinkAllData` 的 isLoading 计算
  - [ ] SubTask 14.2: 检查其他 hooks 是否有相同问题
  - [ ] SubTask 14.3: 确保 enabled=false 时返回正确的加载状态

- [ ] Task 15: 提取移动端菜单状态管理
  - [ ] SubTask 15.1: 创建 `useMobileMenu` hook
  - [ ] SubTask 15.2: 更新所有页面使用共享 hook
  - [ ] SubTask 15.3: 减少代码重复

# Task Dependencies

- [Task 1] 是基础任务，其他任务依赖其完成
- [Task 2] 可以与 [Task 1] 并行处理
- [Task 3], [Task 4], [Task 6] 依赖 [Task 1] 完成
- [Task 5], [Task 9], [Task 10], [Task 12], [Task 13], [Task 14], [Task 15] 可以独立处理
- [Task 7], [Task 8], [Task 11] 依赖 [Task 1] 和 [Task 4] 完成
