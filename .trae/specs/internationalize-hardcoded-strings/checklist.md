# Checklist

## Hooks 国际化验证

- [x] usePriceHistory.ts 中的市场异常描述已国际化
- [x] usePriceHistory.ts 中的网络状态描述已国际化
- [x] useKeyboardShortcuts.ts 中的快捷键描述已国际化
- [x] useChartExport.ts 中的导出状态文本已国际化
- [x] useAlerts.ts 中的错误消息已国际化
- [x] useRealtimeAlerts.ts 中的告警消息已国际化

## 设置组件国际化验证

- [x] PreferencesPanel.tsx 中的时间范围选项已国际化
- [x] PreferencesPanel.tsx 中的语言选项已国际化
- [x] DataManagementPanel.tsx 中的错误消息已国际化

## UI 组件国际化验证

- [x] Toast.tsx 中的关闭按钮文本已国际化
- [x] LanguageSwitcher.tsx 所有文本都有对应的翻译键

## Oracle 图表组件国际化验证

- [x] DataQualityTrend.tsx 中的图表标签已国际化
- [x] DataQualityTrend.tsx 中的质量维度文本已国际化
- [x] DataQualityTrend.tsx 中的评分说明已国际化
- [x] PriceDeviationHistoryChart.tsx 中的偏离分析文本已国际化
- [x] PriceDeviationRisk.tsx 中的风险分析文本已国际化
- [x] LatencyTrendChart.tsx 中的延迟趋势文本已国际化
- [x] LatencyTrendMiniChart.tsx 中的时间范围选项已国际化
- [x] LatencyTrendMiniChart.tsx 中的状态标签已国际化
- [x] BollingerBands.tsx 中的布林带标签已国际化
- [x] ATRIndicator.tsx 中的波动率标签已国际化
- [x] MovingAverageChart.tsx 中的滑动窗口分析文本已国际化
- [x] MultiValidatorComparison.tsx 中的验证者对比文本已国际化
- [x] LatencyDistributionHistogram.tsx 中的图表类型标签已国际化
- [x] DataSourceTrend.tsx 中的月份标签已国际化
- [x] StakingDistributionChart.tsx 中的分类标签已国际化

## Oracle 面板组件国际化验证

- [x] ValidatorAnalyticsPanel 中的相对时间文本已国际化
- [x] ValidatorAnalyticsPanel 中的验证者类型标签已国际化
- [x] DisputeVotingPanel.tsx 中的投票选项已国际化
- [x] DisputeVotingPanel.tsx 中的投票状态已国际化
- [x] DIARiskAssessmentPanel.tsx 中的风险评估文本已国际化
- [x] DIARiskAssessmentPanel.tsx 中的时间线事件已国际化
- [x] DataQualityPanel.tsx 中的时间处理文本已国际化
- [x] AnomalyStatsPanel.tsx 中的异常等级已国际化
- [x] AnomalyStatsPanel.tsx 中的异常类型已国际化
- [x] AnomalyStatsPanel.tsx 中的统计标签已国际化

## Oracle 通用组件国际化验证

- [x] UMAScoreExplanationModal.tsx 中的评分说明已国际化
- [x] UMAScoreExplanationModal.tsx 中的等级说明已国际化
- [x] PerformanceGauge.tsx 中的单位文本已国际化
- [x] GasFeeComparison.tsx 中的 Gas 费用文本已国际化
- [x] CrossChainPriceConsistency.tsx 中的一致性状态已国际化
- [x] CrossChainPriceConsistency.tsx 中的更新状态已国际化
- [x] BandCrossChainPriceConsistency.tsx 中的一致性状态已国际化

## Oracle 表单组件国际化验证

- [x] DataExportButton.tsx 中的导出按钮文本已国际化
- [x] ComparisonReportExporter.tsx 中的错误消息已国际化
- [x] ComparisonReportExporter.tsx 中的导出状态文本已国际化

## 价格查询页面国际化验证

- [x] PriceChart.tsx 中的价格提示文本已国际化
- [x] PriceChart.tsx 中的图表标签已国际化

## i18n 资源文件验证

- [x] en.json 包含所有必需的英文翻译键
- [x] zh-CN.json 包含所有必需的中文翻译键
- [x] en.json 和 zh-CN.json 的键结构一致
- [x] 无重复的翻译键
- [x] 键名遵循 category.subCategory.key 规范

## 功能验证

- [x] 语言切换功能正常工作
- [x] 所有组件正确响应语言切换
- [x] 无遗漏的硬编码文本
- [x] 相对时间显示正确
- [x] 图表标签正确显示翻译

## 质量验证

- [x] TypeScript 类型检查通过
- [x] 生产构建成功
- [x] 无控制台错误
- [x] 翻译文本准确自然
