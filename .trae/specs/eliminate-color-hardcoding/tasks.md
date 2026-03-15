# 消除颜色硬编码任务列表

## 任务依赖关系
- Task 1 → Task 2, Task 3, Task 4
- Task 2, Task 3, Task 4 → Task 5
- Task 5 → Task 6

## 任务列表

- [x] **Task 1: 扩展颜色配置文件**
  扩展 `src/lib/config/colors.ts` 添加缺失的颜色定义。
  - [x] SubTask 1.1: 添加 UI 组件颜色 (button, input, card)
  - [x] SubTask 1.2: 添加图表导出颜色 (exportColors)
  - [x] SubTask 1.3: 添加热力图颜色 (heatmapColors)
  - [x] SubTask 1.4: 添加动画效果颜色 (animationColors)
  - [x] SubTask 1.5: 添加工具提示和阴影颜色

- [x] **Task 2: 重构组件文件 - 图表组件**
  重构图表相关组件，使用颜色配置替代硬编码。
  - [x] SubTask 2.1: 重构 PriceDeviationHistoryChart.tsx
  - [x] SubTask 2.2: 重构 PriceDeviationHeatmap.tsx
  - [x] SubTask 2.3: 重构 ChainComparison.tsx
  - [x] SubTask 2.4: 重构 ConcentrationRisk.tsx
  - [x] SubTask 2.5: 重构 PriceDeviationRisk.tsx
  - [x] SubTask 2.6: 重构 PublisherContributionPanel.tsx

- [x] **Task 3: 重构组件文件 - UI 组件**
  重构 UI 相关组件，使用颜色配置替代硬编码。
  - [x] SubTask 3.1: 重构 AnomalyAlert.tsx
  - [x] SubTask 3.2: 重构 PerformanceGauge.tsx
  - [x] SubTask 3.3: 重构 DataSourceCoverage.tsx
  - [x] SubTask 3.4: 重构 NodeReputationPanel.tsx
  - [x] SubTask 3.5: 重构 ExportSection.tsx

- [x] **Task 4: 重构页面和工具文件**
  重构页面组件和工具文件。
  - [x] SubTask 4.1: 重构 cross-oracle/page.tsx
  - [x] SubTask 4.2: 重构 lib/constants/index.ts (区块链颜色)
  - [x] SubTask 4.3: 重构 utils/chartExport.ts
  - [x] SubTask 4.4: 重构 lib/services/marketData/priceCalculations.ts

- [x] **Task 5: 重构 CSS 文件**
  重构 `src/app/globals.css` 使用 CSS 变量。
  - [x] SubTask 5.1: 更新 :root 变量定义
  - [x] SubTask 5.2: 更新按钮样式类
  - [x] SubTask 5.3: 更新卡片样式类
  - [x] SubTask 5.4: 更新输入框样式类
  - [x] SubTask 5.5: 更新表格样式类
  - [x] SubTask 5.6: 更新滚动条样式
  - [x] SubTask 5.7: 更新动画效果样式

- [x] **Task 6: 验证和测试**
  验证所有颜色硬编码已被消除。
  - [x] SubTask 6.1: 运行颜色硬编码扫描检查
  - [x] SubTask 6.2: 验证组件渲染正常
  - [x] SubTask 6.3: 验证深色模式兼容性
