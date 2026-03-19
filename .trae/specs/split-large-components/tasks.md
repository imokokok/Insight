# Tasks

## 阶段一：页面组件拆分

### Task 1: 拆分 cross-oracle/page.tsx (1329行)
- [x] SubTask 1.1: 创建 `HeaderSection.tsx` - 页面头部和标题组件
- [x] SubTask 1.2: 创建 `StatsOverview.tsx` - 统计概览卡片组件
- [x] SubTask 1.3: 创建 `ComparisonTabs.tsx` - 对比标签页内容组件
- [x] SubTask 1.4: 创建 `ExportSection.tsx` - 导出功能区块组件
- [x] SubTask 1.5: 创建 `useCrossOracleData.ts` - 数据管理 Hook
- [x] SubTask 1.6: 重构 `page.tsx` - 整合所有拆分后的组件

### Task 2: 拆分 market-overview/page.tsx (1016行)
- [x] SubTask 2.1: 创建 `MarketHeader.tsx` - 市场概览头部组件
- [x] SubTask 2.2: 创建 `AssetGrid.tsx` - 资产网格展示组件
- [x] SubTask 2.3: 创建 `MarketFilters.tsx` - 市场筛选器组件
- [x] SubTask 2.4: 创建 `MarketStats.tsx` - 市场统计数据组件
- [x] SubTask 2.5: 创建 `useMarketData.ts` - 数据管理 Hook
- [x] SubTask 2.6: 重构 `page.tsx` - 整合所有拆分后的组件

### Task 3: 拆分 price-query/page.tsx (948行)
- [x] SubTask 3.1: 创建 `QueryForm.tsx` - 查询表单组件
- [x] SubTask 3.2: 创建 `QueryResults.tsx` - 查询结果展示组件
- [x] SubTask 3.3: 创建 `PriceDisplay.tsx` - 价格显示组件
- [x] SubTask 3.4: 创建 `usePriceQuery.ts` - 查询逻辑 Hook
- [x] SubTask 3.5: 重构 `page.tsx` - 整合所有拆分后的组件

## 阶段二：图表组件拆分

### Task 4: 拆分 PriceChart/index.tsx (1269行)
- [x] SubTask 4.1: 创建 `ChartCanvas.tsx` - 图表画布渲染组件
- [x] SubTask 4.2: 创建 `ChartControls.tsx` - 图表控制按钮组件
- [x] SubTask 4.3: 创建 `ChartLegend.tsx` - 图表图例组件
- [x] SubTask 4.4: 创建 `ChartTooltip.tsx` - 图表提示框组件
- [x] SubTask 4.5: 创建 `chartUtils.ts` - 图表工具函数
- [x] SubTask 4.6: 重构 `index.tsx` - 整合所有拆分后的组件

## 阶段三：面板组件拆分

### Task 5: 拆分 DataQualityPanel.tsx (984行)
- [x] SubTask 5.1: 创建 `QualityScoreCard.tsx` - 质量评分卡片组件
- [x] SubTask 5.2: 创建 `DataSourceList.tsx` - 数据源列表组件
- [x] SubTask 5.3: 创建 `QualityMetrics.tsx` - 质量指标展示组件
- [x] SubTask 5.4: 重构 `DataQualityPanel.tsx` - 整合所有拆分后的组件

### Task 6: 拆分 AnomalyAlert.tsx (1087行)
- [x] SubTask 6.1: 创建 `AlertItem.tsx` - 单个告警项组件
- [x] SubTask 6.2: 创建 `AlertFilters.tsx` - 告警筛选器组件
- [x] SubTask 6.3: 创建 `AlertStats.tsx` - 告警统计组件
- [x] SubTask 6.4: 重构 `AnomalyAlert.tsx` - 整合所有拆分后的组件

## 阶段四：Hook 拆分

### Task 7: 拆分 useChartExport.ts (770行)
- [x] SubTask 7.1: 创建 `exportToPNG.ts` - PNG 导出函数
- [x] SubTask 7.2: 创建 `exportToCSV.ts` - CSV 导出函数
- [x] SubTask 7.3: 创建 `exportToJSON.ts` - JSON 导出函数
- [x] SubTask 7.4: 创建 `exportUtils.ts` - 导出工具函数
- [x] SubTask 7.5: 重构 `useChartExport.ts` - 整合所有导出功能

### Task 8: 拆分 useChartZoom.ts (769行)
- [x] SubTask 8.1: 创建 `usePan.ts` - 平移功能 Hook
- [x] SubTask 8.2: 创建 `useScale.ts` - 缩放比例功能 Hook
- [x] SubTask 8.3: 创建 `useBrush.ts` - 刷选功能 Hook
- [x] SubTask 8.4: 创建 `zoomUtils.ts` - 缩放工具函数
- [x] SubTask 8.5: 重构 `useChartZoom.ts` - 整合所有缩放功能

## 阶段五：验证和清理

### Task 9: 验证拆分结果
- [x] SubTask 9.1: 运行 TypeScript 类型检查，确保无类型错误
- [x] SubTask 9.2: 运行 ESLint 检查，确保代码质量
- [x] SubTask 9.3: 手动测试所有受影响页面的功能
- [x] SubTask 9.4: 确认所有文件行数符合规范（组件≤400行，Hook≤300行）

# Task Dependencies
- Task 1、Task 2、Task 3 可以并行执行
- Task 4 可以与其他任务并行执行
- Task 5、Task 6 可以并行执行
- Task 7、Task 8 可以并行执行
- Task 9 依赖所有其他任务完成
