# Tasks

## Task 1: 拆分 PriceChart/index.tsx (1630行)
- [x] Task 1.1: 创建 `ChartToolbar.tsx` - 提取工具栏组件（时间范围选择、刷新、导出按钮等）
- [x] Task 1.2: 创建 `TechnicalIndicators.tsx` - 提取技术指标计算与渲染逻辑（MA、RSI、MACD）
- [x] Task 1.3: 创建 `useChartState.ts` - 提取图表状态管理Hook
- [x] Task 1.4: 创建 `chartUtils.ts` - 提取图表工具函数（数据处理、格式化等）
- [x] Task 1.5: 重构 `index.tsx` - 整合拆分后的组件，保持原有功能

## Task 2: 拆分 OraclePageTemplate.tsx (1364行)
- [x] Task 2.1: 创建 `oraclePanels/` 目录结构
- [x] Task 2.2: 创建 `oraclePanels/ChainlinkPanel.tsx` - Chainlink专用面板配置
- [x] Task 2.3: 创建 `oraclePanels/PythPanel.tsx` - Pyth专用面板配置
- [x] Task 2.4: 创建 `oraclePanels/API3Panel.tsx` - API3专用面板配置
- [x] Task 2.5: 创建 `oraclePanels/TellorPanel.tsx` - Tellor专用面板配置
- [x] Task 2.6: 创建 `oraclePanels/BandProtocolPanel.tsx` - Band Protocol专用面板配置
- [x] Task 2.7: 创建 `oraclePanels/UMAPanel.tsx` - UMA专用面板配置
- [x] Task 2.8: 创建 `oraclePanels/DIAPanel.tsx` - DIA专用面板配置
- [x] Task 2.9: 创建 `oraclePanels/ChroniclePanel.tsx` - Chronicle专用面板配置
- [x] Task 2.10: 创建 `oraclePanels/RedStonePanel.tsx` - RedStone专用面板配置
- [x] Task 2.11: 创建 `oraclePanels/index.ts` - 导出所有面板配置
- [x] Task 2.12: 重构 `OraclePageTemplate.tsx` - 使用拆分后的面板组件

## Task 3: 拆分 LatencyTrendChart.tsx (1350行)
- [x] Task 3.1: 创建 `LatencyHistogram.tsx` - 提取延迟直方图组件
- [x] Task 3.2: 创建 `LatencyPrediction.tsx` - 提取预测功能组件
- [x] Task 3.3: 创建 `useLatencyStats.ts` - 提取延迟统计计算Hook
- [x] Task 3.4: 创建 `latencyUtils.ts` - 提取延迟相关工具函数
- [x] Task 3.5: 重构 `LatencyTrendChart.tsx` - 整合拆分后的组件

# Task Dependencies
- [Task 1.5] depends on [Task 1.1, Task 1.2, Task 1.3, Task 1.4]
- [Task 2.12] depends on [Task 2.1, Task 2.2, Task 2.3, Task 2.4, Task 2.5, Task 2.6, Task 2.7, Task 2.8, Task 2.9, Task 2.10, Task 2.11]
- [Task 3.5] depends on [Task 3.1, Task 3.2, Task 3.3, Task 3.4]
