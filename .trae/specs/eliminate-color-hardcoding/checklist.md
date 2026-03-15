# 消除颜色硬编码检查清单

## 颜色配置文件检查
- [x] `src/lib/config/colors.ts` 包含所有必要的颜色定义
- [x] 新增 UI 组件颜色 (uiColors)
- [x] 新增热力图颜色 (heatmapColors)
- [x] 新增动画效果颜色 (animationColors)
- [x] 导出颜色配置正确扩展

## 组件文件检查
- [x] AnomalyAlert.tsx 使用 chartColors.oracle 替代硬编码
- [x] PerformanceGauge.tsx 使用 semanticColors.neutral.DEFAULT 替代 #9CA3AF
- [x] PublisherContributionPanel.tsx 使用 chartColors.sequence 替代硬编码数组
- [x] DataSourceCoverage.tsx 使用 shadowColors.soft 替代硬编码 boxShadow
- [x] PriceDeviationRisk.tsx 使用颜色配置
- [x] PriceDeviationHistoryChart.tsx 使用 chartColors.recharts
- [x] ConcentrationRisk.tsx 使用颜色配置
- [x] ChainComparison.tsx 使用 chainColors 和 chartColors.recharts
- [x] PriceDeviationHeatmap.tsx 使用 heatmapColors
- [x] NodeReputationPanel.tsx 使用颜色配置
- [x] cross-oracle/page.tsx 使用颜色配置
- [x] ExportSection.tsx 使用 exportColors

## 常量文件检查
- [x] lib/constants/index.ts 区块链颜色使用 chainColors

## 工具文件检查
- [x] utils/chartExport.ts 使用 exportColors
- [x] lib/services/marketData/priceCalculations.ts 使用颜色配置

## CSS 文件检查
- [x] globals.css :root 变量使用颜色配置
- [x] globals.css 按钮样式使用 CSS 变量
- [x] globals.css 卡片样式使用 CSS 变量
- [x] globals.css 输入框样式使用 CSS 变量
- [x] globals.css 表格样式使用 CSS 变量
- [x] globals.css 滚动条样式使用 CSS 变量
- [x] globals.css 动画效果使用 CSS 变量

## 最终验证
- [x] 运行 grep 检查无剩余硬编码颜色 (排除颜色配置文件本身)
- [x] 所有组件正常渲染
- [x] 深色模式颜色正确显示
- [x] 图表颜色正确显示
- [x] 导出功能颜色正确
