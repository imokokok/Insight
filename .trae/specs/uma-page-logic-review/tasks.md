# Tasks

## 高优先级任务

- [x] Task 1: 统一模拟数据源管理
  - [x] SubTask 1.1: 创建 `mockDataConfig.ts` 统一管理所有模拟数据配置
  - [x] SubTask 1.2: 实现种子随机数生成器，确保数据一致性
  - [x] SubTask 1.3: 添加环境变量 `USE_MOCK_DATA` 控制数据源
  - [x] SubTask 1.4: 重构 `UMAClient` 使用统一数据源

- [x] Task 2: 修复WebSocket连接管理问题
  - [x] SubTask 2.1: 创建 `UMAWebSocketContext` 提供共享连接
  - [x] SubTask 2.2: 重构 `useUMARealtimePrice` 使用共享连接
  - [x] SubTask 2.3: 重构 `useUMARealtimeDisputes` 使用共享连接
  - [x] SubTask 2.4: 重构 `useUMARealtimeValidators` 使用共享连接
  - [x] SubTask 2.5: 重构 `useUMARealtimeNetwork` 使用共享连接
  - [x] SubTask 2.6: 重构 `useUMARealtimeRequests` 使用共享连接

- [x] Task 3: 修复内存泄漏风险
  - [x] SubTask 3.1: 审查 `CountdownTimer` 组件定时器清理 - 已确认正确清理
  - [x] SubTask 3.2: 审查 `OptimisticOracleFlow` 动画定时器清理 - 已确认正确清理
  - [x] SubTask 3.3: 审查 `DataRequestBrowser` 自动刷新定时器清理 - 已确认正确清理
  - [x] SubTask 3.4: 审查 `useThrottledCallback` 超时清理 - 已确认正确清理

## 中优先级任务

- [x] Task 4: 改进错误处理机制
  - [x] SubTask 4.1: 创建统一错误处理中间件
  - [x] SubTask 4.2: 修改 `useUmaPage` 聚合所有错误信息
  - [x] SubTask 4.3: 为 `getValidatorEarningsAttribution` 添加友好错误处理
  - [x] SubTask 4.4: 添加错误边界组件的错误聚合显示

- [x] Task 5: 性能优化
  - [x] SubTask 5.1: 为 `getDisputes()` 添加数据缓存
  - [x] SubTask 5.2: 为 `getValidatorPerformanceHeatmap()` 添加缓存
  - [x] SubTask 5.3: 优化 `generateOrderBook` 使用确定性数据
  - [x] SubTask 5.4: 为大数据列表添加虚拟化滚动

- [x] Task 6: 修复状态管理问题
  - [x] SubTask 6.1: 移除 `OptimisticOracleFlow` 生产环境的模拟进度按钮
  - [x] SubTask 6.2: 根据 `DataRequestBrowser` 实际数据确定流程阶段
  - [x] SubTask 6.3: 添加数据新鲜度检测和自动刷新

## 低优先级任务

- [x] Task 7: 代码质量提升
  - [x] SubTask 7.1: 将硬编码文本移至国际化文件
  - [x] SubTask 7.2: 为 `UMAClient` 方法添加输入验证
  - [x] SubTask 7.3: 改进类型定义，移除 `any` 类型
  - [x] SubTask 7.4: 添加 JSDoc 注释

- [x] Task 8: 用户体验改进
  - [x] SubTask 8.1: 为所有组件添加完整的加载状态
  - [x] SubTask 8.2: 实现数据刷新的视觉反馈
  - [x] SubTask 8.3: 添加数据源标识（实时/模拟/缓存）

# Task Dependencies

- Task 2 依赖 Task 1（数据源统一后更容易测试WebSocket）
- Task 3 可与 Task 1-2 并行
- Task 4 应在 Task 1 完成后进行
- Task 5 可与 Task 4 并行
- Task 6 应在 Task 1 完成后进行
- Task 7-8 可与 Task 1-6 并行
