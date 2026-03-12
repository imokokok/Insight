# Tasks

## P0 - 立即处理（关键性能优化）

- [x] Task 1: 客户端组件优化 - 纯展示组件改为 Server Components
  - [x] SubTask 1.1: 识别所有纯展示组件（无状态、无事件处理）
  - [x] SubTask 1.2: 移除纯展示组件的 `use client` 指令
  - [ ] SubTask 1.3: 拆分混合组件为 Server Component（容器）+ Client Component（交互部分）
  - [x] SubTask 1.4: 验证所有页面正常渲染，无水合错误

- [x] Task 2: API 路由缓存优化
  - [x] SubTask 2.1: 为价格 API 添加 `Cache-Control` 响应头（30秒缓存）
  - [x] SubTask 2.2: 为历史数据 API 添加缓存（5分钟缓存）
  - [x] SubTask 2.3: 实现错误边界和标准错误响应格式
  - [x] SubTask 2.4: 测试 API 缓存是否生效

- [x] Task 3: 首页懒加载优化
  - [x] SubTask 3.1: 使用 `dynamic` 导入 OracleMarketOverview 组件
  - [x] SubTask 3.2: 使用 `dynamic` 导入 ArbitrageHeatmap 组件
  - [x] SubTask 3.3: 为懒加载组件添加 Suspense 和骨架屏
  - [x] SubTask 3.4: 测试首页加载性能，确保首屏时间 < 2s

## P1 - 短期处理（重要性能优化）

- [x] Task 4: 图表性能优化
  - [x] SubTask 4.1: 为所有图表组件添加 `dynamic` 懒加载
  - [x] SubTask 4.2: 优化降采样算法，支持动态目标点数
  - [x] SubTask 4.3: 实现图表加载骨架屏
  - [x] SubTask 4.4: 测试大数据量图表渲染性能（< 300ms）

- [x] Task 5: 状态管理优化（CrossChain 页面）
  - [x] SubTask 5.1: 安装 Zustand 依赖
  - [x] SubTask 5.2: 创建 CrossChain store，合并 26 个相关状态
  - [x] SubTask 5.3: 使用 Zustand 派生状态替代复杂 useEffect
  - [x] SubTask 5.4: 测试 CrossChain 页面功能正常

- [x] Task 6: 图片优化
  - [x] SubTask 6.1: 识别项目中所有图片使用
  - [x] SubTask 6.2: 将 `<img>` 标签替换为 Next.js `<Image>` 组件
  - [x] SubTask 6.3: 为首屏图片设置 `priority={true}`
  - [x] SubTask 6.4: 为非首屏图片设置 `loading="lazy"`

## P2 - 中期处理（架构优化）

- [ ] Task 7: 国际化迁移到 next-intl
  - [ ] SubTask 7.1: 配置 next-intl（middleware、i18n config）
  - [ ] SubTask 7.2: 迁移翻译文件到 next-intl 格式
  - [ ] SubTask 7.3: 替换所有 `useI18n` 为 `useTranslations`
  - [ ] SubTask 7.4: 测试所有页面的国际化功能
  - [ ] SubTask 7.5: 移除自定义 i18n 实现

- [ ] Task 8: 状态管理扩展（其他页面）
  - [ ] SubTask 8.1: 为 Price Query 页面创建 Zustand store
  - [ ] SubTask 8.2: 为 Cross Oracle 页面创建 Zustand store
  - [ ] SubTask 8.3: 为 Oracle 详情页面创建 Zustand store
  - [ ] SubTask 8.4: 测试所有页面功能正常

- [ ] Task 9: 虚拟化扩展
  - [ ] SubTask 9.1: 识别所有大数据列表组件（> 50 项）
  - [ ] SubTask 9.2: 为价格表格实现虚拟化
  - [ ] SubTask 9.3: 为交易历史实现虚拟化
  - [ ] SubTask 9.4: 测试列表滚动性能（60 FPS）

## P3 - 长期规划（深度优化）

- [ ] Task 10: 图表库评估与迁移
  - [ ] SubTask 10.1: 评估 Lightweight Charts 性能和功能
  - [ ] SubTask 10.2: 创建 Lightweight Charts 原型组件
  - [ ] SubTask 10.3: 对比 Recharts 和 Lightweight Charts 性能
  - [ ] SubTask 10.4: 决定是否迁移，如迁移则制定迁移计划

- [ ] Task 11: 实现增量静态生成 (ISR)
  - [ ] SubTask 11.1: 为市场概览页面添加 `revalidate = 30`
  - [ ] SubTask 11.2: 为预言机详情页面添加 ISR
  - [ ] SubTask 11.3: 实现 On-Demand Revalidation API
  - [ ] SubTask 11.4: 测试 ISR 是否正常工作

- [x] Task 12: 性能监控集成
  - [x] SubTask 12.1: 安装 @vercel/analytics 和 @vercel/speed-insights
  - [x] SubTask 12.2: 在 RootLayout 中集成 Analytics 和 SpeedInsights
  - [x] SubTask 12.3: 配置自定义性能指标追踪
  - [x] SubTask 12.4: 在 Vercel Dashboard 验证数据收集

- [ ] Task 13: API 限流实现
  - [ ] SubTask 13.1: 实现基于 IP 的请求限流中间件
  - [ ] SubTask 13.2: 配置限流规则（60 次/分钟/IP）
  - [ ] SubTask 13.3: 添加限流响应头（X-RateLimit-Limit, X-RateLimit-Remaining）
  - [ ] SubTask 13.4: 测试限流是否正常工作

## P4 - 持续优化

- [ ] Task 14: 包体积优化
  - [ ] SubTask 14.1: 分析打包体积（使用 `next build --analyze`）
  - [ ] SubTask 14.2: 优化 Lucide React 图标导入（按需导入）
  - [ ] SubTask 14.3: 移除未使用的依赖
  - [ ] SubTask 14.4: 验证包体积减少 > 30%

- [ ] Task 15: 性能测试与基准
  - [ ] SubTask 15.1: 使用 Lighthouse 建立性能基准
  - [ ] SubTask 15.2: 测试首屏加载时间（目标 < 1.5s）
  - [ ] SubTask 15.3: 测试 Lighthouse 分数（目标 > 90）
  - [ ] SubTask 15.4: 创建性能测试脚本，定期运行

# Task Dependencies

## P0 任务（无依赖，可并行）
- Task 1, Task 2, Task 3 可并行执行

## P1 任务（依赖 P0）
- Task 4 depends on Task 1（需要先优化组件结构）
- Task 5 depends on Task 1（需要先优化组件结构）
- Task 6 无依赖，可与 Task 4, Task 5 并行

## P2 任务（依赖 P1）
- Task 7 depends on Task 1（需要先优化组件结构）
- Task 8 depends on Task 5（需要先验证 Zustand 方案）
- Task 9 depends on Task 1（需要先优化组件结构）

## P3 任务（依赖 P2）
- Task 10 depends on Task 4（需要先优化现有图表）
- Task 11 depends on Task 2（需要先优化 API）
- Task 12 无依赖，可随时执行
- Task 13 depends on Task 2（需要先优化 API）

## P4 任务（依赖 P3）
- Task 14 depends on Task 1, Task 4, Task 7（需要先完成主要优化）
- Task 15 depends on 所有其他任务（需要先完成所有优化）

# 预期性能提升

| 优化项 | 当前指标 | 预期指标 | 提升幅度 |
|--------|---------|---------|---------|
| 首屏加载时间 | ~3-4s | ~1-1.5s | **60-70%** |
| JavaScript 包体积 | ~800KB | ~400KB | **50%** |
| 首屏网络请求 | ~20个 | ~10个 | **50%** |
| 图表渲染时间 | ~500ms | ~200ms | **60%** |
| 列表滚动 FPS | ~30fps | ~60fps | **100%** |
| Lighthouse 分数 | ~60 | ~90+ | **50%** |
