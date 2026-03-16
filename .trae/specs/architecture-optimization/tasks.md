# Tasks

## Phase 1: 状态管理统一

- [x] Task 1.1: 创建 Zustand stores 目录结构和基础配置
  - [x] 创建 `src/stores/` 目录
  - [x] 创建 `src/stores/index.ts` 统一导出
  - [x] 配置 Zustand devtools 中间件

- [x] Task 1.2: 创建 Auth Store 替代 AuthContext
  - [x] 创建 `src/stores/authStore.ts`
  - [x] 实现 user, session, profile 状态
  - [x] 实现 signUp, signIn, signOut, resetPassword 方法
  - [x] 实现 session 持久化

- [x] Task 1.3: 创建 UI Store 替代 TimeRangeContext
  - [x] 创建 `src/stores/uiStore.ts`
  - [x] 实现 timeRange 状态
  - [x] 实现 chain/symbol 选择状态
  - [x] 实现模态框状态

- [x] Task 1.4: 创建 Realtime Store 替代 RealtimeContext
  - [x] 创建 `src/stores/realtimeStore.ts`
  - [x] 实现 connectionStatus 状态
  - [x] 实现 subscriptions 管理
  - [x] 实现 reconnect 方法

- [x] Task 1.5: 统一 React Query 配置
  - [x] 创建 `src/lib/config/queryClient.ts`
  - [x] 配置默认 staleTime, gcTime, retry
  - [x] 配置请求/响应拦截器
  - [x] 更新 ReactQueryProvider

- [x] Task 1.6: 迁移 AuthContext 使用方
  - [x] 更新 `src/app/layout.tsx` 使用 AuthStore
  - [x] 更新所有 `useAuth()` 调用为 `useAuthStore()`
  - [x] 更新 Navbar 组件
  - [x] 更新登录/注册页面

- [x] Task 1.7: 迁移 TimeRangeContext 使用方
  - [x] 更新所有 `useTimeRange()` 调用为 `useUIStore()`
  - [x] 更新图表组件
  - [x] 更新筛选组件

- [x] Task 1.8: 迁移 RealtimeContext 使用方
  - [x] 更新所有 `useRealtime()` 调用为 `useRealtimeStore()`
  - [x] 更新实时价格组件
  - [x] 更新连接状态指示器

- [x] Task 1.9: 清理旧 Context 文件
  - [x] 移除 `src/contexts/AuthContext.tsx`
  - [x] 移除 `src/contexts/TimeRangeContext.tsx`
  - [x] 移除 `src/contexts/RealtimeContext.tsx`
  - [x] 更新 `src/contexts/index.ts`

## Phase 2: 组件目录重组

- [x] Task 2.1: 创建新组件目录结构
  - [x] 创建 `src/components/features/` 目录
  - [x] 创建 `src/components/charts/` 目录
  - [x] 创建 `src/components/layout/` 目录

- [ ] Task 2.2: 重组 UI 组件
  - [ ] 扩展 `src/components/ui/` 基础组件
  - [ ] 添加 Button, Input, Select, Modal 组件
  - [ ] 创建 `src/components/ui/index.ts` 统一导出

- [ ] Task 2.3: 重组 Feature 组件
  - [ ] 移动 alerts 组件到 `src/components/features/alerts/`
  - [ ] 移动 favorites 组件到 `src/components/features/favorites/`
  - [ ] 移动 settings 组件到 `src/components/features/settings/`
  - [ ] 移动 realtime 组件到 `src/components/features/realtime/`

- [ ] Task 2.4: 重组 Chart 组件
  - [ ] 移动通用图表到 `src/components/charts/base/`
  - [ ] 移动技术指标图表到 `src/components/charts/technical/`
  - [ ] 移动分析图表到 `src/components/charts/analytics/`

- [ ] Task 2.5: 重组 Layout 组件
  - [ ] 移动 Navbar 到 `src/components/layout/Navbar/`
  - [ ] 移动 Footer 到 `src/components/layout/Footer/`
  - [ ] 创建 `src/components/layout/index.ts`

- [ ] Task 2.6: 重组 Oracle 组件
  - [ ] 创建 `src/components/oracle/shared/` 共享组件
  - [ ] 创建 `src/components/oracle/providers/` 按Provider分组
  - [ ] 移动 panels 组件到对应目录
  - [ ] 更新所有导入路径

- [ ] Task 2.7: 更新所有组件导入路径
  - [ ] 更新页面组件中的导入
  - [ ] 更新其他组件中的导入
  - [ ] 运行 lint 检查

## Phase 3: 统一 API 客户端

- [x] Task 3.1: 创建 API 客户端基础类
  - [x] 创建 `src/lib/api/client/ApiClient.ts`
  - [x] 实现 request, get, post, put, delete 方法
  - [x] 实现请求/响应拦截器机制
  - [x] 实现错误处理

- [x] Task 3.2: 创建 API 错误类
  - [x] 创建 `src/lib/api/client/ApiError.ts`
  - [x] 定义错误码枚举
  - [x] 实现错误转换

- [x] Task 3.3: 创建 API 响应类型
  - [x] 创建 `src/lib/api/client/types.ts`
  - [x] 定义 ApiResponse 接口
  - [x] 定义 PaginatedResponse 接口

- [ ] Task 3.4: 创建请求拦截器
  - [ ] 创建认证拦截器（添加 token）
  - [ ] 创建日志拦截器
  - [ ] 创建请求 ID 拦截器

- [ ] Task 3.5: 创建响应拦截器
  - [ ] 创建错误处理拦截器
  - [ ] 创建响应日志拦截器
  - [ ] 创建重试拦截器

- [ ] Task 3.6: 迁移现有 API 调用
  - [ ] 迁移 `src/lib/oracles/` 中的 API 调用
  - [ ] 迁移 `src/lib/supabase/` 中的查询
  - [ ] 迁移 hooks 中的 fetch 调用

## Phase 4: Hooks 目录优化

- [x] Task 4.1: 创建新 Hooks 目录结构
  - [x] 创建 `src/hooks/queries/` 目录
  - [x] 创建 `src/hooks/mutations/` 目录
  - [x] 创建 `src/hooks/realtime/` 目录
  - [x] 创建 `src/hooks/ui/` 目录

- [ ] Task 4.2: 重组 Query Hooks
  - [ ] 移动 `useOraclePrices.ts` 到 queries/
  - [ ] 移动 `usePriceHistory.ts` 到 queries/
  - [ ] 移动 `useOracleData.ts` 到 queries/
  - [ ] 创建 `src/hooks/queries/index.ts`

- [ ] Task 4.3: 重组 Mutation Hooks
  - [ ] 创建 `useAlertMutations.ts`
  - [ ] 创建 `useFavoriteMutations.ts`
  - [ ] 创建 `useSnapshotMutations.ts`
  - [ ] 创建 `src/hooks/mutations/index.ts`

- [ ] Task 4.4: 重组 Realtime Hooks
  - [ ] 移动 `useRealtimePrice.ts` 到 realtime/
  - [ ] 移动 `useRealtimeAlerts.ts` 到 realtime/
  - [ ] 创建 `src/hooks/realtime/index.ts`

- [ ] Task 4.5: 重组 UI Hooks
  - [ ] 移动 `useChartZoom.ts` 到 ui/
  - [ ] 移动 `useChartExport.ts` 到 ui/
  - [ ] 移动 `useKeyboardShortcuts.ts` 到 ui/
  - [ ] 创建 `src/hooks/ui/index.ts`

- [ ] Task 4.6: 更新所有 Hooks 导入路径
  - [ ] 更新组件中的 hooks 导入
  - [ ] 更新 `src/hooks/index.ts`
  - [ ] 运行 lint 检查

## Phase 5: 监控服务集成

- [x] Task 5.1: 安装 Sentry 依赖
  - [x] 安装 `@sentry/nextjs`
  - [x] 配置 `sentry.client.config.ts`
  - [x] 配置 `sentry.server.config.ts`
  - [x] 配置 `sentry.edge.config.ts`

- [x] Task 5.2: 配置 Sentry 集成
  - [x] 配置错误追踪
  - [x] 配置性能监控
  - [x] 配置 Session Replay
  - [x] 配置 Source Maps

- [x] Task 5.3: 创建监控工具函数
  - [x] 创建 `src/lib/monitoring/index.ts`
  - [x] 实现 `captureException` 封装
  - [x] 实现 `captureMessage` 封装
  - [x] 实现 `startSpan` 封装

- [x] Task 5.4: 集成 Web Vitals
  - [x] 创建 `src/lib/monitoring/webVitals.ts`
  - [x] 实现 CLS, FID, LCP, FCP, TTFB 收集
  - [x] 配置上报到分析服务
  - [x] 在 `layout.tsx` 中集成

- [x] Task 5.5: 添加错误边界监控
  - [x] 更新 ErrorBoundary 组件
  - [x] 添加 Sentry 错误上报
  - [x] 添加用户上下文信息

## Phase 6: 验证和清理

- [x] Task 6.1: 运行完整测试
  - [x] 运行 `npm run lint`
  - [x] 运行 `npm run test`
  - [x] 运行 `npm run build`

- [x] Task 6.2: 更新文档
  - [x] 更新 `ARCHITECTURE.md`
  - [x] 更新 `README.md`
  - [x] 创建迁移指南

- [x] Task 6.3: 清理冗余文件
  - [x] 移除旧的 Context 文件
  - [x] 移除重复的组件
  - [x] 清理未使用的导入

---

# Task Dependencies

- Task 1.2 depends on Task 1.1
- Task 1.3 depends on Task 1.1
- Task 1.4 depends on Task 1.1
- Task 1.5 depends on Task 1.1
- Task 1.6 depends on Task 1.2
- Task 1.7 depends on Task 1.3
- Task 1.8 depends on Task 1.4
- Task 1.9 depends on Task 1.6, Task 1.7, Task 1.8

- Task 2.2 depends on Task 2.1
- Task 2.3 depends on Task 2.1
- Task 2.4 depends on Task 2.1
- Task 2.5 depends on Task 2.1
- Task 2.6 depends on Task 2.3, Task 2.4
- Task 2.7 depends on Task 2.2, Task 2.3, Task 2.4, Task 2.5, Task 2.6

- Task 3.2 depends on Task 3.1
- Task 3.3 depends on Task 3.1
- Task 3.4 depends on Task 3.1
- Task 3.5 depends on Task 3.1
- Task 3.6 depends on Task 3.1, Task 3.2, Task 3.3, Task 3.4, Task 3.5

- Task 4.2 depends on Task 4.1
- Task 4.3 depends on Task 4.1
- Task 4.4 depends on Task 4.1
- Task 4.5 depends on Task 4.1
- Task 4.6 depends on Task 4.2, Task 4.3, Task 4.4, Task 4.5

- Task 5.2 depends on Task 5.1
- Task 5.3 depends on Task 5.1
- Task 5.4 depends on Task 5.1
- Task 5.5 depends on Task 5.2, Task 5.3

- Task 6.1 depends on Phase 1, Phase 2, Phase 3, Phase 4, Phase 5
- Task 6.2 depends on Task 6.1
- Task 6.3 depends on Task 6.1
