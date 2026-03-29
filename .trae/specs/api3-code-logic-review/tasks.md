# Tasks

## P0 - 严重问题修复

- [x] Task 1: 修复链上服务 ABI 编码实现
  - [x] SubTask 1.1: 引入 ethers 或 viem 库进行 ABI 编码
  - [x] SubTask 1.2: 重写 `encodeFunctionData()` 函数使用标准实现
  - [x] SubTask 1.3: 重写 `keccak256()` 函数或使用库函数
  - [x] SubTask 1.4: 修复 `encodeArg()` 地址类型处理
  - [x] SubTask 1.5: 添加单元测试验证编码正确性

- [x] Task 2: 实现真实数据获取或标注模拟数据
  - [x] SubTask 2.1: 评估 `getCoveragePoolEvents()` 是否可接入真实 API
  - [x] SubTask 2.2: 评估 `getLatencyDistribution()` 真实数据源
  - [x] SubTask 2.3: 评估 `getOHLCPrices()` 真实数据源
  - [x] SubTask 2.4: 评估 `getQualityHistory()` 真实数据源
  - [x] SubTask 2.5: 为无法获取真实数据的方法添加"模拟数据"标注

- [x] Task 3: 修复 WebSocket 消息队列无限增长问题
  - [x] SubTask 3.1: 添加 `maxQueueSize` 配置项
  - [x] SubTask 3.2: 实现队列大小检查和丢弃策略
  - [x] SubTask 3.3: 添加队列过期消息清理机制
  - [x] SubTask 3.4: 添加队列状态监控

## P1 - 重要问题修复

- [x] Task 4: 优化批量请求性能
  - [x] SubTask 4.1: 实现请求优先级队列
  - [x] SubTask 4.2: 实现请求去重机制
  - [x] SubTask 4.3: 考虑实现请求合并接口
  - [x] SubTask 4.4: 添加并发请求限制

- [x] Task 5: 优化缓存状态检查
  - [x] SubTask 5.1: 创建共享的缓存状态 Context
  - [x] SubTask 5.2: 减少检查频率或使用事件驱动
  - [x] SubTask 5.3: 避免不必要的重渲染

- [x] Task 6: 完善 IndexedDB 错误处理
  - [x] SubTask 6.1: 添加详细的错误日志
  - [x] SubTask 6.2: 处理 `precacheCriticalData` 失败情况
  - [x] SubTask 6.3: 添加配额超限处理逻辑
  - [x] SubTask 6.4: 添加用户友好的错误提示

- [x] Task 7: 修复 API3DapiView 使用 Mock 数据
  - [x] SubTask 7.1: 移除硬编码的 `mockDapiFeeds`
  - [x] SubTask 7.2: 使用传入的 props 数据
  - [x] SubTask 7.3: 从 hooks 获取真实数据
  - [x] SubTask 7.4: 添加加载和错误状态处理

## P2 - 一般问题修复

- [ ] Task 8: 添加 RPC 端点故障转移
  - [ ] SubTask 8.1: 配置多个备用 RPC 端点
  - [ ] SubTask 8.2: 实现端点健康检查
  - [ ] SubTask 8.3: 实现自动故障转移逻辑
  - [ ] SubTask 8.4: 添加端点状态监控

- [ ] Task 9: 实现请求速率限制
  - [ ] SubTask 9.1: 创建全局速率限制器
  - [ ] SubTask 9.2: 配置每秒最大请求数
  - [ ] SubTask 9.3: 实现请求队列管理
  - [ ] SubTask 9.4: 添加速率限制日志

- [ ] Task 10: 风险数据动态获取
  - [ ] SubTask 10.1: 评估风险指标数据源
  - [ ] SubTask 10.2: 实现风险指标 API 集成
  - [ ] SubTask 10.3: 实现风险事件动态获取
  - [ ] SubTask 10.4: 添加数据更新机制

- [ ] Task 11: 明确标注模拟数据
  - [ ] SubTask 11.1: 在 Hero 组件添加模拟数据提示
  - [ ] SubTask 11.2: 在价格图表添加数据来源标注
  - [ ] SubTask 11.3: 添加全局模拟数据开关提示

## P3 - 代码质量改进

- [ ] Task 12: 加强类型定义
  - [ ] SubTask 12.1: 为 `validateData` schema 参数定义精确类型
  - [ ] SubTask 12.2: 为 `WebSocketCallback` 定义精确类型
  - [ ] SubTask 12.3: 减少 `unknown` 类型使用
  - [ ] SubTask 12.4: 添加类型守卫函数

- [ ] Task 13: 统一错误处理
  - [ ] SubTask 13.1: 创建统一的错误处理工具函数
  - [ ] SubTask 13.2: 统一日志格式
  - [ ] SubTask 13.3: 添加错误上报机制
  - [ ] SubTask 13.4: 更新所有错误处理代码

- [ ] Task 14: 实现请求取消机制
  - [ ] SubTask 14.1: 为 `batchUpdate` 添加 AbortController 支持
  - [ ] SubTask 14.2: 组件卸载时取消进行中的请求
  - [ ] SubTask 14.3: 实现 `pendingUpdates` 清理逻辑
  - [ ] SubTask 14.4: 添加取消状态处理

- [ ] Task 15: 完善 SSR 支持
  - [ ] SubTask 15.1: 使用 `useEffect` 确保 WebSocket 只在客户端初始化
  - [ ] SubTask 15.2: 修复 `navigator.onLine` SSR 问题
  - [ ] SubTask 15.3: 添加 SSR 兼容性测试
  - [ ] SubTask 15.4: 处理水合不匹配问题

## Task Dependencies
- [Task 1] 应优先处理，影响链上数据获取
- [Task 2] 与 [Task 1] 相关，可并行处理
- [Task 3] 独立问题，可并行处理
- [Task 4] 依赖 [Task 1, Task 2] 完成
- [Task 5, 6, 7] 可并行处理
- [Task 8, 9, 10, 11] 可并行处理
- [Task 12, 13, 14, 15] 可并行处理
