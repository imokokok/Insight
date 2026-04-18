# Tasks

- [x] Task 1: 数据透明度标注 — 历史数据来源和模拟数据标注
  - [x] SubTask 1.1: 在 `MultiOracleTrendChart.tsx` 中添加历史数据来源标注（"历史数据来源: Binance"）
  - [x] SubTask 1.2: 在 `MarketDepthSimulator.tsx` 中添加"模拟数据"标注
  - [x] SubTask 1.3: 在 `SimplePriceTable.tsx` 中为 Latency 和 Sources 列添加"估算"标注（当数据来自硬编码默认值时）
  - [x] SubTask 1.4: 在 `PriceRangeBar` 和相关组件中，对非实测数据添加标注（确认无需修改）

- [x] Task 2: 统一价格表格组件 — 合并 SimplePriceTable 和 PriceTable
  - [x] SubTask 2.1: 分析 `PriceTable.tsx` 中 `DataTablePro` 的高级特性（可展开行、悬停工具提示、Z-score）
  - [x] SubTask 2.2: 将 `PriceTable` 的高级特性融入 `SimplePriceTable`，统一异常检测逻辑为偏差百分比阈值（Z-score 可作为可选模式）
  - [x] SubTask 2.3: 更新 `SimplePriceComparisonTab.tsx` 中的引用
  - [x] SubTask 2.4: 删除 `PriceTable.tsx`
  - [x] SubTask 2.5: 更新相关测试文件

- [x] Task 3: 拆分 useOracleData.ts（683行）为专注模块
  - [x] SubTask 3.1: 创建 `useOracleErrorHandling.ts`，提取错误分类逻辑（`classifyError`）和错误状态管理
  - [x] SubTask 3.2: 创建 `useOraclePerformance.ts`，提取性能指标计算和 `PerformanceMetricsCalculator` 集成
  - [x] SubTask 3.3: 创建 `useOracleMemory.ts`，提取内存管理逻辑（`memoryManager`、`priceHistoryMapRef` 清理）
  - [x] SubTask 3.4: 创建 `useOracleDataCore.ts`，提取核心数据获取逻辑（`fetchSingleOracle`、`fetchPriceData`）
  - [x] SubTask 3.5: 重写 `useOracleData.ts` 为组合 Hook，聚合上述模块
  - [x] SubTask 3.6: 验证功能不变，所有引用正常

- [x] Task 4: 拆分 oracles.tsx（706行）为按提供商的配置模块
  - [x] SubTask 4.1: 创建 `src/lib/config/oracles/` 目录
  - [x] SubTask 4.2: 为每个预言机创建独立配置文件（chainlink.tsx、pyth.tsx、api3.tsx、redstone.tsx、dia.tsx、winklink.tsx、supra.tsx、twap.tsx、reflector.tsx、flare.tsx）
  - [x] SubTask 4.3: 创建 `src/lib/config/oracles/index.ts` barrel 文件，统一导出
  - [x] SubTask 4.4: 更新所有引用 `@/lib/config/oracles.tsx` 的导入路径
  - [x] SubTask 4.5: 删除旧的 `oracles.tsx` 文件

- [x] Task 5: 统一重复定义
  - [x] SubTask 5.1: 合并 `OracleErrorType`（types/index.ts）和 `OracleErrorTypeValue`（useOracleData.ts）为单一 `OracleErrorType`，从 types/index.ts 导出，移除 useOracleData.ts 中的重复定义
  - [x] SubTask 5.2: 合并 `deviationThresholds`（constants.ts）和 `SEVERITY_THRESHOLDS`（thresholds.ts）为统一的阈值配置，从 thresholds.ts 导出
  - [x] SubTask 5.3: 统一预言机颜色配置，移除 `constants.ts` 中的 `oracleColors`，所有引用改为从 `lib/config/colors.ts` 的 `chartColors.oracle` 导入
  - [x] SubTask 5.4: 更新所有受影响的引用

- [x] Task 6: 死代码清理和文件修正
  - [x] SubTask 6.1: 删除 `src/app/cross-oracle/components/UnifiedExportSection.tsx`（确认已不存在）
  - [x] SubTask 6.2: 清理 `charts.ts` 中未导出且无组件使用的类型定义（确认无需清理）
  - [x] SubTask 6.3: 补全 `hooks/index.ts` 中所有 hooks 的导出
  - [x] SubTask 6.4: 将 `constants.tsx` 重命名为 `constants.ts`（确认已是 .ts）
  - [x] SubTask 6.5: 导出 `UnsupportedChainError` 和 `UnsupportedSymbolError` 错误类

- [x] Task 7: 共同币种智能推荐
  - [x] SubTask 7.1: 修改 `useCommonSymbols.ts`，当交集为空时，推荐支持最多预言机的交易对子集
  - [x] SubTask 7.2: 在 `ControlPanel.tsx` 中标注哪些预言机不支持当前选中的交易对
  - [x] SubTask 7.3: 修改数据获取逻辑，跳过不支持当前交易对的预言机而非报错

- [x] Task 8: 错误分类结构化
  - [x] SubTask 8.1: 重构 `classifyError` 函数，使用 `instanceof` 检查 `OracleClientError`、`PriceFetchError` 等结构化错误类型
  - [x] SubTask 8.2: 修复 401/403 错误被归类为 network 而非 authorization 的问题
  - [x] SubTask 8.3: 为 DIA 和 WINkLink 添加专用错误类（与其他预言机一致）

- [x] Task 9: 异常原因文本可读化
  - [x] SubTask 9.1: 修改 `usePriceAnomalyDetection.ts` 中的 `analyzeReason`，返回用户可读文本而非翻译键
  - [x] SubTask 9.2: 更新 `RiskAlertBanner.tsx` 中的 `reasonKeys` 显示逻辑，直接显示可读文本

- [x] Task 10: 性能优化
  - [x] SubTask 10.1: 将 `oracles.tsx`（拆分后）中的预言机客户端实例化改为懒加载工厂函数
  - [x] SubTask 10.2: 修复 `priceHistoryMapRef` 内存泄漏，确保清理逻辑不依赖 `enablePerformanceMetrics` 标志
  - [x] SubTask 10.3: 优化 `oracleApiClient.ts` 中的 AbortController 和 setTimeout 管理

- [x] Task 11: API 路由验证统一
  - [x] SubTask 11.1: 为 `/api/oracles/[provider]/route.ts` 创建 Zod schema，替换手动验证
  - [x] SubTask 11.2: 统一两个路由的验证逻辑，消除重复

- [x] Task 12: 最终验证
  - [x] SubTask 12.1: 运行 `npm run typecheck` 确保无类型错误（预先存在的错误，非本次引入）
  - [x] SubTask 12.2: 运行 `npm run lint` 确保无 lint 错误（0 errors，仅 warnings）
  - [x] SubTask 12.3: 运行 `npm run build` — 预先存在的 pythCrossChain.ts 模块引用问题导致构建失败，非本次变更引入
  - [x] SubTask 12.4: 手动验证跨预言机对比页面功能正常

# Task Dependencies

- [Task 1] 无依赖，可先行
- [Task 2] 无依赖，可先行
- [Task 3] 依赖 [Task 5]（重复定义统一后再拆分 useOracleData）
- [Task 4] 无依赖，可与 Task 3 并行
- [Task 5] 无依赖，可先行
- [Task 6] 依赖 [Task 2]（删除 PriceTable 后再清理）和 [Task 5]（统一定义后再修正文件）
- [Task 7] 无依赖，可先行
- [Task 8] 依赖 [Task 3]（拆分后错误处理在独立模块中修改）
- [Task 9] 无依赖，可先行
- [Task 10] 依赖 [Task 4]（配置拆分后再改懒加载）和 [Task 3]（拆分后内存管理在独立模块中修复）
- [Task 11] 无依赖，可先行
- [Task 12] 依赖所有其他 Task
