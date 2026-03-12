# 预言机数据分析平台性能优化 Spec

## Why
作为一个专业的预言机数据分析平台，当前项目存在以下性能问题：
1. **客户端组件过度使用**：100个文件使用 `use client`，无法享受 Server Components 的性能优势，导致首屏 JavaScript 包体积过大
2. **图表性能瓶颈**：37个文件使用 Recharts，大数据量下渲染性能较差
3. **状态管理复杂**：436个 useState 和 154个 useEffect，导致组件重渲染频繁
4. **国际化实现低效**：自定义 i18n 实现，每次翻译都遍历对象树
5. **API 路由缺少优化**：无缓存、无限流、无错误边界
6. **首页加载过重**：一次性加载过多组件和数据

这些问题导致首屏加载时间长（~3-4s）、JavaScript 包体积大（~800KB）、用户体验和 SEO 表现不佳。

## What Changes
- **客户端组件优化**：将纯展示组件改为 Server Components，仅交互组件使用客户端组件
- **图表性能优化**：实现图表懒加载、优化降采样算法、考虑更轻量的图表库
- **状态管理重构**：使用 Zustand 合并相关状态，减少 useEffect 依赖
- **国际化迁移**：从自定义实现迁移到 next-intl，提升翻译性能
- **API 路由优化**：添加响应缓存、请求限流、错误边界
- **首页性能优化**：实现组件懒加载、关键内容优先加载
- **图片优化**：使用 Next.js Image 组件，实现懒加载和响应式图片
- **性能监控**：集成 Vercel Analytics 和 Speed Insights

## Impact
- Affected specs: 所有页面组件、API 路由、状态管理、国际化
- Affected code: 
  - 所有使用 `use client` 的组件（100个文件）
  - 所有图表组件（37个文件）
  - API 路由（src/app/api/）
  - 国际化系统（src/lib/i18n/）
  - 首页（src/app/page.tsx）

## ADDED Requirements

### Requirement: 客户端组件优化
The system SHALL 将纯展示组件改为 Server Components，仅交互组件使用客户端组件

#### Scenario: 纯展示组件优化
- **WHEN** 组件仅包含静态内容展示
- **THEN** 移除 `use client` 指令，使用 Server Component

#### Scenario: 交互组件保留
- **WHEN** 组件包含状态管理、事件处理或浏览器 API
- **THEN** 保留 `use client` 指令

#### Scenario: 混合组件模式
- **WHEN** 组件包含静态内容和交互部分
- **THEN** 拆分为 Server Component（容器）和 Client Component（交互部分）

### Requirement: 图表性能优化
The system SHALL 优化图表渲染性能

#### Scenario: 图表懒加载
- **WHEN** 页面包含图表组件
- **THEN** 使用 `dynamic` 导入实现懒加载，并显示加载骨架屏

#### Scenario: 降采样优化
- **WHEN** 图表数据点超过 500 个
- **THEN** 应用智能降采样算法，保留关键数据点

#### Scenario: 图表库优化
- **WHEN** 图表渲染时间超过 300ms
- **THEN** 考虑迁移到更轻量的图表库（Lightweight Charts 或 Visx）

### Requirement: 状态管理优化
The system SHALL 使用 Zustand 进行全局状态管理

#### Scenario: 相关状态合并
- **WHEN** 组件包含多个相关状态（如筛选器、选择器）
- **THEN** 使用 Zustand store 合并管理

#### Scenario: 减少副作用
- **WHEN** useEffect 依赖过多
- **THEN** 使用 Zustand 的派生状态或计算属性替代

### Requirement: 国际化迁移
The system SHALL 迁移到 next-intl 国际化方案

#### Scenario: 服务端翻译
- **WHEN** 页面首次渲染
- **THEN** 使用 next-intl 的服务端翻译，避免客户端 JavaScript 开销

#### Scenario: 翻译缓存
- **WHEN** 多次调用相同翻译键
- **THEN** 使用 next-intl 的内置缓存机制

### Requirement: API 路由优化
The system SHALL 优化 API 路由性能和可靠性

#### Scenario: 响应缓存
- **WHEN** API 返回价格数据
- **THEN** 添加 `Cache-Control` 头，设置 30 秒缓存

#### Scenario: 请求限流
- **WHEN** API 收到大量请求
- **THEN** 实现请求限流，每 IP 每分钟最多 60 次请求

#### Scenario: 错误边界
- **WHEN** API 调用失败
- **THEN** 返回标准错误响应，包含错误码和重试建议

### Requirement: 首页性能优化
The system SHALL 优化首页加载性能

#### Scenario: 组件懒加载
- **WHEN** 首页加载非关键组件（如热力图、市场概览）
- **THEN** 使用 `dynamic` 和 `Suspense` 延迟加载

#### Scenario: 关键内容优先
- **WHEN** 首页首次渲染
- **THEN** 优先加载 Hero、价格滚动、指标卡片，延迟加载其他内容

#### Scenario: 数据预取
- **WHEN** 用户访问首页
- **THEN** 预取关键数据（价格、指标），减少后续页面加载时间

### Requirement: 图片优化
The system SHALL 使用 Next.js Image 组件优化图片

#### Scenario: 图片懒加载
- **WHEN** 页面包含图片
- **THEN** 使用 `loading="lazy"` 实现懒加载

#### Scenario: 响应式图片
- **WHEN** 图片需要适配不同屏幕尺寸
- **THEN** 使用 `srcSet` 和 `sizes` 属性

#### Scenario: 图片优先级
- **WHEN** 图片位于首屏
- **THEN** 设置 `priority={true}`，避免布局偏移

### Requirement: 性能监控
The system SHALL 集成性能监控工具

#### Scenario: 用户行为分析
- **WHEN** 用户访问页面
- **THEN** 自动收集页面浏览、点击等行为数据

#### Scenario: 性能指标收集
- **WHEN** 页面加载完成
- **THEN** 自动收集 Core Web Vitals 指标（LCP、FID、CLS）

#### Scenario: 性能报告
- **WHEN** 需要分析性能问题
- **THEN** 在 Vercel Dashboard 查看性能报告和优化建议

## MODIFIED Requirements
无

## REMOVED Requirements
无
