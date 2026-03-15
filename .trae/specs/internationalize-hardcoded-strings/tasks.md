# Tasks

- [x] Task 1: 扫描并分类所有包含硬编码文本的文件
  - [x] SubTask 1.1: 扫描 components/alerts/ 目录下的硬编码文本
  - [x] SubTask 1.2: 扫描 components/oracle/ 目录下的硬编码文本
  - [x] SubTask 1.3: 扫描 components/realtime/ 目录下的硬编码文本
  - [x] SubTask 1.4: 扫描 app/ 目录下的硬编码文本
  - [x] SubTask 1.5: 整理硬编码文本清单，按模块分类

- [x] Task 2: 国际化 alerts 模块
  - [x] SubTask 2.1: 国际化 AlertConfig.tsx
  - [x] SubTask 2.2: 国际化 AlertNotification.tsx
  - [x] SubTask 2.3: 国际化 AlertHistory.tsx
  - [x] SubTask 2.4: 国际化 AlertList.tsx

- [x] Task 3: 国际化 oracle/common 模块
  - [x] SubTask 3.1: 国际化 PageHeader.tsx (包含时间格式化)
  - [x] SubTask 3.2: 国际化 GasFeeComparison.tsx
  - [x] SubTask 3.3: 国际化 ValidatorEarningsBreakdown.tsx
  - [x] SubTask 3.4: 国际化 ChartAnnotations.tsx
  - [x] SubTask 3.5: 国际化 ConfidenceScore.tsx
  - [x] SubTask 3.6: 国际化 AnomalyAlert.tsx
  - [x] SubTask 3.7: 国际化其他 common 组件

- [x] Task 4: 国际化 oracle/panels 模块
  - [x] SubTask 4.1: 国际化 NetworkHealthPanel.tsx
  - [x] SubTask 4.2: 国际化 DataSourceTraceabilityPanel.tsx
  - [x] SubTask 4.3: 国际化 AccuracyAnalysisPanel.tsx
  - [x] SubTask 4.4: 国际化其他 panels 组件

- [x] Task 5: 国际化 oracle/charts 模块
  - [x] SubTask 5.1: 国际化图表标题和标签
  - [x] SubTask 5.2: 国际化工具提示文本

- [x] Task 6: 国际化 cross-chain 和 market-overview 模块
  - [x] SubTask 6.1: 国际化 PriceSpreadHeatmap.tsx
  - [x] SubTask 6.2: 国际化 ScheduledExportConfig.tsx
  - [x] SubTask 6.3: 国际化其他 cross-chain 组件

- [x] Task 7: 更新 i18n 翻译文件
  - [x] SubTask 7.1: 将所有提取的文本添加到 en.json
  - [x] SubTask 7.2: 将所有提取的文本添加到 zh-CN.json
  - [x] SubTask 7.3: 确保中英文翻译一致性

- [x] Task 8: 验证国际化实现
  - [x] SubTask 8.1: 检查所有修改的组件是否正确使用 t() 函数
  - [x] SubTask 8.2: 验证语言切换时文本是否正确变化
  - [x] SubTask 8.3: 运行类型检查确保无 TypeScript 错误

# Task Dependencies
- Task 1 必须在 Task 2-6 之前完成
- Task 2-6 可以并行执行
- Task 7 依赖于 Task 2-6 的完成
- Task 8 依赖于 Task 7 的完成
