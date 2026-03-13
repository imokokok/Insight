# Tasks

## 严重问题修复

- [x] Task 1: 统一时间戳处理逻辑
  - [x] SubTask 1.1: 创建时间戳工具模块 `lib/utils/timestamp.ts`，提供统一的转换函数
  - [x] SubTask 1.2: 修复 `queries.ts` 中的时间戳保存逻辑
  - [x] SubTask 1.3: 修复 `api/oracles/route.ts` 中的时间戳传入逻辑
  - [x] SubTask 1.4: 添加单元测试验证时间戳转换

- [x] Task 2: 修复 Pyth Hermes 类型安全问题
  - [x] SubTask 2.1: 修复 `convertPythPrice` 函数参数类型定义
  - [x] SubTask 2.2: 添加类型守卫验证 WebSocket 消息格式
  - [x] SubTask 2.3: 更新 `handlePriceUpdate` 中的类型处理

- [x] Task 3: 实现 Pyth 历史价格功能
  - [x] SubTask 3.1: 研究 Pyth API 是否支持历史价格查询
  - [x] SubTask 3.2: 如果支持，实现 API 调用逻辑
  - [x] SubTask 3.3: 如果不支持，抛出 `NotImplementedError` 并记录日志

## 性能优化

- [x] Task 4: 优化告警检测性能
  - [x] SubTask 4.1: 重构 `checkAlertConditions` 函数，批量获取历史价格
  - [x] SubTask 4.2: 添加内存缓存减少数据库查询
  - [x] SubTask 4.3: 添加性能监控日志

## 代码重构

- [x] Task 5: 提取公共 API 工具函数
  - [x] SubTask 5.1: 创建 `lib/api/utils.ts` 文件
  - [x] SubTask 5.2: 提取 `getUserId` 函数到公共模块
  - [x] SubTask 5.3: 更新 `api/alerts/route.ts` 使用公共函数
  - [x] SubTask 5.4: 更新 `api/alerts/[id]/route.ts` 使用公共函数
  - [x] SubTask 5.5: 更新 `api/snapshots/route.ts` 使用公共函数

- [x] Task 6: 重构 Oracle API 路由
  - [x] SubTask 6.1: 创建 `lib/api/oracleHandlers.ts` 提取公共逻辑
  - [x] SubTask 6.2: 重构 `api/oracles/route.ts` 使用公共处理器
  - [x] SubTask 6.3: 重构 `api/oracles/[provider]/route.ts` 使用公共处理器

- [x] Task 7: 统一 WebSocket 管理
  - [x] SubTask 7.1: 审查 `lib/realtime/websocket.ts` 和 `hooks/useWebSocket.ts` 的功能重叠
  - [x] SubTask 7.2: 确定保留哪个实现作为核心
  - [x] SubTask 7.3: 重构另一个为对核心实现的封装
  - [x] SubTask 7.4: 更新所有引用

## 配置规范化

- [x] Task 8: 修复 WebSocket URL 配置
  - [x] SubTask 8.1: 更新 `websocket.ts` 中的默认 URL 为有效值或移除默认值
  - [x] SubTask 8.2: 添加配置验证，在配置缺失时抛出明确错误
  - [x] SubTask 8.3: 更新文档说明配置要求

- [x] Task 9: 规范化基础价格配置
  - [x] SubTask 9.1: 将 `UNIFIED_BASE_PRICES` 移动到配置文件
  - [x] SubTask 9.2: 支持从环境变量读取
  - [x] SubTask 9.3: 添加配置更新机制

## 代码规范

- [x] Task 10: 修复文件命名规范
  - [x] SubTask 10.1: 将 `uma.tsx` 重命名为 `uma.ts` - **已跳过**：文件包含 JSX 组件，命名正确
  - [x] SubTask 10.2: 更新所有导入引用 - **已跳过**：无需更新

# Task Dependencies

- [Task 2] 依赖 [Task 3] - 类型修复应在功能实现之前完成
- [Task 5] 和 [Task 6] 可以并行执行
- [Task 7] 应在 [Task 5] 和 [Task 6] 之后执行，避免重复重构
- [Task 8] 和 [Task 9] 可以并行执行
