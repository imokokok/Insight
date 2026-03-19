# 大组件拆分检查清单

## cross-oracle/page.tsx 拆分
- [x] `HeaderSection.tsx` 已创建，包含页面头部和标题逻辑
- [x] `StatsOverview.tsx` 已创建，包含统计概览卡片
- [x] `ComparisonTabs.tsx` 已创建，包含对比标签页内容
- [x] `ExportSection.tsx` 已创建，包含导出功能区块
- [x] `useCrossOracleData.ts` 已创建，包含数据管理逻辑
- [x] `page.tsx` 已重构，整合所有拆分后的组件（目标≤400行）

## market-overview/page.tsx 拆分
- [x] `MarketHeader.tsx` 已创建，包含市场概览头部
- [x] `AssetGrid.tsx` 已创建，包含资产网格展示
- [x] `MarketFilters.tsx` 已创建，包含市场筛选器
- [x] `MarketStats.tsx` 已创建，包含市场统计数据
- [x] `useMarketData.ts` 已创建，包含数据管理逻辑
- [x] `page.tsx` 已重构，整合所有拆分后的组件（目标≤400行）

## price-query/page.tsx 拆分
- [x] `QueryForm.tsx` 已创建，包含查询表单
- [x] `QueryResults.tsx` 已创建，包含查询结果展示
- [x] `PriceDisplay.tsx` 已创建，包含价格显示
- [x] `usePriceQuery.ts` 已创建，包含查询逻辑
- [x] `page.tsx` 已重构，整合所有拆分后的组件（目标≤400行）

## PriceChart/index.tsx 拆分
- [x] `ChartCanvas.tsx` 已创建，包含图表画布渲染
- [x] `ChartControls.tsx` 已创建，包含图表控制按钮
- [x] `ChartLegend.tsx` 已创建，包含图表图例
- [x] `ChartTooltip.tsx` 已创建，包含图表提示框
- [x] `chartUtils.ts` 已创建，包含图表工具函数
- [x] `index.tsx` 已重构，整合所有拆分后的组件（目标≤400行）

## DataQualityPanel.tsx 拆分
- [x] `QualityScoreCard.tsx` 已创建，包含质量评分卡片
- [x] `DataSourceList.tsx` 已创建，包含数据源列表
- [x] `QualityMetrics.tsx` 已创建，包含质量指标展示
- [x] `DataQualityPanel.tsx` 已重构，整合所有拆分后的组件（目标≤400行）

## AnomalyAlert.tsx 拆分
- [x] `AlertItem.tsx` 已创建，包含单个告警项
- [x] `AlertFilters.tsx` 已创建，包含告警筛选器
- [x] `AlertStats.tsx` 已创建，包含告警统计
- [x] `AnomalyAlert.tsx` 已重构，整合所有拆分后的组件（目标≤400行）

## useChartExport.ts 拆分
- [x] `exportToPNG.ts` 已创建，包含 PNG 导出逻辑
- [x] `exportToCSV.ts` 已创建，包含 CSV 导出逻辑
- [x] `exportToJSON.ts` 已创建，包含 JSON 导出逻辑
- [x] `exportUtils.ts` 已创建，包含导出工具函数
- [x] `useChartExport.ts` 已重构，整合所有导出功能（目标≤300行）

## useChartZoom.ts 拆分
- [x] `usePan.ts` 已创建，包含平移功能
- [x] `useScale.ts` 已创建，包含缩放比例功能
- [x] `useBrush.ts` 已创建，包含刷选功能
- [x] `zoomUtils.ts` 已创建，包含缩放工具函数
- [x] `useChartZoom.ts` 已重构，整合所有缩放功能（目标≤300行）

## 功能验证
- [x] TypeScript 类型检查通过（无新增类型错误）
- [x] ESLint 检查通过，无代码质量问题
- [x] 所有受影响页面功能正常
- [x] 所有拆分后的文件遵循项目代码风格
- [x] 所有组件和 Hook 有清晰的职责边界
- [x] 没有过度拆分（每个文件都有实际意义）
- [x] 导入导出关系清晰，无循环依赖
