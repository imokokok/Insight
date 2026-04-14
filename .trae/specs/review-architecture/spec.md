# Insight 项目架构优化 Spec

## Why

Insight 项目作为一个多 Oracle 价格聚合平台，代码量已达到中大型规模，但架构层面存在若干设计不一致、类型安全不足、职责划分不清等问题，这些问题会随着功能增长而放大，影响可维护性和可靠性。具体问题包括：

1. **DI 容器类型不安全** - 使用字符串 token 无法在编译时发现拼写错误或类型不匹配
2. **crossChainStore 职责过重** - 单个 store 混合了选择器状态、UI 状态、数据状态，导致不必要的重渲染
3. **Alert CRUD 使用 useCallback 而非 useMutation** - 无法利用 React Query 的自动错误处理、重试和缓存失效机制
4. **OracleCache 无容量限制** - 可能导致内存泄漏
5. **手写 HTML 消毒逻辑** - 存在安全风险，应使用业界标准库
6. **authStore 无持久化** - 页面刷新后需要重新获取 profile
7. **WebSocket Hook 回调引用不稳定** - 可能导致 WebSocket 连接重建

## What Changes

### 1. DI 容器类型安全重构

- 创建 `Token<T>` 泛型类，将 token 字符串与类型绑定
- 修改 `Container.resolve` 从 token 自动推断返回类型
- 添加循环依赖检测机制

### 2. crossChainStore 职责拆分

- 拆分为 `crossChainSelectorStore`（选择器状态）
- 拆分为 `crossChainUIStore`（UI 状态）
- 拆分为 `crossChainDataStore`（数据状态）
- 更新所有消费组件的 import 路径

### 3. Alert Hooks 迁移至 useMutation

- 将 `useCreateAlert`、`useUpdateAlert`、`useDeleteAlert` 改为使用 `useMutation`
- 移除手动管理的 `isCreating`/`isUpdating`/`isDeleting` 状态
- 利用 `onSuccess` 自动 invalidate 相关 query key

### 4. OracleCache 容量限制

- 添加 `MAX_CACHE_SIZE` 常量（1000）
- 实现 LRU 淘汰策略
- 添加定期清理过期条目的 `setInterval`

### 5. DOMPurify 集成

- 安装 `dompurify` 和 `@types/dompurify`
- 重构 `sanitizeHtmlBasic` 使用 DOMPurify
- 补充 XSS 检测模式

### 6. authStore 状态持久化

- 添加 `persist` 中间件
- 使用 `partialize` 仅持久化 `profile` 和 `preferences`
- 实现 `onRehydrateStorage` 处理 Date 对象恢复

### 7. WebSocket Hook 回调稳定化

- 使用 `useRef` 存储 `onPerformanceMetrics` 和其他回调参数
- 避免因回调引用变化导致 WebSocket 连接重建

## Impact

- Affected specs: 状态管理层、DI 容器、数据获取层、安全模块、Oracle 核心层
- Affected code:
  - `src/lib/di/` — DI 容器全面重构
  - `src/stores/crossChainStore.ts` — 拆分为多个 store
  - `src/stores/authStore.ts` — 增加持久化
  - `src/hooks/data/useAlerts.ts` — 迁移至 useMutation
  - `src/lib/oracles/base.ts` — OracleCache 增加容量限制
  - `src/lib/security/` — 引入 DOMPurify
  - `src/lib/realtime/websocket.ts` — 稳定化 Hook 依赖

## ADDED Requirements

### Requirement: 类型安全 DI 容器

系统 SHALL 提供编译时类型安全的依赖注入机制，确保 token 与服务类型的对应关系在编译时即可验证。

#### Scenario: Token 类型不匹配时编译报错

- **WHEN** 开发者使用错误类型 resolve 一个 token
- **THEN** TypeScript 编译器 SHALL 报告类型错误

#### Scenario: Token 拼写错误时编译报错

- **WHEN** 开发者使用不存在的 token 字符串
- **THEN** TypeScript 编译器 SHALL 报告类型错误

### Requirement: Store 职责单一化

系统 SHALL 将 `crossChainStore` 拆分为职责单一的独立 store，每个 store 只负责一类状态。

#### Scenario: 选择器状态与 UI 状态独立更新

- **WHEN** 用户修改跨链选择器
- **THEN** 不应触发 UI 状态（如排序、分页）的订阅者重渲染

### Requirement: 统一数据访问路径

系统 SHALL 为同一功能域提供一致的数据访问路径，避免直接 queries 与 API 路由混用。

#### Scenario: Alert CRUD 操作路径一致

- **WHEN** 开发者执行 alert 的创建/读取/更新/删除
- **THEN** 所有操作 SHALL 通过同一条数据路径（API 路由或直接 queries，而非混用）

### Requirement: CRUD Hooks 使用 useMutation

系统 SHALL 使用 React Query 的 `useMutation` 管理创建/更新/删除操作，利用其自动错误处理、重试和缓存失效能力。

#### Scenario: 创建 alert 后自动刷新列表

- **WHEN** 用户创建新 alert
- **THEN** `useMutation` 的 `onSuccess` SHALL 自动 invalidate 相关 query key

### Requirement: OracleCache 容量限制

系统 SHALL 为 OracleCache 设置最大条目数限制，防止长时间运行导致的内存泄漏。

#### Scenario: 缓存达到上限时淘汰旧数据

- **WHEN** 缓存条目数超过 `MAX_CACHE_SIZE`
- **THEN** 系统 SHALL 淘汰最早过期的条目

### Requirement: 安全 HTML 消毒

系统 SHALL 使用业界标准库（DOMPurify）进行 HTML 消毒，而非手写正则替换。

#### Scenario: 恶意 HTML 被正确过滤

- **WHEN** 输入包含 `<svg/onload=alert(1)>` 等绕过变体
- **THEN** DOMPurify SHALL 正确移除危险内容

## MODIFIED Requirements

### Requirement: authStore 状态持久化

authStore SHALL 持久化 `profile` 和 `preferences` 到 localStorage，避免每次页面刷新重新获取。`session` 仍由 Supabase cookie 管理，不纳入 localStorage 持久化范围。

### Requirement: WebSocket Hook 回调引用稳定化

`createWebSocketHook` 的 `onPerformanceMetrics` 回调 SHALL 使用 `useRef` 稳定化，避免因回调引用变化导致 WebSocket 连接重建。

## REMOVED Requirements

### Requirement: 字符串 token DI 解析

**Reason**: 字符串 token 无法提供编译时类型安全，已被类型安全 token 机制替代

**Migration**: 所有 `container.resolve<ISomeService>('ISomeService')` 迁移为 `container.resolve(SERVICE_TOKENS.SomeService)`，类型由 token 定义自动推断
