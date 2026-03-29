# Tasks

## Phase 1: 严重问题修复（高优先级）

- [x] Task 1: 修复ABI编码实现
  - [x] SubTask 1.1: 安装 ethers.js 或 viem 依赖（如果尚未安装）
  - [x] SubTask 1.2: 移除自定义的 keccak256、simpleHash、encodeFunctionData 函数
  - [x] SubTask 1.3: 使用 ethers.js Interface 或 viem encodeFunctionData 实现正确的ABI编码
  - [ ] SubTask 1.4: 添加单元测试验证编码正确性

- [x] Task 2: 移除虚假验证数据
  - [x] SubTask 2.1: 移除 TellorHero 中的 mockVerificationData 生成
  - [x] SubTask 2.2: 添加数据来源标签（如果使用演示数据）
  - [ ] SubTask 2.3: 实现真实的链上验证数据获取（可选）

## Phase 2: 类型与数据层改进（高优先级）

- [x] Task 3: 修复类型定义问题
  - [x] SubTask 3.1: 合并 types.ts 中重复的 ReporterData 接口
  - [x] SubTask 3.2: 确保所有类型定义与实际数据结构一致
  - [x] SubTask 3.3: 添加缺失的类型导出

- [x] Task 4: 统一数据源管理
  - [x] SubTask 4.1: 创建 TellorClient 单例或通过 Context 提供
  - [x] SubTask 4.2: 统一 useTellorPage 和 hooks/oracles/tellor.ts 中的客户端实例
  - [x] SubTask 4.3: 添加数据来源标识（on-chain/cache/mock）

## Phase 3: 性能优化（中优先级）

- [x] Task 5: 优化组件数据生成
  - [x] SubTask 5.1: 在 TellorMarketView 中使用 useMemo 缓存生成的数据
  - [x] SubTask 5.2: 在 TellorHero 中移除随机数据生成
  - [ ] SubTask 5.3: 在其他视图中应用相同的优化

- [x] Task 6: 优化并发查询
  - [x] SubTask 6.1: 实现请求优先级机制
  - [x] SubTask 6.2: 对非关键数据实现延迟加载
  - [ ] SubTask 6.3: 添加请求批处理（如果可行）

## Phase 4: 错误处理改进（中优先级）

- [x] Task 7: 改进错误处理和用户反馈
  - [x] SubTask 7.1: 添加数据获取失败的明确错误提示
  - [x] SubTask 7.2: 实现数据来源切换的用户通知
  - [ ] SubTask 7.3: 添加重试机制的用户界面

## Phase 5: 合约配置完善（低优先级）

- [x] Task 8: 完善多链合约配置
  - [x] SubTask 8.1: 添加 Arbitrum 链的 Tellor 合约地址
  - [x] SubTask 8.2: 添加 Polygon 链的 Tellor 合约地址
  - [x] SubTask 8.3: 添加 Optimism 链的 Tellor 合约地址
  - [x] SubTask 8.4: 添加 Base 链的 Tellor 合约地址
  - [x] SubTask 8.5: 配置备用 RPC 端点

# Task Dependencies

- Task 1 (ABI编码修复) 阻塞 Task 2 (验证数据修复)
- Task 3 (类型修复) 可与 Task 1 并行
- Task 4 (数据源统一) 依赖 Task 3
- Task 5 (性能优化) 可与 Task 4 并行
- Task 6 (并发优化) 应在 Task 5 之后进行
- Task 7 (错误处理) 可与 Task 5 并行
- Task 8 (合约配置) 可与 Task 1 并行
