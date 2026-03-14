# Tasks

- [x] Task 1: 扩展颜色配置文件
  - [x] SubTask 1.1: 在 colors.ts 中添加 chainColors 对象，定义各条链的品牌色
  - [x] SubTask 1.2: 在 colors.ts 中添加 validatorTypeColors 对象（如果 chartColors.validator 不够用）
  - [x] SubTask 1.3: 在 colors.ts 中添加 regionColors 对象（如果 chartColors.region 不够用）
  - [x] SubTask 1.4: 检查并补充 chartColors.recharts 中缺失的颜色定义
  - [x] SubTask 1.5: 添加更多图表相关的颜色常量（如 RSI 区域颜色、MACD 颜色等）
  
- [ ] Task 2: 重构图表组件中的硬编码颜色
  - [ ] SubTask 2.1: 重构 PriceChart.tsx - 替换所有硬编码颜色为配置常量
  - [ ] SubTask 2.2: 重构 CrossOracleComparison.tsx - 使用统一的预言机颜色
  - [ ] SubTask 2.3: 重构 RSIIndicator.tsx - 使用配置中的网格和区域颜色
  - [ ] SubTask 2.4: 重构 PriceVolatilityChart.tsx - 替换硬编码颜色
  - [ ] SubTask 2.5: 重构 MovingAverageChart.tsx - 替换硬编码颜色
  - [ ] SubTask 2.6: 重构 ConfidenceIntervalChart.tsx - 替换硬编码颜色
  - [ ] SubTask 2.7: 重构 GasFeeTrendChart.tsx - 替换硬编码颜色
  - [ ] SubTask 2.8: 重构 ValidatorComparison.tsx - 替换硬编码颜色
  - [ ] SubTask 2.9: 重构 PriceDeviationRisk.tsx - 替换硬编码颜色
  - [ ] SubTask 2.10: 重构 ConcentrationRisk.tsx - 替换硬编码颜色
  
- [ ] Task 3: 重构面板组件中的硬编码颜色
  - [ ] SubTask 3.1: 重构 ValidatorAnalyticsPanel.tsx - 使用 chartColors.validator 和 chartColors.region
  - [ ] SubTask 3.2: 重构 CrossChainPanel.tsx - 使用 chainColors 配置
  
- [ ] Task 4: 重构通用组件中的硬编码颜色
  - [ ] SubTask 4.1: 重构 PriceAccuracyStats.tsx - 替换硬编码颜色
  - [ ] SubTask 4.2: 重构 PublisherReliabilityScore.tsx - 替换硬编码颜色
  - [ ] SubTask 4.3: 重构 DataSourceCoverage.tsx - 替换硬编码颜色
  - [ ] SubTask 4.4: 重构 GasFeeComparison.tsx - 替换硬编码颜色
  - [ ] SubTask 4.5: 重构 DataQualityIndicator.tsx - 替换硬编码颜色
  - [ ] SubTask 4.6: 重构 ValidatorEarningsBreakdown.tsx - 替换硬编码颜色
  - [ ] SubTask 4.7: 重构 BandCrossChainPriceConsistency.tsx - 替换硬编码颜色
  - [ ] SubTask 4.8: 重构 AnomalyMarker.tsx - 替换硬编码颜色
  - [ ] SubTask 4.9: 重构 ChartAnnotations.tsx - 替换硬编码颜色
  - [ ] SubTask 4.10: 重构 VolatilityAlert.tsx - 替换硬编码颜色
  - [ ] SubTask 4.11: 重构 ConfidenceScore.tsx - 替换硬编码颜色
  - [ ] SubTask 4.12: 重构 UMAScoreExplanationModal.tsx - 替换硬编码颜色
  - [ ] SubTask 4.13: 重构 ExtremeMarketAnalysis.tsx - 替换硬编码颜色
  - [ ] SubTask 4.14: 重构 OraclePerformanceRanking.tsx - 替换硬编码颜色
  - [ ] SubTask 4.15: 重构 DataSourceCredibility.tsx - 替换硬编码颜色
  - [ ] SubTask 4.16: 重构 DisputeAmountDistribution.tsx - 替换硬编码颜色
  - [ ] SubTask 4.17: 重构 PriceDeviationMonitor.tsx - 替换硬编码颜色
  - [ ] SubTask 4.18: 重构 PerformanceGauge.tsx - 替换硬编码颜色
  - [ ] SubTask 4.19: 重构 DisputeEfficiencyAnalysis.tsx - 替换硬编码颜色
  - [ ] SubTask 4.20: 重构 CrossChainPriceConsistency.tsx - 替换硬编码颜色
  - [ ] SubTask 4.21: 重构 UMADataQualityScoreCard.tsx - 替换硬编码颜色
  - [ ] SubTask 4.22: 重构 RequestTypeDistribution.tsx - 替换硬编码颜色
  - [ ] SubTask 4.23: 重构 LatencyAnalysis.tsx - 替换硬编码颜色
  
- [ ] Task 5: 重构表单组件中的硬编码颜色
  - [ ] SubTask 5.1: 重构 ComparisonReportExporter.tsx - 使用 exportColors 配置
  
- [ ] Task 6: 重构类型定义和服务文件中的硬编码颜色
  - [ ] SubTask 6.1: 重构 lib/oracles/uma/types.ts - 使用 chartColors 配置
  - [ ] SubTask 6.2: 重构 lib/services/marketData/defiLlamaApi.ts - 使用预言机颜色配置
  - [ ] SubTask 6.3: 重构 lib/config/oracles.tsx - 使用统一的预言机颜色
  - [ ] SubTask 6.4: 重构 lib/constants/index.ts - 检查并替换硬编码颜色
  - [ ] SubTask 6.5: 重构 lib/utils/chartSharedUtils.ts - 替换硬编码颜色
  - [ ] SubTask 6.6: 重构 lib/analytics/riskMetrics.ts - 替换硬编码颜色
  - [ ] SubTask 6.7: 重构 lib/analytics/anomalyDetection.ts - 替换硬编码颜色
  
- [ ] Task 7: 重构 hooks 中的硬编码颜色
  - [ ] SubTask 7.1: 重构 hooks/useChartExport.ts - 替换硬编码颜色
  - [ ] SubTask 7.2: 重构 hooks/chart/useChartExport.ts - 替换硬编码颜色
  
- [ ] Task 8: 重构页面组件中的硬编码颜色
  - [ ] SubTask 8.1: 重构 app/cross-oracle/page.tsx - 替换硬编码颜色
  
- [ ] Task 9: 验证和测试
  - [ ] SubTask 9.1: 运行 TypeScript 类型检查，确保无类型错误
  - [ ] SubTask 9.2: 运行 lint 检查，确保代码质量
  - [ ] SubTask 9.3: 视觉验证 - 确保所有图表和组件颜色显示正确
  - [ ] SubTask 9.4: 检查是否有遗漏的硬编码颜色（再次运行 grep 搜索））

# Task Dependencies
- Task 1 必须首先完成，其他任务依赖颜色配置文件的扩展
- Task 2-8 可以并行执行（在 Task 1 完成后）
- Task 9 必须在所有重构任务完成后执行
