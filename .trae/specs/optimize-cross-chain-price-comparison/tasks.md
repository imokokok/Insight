# Tasks

- [ ] Task 1: 拆分 useCrossChainData God Hook 为独立 Hook
  - [ ] SubTask 1.1: 拆分 `types.ts` 中的 `UseCrossChainDataReturn` 巨型接口为多个独立接口（`SelectorState`、`DataState`、`StatisticsState`、`ChartState`、`TableState`、`ExportState`）
  - [ ] SubTask 1.2: 重构 `useCrossChainData.ts`，移除巨型聚合 Hook，导出各独立 Hook 的组合函数
  - [ ] SubTask 1.3: 更新 `CrossChainContent.tsx` 及所有子组件，改为按需订阅独立 Hook 或 Store selector
  - [ ] SubTask 1.4: 验证跨链页面功能正常，无重渲染性能退化

- [ ] Task 2: 移除不必要的代理 Hook 和纯函数 Hook 包装
  - [ ] SubTask 2.1: 移除 `useCrossChainSelector`、`useCrossChainUI` 代理 Hook，组件直接使用 Store selector
  - [ ] SubTask 2.2: 移除 `useCrossChainStatistics`、`useCrossChainChart` 代理 Hook，组件直接使用底层 Hook
  - [ ] SubTask 2.3: 将 `useDataValidation` 提取为 `validatePriceData` 工具函数（已有 `utils/validation.ts`）
  - [ ] SubTask 2.4: 将 `useAnomalyDetection` 提取为 `detectAnomalousPrices` 工具函数（已有 `utils/anomalyDetection.ts`）
  - [ ] SubTask 2.5: 更新所有引用代理 Hook 和纯函数 Hook 的组件
  - [ ] SubTask 2.6: 更新 `hooks/index.ts` 导出

- [ ] Task 3: 优化 Zustand Store 配置
  - [ ] SubTask 3.1: 移除 `crossChainDataStore` 中无效的 persist 中间件（partialize 返回空对象）
  - [ ] SubTask 3.2: 将 `selectedBaseChain` 纳入 `crossChainSelectorStore` 的 `partialize` 持久化配置
  - [ ] SubTask 3.3: 将 `hoveredCell`、`selectedCell`、`tooltipPosition` 从 `crossChainUIStore` 移至组件本地 useState
  - [ ] SubTask 3.4: 清理 Store 文件底部未导出的 selector hooks
  - [ ] SubTask 3.5: 验证 Store 状态持久化和恢复正常

- [ ] Task 4: 修复数据准确性 Bug
  - [ ] SubTask 4.1: 修复 `DispersionGauge` 双重百分比 bug（`PriceDispersionCard` 乘以 100 后 `DispersionGauge` 又乘以 100）
  - [ ] SubTask 4.2: 统一 `constants.tsx` 和 `thresholds.ts` 中不一致的偏差阈值定义，`constants.tsx` 从 `thresholds.ts` 导入
  - [ ] SubTask 4.3: 为 `MarketDepthSimulator` 添加"Simulated"标识
  - [ ] SubTask 4.4: 修复 `useOracleData` 中 `prices.push` 在并行回调中的不安全模式，改为 `map` + 解构赋值
  - [ ] SubTask 4.5: 修复 `SimplePriceTable` 中 Latency/Sources 列使用默认值的问题，标注"Estimated"

- [ ] Task 5: 提取重复代码为共享工具函数
  - [ ] SubTask 5.1: 创建 `src/app/cross-chain/utils/timeUtils.ts`，提取 `getTimeRangeInMs` 函数
  - [ ] SubTask 5.2: 移除 `InteractivePriceChart.tsx`、`PriceSpreadHeatmap.tsx`、`ChartsTab.tsx` 中的重复 `getTimeRangeInMs` 定义
  - [ ] SubTask 5.3: 统一 `getConsistencyRating`（保留 `colorUtils.ts` 版本，移除 `useExport.ts` 中的重复定义）
  - [ ] SubTask 5.4: 移除 `CrossChainFilters.tsx` 中硬编码的 `chainColors` 映射，改用 `@/lib/config/colors` 的配置
  - [ ] SubTask 5.5: 提取 `correlationUtils.ts` 中重复的时间戳匹配逻辑为内部共享函数

- [ ] Task 6: 清理死代码
  - [ ] SubTask 6.1: 清理 `colorUtils.ts` 中未导出的 `getDiffTextColor`、`getCorrelationColor`、`getVolatilityColor`
  - [ ] SubTask 6.2: 清理 `correlationUtils.ts` 中未导出的 `calculateRollingCorrelation`
  - [ ] SubTask 6.3: 清理 `statisticsUtils.ts` 中未使用的 `calculateStandardDeviationFromValues`
  - [ ] SubTask 6.4: 清理 `volatilityUtils.ts` 中未导出的 `calculateRollingVolatility`、`calculateVolatilityCone`
  - [ ] SubTask 6.5: 清理 `constants.ts` 中未导出的 `PriceDifference` 接口
  - [ ] SubTask 6.6: 移除 `cross-oracle/UnifiedExportSection.tsx` 未被引用的组件及其测试
  - [ ] SubTask 6.7: 移除 `cross-oracle/PriceTable.tsx` 未被当前页面使用的组件及其测试
  - [ ] SubTask 6.8: 清理 `constants.tsx` 中未导出的 `deviationThresholds`、`chartConfig`、`cacheConfig`
  - [ ] SubTask 6.9: 清理 `thresholds.ts` 中未导出的延迟/偏差阈值（确认无外部使用后导出或移除）
  - [ ] SubTask 6.10: 清理 `charts.ts` 中未导出的类型接口
  - [ ] SubTask 6.11: 将 `constants.tsx` 文件扩展名改为 `.ts`（不含 JSX）

- [ ] Task 7: 拆分超大组件文件
  - [ ] SubTask 7.1: 拆分 `InteractivePriceChart.tsx`（829行）→ 拆出 `ChartToolbar`、`ReferenceLineManager`、`ChartLegend` 子组件
  - [ ] SubTask 7.2: 拆分 `PriceSpreadHeatmap.tsx`（703行）→ 拆出 `HeatmapTooltip`、`SelectedCellDetail` 为独立文件
  - [ ] SubTask 7.3: 拆分 `CrossChainFilters.tsx`（412行）→ 拆出 `ChainSelector`、`TechnicalIndicators`、`AnomalyConfig` 子组件
  - [ ] SubTask 7.4: 拆分 `OverviewTab.tsx` 中的 Stability Analysis 表格为独立组件
  - [ ] SubTask 7.5: 拆分 `PageHeader.tsx` 中的收藏下拉菜单为独立组件

- [ ] Task 8: 扩展跨链比较至多 Oracle 提供商
  - [ ] SubTask 8.1: 在 `src/lib/oracles/` 下创建通用跨链比较服务（不限于 Pyth），定义 `CrossChainComparisonService` 接口
  - [ ] SubTask 8.2: 为 Chainlink 实现跨链比较逻辑（基于各链上 Aggregator 合约的最新 Round 数据时间戳）
  - [ ] SubTask 8.3: 为 API3 实现跨链比较逻辑（基于各链上 dAPI Proxy 合约的数据时间戳）
  - [ ] SubTask 8.4: 修复 Pyth 跨链比较逻辑，使用链上更新时间戳而非 API 响应延迟
  - [ ] SubTask 8.5: 更新 `useDataFetching` 支持多 Oracle 提供商的跨链数据获取
  - [ ] SubTask 8.6: 更新 `CrossChainFilters` 允许选择不同 Oracle 提供商
  - [ ] SubTask 8.7: 更新 `PriceSpreadHeatmap` 和 `PriceComparisonTable` 支持多 Oracle 数据展示

- [ ] Task 9: 修复失效测试
  - [ ] SubTask 9.1: 修复 `RiskAlertBanner.test.tsx`：Props 接口与实际组件对齐
  - [ ] SubTask 9.2: 修复 `ControlPanel.test.tsx`：移除不存在的 `symbols` prop，使用正确的 `OracleProvider` 枚举值
  - [ ] SubTask 9.3: 修复 `PriceTable.test.tsx`：mock 签名与实际函数对齐
  - [ ] SubTask 9.4: 修复 `TabNavigation.test.tsx`：替换占位符断言为实际测试
  - [ ] SubTask 9.5: 验证所有测试通过

- [ ] Task 10: 最终验证
  - [ ] SubTask 10.1: 运行 `npm run typecheck` 确保无类型错误
  - [ ] SubTask 10.2: 运行 `npm run lint` 确保无 lint 错误
  - [ ] SubTask 10.3: 运行 `npm run test` 确保测试通过
  - [ ] SubTask 10.4: 运行 `npm run build` 确保构建成功
  - [ ] SubTask 10.5: 手动验证跨链页面和跨预言机页面功能正常

# Task Dependencies

- [Task 1] 无依赖，可先行（核心架构变更）
- [Task 2] 依赖 [Task 1]（代理 Hook 在 God Hook 拆分后更容易移除）
- [Task 3] 无依赖，可先行（Store 配置独立）
- [Task 4] 无依赖，可先行（Bug 修复独立）
- [Task 5] 无依赖，可先行（代码提取独立）
- [Task 6] 无依赖，可先行（死代码清理独立）
- [Task 7] 依赖 [Task 1]（组件拆分在 Hook 拆分后更容易进行）
- [Task 8] 依赖 [Task 1]（多 Oracle 扩展在 Hook 拆分后更容易实现）
- [Task 9] 依赖 [Task 4]、[Task 6]（测试修复在 Bug 修复和死代码清理后进行）
- [Task 10] 依赖所有其他 Task
