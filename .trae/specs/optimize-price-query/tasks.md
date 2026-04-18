# Tasks

- [ ] Task 1: 引入 React Query 并搭建基础设施
  - [ ] SubTask 1.1: 安装 @tanstack/react-query 依赖
  - [ ] SubTask 1.2: 创建 React Query Provider（QueryClient 配置：staleTime/gcTime/retry 默认值）
  - [ ] SubTask 1.3: 在 layout.tsx 中挂载 QueryClientProvider
  - [ ] SubTask 1.4: 定义价格查询的 Query Key 工厂函数（priceKeys / historicalKeys / crossChainKeys / crossOracleKeys）

- [ ] Task 2: 使用 React Query 重构 Price Query 数据获取层
  - [ ] SubTask 2.1: 创建 usePriceQuery hook（useQuery 封装，替换 oracleApiClient.fetchPrice）
  - [ ] SubTask 2.2: 创建 useHistoricalQuery hook（useQuery 封装，替换 oracleApiClient.fetchHistorical）
  - [ ] SubTask 2.3: 创建 useBatchPriceQuery hook（useQueries 封装，替换 limitConcurrency + buildQueryTasks）
  - [ ] SubTask 2.4: 重写 usePriceQueryData，移除手动 loading/error/data 状态管理，改用 React Query 返回值
  - [ ] SubTask 2.5: 移除 usePriceQueryData 中的 requestAnimationFrame 初始化和手动缓存逻辑
  - [ ] SubTask 2.6: 验证 Price Query 页面功能正常

- [ ] Task 3: 拆分 usePriceQuery 巨型 Hook
  - [ ] SubTask 3.1: 创建 QueryParamsContext（Oracle/Chain/Symbol/TimeRange 状态 + URL 同步）
  - [ ] SubTask 3.2: 创建 QueryDataContext（查询结果 + 历史数据，消费 React Query hooks）
  - [ ] 3.3: 创建 QueryUIContext（filter/sort/hiddenSeries/compareMode 等 UI 状态）
  - [ ] SubTask 3.4: 重构 PriceQueryContent 使用新的 Context Providers
  - [ ] SubTask 3.5: 更新所有子组件从对应 Context 获取状态，移除对 usePriceQuery 的直接依赖
  - [ ] SubTask 3.6: 确保返回值使用 useMemo 保证引用稳定性

- [ ] Task 4: 实现自动刷新机制
  - [ ] SubTask 4.1: 创建 useAutoRefresh hook（支持关闭/30s/1m/5m 间隔，页面不可见时暂停）
  - [ ] SubTask 4.2: 利用 React Query的 refetchInterval + document.visibilityState 实现智能刷新
  - [ ] SubTask 4.3: 在 Price Query 页面添加自动刷新控件（下拉选择间隔 + 倒计时显示）
  - [ ] SubTask 4.4: 在 Cross-Oracle 页面添加自动刷新控件
  - [ ] SubTask 4.5: 验证自动刷新在标签页切换时正确暂停/恢复

- [ ] Task 5: Oracle 选择器多选支持
  - [ ] SubTask 5.1: 修改 selectedOracle 状态类型为 OracleProvider[]（兼容单选场景）
  - [ ] SubTask 5.2: 重构 Selectors 组件，Oracle 下拉改为多选模式（Checkbox 列表）
  - [ ] SubTask 5.3: 修改 useBatchPriceQuery 支持多预言机并行查询
  - [ ] SubTask 5.4: QueryResults 增加多预言机对比视图（价格对比表格 + 偏差率 + 统计摘要）
  - [ ] SubTask 5.5: 更新 URL 参数格式支持多预言机（oracle=chainlink,pyth）
  - [ ] SubTask 5.6: 验证多预言机查询和单预言机查询均正常工作

- [ ] Task 6: 实现对比模式 UI
  - [ ] SubTask 6.1: 在 Selectors 面板添加对比模式开关和对比时间范围选择器
  - [ ] SubTask 6.2: 创建 useCompareQuery hook（获取对比时间范围的历史数据）
  - [ ] SubTask 6.3: 修改 PriceChart 支持双时间范围数据叠加展示（不同颜色/线型区分）
  - [ ] SubTask 6.4: 图例中标注当前/对比时间范围标签
  - [ ] SubTask 6.5: 验证对比模式图表展示正确

- [ ] Task 7: 修复数据准确性问题
  - [ ] SubTask 7.1: 移除 QueryResults 中 volume24h=0 硬编码，数据不可用时显示 "N/A"
  - [ ] SubTask 7.2: 修改 DefaultStats 组件，volume24h 为 0 时显示 "N/A"
  - [ ] SubTask 7.3: 在 PriceData 类型中添加 confidenceSource 字段（'original' | 'estimated'）
  - [ ] SubTask 7.4: 修改 Pyth/RedStone/Flare 客户端，设置 confidenceSource='estimated'
  - [ ] SubTask 7.5: DataSourceSection 和统计卡片中显示置信区间来源标签
  - [ ] SubTask 7.6: 修改 usePriceQueryChart，缺失数据点使用 null 断开线条，移除 lastValidValues 前值填充
  - [ ] SubTask 7.7: 修复收藏功能：保存完整配置（Oracle+Chain+Symbol+TimeRange），应用时完整恢复

- [ ] Task 8: 消除重复代码和冗余系统
  - [ ] SubTask 8.1: 统一 AnyOnChainData 类型定义到 constants.ts，删除 StatsCardsSelector 中的重复定义
  - [ ] SubTask 8.2: 统一 QueryError 类型定义到 types 文件，删除 queryTaskUtils 中的重复定义
  - [ ] SubTask 8.3: 统一 ChartDataPoint 类型定义，确保 PriceChart 和 usePriceQueryChart 使用同一类型
  - [ ] SubTask 8.4: 统一导出入口：移除 usePriceQueryExport，导出功能统一通过 UnifiedExport 组件
  - [ ] SubTask 8.5: 清理 Selectors 中未使用的 \_showAdvanced 状态和 \_isCurrentSymbolSupported 计算
  - [ ] SubTask 8.6: 清理 performanceMonitoring.ts 中未使用的 getMetricRatingDisplay 和 getWebVitalRatingDisplay 函数
  - [ ] SubTask 8.7: 修复 QueryResults 中 prevPriceRef 在渲染期间写入的问题，改用 useEffect 更新

- [ ] Task 9: Cross-Oracle 功能增强
  - [ ] SubTask 9.1: 在 ControlPanel 中添加链筛选器（下拉选择，默认"全部链"）
  - [ ] SubTask 9.2: 修改 useOracleData 支持按链过滤数据（传递 chain 参数到 oracleApiClient）
  - [ ] SubTask 9.3: 在 CrossOracleContent 中集成 UnifiedExportSection 组件，启用导出功能
  - [ ] SubTask 9.4: 验证 Cross-Oracle 链筛选和导出功能正常

- [ ] Task 10: 使用 React Query 重构 Cross-Chain 数据获取
  - [ ] SubTask 10.1: 创建 useCrossChainPriceQuery hook（useQueries 封装多链并行查询）
  - [ ] SubTask 10.2: 移除 useDataFetching 中的 moduleCache 模块级缓存
  - [ ] SubTask 10.3: 重构 useCrossChainDataState 使用 React Query hooks
  - [ ] SubTask 10.4: 验证 Cross-Chain 页面功能正常

- [ ] Task 11: 最终验证
  - [ ] SubTask 11.1: 运行 npm run typecheck 确保无类型错误
  - [ ] SubTask 11.2: 运行 npm run lint 确保无 lint 错误
  - [ ] SubTask 11.3: 运行 npm run test 确保测试通过
  - [ ] SubTask 11.4: 运行 npm run build 确保构建成功
  - [ ] SubTask 11.5: 手动验证 Price Query / Cross-Chain / Cross-Oracle 三个页面核心功能

# Task Dependencies

- [Task 1] 无依赖，必须最先完成
- [Task 2] 依赖 [Task 1]
- [Task 3] 依赖 [Task 2]（React Query 重构后再拆分 Hook）
- [Task 4] 依赖 [Task 2]（基于 React Query 的 refetchInterval 实现自动刷新）
- [Task 5] 依赖 [Task 3]（Context 拆分后更容易支持多选状态）
- [Task 6] 依赖 [Task 3]（Context 拆分后更容易添加对比模式 UI）
- [Task 7] 无依赖，可先行（数据准确性修复独立于架构重构）
- [Task 8] 无依赖，可先行（代码清理独立于架构重构）
- [Task 9] 依赖 [Task 4]（Cross-Oracle 自动刷新）和 [Task 1]（React Query 基础设施）
- [Task 10] 依赖 [Task 1]
- [Task 11] 依赖所有其他 Task
