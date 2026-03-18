# Tasks

## 阶段一：CrossOracleComparison 组件拆分 (1237行)

- [x] Task 1: 拆分 CrossOracleComparison 组件
  - [x] SubTask 1.1: 创建 `useComparisonStats.ts` Hook - 提取所有 useMemo 计算逻辑（一致性评分、价格统计、偏差数据、雷达图数据等）
  - [x] SubTask 1.2: 创建 `DeviationTable.tsx` - 偏差分析表格组件
  - [x] SubTask 1.3: 创建 `PriceComparisonTable.tsx` - 价格比较详情表格组件
  - [x] SubTask 1.4: 创建 `PerformanceTable.tsx` - 性能比较表格组件
  - [x] SubTask 1.5: 创建 `ComparisonCharts.tsx` - 合并所有图表渲染（偏差柱状图、价格比较图、雷达图等）
  - [x] SubTask 1.6: 创建 `ComparisonControls.tsx` - 控制面板组件（选择器、滑块、刷新控件）
  - [x] SubTask 1.7: 重构 `index.tsx` - 整合所有拆分后的组件和 Hook

## 阶段二：NetworkHealthPanel 组件拆分 (1092行)

- [x] Task 2: 拆分 NetworkHealthPanel 组件
  - [x] SubTask 2.1: 创建 `./types.ts` - 提取所有类型定义（NetworkMetric、BandProtocolMetrics、SolanaNetworkMetrics 等）
  - [x] SubTask 2.2: 创建 `NetworkStatusIndicator.tsx` - 网络状态指示器组件
  - [x] SubTask 2.3: 创建 `MetricCard.tsx` - 指标卡片组件
  - [x] SubTask 2.4: 创建 `ActivityHeatmap.tsx` - 活动热力图组件
  - [x] SubTask 2.5: 创建 `BandProtocolMetricsCard.tsx` - Band Protocol 指标卡片组件
  - [x] SubTask 2.6: 创建 `SolanaNetworkStatusCard.tsx` - Solana 网络状态卡片组件
  - [x] SubTask 2.7: 创建 `DataFreshnessIndicator.tsx` - 数据新鲜度指示器组件
  - [x] SubTask 2.8: 重构 `NetworkHealthPanel.tsx` - 整合所有拆分后的组件

## 阶段三：useCrossOraclePage Hook 拆分 (1001行)

- [x] Task 3: 拆分 useCrossOraclePage Hook
  - [x] SubTask 3.1: 创建 `./types.ts` - 提取所有类型定义
  - [x] SubTask 3.2: 创建 `usePriceStats.ts` - 价格统计计算 Hook
  - [x] SubTask 3.3: 创建 `useChartData.ts` - 图表数据处理 Hook
  - [x] SubTask 3.4: 创建 `useTechnicalIndicators.ts` - 技术指标计算 Hook（MA、ATR、Bollinger）
  - [x] SubTask 3.5: 创建 `useFilterSort.ts` - 过滤和排序逻辑 Hook
  - [x] SubTask 3.6: 创建 `useExport.ts` - 导出功能 Hook
  - [x] SubTask 3.7: 重构 `useCrossOraclePage.ts` - 整合所有拆分后的 Hook

## 阶段四：useMarketOverviewData Hook 拆分 (800行)

- [x] Task 4: 拆分 useMarketOverviewData Hook
  - [x] SubTask 4.1: 创建 `./types.ts` - 提取所有类型定义（如尚未存在）
  - [x] SubTask 4.2: 创建 `useDataFetching.ts` - 数据获取逻辑 Hook
  - [x] SubTask 4.3: 创建 `useExport.ts` - 导出功能 Hook
  - [x] SubTask 4.4: 创建 `useWebSocketHandler.ts` - WebSocket 消息处理 Hook
  - [x] SubTask 4.5: 重构 `useMarketOverviewData.ts` - 整合所有拆分后的 Hook

## 阶段五：验证和清理

- [x] Task 5: 验证拆分结果
  - [x] SubTask 5.1: 运行 TypeScript 类型检查，确保无类型错误
  - [x] SubTask 5.2: 运行 ESLint 检查，确保代码质量
  - [x] SubTask 5.3: 手动测试所有受影响页面的功能
  - [x] SubTask 5.4: 确认所有文件行数符合规范（组件≤300行，Hook≤200行）

# Task Dependencies
- [Task 2] 可以与 [Task 1] 并行执行
- [Task 3] 可以与 [Task 1]、[Task 2] 并行执行
- [Task 4] 可以与 [Task 1]、[Task 2]、[Task 3] 并行执行
- [Task 5] 依赖 [Task 1]、[Task 2]、[Task 3]、[Task 4] 全部完成
