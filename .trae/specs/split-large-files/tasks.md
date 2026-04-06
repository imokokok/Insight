# Tasks

## Phase 1: Pyth数据服务拆分 (优先级: 高)
- [x] Task 1: 拆分PythDataService.ts (734行)
  - [x] SubTask 1.1: 创建 `lib/oracles/pyth/retry.ts` - 提取重试逻辑工具函数 (withRetry, sleep)
  - [x] SubTask 1.2: 创建 `lib/oracles/pyth/crossChain.ts` - 提取跨链数据获取逻辑 (fetchChainSpecificData, getCrossChainPrices)
  - [x] SubTask 1.3: 创建 `lib/oracles/pyth/calculations.ts` - 提取统计计算函数 (calculateTotalSubmissions, calculateAverageLatency)
  - [x] SubTask 1.4: 重构 `PythDataService.ts` - 导入拆分的模块，保持原有API不变
  - [x] SubTask 1.5: 更新相关导入路径 - 确保所有引用该服务的代码正常工作
  - [x] SubTask 1.6: 验证功能 - 运行相关测试，确保功能不受影响

## Phase 2: AnalysisTab组件拆分 (优先级: 高)
- [x] Task 2: 拆分AnalysisTab.tsx (327行)
  - [x] SubTask 2.1: 创建 `components/DataQualityTrend.tsx` - 提取数据质量趋势组件
  - [x] SubTask 2.2: 创建 `components/LatencyDistributionHistogram.tsx` - 提取延迟分布直方图组件
  - [x] SubTask 2.3: 创建 `components/MovingAverageChart.tsx` - 提取移动平均线图表组件
  - [x] SubTask 2.4: 创建 `components/PriceCorrelationMatrix.tsx` - 提取价格相关性矩阵组件
  - [x] SubTask 2.5: 创建 `components/PriceDeviationHeatmap.tsx` - 提取价格偏差热力图组件
  - [x] SubTask 2.6: 创建 `components/PriceDistributionBoxPlot.tsx` - 提取价格分布箱线图组件
  - [x] SubTask 2.7: 创建 `components/PriceVolatilityChart.tsx` - 提取价格波动率图表组件
  - [x] SubTask 2.8: 创建 `components/OraclePerformanceRanking.tsx` - 提取预言机性能排名组件
  - [x] SubTask 2.9: 重构 `AnalysisTab.tsx` - 导入拆分的组件，简化主组件
  - [x] SubTask 2.10: 验证UI渲染 - 确保页面显示正常

## Phase 3: CrossChain数据Hook拆分 (优先级: 高)
- [x] Task 3: 拆分useCrossChainData.ts (1,758行)
  - [x] SubTask 3.1: 创建 `utils/validation.ts` - 提取验证工具函数 (validatePriceData)
  - [x] SubTask 3.2: 创建 `utils/anomalyDetection.ts` - 提取异常检测工具函数 (detectAnomalousPrices)
  - [x] SubTask 3.3: 创建 `hooks/useDataValidation.ts` - 提取数据验证Hook
  - [x] SubTask 3.4: 创建 `hooks/useAnomalyDetection.ts` - 提取异常检测Hook
  - [x] SubTask 3.5: 创建 `hooks/useDataFetching.ts` - 提取数据获取Hook
  - [x] SubTask 3.6: 重构 `useCrossChainData.ts` - 组合拆分的Hooks，保持原有API
  - [x] SubTask 3.7: 验证功能 - 确保跨链数据功能正常

## Phase 4: Band RPC服务拆分 (优先级: 中)
- [x] Task 4: 拆分bandRpcService.ts (1,419行)
  - [x] SubTask 4.1: 创建 `validators.ts` - 提取验证者相关逻辑 (getValidators, getValidatorInfo)
  - [x] SubTask 4.2: 创建 `blocks.ts` - 提取区块相关逻辑 (getLatestBlock, getBlockByHeight)
  - [x] SubTask 4.3: 创建 `governance.ts` - 提取治理相关逻辑 (getGovernanceProposals, getGovernanceParams)
  - [x] SubTask 4.4: 扩展 `types.ts` - 添加缺失的类型定义
  - [x] SubTask 4.5: 重构 `BandRpcService.ts` - 导入拆分的模块
  - [x] SubTask 4.6: 验证功能 - 确保Band Protocol集成正常

## Phase 5: ChartExportButton组件拆分 (优先级: 中)
- [x] Task 5: 拆分ChartExportButton.tsx (1,104行)
  - [x] SubTask 5.1: 创建 `hooks/useExportState.ts` - 提取导出状态管理Hook
  - [x] SubTask 5.2: 创建 `hooks/useExportActions.ts` - 提取导出操作Hook
  - [x] SubTask 5.3: 创建 `components/ExportSettings.tsx` - 提取导出设置子组件
  - [x] SubTask 5.4: 创建 `components/ResolutionPicker.tsx` - 提取分辨率选择器
  - [x] SubTask 5.5: 创建 `components/BatchSelector.tsx` - 提取批量选择器
  - [x] SubTask 5.6: 创建 `components/ExportPreview.tsx` - 提取导出预览组件
  - [x] SubTask 5.7: 重构 `ChartExportButton.tsx` - 导入拆分的模块和组件
  - [x] SubTask 5.8: 验证导出功能 - 确保图表导出正常工作

## Phase 6: DIA数据服务拆分 (优先级: 中)
- [x] Task 6: 拆分diaDataService.ts (1,059行)
  - [x] SubTask 6.1: 创建 `constants/chainMapping.ts` - 提取链映射常量 (DIA_CHAIN_MAPPING)
  - [x] SubTask 6.2: 创建 `constants/assetAddresses.ts` - 提取资产地址常量 (DIA_ASSET_ADDRESSES)
  - [x] SubTask 6.3: 创建 `constants/nftCollections.ts` - 提取NFT集合常量 (NFT_COLLECTIONS)
  - [x] SubTask 6.4: 重构 `DIADataService.ts` - 导入拆分的常量
  - [x] SubTask 6.5: 验证功能 - 确保DIA集成正常

## Phase 7: DataTablePro组件拆分 (优先级: 中)
- [x] Task 7: 拆分DataTablePro.tsx (1,028行)
  - [x] SubTask 7.1: 创建 `types.ts` - 提取类型定义 (ColumnDef, DataTableProProps等)
  - [x] SubTask 7.2: 创建 `utils/formatting.ts` - 提取格式化工具函数 (getNestedValue, applyConditionalFormatting)
  - [x] SubTask 7.3: 创建 `utils/sorting.ts` - 提取排序工具函数 (sortData, handleMultiSort)
  - [x] SubTask 7.4: 创建 `components/TableHeader.tsx` - 提取表头组件
  - [x] SubTask 7.5: 创建 `components/TableBody.tsx` - 提取表体组件
  - [x] SubTask 7.6: 创建 `components/ColumnResizer.tsx` - 提取列宽调整器
  - [x] SubTask 7.7: 创建 `components/DensityToggle.tsx` - 提取密度切换器
  - [x] SubTask 7.8: 重构 `DataTablePro.tsx` - 导入拆分的模块和组件
  - [x] SubTask 7.9: 验证表格功能 - 确保数据表格正常工作

## Phase 8: 最终验证和清理
- [x] Task 8: 全面测试和文档更新
  - [x] SubTask 8.1: 运行完整测试套件 - 确保所有功能正常
  - [x] SubTask 8.2: 检查TypeScript类型 - 确保无类型错误
  - [x] SubTask 8.3: 检查导入路径 - 确保所有导入正确
  - [x] SubTask 8.4: 代码审查 - 确保代码质量符合标准
  - [x] SubTask 8.5: 性能测试 - 确保拆分后性能没有下降

# Task Dependencies
- Task 2 (AnalysisTab拆分) 可以与 Task 1 (PythDataService拆分) 并行执行
- Task 3 (CrossChain Hook拆分) 依赖 Task 1 完成
- Task 4-7 可以并行执行
- Task 8 (最终验证) 依赖所有前置任务完成

# 预期成果
- 所有拆分后的文件不超过300行
- 每个文件职责单一，易于理解和维护
- 保持原有功能和API不变
- 提高代码的可测试性和可复用性
