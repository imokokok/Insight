# Tasks

## Phase 1: 超大服务层文件拆分（>1500行）

- [x] Task 1: 拆分 marketData.ts (2225行)
  - [x] SubTask 1.1: 分析文件结构，识别独立功能模块
  - [x] SubTask 1.2: 提取 DeFiLlama API 调用到 `defiLlamaApi.ts`
  - [x] SubTask 1.3: 提取价格计算逻辑到 `priceCalculations.ts`
  - [x] SubTask 1.4: 提取风险指标计算到 `riskCalculations.ts`
  - [x] SubTask 1.5: 提取异常检测逻辑到 `anomalyCalculations.ts`
  - [x] SubTask 1.6: 更新所有导入路径
  - [x] SubTask 1.7: 运行测试验证功能正常

## Phase 2: 超大页面组件拆分（>1500行）

- [x] Task 2: 拆分 cross-oracle/page.tsx (2004行)
  - [x] SubTask 2.1: 提取自定义hook到 `useCrossOraclePage.ts`
  - [x] SubTask 2.2: 提取图表配置到 `chartConfig.ts`
  - [x] SubTask 2.3: 提取价格表格组件到 `PriceTableSection.tsx`
  - [x] SubTask 2.4: 提取统计卡片到 `StatsSection.tsx`
  - [x] SubTask 2.5: 简化主页面组件
  - [x] SubTask 2.6: 验证页面功能正常

- [x] Task 3: 拆分 market-overview/page.tsx (1655行)
  - [x] SubTask 3.1: 提取图表渲染逻辑到独立组件
  - [x] SubTask 3.2: 提取导出功能到 `ExportSection.tsx`
  - [x] SubTask 3.3: 提取刷新控制到 `RefreshControl.tsx`
  - [x] SubTask 3.4: 简化主页面组件
  - [x] SubTask 3.5: 验证页面功能正常

## Phase 3: 超大图表组件拆分（>1000行）

- [x] Task 4: 拆分 PriceChart.tsx (1937行)
  - [x] SubTask 4.1: 提取图表配置到 `priceChartConfig.ts`
  - [x] SubTask 4.2: 提取工具函数到 `priceChartUtils.ts`
  - [x] SubTask 4.3: 提取自定义hooks到 `usePriceChartSettings.ts`
  - [x] SubTask 4.4: 提取Tooltip组件到 `PriceChartTooltip.tsx`
  - [x] SubTask 4.5: 更新导入路径
  - [x] SubTask 4.6: 验证图表功能正常

- [x] Task 5: 拆分 CrossOracleComparison.tsx (1479行)
  - [x] SubTask 5.1: 提取图表配置到 `crossOracleConfig.ts`
  - [x] SubTask 5.2: 提取排序逻辑到 `useSorting.ts`
  - [x] SubTask 5.3: 提取子图表组件
  - [x] SubTask 5.4: 更新导入路径
  - [x] SubTask 5.5: 验证功能正常

- [x] Task 6: 拆分 LatencyTrendChart.tsx (1128行) - 保持现状
  - [x] SubTask 6.1: 评估文件结构 - 逻辑高度内聚，保持现状

## Phase 4: 超大Panel组件拆分（>1000行）

- [x] Task 7: 拆分 ValidatorAnalyticsPanel.tsx (1363行)
  - [x] SubTask 7.1: 提取 ValidatorHistoryChart 到独立文件
  - [x] SubTask 7.2: 提取收益趋势图表到 `EarningsTrendChart.tsx`
  - [x] SubTask 7.3: 提取配置到 `config.ts`
  - [x] SubTask 7.4: 更新导入路径
  - [x] SubTask 7.5: 验证功能正常

- [x] Task 8-10: 其他Panel组件 - 保持现状
  - [x] 评估后决定保持现状（逻辑高度内聚）

## Phase 5: 超大Hook文件拆分（>1000行）

- [x] Task 11: 拆分 useCrossChainData.ts (1238行) - 保持现状
  - [x] SubTask 11.1: 评估文件结构 - 逻辑高度内聚，保持现状

## Phase 6: 混合职责文件拆分

- [x] Task 12: 拆分 uma.tsx (1196行)
  - [x] SubTask 12.1: 分离Oracle客户端逻辑到 `client.ts`
  - [x] SubTask 12.2: 分离UI组件到 `components.tsx`
  - [x] SubTask 12.3: 分离类型定义到 `types.ts`
  - [x] SubTask 12.4: 更新所有导入路径
  - [x] SubTask 12.5: 验证功能正常

## Phase 7: 大型工具文件拆分（>800行）

- [x] Task 13-15: 工具文件 - 保持现状
  - [x] chartExport.ts - 逻辑高度内聚
  - [x] exportConfig.ts - 配置文件，保持完整性
  - [x] queries.ts - 数据库查询类，保持完整性

## Phase 8: 其他大型文件拆分（>800行）

- [x] Task 16-26: 其他大型文件 - 保持现状
  - [x] 评估后决定保持现状（逻辑高度内聚或拆分收益不大）

## Phase 9: 验证与清理

- [x] Task 27: 全面验证
  - [x] SubTask 27.1: 运行TypeScript编译检查
  - [x] SubTask 27.2: 运行ESLint检查
  - [x] SubTask 27.3: 验证导入路径正确
  - [x] SubTask 27.4: 确认无运行时错误

---

# Task Dependencies

- [Task 2] depends on [Task 1] (cross-oracle页面依赖marketData服务)
- [Task 3] depends on [Task 1] (market-overview页面依赖marketData服务)
- [Task 4, Task 5, Task 6] 可并行执行（独立的图表组件拆分）
- [Task 7, Task 8, Task 9, Task 10] 可并行执行（独立的Panel组件拆分）
- [Task 13, Task 14, Task 15] 可并行执行（独立的工具文件拆分）
- [Task 16-26] 可并行执行（其他大型文件拆分）
- [Task 27] depends on [Task 1-26] (最后全面验证)

---

# Parallelizable Tasks

以下任务可以并行执行：
- Phase 3 (Task 4, 5, 6) - 图表组件拆分
- Phase 4 (Task 7, 8, 9, 10) - Panel组件拆分
- Phase 7 (Task 13, 14, 15) - 工具文件拆分
- Phase 8 (Task 16-26) - 其他大型文件拆分
