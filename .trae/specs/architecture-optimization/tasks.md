# Tasks

## Phase 1: 状态管理统一化

- [x] Task 1: 移除 SWR，统一使用 React Query
  - [x] SubTask 1.1: 审计所有使用 SWR 的 hooks，记录迁移清单
  - [x] SubTask 1.2: 将 useOracleDataSWR 迁移到 React Query
  - [x] SubTask 1.3: 更新所有使用 SWR hooks 的组件
  - [x] SubTask 1.4: 移除 SWRProvider 和 SWR 依赖
  - [x] SubTask 1.5: 更新 React Query 配置，优化缓存策略

- [x] Task 2: 优化 Zustand Store 结构
  - [x] SubTask 2.1: 审计现有 store，识别可合并的状态
  - [x] SubTask 2.2: 为 crossChainStore 添加持久化配置
  - [x] SubTask 2.3: 创建通用 UI 状态 store（替代多个独立 useState）
  - [x] SubTask 2.4: 添加 store 选择器优化性能

## Phase 2: API 层重构

- [x] Task 3: 创建 API 路由抽象层
  - [x] SubTask 3.1: 设计 createApiHandler 工厂函数
  - [x] SubTask 3.2: 实现中间件系统（认证、验证、日志、错误处理）
  - [x] SubTask 3.3: 创建通用请求验证器
  - [x] SubTask 3.4: 创建统一响应格式工具

- [x] Task 4: 重构现有 API 路由
  - [x] SubTask 4.1: 重构 /api/oracles 路由使用新抽象
  - [x] SubTask 4.2: 重构 /api/alerts 路由使用新抽象
  - [x] SubTask 4.3: 重构 /api/favorites 路由使用新抽象
  - [x] SubTask 4.4: 重构 /api/snapshots 路由使用新抽象
  - [x] SubTask 4.5: 重构 /api/auth 路由使用新抽象

- [x] Task 5: 引入 API 版本控制
  - [x] SubTask 5.1: 设计版本控制策略
  - [x] SubTask 5.2: 创建 /api/v1 路由结构
  - [x] SubTask 5.3: 添加版本废弃响应头支持
  - [x] SubTask 5.4: 更新 API 文档

## Phase 3: 错误处理体系

- [x] Task 6: 建立自定义错误类层级
  - [x] SubTask 6.1: 创建基础 AppError 类
  - [x] SubTask 6.2: 创建业务错误类（ValidationError, NotFoundError, AuthenticationError, AuthorizationError, ConflictError, RateLimitError）
  - [x] SubTask 6.3: 创建 Oracle 特定错误类（OracleClientError, PriceFetchError, UnsupportedChainError）
  - [x] SubTask 6.4: 实现错误到 HTTP 响应的转换器

- [x] Task 7: 集成错误处理到各层
  - [x] SubTask 7.1: 在 API 路由层集成错误处理
  - [x] SubTask 7.2: 在 Oracle 客户端层集成错误处理
  - [x] SubTask 7.3: 在 React Query 中添加全局错误处理
  - [x] SubTask 7.4: 添加前端错误边界和用户友好提示

## Phase 4: 类型系统优化

- [x] Task 8: 重组类型定义目录结构
  - [x] SubTask 8.1: 创建 types/ 子目录结构（common/, oracle/, auth/, api/, ui/）
  - [x] SubTask 8.2: 迁移 oracle 类型到 types/oracle/
  - [x] SubTask 8.3: 提取共享类型到 types/common/
  - [x] SubTask 8.4: 创建 API 请求/响应类型到 types/api/
  - [x] SubTask 8.5: 更新所有导入路径

- [x] Task 9: 消除类型重复定义
  - [x] SubTask 9.1: 审计所有类型定义，识别重复
  - [x] SubTask 9.2: 合并重复的类型定义
  - [x] SubTask 9.3: 使用 TypeScript utility types 减少样板代码
  - [x] SubTask 9.4: 添加严格的类型检查配置

## Phase 5: 依赖注入与可测试性

- [x] Task 10: 实现依赖注入容器
  - [x] SubTask 10.1: 创建简单的 DI 容器实现
  - [x] SubTask 10.2: 注册 Oracle 客户端到容器
  - [x] SubTask 10.3: 注册服务类到容器
  - [x] SubTask 10.4: 创建 React hooks 获取依赖

- [x] Task 11: 提升可测试性
  - [x] SubTask 11.1: 为 Oracle 客户端创建接口定义
  - [x] SubTask 11.2: 创建 mock 实现工厂
  - [x] SubTask 11.3: 重构组件使用依赖注入
  - [x] SubTask 11.4: 添加测试工具函数

## Phase 6: 组件结构优化

- [x] Task 12: 重组 Oracle 组件目录
  - [x] SubTask 12.1: 创建功能子目录（charts/, indicators/, panels/, tables/, forms/）
  - [x] SubTask 12.2: 移动组件到对应子目录
  - [x] SubTask 12.3: 为每个子目录创建 index.ts
  - [x] SubTask 12.4: 更新所有导入路径

- [x] Task 13: 组件标准化
  - [x] SubTask 13.1: 统一组件命名规范
  - [x] SubTask 13.2: 添加组件文档注释
  - [x] SubTask 13.3: 提取可复用组件到 ui/ 目录
  - [x] SubTask 13.4: 创建组件使用示例

## Phase 7: 测试与监控

- [x] Task 14: 完善测试架构
  - [x] SubTask 14.1: 配置 Jest 测试环境
  - [x] SubTask 14.2: 为核心 hooks 添加单元测试
  - [x] SubTask 14.3: 为 API 路由添加集成测试
  - [x] SubTask 14.4: 配置测试覆盖率报告
  - [x] SubTask 14.5: 添加 CI 测试覆盖率检查

- [x] Task 15: 集成监控与可观测性
  - [x] SubTask 15.1: 配置性能监控（已有 Vercel Analytics）
  - [x] SubTask 15.2: 添加自定义性能指标收集
  - [x] SubTask 15.3: 集成错误追踪服务（如 Sentry）
  - [x] SubTask 15.4: 添加健康检查端点

## Phase 8: 文档与规范

- [x] Task 16: 更新架构文档
  - [x] SubTask 16.1: 更新 ARCHITECTURE.md 反映新架构
  - [x] SubTask 16.2: 创建编码规范文档
  - [x] SubTask 16.3: 创建 API 文档
  - [x] SubTask 16.4: 创建迁移指南

---

# Task Dependencies

- [Task 2] depends on [Task 1] (状态管理统一后再优化 store)
- [Task 4] depends on [Task 3] (需要先有抽象层才能重构)
- [Task 5] depends on [Task 4] (先完成重构再添加版本控制)
- [Task 7] depends on [Task 6] (需要先有错误类)
- [Task 11] depends on [Task 10] (需要先有 DI 容器)
- [Task 12] depends on [Task 8] (类型重组后再移动组件)
- [Task 14] depends on [Task 1, Task 3, Task 6, Task 10] (核心架构稳定后完善测试)
- [Task 16] depends on [Task 1-15] (最后更新文档)

---

# Parallelizable Tasks

以下任务可以并行执行：
- Task 1 + Task 6 + Task 8 + Task 10 (状态管理、错误处理、类型系统、依赖注入互不依赖)
- Task 12 + Task 13 (组件重组和标准化可并行)
- Task 14 + Task 15 (测试和监控可并行)
