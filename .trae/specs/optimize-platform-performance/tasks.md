# Tasks

- [x] Task 1: 优化 SWR 全局缓存配置
  - [x] SubTask 1.1: 在 SWRProvider 中添加缓存存储策略（localStorage/内存）
  - [x] SubTask 1.2: 配置 provider 级别的默认 staleTime
  - [x] SubTask 1.3: 添加预加载（prefetch）配置
  - [x] SubTask 1.4: 实现缓存过期前的静默更新机制

- [x] Task 2: 为大型列表组件添加虚拟滚动
  - [x] SubTask 2.1: 在 ValidatorPanel 中实现虚拟滚动列表
  - [x] SubTask 2.2: 在 PublisherList 中实现虚拟滚动列表
  - [x] SubTask 2.3: 安装并配置 @tanstack/react-virtual

- [x] Task 3: 实现图表数据降采样
  - [x] SubTask 3.1: 在 PriceChart 组件中添加数据降采样逻辑
  - [x] SubTask 3.2: 在 LatencyTrendChart 组件中添加降采样
  - [x] SubTask 3.3: 实现基于时间范围的自适应采样率

- [x] Task 4: 组件 memo 优化
  - [x] SubTask 4.1: 为 StatCard 组件添加 React.memo
  - [x] SubTask 4.2: 为 MetricCardComponent 添加 memo
  - [x] SubTask 4.3: 为 DashboardCard 基础包装组件添加 memo
  - [x] SubTask 4.4: 优化 useCallback 和 useMemo 的依赖数组

- [x] Task 5: 优化国际化资源加载
  - [x] SubTask 5.1: 配置 next-intl 按需加载语言资源
  - [x] SubTask 5.2: 添加浏览器语言检测和自动切换

- [x] Task 6: 优化数据获取 Hook
  - [x] SubTask 6.1: 增强 useOracleData hook 的缓存配置
  - [x] SubTask 6.2: 添加 staleTime 参数支持
  - [x] SubTask 6.3: 实现数据预取（prefetch）方法

# Task Dependencies
- [Task 6] depends on [Task 1]
- [Task 2] depends on [Task 1]
- [Task 3] can proceed independently
- [Task 4] can proceed independently
- [Task 5] can proceed independently
