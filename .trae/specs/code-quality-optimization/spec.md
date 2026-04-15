# 代码质量优化 Spec

## Why

项目整体代码质量较高（7.7/10），架构设计合理，安全意识强，但在组件 prop drilling、React.memo 缺失、hook 模式不一致、类型断言过多、环境变量隔离等方面存在可优化空间，需要系统性改进以提升可维护性、性能和类型安全。

## What Changes

- 重构组件 prop 接口，将相关 props 聚合为类型化对象，减少 prop drilling
- 为纯展示子组件添加 React.memo，减少不必要的重渲染
- 统一 mutation hook 模式，将手动状态管理迁移到 useMutation
- 减少 `as` 类型断言，让 queries 层返回更精确的类型
- 修复模块级缓存清理机制，添加定时清理
- 统一 i18n 回退文本，消除硬编码字符串
- 优化 API 层：请求拦截器支持异步、Supabase 客户端单例化
- 加强环境变量客户端隔离，敏感字段不出现在客户端 schema
- 改善测试质量：减少 mock 耦合、修复文件名不匹配、消除测试中 any
- 提取重复的 on-chain 数据获取逻辑为统一 hook
- 将内联 SVG 图标抽取到独立文件

## Impact

- Affected specs: 组件架构、Hook 系统、API 层、状态管理、类型安全、性能、安全、测试
- Affected code:
  - `src/app/[locale]/price-query/` - prop 聚合、on-chain hook 合并
  - `src/app/[locale]/cross-chain/` - 缓存清理、未使用变量
  - `src/app/[locale]/cross-oracle/` - i18n 回退、memo
  - `src/components/Navbar.tsx` - 组件拆分、Image 优化
  - `src/components/Footer.tsx` - 图标抽取
  - `src/hooks/data/useAlerts.ts` - useMutation 迁移
  - `src/hooks/data/useFavorites.ts` - deepEqual 优化
  - `src/lib/api/` - 拦截器异步、客户端单例
  - `src/lib/config/env.ts` - 客户端 schema 隔离
  - `src/stores/authStore.ts` - rehydration 修复
  - 测试文件 - mock 优化、any 消除

## ADDED Requirements

### Requirement: 组件 Prop 聚合

系统 SHALL 将相关 props 聚合为类型化对象，单个组件接收的 props 数量不超过 10 个。

#### Scenario: PriceQueryContent 向 QueryResults 传参

- **WHEN** PriceQueryContent 渲染 QueryResults 组件
- **THEN** 相关 props 被聚合为 `queryState`、`chartState`、`statsState` 等类型化对象，而非 25+ 个独立 props

### Requirement: React.memo 纯展示组件优化

系统 SHALL 为接收稳定 props 的纯展示子组件添加 React.memo 包装，特别是在列表渲染和频繁更新的父组件场景中。

#### Scenario: 跨 Oracle 价格表格渲染

- **WHEN** CrossOracleContent 中的 PriceTable 接收相同数据
- **THEN** 组件不会因父组件其他状态变化而重新渲染

### Requirement: 统一 Mutation Hook 模式

系统 SHALL 使用 React Query 的 useMutation 处理所有数据变更操作，而非手动管理 isProcessing/isAcknowledging 状态。

#### Scenario: Alert 确认操作

- **WHEN** 用户确认一个 alert
- **THEN** 使用 useMutation 管理加载/错误/成功状态，与项目中其他 mutation hook 模式一致

### Requirement: API 响应运行时类型验证

系统 SHALL 对关键 API 响应使用 Zod schema 进行运行时类型验证，而非直接信任 JSON 解析结果。

#### Scenario: Oracle 价格数据获取

- **WHEN** ApiClient 接收到 API 响应
- **THEN** 响应数据经过 Zod schema 验证后才返回给调用方

### Requirement: 环境变量客户端隔离

系统 SHALL 为客户端和服务端定义完全不同的环境变量 schema，客户端 schema 不包含 SUPABASE_SERVICE_ROLE_KEY、CSRF_SECRET、JWT_SECRET 等敏感字段。

#### Scenario: 客户端环境变量访问

- **WHEN** 客户端代码访问环境变量
- **THEN** TypeScript 类型系统阻止访问服务端专属字段

### Requirement: On-Chain 数据获取统一 Hook

系统 SHALL 提供统一的 `useOnChainDataByProvider` hook，替代当前 DIA/WINkLink/RedStone 三个重复的 on-chain 数据获取逻辑。

#### Scenario: 按提供商获取链上数据

- **WHEN** 组件需要获取特定 oracle 的链上数据
- **THEN** 通过 `useOnChainDataByProvider(provider, options)` 统一调用，而非分别调用三个独立 hook

### Requirement: 模块级缓存定时清理

系统 SHALL 为 useDataFetching 中的模块级 Map 缓存添加定时清理机制，确保过期缓存在组件不活跃时也能被清理。

#### Scenario: 用户长时间停留在页面但不刷新数据

- **WHEN** 缓存条目超过 TTL 但没有新的 fetchData 调用
- **THEN** 定时器自动清理过期缓存条目

### Requirement: i18n 回退文本统一

系统 SHALL 消除所有硬编码的英文回退文本，统一使用 i18n key。

#### Scenario: CrossOracleContent 加载状态

- **WHEN** 数据加载中显示状态文本
- **THEN** 使用 `t('crossOracle.loadingData')` 而非 `t('crossOracle.loadingData') || 'Loading data'`

## MODIFIED Requirements

### Requirement: API 请求拦截器

请求拦截器 SHALL 支持异步操作（如 token 刷新），类型定义从 `(config: RequestInit) => RequestInit` 修改为 `(config: RequestInit) => RequestInit | Promise<RequestInit>`。

### Requirement: Supabase 客户端创建

authMiddleware SHALL 使用单例模式创建 Supabase 客户端，而非每次请求都动态 import 并创建新实例。

### Requirement: Navbar 组件结构

Navbar 组件 SHALL 将用户菜单下拉面板抽取为独立组件，将内联正则表达式提取为模块级常量，使用 Next.js Image 组件替代原生 img 标签，并对头像 URL 进行消毒。

### Requirement: Footer 图标管理

Footer 中的 6 个内联 SVG 图标 SHALL 抽取到独立的 icons 文件或使用 lucide-react 图标库。

### Requirement: 测试质量

测试文件 SHALL 减少手动 mock 数量，考虑使用 MSW 替代 API mock；测试文件名 SHALL 与被测模块匹配；测试中的 `as any` SHALL 替换为更精确的类型断言或工厂函数。

## REMOVED Requirements

### Requirement: 无

无需移除现有功能。
