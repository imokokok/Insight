# Tasks

## P0 - 关键优化任务

- [x] Task 1: 图表组件性能优化
  - [x] SubTask 1.1: 为 OracleMarketOverview 组件添加 React.memo
  - [x] SubTask 1.2: 为 PriceChart 组件添加 useMemo 优化数据处理
  - [x] SubTask 1.3: 为 LatencyTrendChart 组件添加 useCallback 优化事件处理
  - [x] SubTask 1.4: 为所有图表组件添加自定义比较函数

- [x] Task 2: React Query 缓存策略优化
  - [x] SubTask 2.1: 更新 ReactQueryProvider 配置，细化不同数据类型的缓存策略
  - [x] SubTask 2.2: 为价格数据添加 30s staleTime 配置
  - [x] SubTask 2.3: 为历史数据添加 5min staleTime 配置
  - [x] SubTask 2.4: 为网络状态数据添加 60s staleTime 配置
  - [x] SubTask 2.5: 实现数据预取 hooks（usePrefetchOracleData）

- [x] Task 3: 图表数据降采样优化
  - [x] SubTask 3.1: 检查现有降采样工具函数（downsampling.ts）
  - [x] SubTask 3.2: 为 PriceChart 添加自动降采样逻辑（数据点 > 500 时启用）
  - [x] SubTask 3.3: 为趋势图表添加自适应降采样
  - [x] SubTask 3.4: 添加降采样性能测试用例

## P1 - 重要优化任务

- [x] Task 4: WebSocket 性能优化
  - [x] SubTask 4.1: 实现数据更新批处理机制（100ms 窗口）
  - [x] SubTask 4.2: 添加数据更新节流（最高 10fps）
  - [x] SubTask 4.3: 优化重连策略，使用指数退避
  - [x] SubTask 4.4: 添加连接状态性能指标

- [x] Task 5: 资源加载优化
  - [x] SubTask 5.1: 更新 next.config.ts 添加图片优化配置
  - [x] SubTask 5.2: 配置 optimizePackageImports 添加 framer-motion、lucide-react、date-fns
  - [x] SubTask 5.3: 检查并优化字体加载配置
  - [x] SubTask 5.4: 添加关键 CSS 内联配置

- [x] Task 6: 列表虚拟化优化
  - [x] SubTask 6.1: 检查 @tanstack/react-virtual 使用情况
  - [x] SubTask 6.2: 为 ProtocolList 组件添加虚拟化
  - [x] SubTask 6.3: 为 AlertList 组件添加虚拟化
  - [x] SubTask 6.4: 为大型数据表格添加虚拟滚动

## P2 - 改进优化任务

- [x] Task 7: 性能监控体系
  - [x] SubTask 7.1: 配置 web-vitals 指标收集
  - [x] SubTask 7.2: 添加自定义性能指标 hooks（usePerformanceMetrics）
  - [x] SubTask 7.3: 集成 Vercel Analytics 性能监控
  - [x] SubTask 7.4: 添加性能预算配置到 package.json

- [x] Task 8: 数据预取策略
  - [x] SubTask 8.1: 实现导航悬停预取 hooks
  - [x] SubTask 8.2: 为首页 Oracle 卡片添加预取逻辑
  - [x] SubTask 8.3: 实现路由级别数据预加载
  - [x] SubTask 8.4: 添加预取性能测试

- [x] Task 9: 构建产物优化
  - [x] SubTask 9.1: 分析当前构建产物大小
  - [x] SubTask 9.2: 配置 webpack bundle analyzer
  - [x] SubTask 9.3: 优化第三方库导入方式
  - [x] SubTask 9.4: 添加构建产物大小监控

- [x] Task 10: 首屏加载优化
  - [x] SubTask 10.1: 优化骨架屏组件实现
  - [x] SubTask 10.2: 实现关键资源预加载
  - [x] SubTask 10.3: 优化首页组件加载顺序
  - [x] SubTask 10.4: 添加首屏性能测试

# Task Dependencies
- [Task 2] depends on [Task 1] - React Query 优化应在组件优化后进行
- [Task 3] depends on [Task 1] - 降采样优化需要先完成组件 memo 化
- [Task 4] 可与 [Task 1-3] 并行执行
- [Task 5] 可与 [Task 1-4] 并行执行
- [Task 6] depends on [Task 1] - 虚拟化需要先完成组件优化
- [Task 7] depends on [Task 1-6] - 监控应在优化完成后建立基线
- [Task 8] depends on [Task 2] - 预取依赖 React Query 配置
- [Task 9] 可与 [Task 1-8] 并行执行
- [Task 10] depends on [Task 1-9] - 首屏优化是最终整合任务
