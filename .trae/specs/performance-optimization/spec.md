# 性能优化 Spec

## Why
项目作为一个 Oracle 数据分析平台，涉及大量实时数据更新、复杂图表渲染和 WebSocket 连接。当前存在以下性能瓶颈：
1. 大型组件导致初始加载缓慢和重复渲染
2. 图表数据量大时渲染性能下降
3. 实时数据更新可能导致不必要的组件重渲染
4. 缺少系统性的性能监控和优化策略

## What Changes
- 实施组件级别的性能优化（memo、useMemo、useCallback）
- 优化图表渲染性能（虚拟化、降采样、懒加载）
- 优化 React Query 缓存策略和数据预取
- 优化 WebSocket 数据更新频率和批处理
- 添加图片和资源优化配置
- 建立性能监控指标体系
- **BREAKING**: 部分组件将使用 memo 包裹，可能影响测试快照

## Impact
- Affected specs: 所有图表组件、实时数据 hooks、数据获取逻辑
- Affected code:
  - `src/components/oracle/charts/*` - 图表组件
  - `src/hooks/*` - 数据 hooks
  - `src/providers/ReactQueryProvider.tsx` - 缓存配置
  - `src/lib/realtime/*` - WebSocket 管理
  - `next.config.ts` - 构建优化配置

## ADDED Requirements

### Requirement: 组件渲染优化
系统 SHALL 对频繁渲染的组件实施 memo 优化，避免不必要的重渲染。

#### Scenario: 图表组件 memo 化
- **GIVEN** 图表组件接收相同的 props
- **WHEN** 父组件重新渲染
- **THEN** 图表组件不应重新渲染

#### Scenario: 列表项 memo 化
- **GIVEN** 虚拟列表中的列表项组件
- **WHEN** 列表数据部分更新
- **THEN** 仅更新的列表项重新渲染

### Requirement: 数据计算优化
系统 SHALL 使用 useMemo 和 useCallback 优化昂贵的计算和回调函数。

#### Scenario: 图表数据处理
- **GIVEN** 图表需要处理大量数据点
- **WHEN** 组件渲染
- **THEN** 数据转换应被 memo 化，避免每次渲染重新计算

#### Scenario: 事件回调优化
- **GIVEN** 组件传递回调给子组件
- **WHEN** 父组件重新渲染
- **THEN** 回调函数引用应保持稳定

### Requirement: 图表渲染优化
系统 SHALL 实施图表级别的性能优化策略。

#### Scenario: 大数据集降采样
- **GIVEN** 图表数据点超过 500 个
- **WHEN** 渲染图表
- **THEN** 应自动应用降采样算法，保持渲染时间 < 100ms

#### Scenario: 图表懒加载
- **GIVEN** 图表组件不在视口内
- **WHEN** 页面初始加载
- **THEN** 图表应延迟渲染直到进入视口

#### Scenario: 图表虚拟化
- **GIVEN** 需要渲染大量图表实例
- **WHEN** 用户滚动页面
- **THEN** 应使用虚拟滚动仅渲染可见区域的图表

### Requirement: React Query 缓存优化
系统 SHALL 优化 React Query 的缓存策略和数据预取。

#### Scenario: 价格数据缓存
- **GIVEN** 价格数据查询
- **WHEN** 数据在 staleTime 内
- **THEN** 应返回缓存数据，不发起网络请求

#### Scenario: 数据预取
- **GIVEN** 用户悬停在导航链接上
- **WHEN** 可能访问目标页面
- **THEN** 应预取该页面的数据

#### Scenario: 后台数据刷新
- **GIVEN** 用户在查看数据
- **WHEN** 数据变为 stale
- **THEN** 应在后台静默刷新，不影响当前显示

### Requirement: WebSocket 性能优化
系统 SHALL 优化 WebSocket 数据更新策略。

#### Scenario: 数据更新批处理
- **GIVEN** 短时间内收到多个价格更新
- **WHEN** 更新频率超过 100ms
- **THEN** 应批量处理更新，减少渲染次数

#### Scenario: 数据节流
- **GIVEN** 实时价格推送
- **WHEN** 推送频率过高
- **THEN** 应节流更新频率至最高 10fps

#### Scenario: 断线重连优化
- **GIVEN** WebSocket 连接断开
- **WHEN** 尝试重连
- **THEN** 应使用指数退避策略，避免频繁重连

### Requirement: 资源加载优化
系统 SHALL 优化静态资源和第三方库的加载。

#### Scenario: 图片优化
- **GIVEN** 页面包含图片资源
- **WHEN** 构建项目
- **THEN** 应启用 Next.js 图片优化，使用 WebP 格式

#### Scenario: 第三方库优化
- **GIVEN** 使用大型第三方库（recharts、framer-motion）
- **WHEN** 打包构建
- **THEN** 应配置 tree-shaking 和代码分割

#### Scenario: 字体优化
- **GIVEN** 使用自定义字体
- **WHEN** 页面加载
- **THEN** 应使用 font-display: swap 避免阻塞渲染

### Requirement: 性能监控
系统 SHALL 建立性能监控指标体系。

#### Scenario: Core Web Vitals 监控
- **GIVEN** 应用运行在生产环境
- **WHEN** 用户访问页面
- **THEN** 应收集 LCP、FID、CLS 指标并上报

#### Scenario: 自定义性能指标
- **GIVEN** 关键用户交互
- **WHEN** 用户执行操作
- **THEN** 应记录操作耗时，用于性能分析

#### Scenario: 性能预算
- **GIVEN** 项目构建
- **WHEN** 打包完成
- **THEN** 应检查包大小是否超出预算（建议：首屏 JS < 200KB）

### Requirement: 首屏加载优化
系统 SHALL 优化首屏加载性能。

#### Scenario: 关键 CSS 内联
- **GIVEN** 首屏渲染
- **WHEN** 页面加载
- **THEN** 关键 CSS 应内联，避免阻塞渲染

#### Scenario: 骨架屏优化
- **GIVEN** 数据加载中
- **WHEN** 显示加载状态
- **THEN** 应使用骨架屏而非全屏 loading，提升感知性能

#### Scenario: 路由预加载
- **GIVEN** 用户可能访问的页面
- **WHEN** 用户悬停导航链接
- **THEN** 应预加载目标页面的代码和数据

## MODIFIED Requirements

### Requirement: React Query Provider 配置
系统 SHALL 更新 React Query 默认配置以优化性能。

#### Scenario: 缓存时间配置
- **GIVEN** 不同类型的数据
- **WHEN** 配置缓存策略
- **THEN** 应根据数据类型设置不同的 staleTime 和 gcTime

### Requirement: Next.js 构建配置
系统 SHALL 更新 Next.js 配置以优化构建产物。

#### Scenario: 包导入优化
- **GIVEN** 大型第三方库
- **WHEN** 配置 optimizePackageImports
- **THEN** 应添加所有大型库（framer-motion、lucide-react、date-fns）

## REMOVED Requirements
无移除的需求

## 性能优化优先级

### P0 - 关键（立即处理）
1. 图表组件 memo 化和 useMemo 优化
2. React Query 缓存策略优化
3. 大数据集降采样配置

### P1 - 重要（短期处理）
1. WebSocket 数据批处理和节流
2. 图片和资源优化配置
3. 组件虚拟化实现

### P2 - 改进（中期处理）
1. 性能监控指标体系
2. 数据预取策略
3. 构建产物优化

## 预期性能指标

| 指标 | 当前值 | 目标值 |
|------|--------|--------|
| LCP (Largest Contentful Paint) | - | < 2.5s |
| FID (First Input Delay) | - | < 100ms |
| CLS (Cumulative Layout Shift) | - | < 0.1 |
| TTI (Time to Interactive) | - | < 3.8s |
| 首屏 JS 大小 | - | < 200KB |
| 图表渲染时间 (1000 数据点) | - | < 100ms |
| WebSocket 更新延迟 | - | < 50ms |
